const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs');
const xlsx = require('xlsx');
const pptxgen = require('pptxgenjs');
const stringSimilarity = require('string-similarity');
const financeEngine = require('./finance-engine');
const resourceEngine = require('./resource-engine');

dotenv.config();

const APP_VERSION = "v1.2.2 (Emergency Route Patch)";
const app = express();
const PORT = process.env.PORT || 3001;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });

// In-memory state for POC (Session-like)
let projectState = {
    jiraDump: [],
    rateCard: [],
    resourceList: [],
    projectMaster: [],
    overheadPool: [],
    attendanceHR: [], // Defensive fallback key
    lastRefreshed: null
};

// In-memory state for Resource Report
let attendanceState = {
    summary: [],
    matchingReport: [],
    qcFlags: [],
    rawData: []
};

app.use(cors());
app.use(express.json());

// Request Logger for Debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Metadata Persistence (Categories, etc.)
const METADATA_FILE = path.join(__dirname, 'metadata.json');

// REST API Endpoints
app.get('/api/metadata', (req, res) => {
    console.log('-> Handling GET /api/metadata');
    try {
        if (!fs.existsSync(METADATA_FILE)) {
            fs.writeFileSync(METADATA_FILE, JSON.stringify({ categories: ["Implementation", "Support", "Consulting"] }, null, 4));
        }
        const data = fs.readFileSync(METADATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Metadata Read Error:', err);
        res.status(500).json({ error: 'Failed to read metadata' });
    }
});

app.post('/api/metadata', (req, res) => {
    console.log('-> Handling POST /api/metadata');
    try {
        const newMetadata = req.body;
        fs.writeFileSync(METADATA_FILE, JSON.stringify(newMetadata, null, 4));
        res.json({ success: true, metadata: newMetadata });
    } catch (err) {
        console.error('Metadata Save Error:', err);
        res.status(500).json({ error: 'Failed to save metadata' });
    }
});

app.get('/api/ping', (req, res) => res.json({ status: 'pong', version: APP_VERSION }));

// Resource Ingestion Endpoint (HR Attendance Raw)
app.post('/api/upload/attendance', upload.single('file'), (req, res) => {
    console.log(`[DEBUG] Attendance Route Hit: /api/upload/attendance`);
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded or file could not be parsed.' });
        const filePath = req.file.path;
        let rows = [];

        if (req.file.originalname.toLowerCase().endsWith('.csv')) {
            const content = fs.readFileSync(filePath, 'utf8');
            rows = Papa.parse(content, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '')
            }).data;
        } else {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        fs.unlinkSync(filePath); // Cleanup

        if (!rows || !rows.length) return res.status(400).json({ error: "File is empty or could not be parsed. Please check if it is a valid CSV/Excel file." });

        // Validate Columns (Case-Insensitive and space-robust)
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);

        console.log(`[DEBUG] Attendance CSV Upload: Found keys: ${keys.join(', ')}`);

        // Check for required columns with flexible spelling for Roster Date
        const hasEmployee = keys.includes('employeename');
        const hasDate = keys.includes('rosterdate') || keys.includes('roasterdate') || keys.includes('date');
        const hasFirstHalf = keys.includes('firsthalf');
        const hasSecondHalf = keys.includes('secondhalf');

        const missing = [];
        if (!hasEmployee) missing.push('employeename');
        if (!hasDate) missing.push('rosterdate (or roasterdate)');
        if (!hasFirstHalf) missing.push('firsthalf');
        if (!hasSecondHalf) missing.push('secondhalf');

        if (missing.length) {
            return res.status(400).json({
                error: `Missing required columns: ${missing.join(', ')}`,
                foundColumns: keys,
                tip: "Please ensure your CSV has headers: Employee Name, Roster Date, First Half, Second Half."
            });
        }

        // Helper to match case-insensitive with Roaster/Roster flexibility
        const getVal = (row, key) => {
            if (key === 'rosterdate') {
                const match = Object.keys(row).find(k => k === 'rosterdate' || k === 'roasterdate' || k === 'date');
                return match ? row[match] : undefined;
            }
            const match = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
            return match ? row[match] : undefined;
        };

        const allowedCodes = ['P', 'A', 'O', 'H', 'OD', 'WFH'];
        const qcFlags = [];
        const employeeData = {};

        rows.forEach((row, idx) => {
            const name = (getVal(row, 'employeename') || '').trim();
            const date = getVal(row, 'rosterdate');
            let fh = (getVal(row, 'firsthalf') || '').toString().toUpperCase().trim();
            let sh = (getVal(row, 'secondhalf') || '').toString().toUpperCase().trim();

            if (!name) return;

            // Handle data issues
            if (!allowedCodes.includes(fh) || !fh) {
                qcFlags.push(`Row ${idx + 2}: FirstHalf='${fh || 'Empty'}' - unknown code - treated as P`);
                fh = 'P';
            }
            if (!allowedCodes.includes(sh) || !sh) {
                qcFlags.push(`Row ${idx + 2}: SecondHalf='${sh || 'Empty'}' - unknown code - treated as P`);
                sh = 'P';
            }

            let dayLeave = 0;
            if (fh === 'A' && sh === 'A') dayLeave = 1.0;
            else if (fh === 'A' || sh === 'A') dayLeave = 0.5;

            if (!employeeData[name]) {
                employeeData[name] = {
                    ResourceName: name,
                    ActualLeaveDays: 0,
                    RawRowsCount: 0,
                    FlaggedRows: 0
                };
            }

            employeeData[name].ActualLeaveDays += dayLeave;
            employeeData[name].RawRowsCount += 1;
            // Note: FlaggedRows could count rows with unknown codes
        });

        // Name Normalization Function
        const normalize = (name) => {
            return name.toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[.,]/g, '')
                .replace(/\b(mr|mrs|ms|dr)\b/gi, '')
                .trim();
        };

        // Name Matching Logic
        const hrNames = Object.keys(employeeData);
        const jiraResources = projectState.resourceList.map(r => ({
            original: r['Jira Name'] || r['Name'] || '',
            normalized: normalize(r['Jira Name'] || r['Name'] || '')
        })).filter(r => r.original);

        const matchingReport = [];
        const finalAttendanceSummary = [];

        hrNames.forEach(hrName => {
            const normHR = normalize(hrName);
            const hrInfo = employeeData[hrName];

            // Exact Match
            let match = jiraResources.find(j => j.normalized === normHR);
            let matchType = 'Unmatched';
            let matchedName = null;
            let score = 0;

            if (match) {
                matchType = 'Exact';
                matchedName = match.original;
                score = 1.0;
            } else if (jiraResources.length > 0) {
                // Fuzzy Match
                const results = stringSimilarity.findBestMatch(normHR, jiraResources.map(j => j.normalized));
                score = results.bestMatch.rating;
                if (score >= 0.90) {
                    match = jiraResources[results.bestMatchIndex];
                    matchType = 'Fuzzy (Auto)';
                    matchedName = match.original;
                } else if (score >= 0.75) {
                    match = jiraResources[results.bestMatchIndex];
                    matchType = 'Fuzzy (Review Required)';
                    matchedName = match.original;
                }
            }

            matchingReport.push({
                HRName: hrName,
                MatchedNameInJira: matchedName,
                MatchType: matchType,
                Score: (score * 100).toFixed(0) + '%'
            });

            finalAttendanceSummary.push({
                ...hrInfo,
                MatchedName: matchedName,
                ActualLeaveHours: hrInfo.ActualLeaveDays * 8
            });
        });

        attendanceState = {
            summary: finalAttendanceSummary,
            matchingReport,
            qcFlags,
            filteredRaw: rows
        };

        projectState.lastRefreshed = new Date().toISOString();

        const unmatchedNames = matchingReport.filter(m => m.MatchType === 'Unmatched').map(m => m.HRName);

        res.json({
            success: true,
            rowCount: rows.length,
            resourceCount: hrNames.length,
            unmatchedCount: unmatchedNames.length,
            unmatchedNames: unmatchedNames,
            qcCount: qcFlags.length,
            qcExamples: qcFlags.slice(0, 5) // Send top 5 QC issues to the frontend
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Attendance Parse Error', details: err.message });
    }
});

// File Ingestion Endpoint
app.post('/api/upload/:type', upload.single('file'), (req, res) => {
    const { type } = req.params;
    console.log(`[DEBUG] Generic Upload Route Hit: type='${type}'`);

    // Defensive Fallback: If attendance is misrouted here, tell the user
    if (type === 'attendance' || type === 'attendanceHR') {
        return res.status(400).json({
            error: `Routing Error: Attendance file hit the generic route for '${type}'.`,
            tip: "Try refreshing your browser (Ctrl+F5) and restarting the server."
        });
    }

    if (!projectState.hasOwnProperty(type)) {
        return res.status(400).json({ error: `Invalid data type: [${type}]. Please check your frontend code.` });
    }

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded or file could not be parsed.' });
        const filePath = req.file.path;
        let data = [];

        if (req.file.originalname.toLowerCase().endsWith('.csv')) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const result = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: 'greedy',
                dynamicTyping: true
            });
            data = result.data;
        } else {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        if (data && data.length > 0) {
            const firstRow = data[0];
            const keys = Object.keys(firstRow).map(k => String(k).trim().toLowerCase());
            const missing = [];

            if (type === 'jiraDump') {
                if (!keys.includes('author')) missing.push('Author');
                if (!keys.includes('issue')) missing.push('Issue');
                if (!keys.some(k => k.includes('time spent'))) missing.push('Time Spent (hrs)');
            } else if (type === 'rateCard') {
                if (!keys.includes('name') && !keys.includes('jiraname') && !keys.includes('jira name')) missing.push('Name or Jira Name');
                if (!keys.includes('monthlysalary') && !keys.includes('monthly salary')) missing.push('Monthly Salary');
                if (!keys.includes('function')) missing.push('Function');
            } else if (type === 'resourceList') {
                if (!keys.includes('name') && !keys.includes('jiraname') && !keys.includes('jira name')) missing.push('Name or Jira Name');
                if (!keys.includes('dateofjoining') && !keys.includes('date of joining') && !keys.includes('doj')) missing.push('Date of Joining (DOJ)');
            } else if (type === 'projectMaster') {
                if (!keys.includes('project') && !keys.includes('customername') && !keys.includes('customer name')) missing.push('Project or Customer Name');
                if (!keys.includes('category')) missing.push('Category');
            }

            if (missing.length > 0) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ error: `Validation Failed. The uploaded ${type} sheet is missing required columns: ${missing.join(', ')}` });
            }
        }

        projectState[type] = data;
        projectState.lastRefreshed = new Date().toISOString();
        fs.unlinkSync(filePath); // Cleanup

        res.json({
            success: true,
            rowCount: data.length,
            preview: data.slice(0, 5)
        });
    } catch (err) {
        console.error(`Upload Error [${type}]:`, err);
        res.status(500).json({ error: 'File Parse Error', details: err.message });
    }
});

// Calculate Report Endpoint
app.get('/api/calculate', (req, res) => {
    try {
        console.log(`[DEBUG] /api/calculate triggered.`);
        console.log(`[DEBUG] Current projectState size: Jira: ${projectState.jiraDump?.length || 0}, Rates: ${projectState.rateCard?.length || 0}, Resources: ${projectState.resourceList?.length || 0}`);
        const inputData = {
            jiraDump: projectState.jiraDump,
            rateCard: projectState.rateCard,
            resourceList: projectState.resourceList,
            projectMaster: projectState.projectMaster,
            overheadPool: projectState.overheadPool,
            attendanceSummary: attendanceState.summary,
            filters: {
                year: req.query.year || 'All',
                quarter: req.query.quarter || 'All',
                month: req.query.month || 'All'
            }
        };
        const results = financeEngine.process(inputData);
        results.lastRefreshed = projectState.lastRefreshed;
        res.json(results);
    } catch (err) {
        console.error(`[DEBUG] /api/calculate Error:`, err);
        res.status(500).json({ error: 'Calculation failed', details: err.message });
    }
});

// Resource Calculation Endpoint
app.get('/api/calculate-resource', async (req, res) => {
    try {
        console.log(`[DEBUG] /api/calculate-resource triggered.`);

        // Use SHARED state
        const inputData = {
            JiraDump: projectState.jiraDump,
            ResourceMaster: projectState.resourceList, // Linked to existing upload
            RateCard: projectState.rateCard,
            ProjectMaster: projectState.projectMaster,
            AttendanceSummary: attendanceState.summary,
            MatchingReport: attendanceState.matchingReport,
            AttendanceQC: attendanceState.qcFlags,
            Filters: {
                year: req.query.year || 'All',
                quarter: req.query.quarter || 'All',
                month: req.query.month || 'All'
            }
        };

        console.log(`[DEBUG] Resource Report Input Data Size: Jira: ${inputData.JiraDump?.length || 0}, ResourceMaster: ${inputData.ResourceMaster?.length || 0}, AttendanceSummary: ${inputData.AttendanceSummary?.length || 0}`);

        const results = resourceEngine.process(inputData);
        results.lastRefreshed = projectState.lastRefreshed;

        // Save Excel logic
        const dateStr = new Date().toISOString().replace(/T.*/, '').replace(/-/g, '');
        const wb = xlsx.utils.book_new();

        // Build Excel Output Data
        const outData = results.reportData.map(r => ({
            ResourceName: r.ResourceName,
            RequiredHours: r.RequiredHours,
            ExternalHours: r.ExternalHours,
            InternalHours: r.InternalHours,
            CAAPL_Hours: r.CAAPL_Hours,
            LND_Hours: r.LND_Hours,
            Sales_Hours: r.Sales_Hours,
            Leaves_Hours_Jira: r.Leaves_Hours_Jira,
            Leaves_Days_Jira: r.Leaves_Days_Jira,
            ActualLeaveDays: r.ActualLeaveDays,
            Leaves_Hours_Final: r.Leaves_Hours_Final,
            Bench_Hours_Jira: r.Bench_Hours_Jira,
            AdjustedBench: r.AdjustedBench,
            FinalBench: r.FinalBench,
            TotalAllocated: r.TotalAllocated,
            CrossCheckDelta: r.CrossCheckDelta,
            'ExternalProductivity%': r.ExternalProductivity !== null ? (r.ExternalProductivity * 100).toFixed(2) + '%' : 'NA',
            'InternalProductivity%': r.InternalProductivity !== null ? (r.InternalProductivity * 100).toFixed(2) + '%' : 'NA',
            'Bench%': r.BenchPercent !== null ? (r.BenchPercent * 100).toFixed(2) + '%' : 'NA',
            'OverallBillability%': r.OverallBillability !== null ? (r.OverallBillability * 100).toFixed(2) + '%' : 'NA'
        }));

        const wsResource = xlsx.utils.json_to_sheet(outData);
        xlsx.utils.book_append_sheet(wb, wsResource, "ResourceBillability");

        const qcDataStr = [
            ...results.qcReport.missingSheets.map(s => `Missing Sheet: ${s}`),
            ...results.qcReport.missingRequiredHours.map(n => `Resource ${n}: RequiredHours missing`),
            ...results.qcReport.unknownCategories.map(c => `Unknown Project Category: ${c}`),
            ...results.qcReport.denominatorIssues.map(n => `Resource ${n}: RequiredHours - Leaves <= 0 (NA percentages)`),
            ...results.qcReport.failedCrossChecks.map(f => `Resource ${f.name}: Failed Cross-Check (Delta: ${f.delta.toFixed(2)})`),
            ...attendanceState.qcFlags,
            ...attendanceState.matchingReport.filter(m => m.MatchType.includes('Review') || m.MatchType === 'Unmatched').map(m => `Name Match: ${m.HRName} matched to ${m.MatchedNameInJira || 'None'} (${m.MatchType} - Score: ${m.Score})`)
        ].map(s => ({ Flag: s }));

        const wsQC = xlsx.utils.json_to_sheet(qcDataStr);
        xlsx.utils.book_append_sheet(wb, wsQC, "QC_Report");

        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(attendanceState.summary), "AttendanceSummary");
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(attendanceState.matchingReport), "MatchingReport");

        const excelPath = path.join(__dirname, 'uploads', `ResourceBillability_${dateStr}.xlsx`);
        xlsx.writeFile(wb, excelPath);

        // Generate PPTX
        const pptx = new pptxgen();
        const slide = pptx.addSlide();

        slide.addText(`Resource-Wise Billability — ${dateStr}`, { x: 0.5, y: 0.5, fontSize: 24, bold: true });

        slide.addText('Avg Overall Billability', { x: 0.5, y: 1.5, fontSize: 12, color: '666666' });
        slide.addText(`${(results.summary.AvgOverallBillability * 100).toFixed(2)}%`, { x: 0.5, y: 1.8, fontSize: 32, bold: true, color: '003366' });

        slide.addText('Avg External Prod', { x: 3.0, y: 1.5, fontSize: 12, color: '666666' });
        slide.addText(`${(results.summary.AvgExternalProductivity * 100).toFixed(2)}%`, { x: 3.0, y: 1.8, fontSize: 32, bold: true, color: '003366' });

        slide.addText('Avg Internal Prod', { x: 5.5, y: 1.5, fontSize: 12, color: '666666' });
        slide.addText(`${(results.summary.AvgInternalProductivity * 100).toFixed(2)}%`, { x: 5.5, y: 1.8, fontSize: 32, bold: true, color: '003366' });

        slide.addText('Avg Bench', { x: 8.0, y: 1.5, fontSize: 12, color: '666666' });
        slide.addText(`${(results.summary.AvgBench * 100).toFixed(2)}%`, { x: 8.0, y: 1.8, fontSize: 32, bold: true, color: 'cc0000' });

        const pptxPath = path.join(__dirname, 'uploads', `ResourceBillability_Summary_${dateStr}.pptx`);
        await pptx.writeFile({ fileName: pptxPath });

        results.exportFiles = {
            excel: `/uploads/ResourceBillability_${dateStr}.xlsx`,
            pptx: `/uploads/ResourceBillability_Summary_${dateStr}.pptx`
        };

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Calculation failed', details: err.message });
    }
});

// Clear Data Endpoint
app.post('/api/clear', (req, res) => {
    projectState = {
        jiraDump: [],
        rateCard: [],
        resourceList: [],
        projectMaster: [],
        overheadPool: []
    };
    res.json({ success: true, message: 'All data cleared' });
});

// ==============================
// JIRA API INTEGRATION ENDPOINTS
// ==============================

// Test JIRA Connection
app.post('/api/jira/test-connection', async (req, res) => {
    const { jiraUrl, email, apiToken } = req.body;
    if (!jiraUrl || !email || !apiToken) {
        return res.status(400).json({ error: 'Missing required fields: jiraUrl, email, apiToken' });
    }
    try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const response = await axios.get(`${jiraUrl.replace(/\/$/, '')}/rest/api/3/myself`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
            timeout: 15000
        });
        // Also fetch project count
        const projectsRes = await axios.get(`${jiraUrl.replace(/\/$/, '')}/rest/api/3/project`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
            timeout: 15000
        });
        res.json({
            success: true,
            user: response.data.displayName,
            email: response.data.emailAddress,
            projectCount: projectsRes.data.length
        });
    } catch (error) {
        const msg = error.response?.data?.message || error.response?.data?.errorMessages?.join(', ') || error.message;
        res.status(error.response?.status || 500).json({ error: `JIRA Connection Failed: ${msg}` });
    }
});

// Extract JIRA Worklogs with SSE Progress
app.post('/api/jira/extract', async (req, res) => {
    const { jiraUrl, email, apiToken, jql, epicField } = req.body;
    const effectiveEpicField = epicField || 'customfield_10014';

    if (!jiraUrl || !email || !apiToken) {
        return res.status(400).json({ error: 'Missing required JIRA credentials' });
    }

    // Setup SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const sendEvent = (type, data) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' };
        const baseUrl = jiraUrl.replace(/\/$/, '');

        sendEvent('progress', { percent: 0, status: 'Fetching project categories...', issue: '' });

        // 1. Cache project categories
        const projectCategoryMap = {};
        try {
            const projRes = await axios.get(`${baseUrl}/rest/api/3/project`, { headers, timeout: 30000 });
            projRes.data.forEach(p => {
                projectCategoryMap[p.key] = p.projectCategory?.name || null;
            });
            sendEvent('progress', { percent: 5, status: `Found ${projRes.data.length} projects. Searching issues...`, issue: '' });
        } catch (err) {
            sendEvent('progress', { percent: 5, status: 'Could not fetch project categories, continuing...', issue: '' });
        }

        // 2. Search issues with JQL (paginated using nextPageToken)
        const effectiveJql = jql || 'worklogDate >= -30d';
        let allIssues = [];
        const pageSize = 50;
        let nextPageToken = null;
        let pageCount = 0;

        sendEvent('progress', { percent: 8, status: `Executing JQL: ${effectiveJql}`, issue: '' });

        do {
            const params = {
                jql: effectiveJql,
                maxResults: pageSize,
                fields: `summary,project,timetracking,parent,${effectiveEpicField}`
            };
            if (nextPageToken) {
                params.nextPageToken = nextPageToken;
            }

            const searchRes = await axios.get(`${baseUrl}/rest/api/3/search/jql`, {
                headers,
                params,
                timeout: 60000
            });

            allIssues = allIssues.concat(searchRes.data.issues || []);
            nextPageToken = searchRes.data.nextPageToken || null;
            pageCount++;

            sendEvent('progress', {
                percent: Math.min(10, 8 + pageCount),
                status: `Fetched ${allIssues.length} issues so far (page ${pageCount})...`,
                issue: ''
            });
        } while (nextPageToken);

        if (allIssues.length === 0) {
            sendEvent('complete', { rowCount: 0, message: 'No issues found with the given JQL query.' });
            res.end();
            return;
        }

        sendEvent('progress', { percent: 10, status: `Found ${allIssues.length} issues. Extracting worklogs...`, issue: '' });

        // 3. Extract worklogs from each issue
        const rows = [];
        const startTime = Date.now();

        for (let idx = 0; idx < allIssues.length; idx++) {
            const issue = allIssues[idx];
            const issueKey = issue.key;
            const fields = issue.fields || {};
            const project = fields.project || {};
            const projectName = project.name || '';
            const projectKey = project.key || '';
            const projectCategory = projectCategoryMap[projectKey] || null;

            // Epic handling
            let epic = null;
            if (fields[effectiveEpicField]) {
                epic = fields[effectiveEpicField];
            }
            if (!epic && fields.parent) {
                epic = fields.parent.key || null;
            }

            // Original estimate
            let originalEstimate = null;
            if (fields.timetracking?.originalEstimateSeconds) {
                originalEstimate = Math.round((fields.timetracking.originalEstimateSeconds / 3600) * 100) / 100;
            }

            // Fetch worklogs for this issue
            try {
                const wlRes = await axios.get(`${baseUrl}/rest/api/3/issue/${issueKey}/worklog`, {
                    headers,
                    timeout: 30000
                });

                const worklogs = wlRes.data.worklogs || [];
                for (const wl of worklogs) {
                    rows.push({
                        'Author': wl.author?.displayName || wl.author?.name || 'Unknown',
                        'Project': projectName,
                        'Issue': issueKey,
                        'Epic': epic,
                        'Original Estimate (hrs)': originalEstimate,
                        'Project Category': projectCategory,
                        'Date': (wl.started || '').split('T')[0],
                        'Time Spent (hrs)': Math.round((wl.timeSpentSeconds / 3600) * 100) / 100
                    });
                }
            } catch (wlErr) {
                sendEvent('warning', { message: `Could not fetch worklogs for ${issueKey}: ${wlErr.message}` });
            }

            // Progress update (every issue or every 5 for large sets)
            if (allIssues.length < 100 || idx % 5 === 0 || idx === allIssues.length - 1) {
                const elapsed = (Date.now() - startTime) / 1000;
                const avgTime = elapsed / (idx + 1);
                const remaining = avgTime * (allIssues.length - idx - 1);
                const percent = 10 + Math.round(((idx + 1) / allIssues.length) * 88);

                sendEvent('progress', {
                    percent,
                    status: `Processing ${idx + 1}/${allIssues.length}`,
                    issue: issueKey,
                    eta: remaining > 60 ? `${(remaining / 60).toFixed(1)} min` : `${Math.round(remaining)}s`,
                    rowsExtracted: rows.length
                });
            }
        }

        // 4. Store in projectState (same as CSV upload)
        projectState.jiraDump = rows;
        projectState.lastRefreshed = new Date().toISOString();

        sendEvent('complete', {
            rowCount: rows.length,
            issueCount: allIssues.length,
            message: `Extraction complete! ${rows.length} worklog entries from ${allIssues.length} issues.`
        });

        res.end();

    } catch (error) {
        const msg = error.response?.data?.errorMessages?.join(', ') || error.response?.data?.message || error.message;
        sendEvent('error', { message: `Extraction failed: ${msg}` });
        res.end();
    }
});

// Export extracted JIRA data as CSV
app.get('/api/jira/export', (req, res) => {
    try {
        if (!projectState.jiraDump || projectState.jiraDump.length === 0) {
            return res.status(404).json({ error: 'No JIRA data available to export. Please extract first.' });
        }
        
        const csv = Papa.unparse(projectState.jiraDump);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Jira_Extract.csv"');
        res.status(200).send(csv);
    } catch (err) {
        console.error('Jira Export Error:', err);
        res.status(500).json({ error: 'Failed to export JIRA data', details: err.message });
    }
});

// Legacy Jira Proxy Endpoint
app.get('/api/jira/worklogs', async (req, res) => {
    const { JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
    if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        return res.status(500).json({ error: 'Jira configuration missing' });
    }
    try {
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
        const response = await axios.get(`${JIRA_URL}/rest/api/3/search/jql`, {
            params: req.query,
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Jira API Error' });
    }
});

// Static Files (Serve after API routes)
// static serving removed - frontend is now in a separate Vite app

app.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`FinanceOS Backend: ${APP_VERSION}`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`----------------------------------------`);
});
