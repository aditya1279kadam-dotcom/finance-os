/**
 * Finance Engine (Backend Version)
 */

class FinanceEngine {
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
            if (day !== 0 && day !== 6) days++;
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
        const { jiraDump = [], rateCard = [], resourceList = [], projectMaster = [], overheadPool = [], attendanceSummary = [], filters = {} } = data;

        // 1. Process project keys and hourly rates
        const processedJira = this.processJiraDump(jiraDump, rateCard, resourceList, filters);

        // 2. Aggregate Direct Cost by Project Key
        const projectDirectCosts = this.aggregateDirectCosts(processedJira);

        // 3. Calculate Indirect Cost Allocation
        const totalDirectCost = Object.values(projectDirectCosts).reduce((sum, cost) => sum + cost, 0);
        const peopleOverhead = this.calculatePeopleOverhead(resourceList, rateCard, attendanceSummary, filters);
        const allocations = this.calculateAllocations(projectDirectCosts, totalDirectCost, overheadPool, peopleOverhead);

        // 4. Generate Final Project Report
        const report = this.generateReport(projectMaster, projectDirectCosts, allocations);

        return {
            report,
            summary: this.calculateKPIs(report, peopleOverhead),
            processedJira
        };
    }

    processJiraDump(jiraDump, rateCard, resourceList, filters) {
        const rateMap = new Map(rateCard.map(r => [r['Jira Name'] || r['Name'], parseFloat(r['Monthly Salary'] || 0)]));
        const resourceMap = new Map(resourceList.map(r => [r['Jira Name'] || r['Name'], r]));
        const { periodStart, periodEnd } = this.getPeriodBounds(filters);

        const authorTotalHours = {};
        jiraDump.forEach(row => {
            const author = row['Author'];
            const hours = parseFloat(row['Time Spent (hrs)'] || 0);
            authorTotalHours[author] = (authorTotalHours[author] || 0) + hours;
        });

        return jiraDump.map(row => {
            const author = row['Author'];
            const issue = row['Issue'] || '';
            const projectKey = issue.includes('-') ? issue.split('-')[0] : 'UNKNOWN';
            const timeSpent = parseFloat(row['Time Spent (hrs)'] || 0);
            const monthlySalary = rateMap.get(author) || 0;
            const hourlyRate = monthlySalary / 22 / 8;

            const resource = resourceMap.get(author);
            let reqH = 176;

            if (resource) {
                const dojStr = resource['Date of Joining'] || resource['DOJ'];
                const dosStr = resource['Date of Separation'] || resource['DOS'];
                let doj = this.parseDate(dojStr) || periodStart;
                let dos = this.parseDate(dosStr);
                let effStart = doj > periodStart ? doj : periodStart;
                let effEnd = dos && dos < periodEnd ? dos : periodEnd;
                reqH = effStart <= effEnd ? this.getWorkingDays(effStart, effEnd) * 8 : 0;
            }

            let cappedHours = timeSpent;
            if (authorTotalHours[author] > reqH && reqH > 0) {
                cappedHours = (timeSpent / authorTotalHours[author]) * reqH;
            } else if (reqH === 0 && timeSpent > 0) {
                cappedHours = timeSpent;
            }

            return {
                ...row,
                projectKey,
                hourlyRate,
                cappedHours,
                rowCost: cappedHours * hourlyRate
            };
        });
    }

    aggregateDirectCosts(processedJira) {
        const aggregation = {};
        processedJira.forEach(row => {
            const key = row.projectKey;
            aggregation[key] = (aggregation[key] || 0) + row.rowCost;
        });
        return aggregation;
    }

    calculatePeopleOverhead(resourceList, rateCard, attendanceSummary, filters) {
        const rateMap = new Map();
        const functionMap = new Map();
        rateCard.forEach(r => {
            const name = r['Jira Name'] || r['Name'];
            if (name) {
                rateMap.set(name, parseFloat(r['Monthly Salary'] || 0));
                functionMap.set(name, (r['Function'] || '').trim());
            }
        });

        const attendanceMap = new Map();
        if (attendanceSummary) {
            attendanceSummary.forEach(a => {
                if (a.MatchedName) attendanceMap.set(a.MatchedName, parseFloat(a.ActualLeaveDays || 0));
                if (a.ResourceName) attendanceMap.set(a.ResourceName, parseFloat(a.ActualLeaveDays || 0));
            });
        }

        const { periodStart, periodEnd } = this.getPeriodBounds(filters);
        let totalPeopleOverhead = 0;

        resourceList.forEach(r => {
            const name = r['Jira Name'] || r['Name'];
            if (!name) return;

            const func = functionMap.get(name) || 'Unknown';
            const isOverhead = !['Technology', 'Product'].includes(func);

            if (isOverhead) {
                const dojStr = r['Date of Joining'] || r['DOJ'];
                const dosStr = r['Date of Separation'] || r['DOS'];
                let doj = this.parseDate(dojStr) || periodStart;
                let dos = this.parseDate(dosStr);
                let effStart = doj > periodStart ? doj : periodStart;
                let effEnd = dos && dos < periodEnd ? dos : periodEnd;

                const requiredDays = effStart <= effEnd ? this.getWorkingDays(effStart, effEnd) : 0;

                const leaves = attendanceMap.get(name) || 0;
                const actualWorkingDays = Math.max(0, requiredDays - leaves);

                const monthlySalary = rateMap.get(name) || 0;
                const dailyRate = monthlySalary / 22;

                totalPeopleOverhead += (actualWorkingDays * dailyRate);
            }
        });

        return totalPeopleOverhead;
    }

    calculateAllocations(projectDirectCosts, totalDirectCost, overheadPool, peopleOverhead) {
        const pool = overheadPool[0] || { 'HR Overhead Total': 0, 'Infra Total': 0, 'OPE Total': 0, 'Commission Total': 0 };
        const allocations = {};

        const combinedHROverhead = parseFloat(pool['HR Overhead Total'] || 0) + (peopleOverhead || 0);

        Object.keys(projectDirectCosts).forEach(key => {
            const share = totalDirectCost > 0 ? projectDirectCosts[key] / totalDirectCost : 0;
            allocations[key] = {
                hr: share * combinedHROverhead,
                infra: share * (parseFloat(pool['Infra Total']) || 0),
                ope: share * (parseFloat(pool['OPE Total']) || 0),
                commission: share * (parseFloat(pool['Commission Total']) || 0)
            };
        });
        return allocations;
    }

    generateReport(projectMaster, projectDirectCosts, allocations) {
        return projectMaster.map(proj => {
            const key = proj['Client Code'] || proj['Project Key (formula)'] || 'UNKNOWN';

            // New Logic for Multi-Quarter Tracking
            const revenueFY25 = parseFloat(proj['Revenue FY25'] || 0);
            const revenueFY26 = parseFloat(proj['Revenue FY26'] || 0);
            const cumulativeRevenue = revenueFY25 + revenueFY26;

            const totalSignedHRCost = parseFloat(proj['Total Signed HR Cost'] || 0);
            const costTillLastQuarter = parseFloat(proj['Cost Till Last Quarter'] || 0);
            const costIncurredCurrentQuarter = projectDirectCosts[key] || 0;
            const totalDirectCostTillDate = costTillLastQuarter + costIncurredCurrentQuarter;

            const al = allocations[key] || { hr: 0, infra: 0, ope: 0, commission: 0 };
            const totalFullyLoadedCost = totalDirectCostTillDate + al.hr + al.infra + al.ope + al.commission;
            const grossProfit = cumulativeRevenue - totalFullyLoadedCost;

            return {
                // 1-5 Base Details
                project: proj['Customer Name'] || proj['Project'],
                product: proj['Product'],
                category: proj['Category'],
                projectKey: key,
                projectStatus: proj['Project Status'] || 'Active',

                // 6-10 Revenue & Budget
                poAmount: parseFloat(proj['PO Amount'] || 0),
                revenueFY25,
                revenueFY26,
                cumulativeRevenue,
                budgetToGo: parseFloat(proj['PO Amount'] || 0) - cumulativeRevenue,

                // 11-16 HR Cost & WIP
                totalSignedHRCost,
                costTillLastQuarter,
                openingRemainingSignedHRCost: totalSignedHRCost - costTillLastQuarter,
                costIncurredCurrentQuarter,
                totalDirectCostTillDate,
                closingRemainingSignedHRCost: totalSignedHRCost - totalDirectCostTillDate,

                // 17-21 Indirect & Fully Loaded
                allocatedHROverhead: al.hr,
                opeCost: al.ope,
                infraCost: al.infra,
                partnershipCommission: al.commission,
                totalFullyLoadedCost,

                // 22-23 Profitability
                grossProfit,
                grossMargin: cumulativeRevenue > 0 ? (grossProfit / cumulativeRevenue) : 0,

                // Flags
                projectMissingInJira: (proj['Project Status'] === 'Active' && !projectDirectCosts[key]),

                // Legacy Field Compatibility
                revenue: cumulativeRevenue,
                fullyLoadedCost: totalFullyLoadedCost,
                margin: cumulativeRevenue > 0 ? (grossProfit / cumulativeRevenue) : 0
            };
        });
    }

    calculateKPIs(report) {
        const totalRevenue = report.reduce((sum, r) => sum + r.revenue, 0);
        const totalFullyLoaded = report.reduce((sum, r) => sum + r.fullyLoadedCost, 0);
        return {
            totalRevenue,
            totalDirectCost: report.reduce((sum, r) => sum + r.directCost, 0),
            totalFullyLoaded,
            totalProfit: totalRevenue - totalFullyLoaded,
            avgMargin: totalRevenue > 0 ? ((totalRevenue - totalFullyLoaded) / totalRevenue) : 0
        };
    }
}

module.exports = new FinanceEngine();
