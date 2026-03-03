const xlsx = require('xlsx');

class ResourceEngine {
    constructor() { }

    process(data) {
        const { JiraDump = [], ResourceMaster = [], AttendanceSummary = [], MatchingReport = [], AttendanceQC = [] } = data;

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

        // 1. Map Jira Project Categories to FinalCategory
        const processedJira = JiraDump.map(row => {
            const author = (getVal(row, 'Author', 'resourcename') || '').trim();
            const projectCat = (getVal(row, 'ProjectCategory', 'project category') || '').trim();
            const cappedHours = parseFloat(getVal(row, 'CappedHours', 'capped hours', 'capped_hours', 'time spent (hrs)')) || 0;

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

        // 2. Initialize resource map from ResourceMaster
        const resources = {};
        ResourceMaster.forEach(row => {
            const name = (getVal(row, 'Jira Name', 'Name', 'ResourceName') || '').trim();
            if (!name) return;
            const reqH = getVal(row, 'RequiredHours', 'Required Hours (Formula)', 'Required Hours');

            resources[name] = {
                ResourceName: name,
                RequiredHours: reqH !== undefined && reqH !== null ? parseFloat(reqH) : 176,
                ExternalHours: 0,
                InternalHours: 0,
                CAAPL_Hours: 0,
                LND_Hours: 0,
                Sales_Hours: 0,
                Leaves_Hours_Jira: 0,
                Bench_Hours_Jira: 0,
                ActualLeaveDays: 0 // Will be filled from AttendanceSummary
            };
        });

        // 3. Aggregate Jira hours per resource
        processedJira.forEach(row => {
            if (!row.author) return;
            // Note: In some cases row.author might need to be matched to ResourceMaster names
            // but usually Jira Name in ResourceMaster matches Author in JiraDump.
            if (!resources[row.author]) {
                resources[row.author] = {
                    ResourceName: row.author, RequiredHours: 176,
                    ExternalHours: 0, InternalHours: 0, CAAPL_Hours: 0,
                    LND_Hours: 0, Sales_Hours: 0, Leaves_Hours_Jira: 0, Bench_Hours_Jira: 0,
                    ActualLeaveDays: 0
                };
            }
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

        return {
            reportData,
            summary,
            qcReport
        };
    }
}

module.exports = new ResourceEngine();
