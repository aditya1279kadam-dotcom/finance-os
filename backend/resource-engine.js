const xlsx = require('xlsx');

class ResourceEngine {
    constructor() { }

    parseDate(input) {
        if (!input) return null;
        if (typeof input === 'number') {
            return new Date(Math.round((input - 25569) * 86400 * 1000));
        }
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }

    getWorkingDays(startDate, endDate) {
        if (!startDate || isNaN(startDate.getTime())) return 0;
        if (!endDate || isNaN(endDate.getTime())) return 0;
        if (startDate > endDate) return 0;

        let days = 0;
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        while (current <= end) {
            let day = current.getDay();
            if (day !== 0 && day !== 6) {
                days++;
            }
            current.setDate(current.getDate() + 1);
        }
        return days;
    }

    getPeriodBounds(filters) {
        let start = new Date('2024-04-01');
        let end = new Date();

        if (filters && filters.year && filters.year !== 'All') {
            const fyYear = parseInt(filters.year.replace('FY', '')) + 2000;
            start = new Date(`${fyYear - 1}-04-01`);
            end = new Date(`${fyYear}-03-31`);

            if (filters.quarter && filters.quarter !== 'All') {
                const qMap = {
                    'Q1': { sm: 4, em: 6 },
                    'Q2': { sm: 7, em: 9 },
                    'Q3': { sm: 10, em: 12 },
                    'Q4': { sm: 1, em: 3 }
                };
                const q = qMap[filters.quarter];
                if (q) {
                    const sYear = q.sm >= 4 ? fyYear - 1 : fyYear;
                    const eYear = q.em >= 4 ? fyYear - 1 : fyYear;
                    start = new Date(sYear, q.sm - 1, 1);
                    end = new Date(eYear, q.em, 0);
                }
            }
        }

        if (end > new Date()) end = new Date();
        return { periodStart: start, periodEnd: end };
    }

    process(data) {
        const { JiraDump = [], ResourceMaster = [], RateCard = [], AttendanceSummary = [], Filters = {}, MatchingReport = [], AttendanceQC = [] } = data;

        const qcReport = {
            missingSheets: [],
            missingColumns: [],
            unknownCategories: new Set(),
            failedCrossChecks: [],
            denominatorIssues: [],
            missingLeaveDays: [],
            missingRequiredHours: []
        };

        // Helper for flexible column access
        const getVal = (row, ...keys) => {
            for (let k of keys) {
                if (row[k] !== undefined && row[k] !== null) return row[k];
                for (let rk of Object.keys(row)) {
                    if (rk.toLowerCase() === k.toLowerCase()) return row[rk];
                }
            }
            return undefined;
        };

        // 1. Initialize resource map from ResourceMaster & RateCard
        const resources = {};
        const { periodStart, periodEnd } = this.getPeriodBounds(Filters);

        // Build RateCard map for faster function lookup
        const rateMap = {};
        RateCard.forEach(r => {
            const n = (getVal(r, 'Name', 'ResourceName') || '').trim();
            if (n) rateMap[n] = getVal(r, 'Function', 'function') || 'Unknown';
        });

        const missingJiraIDs = [];
        const defaulters = [];

        ResourceMaster.forEach(row => {
            const name = (getVal(row, 'Jira Name', 'Name', 'ResourceName') || '').trim();
            const formalName = (getVal(row, 'Name') || name).trim();
            if (!name) return;

            const dojStr = getVal(row, 'Date of Joining', 'DOJ');
            const dosStr = getVal(row, 'Date of Separation', 'DOS');

            let doj = this.parseDate(dojStr) || periodStart;
            let dos = this.parseDate(dosStr);

            let effStart = doj > periodStart ? doj : periodStart;
            let effEnd = dos && dos < periodEnd ? dos : periodEnd;

            const reqH = effStart <= effEnd ? this.getWorkingDays(effStart, effEnd) * 8 : 0;
            const func = rateMap[formalName] || 'Unknown';

            resources[name] = {
                ResourceName: name,
                FormalName: formalName,
                Function: func,
                RequiredHours: reqH,
                TotalUncappedJira: 0,
                ExternalHours: 0, InternalHours: 0, CAAPL_Hours: 0,
                LND_Hours: 0, Sales_Hours: 0, Leaves_Hours_Jira: 0, Bench_Hours_Jira: 0,
                ActualLeaveDays: 0
            };
        });

        // 2. Pre-scan Jira for Total Uncapped Hours per Author
        JiraDump.forEach(row => {
            const author = (getVal(row, 'Author', 'resourcename') || '').trim();
            const timeSpent = parseFloat(getVal(row, 'time spent (hrs)', 'Time Spent (Hours)')) || 0;
            if (author && resources[author]) {
                resources[author].TotalUncappedJira += timeSpent;
            } else if (author && timeSpent > 0) {
                // If the author is NOT in ResourceMaster but logged time, create them gracefully
                resources[author] = {
                    ResourceName: author, FormalName: author, Function: 'Unknown',
                    RequiredHours: 0, TotalUncappedJira: timeSpent,
                    ExternalHours: 0, InternalHours: 0, CAAPL_Hours: 0, LND_Hours: 0, Sales_Hours: 0, Leaves_Hours_Jira: 0, Bench_Hours_Jira: 0, ActualLeaveDays: 0
                };
            }
        });

        // 3. Identify Missing IDs and Defaulters (Tech/Product only)
        Object.values(resources).forEach(r => {
            const isTechProduct = r.Function === 'Technology' || r.Function === 'Product';

            // Check if missing Jira ID (Doesn't exist in JiraDump)
            let existsInJira = JiraDump.some(row => (getVal(row, 'Author', 'resourcename') || '').trim() === r.ResourceName);
            if (isTechProduct && !existsInJira) {
                missingJiraIDs.push(r.ResourceName);
                r.MissingJiraID = true;
            }

            // Defaulter: Exists but no hours, or logged < required
            if (r.RequiredHours > 0 && r.TotalUncappedJira === 0 && existsInJira) {
                defaulters.push({ name: r.ResourceName, type: 'No Logs', required: r.RequiredHours });
            } else if (r.RequiredHours > 0 && r.TotalUncappedJira < r.RequiredHours && existsInJira) {
                defaulters.push({ name: r.ResourceName, type: 'Partial Logs', required: r.RequiredHours, logged: r.TotalUncappedJira, missing: r.RequiredHours - r.TotalUncappedJira });
            }
        });

        // 4. Map Jira Project Categories to FinalCategory & Cap Hours
        const processedJira = JiraDump.map(row => {
            const author = (getVal(row, 'Author', 'resourcename') || '').trim();
            const projectCat = (getVal(row, 'ProjectCategory', 'project category') || '').trim();
            let timeSpent = parseFloat(getVal(row, 'CappedHours', 'capped hours', 'time spent (hrs)', 'Time Spent (Hours)')) || 0;

            const resObj = resources[author];
            const reqH = resObj ? resObj.RequiredHours : 0;
            const totalU = resObj ? resObj.TotalUncappedJira : timeSpent;

            // Apply Row-level Capping
            let cappedHours = timeSpent;
            if (totalU > reqH && reqH > 0) {
                cappedHours = (timeSpent / totalU) * reqH;
            } else if (reqH === 0 && totalU > 0) {
                // Not standard according to spec, but if someone logged but has 0 required, 
                cappedHours = timeSpent;
            }

            let finalCat = 'Unknown';
            const catLower = projectCat.toLowerCase();

            if (['implementation', 'cr', 'support', 'consulting', 'valuation'].some(c => catLower.includes(c)) || catLower.includes('external') || catLower.includes('billable')) {
                finalCat = 'External Billable';
            } else if (catLower === 'capex' || catLower.includes('internal billable')) {
                finalCat = 'Internal Billable';
            } else if (['hr', 'admin', 'laptop', 'caapl', 'internal', 'general'].some(c => catLower.includes(c))) {
                finalCat = 'CAAPL';
            } else if (['lnd', 'learning', 'development'].some(c => catLower.includes(c))) {
                finalCat = 'LND';
            } else if (['sales', 'pre-sales', 'demo'].some(c => catLower.includes(c))) {
                finalCat = 'Sales';
            } else if (['leave', 'leaves'].some(c => catLower.includes(c))) {
                finalCat = 'Leaves';
            } else if (['bench'].some(c => catLower.includes(c))) {
                finalCat = 'Bench';
            } else {
                if (projectCat) qcReport.unknownCategories.add(projectCat);
            }

            return { author, finalCat, cappedHours };
        });

        // 5. Aggregate Capped Jira hours per resource
        processedJira.forEach(row => {
            if (!row.author || !resources[row.author]) return;
            const r = resources[row.author];
            if (row.finalCat === 'External Billable') r.ExternalHours += row.cappedHours;
            else if (row.finalCat === 'Internal Billable') r.InternalHours += row.cappedHours;
            else if (row.finalCat === 'CAAPL') r.CAAPL_Hours += row.cappedHours;
            else if (row.finalCat === 'LND') r.LND_Hours += row.cappedHours;
            else if (row.finalCat === 'Sales') r.Sales_Hours += row.cappedHours;
            else if (row.finalCat === 'Leaves') r.Leaves_Hours_Jira += row.cappedHours;
            else if (row.finalCat === 'Bench') r.Bench_Hours_Jira += row.cappedHours;
        });

        // 4. Incorporate Attendance Summary (Reconciling via MatchedName)
        AttendanceSummary.forEach(att => {
            const matchedName = att.MatchedName;
            if (matchedName && resources[matchedName]) {
                resources[matchedName].ActualLeaveDays = att.ActualLeaveDays;
            } else if (!matchedName) {
                // Unmatched HR names are handled in the server's matchingReport/QC
            }
        });

        const reportData = [];

        // 5. Compute final metrics and adjusted bench
        Object.keys(resources).sort().forEach(name => {
            const r = resources[name];
            r.Leaves_Days_Jira = r.Leaves_Hours_Jira / 8;

            // HR Reconciliation Logic
            const actualLeaves = r.ActualLeaveDays || r.Leaves_Days_Jira;
            let extraLeaveHours = 0;
            if (actualLeaves > r.Leaves_Days_Jira) {
                extraLeaveHours = (actualLeaves - r.Leaves_Days_Jira) * 8;
                r.Leaves_Hours_Final = r.Leaves_Hours_Jira + extraLeaveHours;
            } else {
                r.Leaves_Hours_Final = r.Leaves_Hours_Jira;
            }
            r.ActualLeaveDays = actualLeaves;

            // Adjusted Bench Calculation
            const R = r.RequiredHours;
            const totalNonBenchJira = r.ExternalHours + r.InternalHours + r.CAAPL_Hours + r.LND_Hours + r.Sales_Hours + r.Leaves_Hours_Jira;
            const missing = R - totalNonBenchJira;
            r.AdjustedBench = missing > 0 ? missing : 0;

            let finalBench = r.Bench_Hours_Jira + r.AdjustedBench;
            if (actualLeaves > r.Leaves_Days_Jira) {
                finalBench -= extraLeaveHours;
            }
            r.FinalBench = Math.max(0, finalBench);

            // Cross Verification
            r.TotalAllocated = r.ExternalHours + r.InternalHours + r.CAAPL_Hours + r.LND_Hours + r.Sales_Hours + r.Leaves_Hours_Final + r.FinalBench;
            r.CrossCheckDelta = r.TotalAllocated - R;

            if (Math.abs(r.CrossCheckDelta) > 0.01) {
                qcReport.failedCrossChecks.push({ name, delta: r.CrossCheckDelta });
            }

            // KPIs
            const denom = R - r.Leaves_Hours_Final;
            if (r.RequiredHours === null) {
                qcReport.missingRequiredHours.push(name);
                r.ExternalProductivity = null;
                r.InternalProductivity = null;
                r.BenchPercent = null;
                r.OverallBillability = null;
            } else {
                if (denom <= 0) {
                    qcReport.denominatorIssues.push(name);
                    r.ExternalProductivity = null;
                    r.OverallBillability = null;
                } else {
                    r.ExternalProductivity = r.ExternalHours / denom;
                    r.OverallBillability = (r.InternalHours + r.ExternalHours) / denom;
                }
                r.InternalProductivity = (r.InternalHours + r.CAAPL_Hours + r.LND_Hours) / R;
                r.BenchPercent = r.FinalBench / R;
            }

            reportData.push(r);
        });

        // 6. Summary Aggregates
        let cntExt = 0, sumExt = 0;
        let cntInt = 0, sumInt = 0;
        let cntBench = 0, sumBench = 0;
        let cntOv = 0, sumOv = 0;

        reportData.forEach(r => {
            if (r.ExternalProductivity !== null) { cntExt++; sumExt += r.ExternalProductivity; }
            if (r.InternalProductivity !== null) { cntInt++; sumInt += r.InternalProductivity; }
            if (r.BenchPercent !== null) { cntBench++; sumBench += r.BenchPercent; }
            if (r.OverallBillability !== null) { cntOv++; sumOv += r.OverallBillability; }
        });

        const summary = {
            AvgOverallBillability: cntOv ? (sumOv / cntOv) : 0,
            AvgExternalProductivity: cntExt ? (sumExt / cntExt) : 0,
            AvgInternalProductivity: cntInt ? (sumInt / cntInt) : 0,
            AvgBench: cntBench ? (sumBench / cntBench) : 0,
            TopResources: [...reportData].sort((a, b) => b.RequiredHours - a.RequiredHours).slice(0, 10),
            BottomBillability: [...reportData]
                .filter(r => r.OverallBillability !== null)
                .sort((a, b) => a.OverallBillability - b.OverallBillability).slice(0, 10)
        };

        qcReport.unknownCategories = Array.from(qcReport.unknownCategories);
        qcReport.missingJiraIDs = missingJiraIDs;
        qcReport.defaulters = defaulters;

        return {
            reportData,
            summary,
            qcReport
        };
    }
}

module.exports = new ResourceEngine();
