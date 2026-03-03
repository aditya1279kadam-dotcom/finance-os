/**
 * Finance Engine (Backend Version)
 */

class FinanceEngine {
    constructor() {}

    process(data) {
        const { jiraDump = [], rateCard = [], resourceList = [], projectMaster = [], overheadPool = [] } = data;
        
        // 1. Process project keys and hourly rates
        const processedJira = this.processJiraDump(jiraDump, rateCard, resourceList);
        
        // 2. Aggregate Direct Cost by Project Key
        const projectDirectCosts = this.aggregateDirectCosts(processedJira);
        
        // 3. Calculate Indirect Cost Allocation
        const totalDirectCost = Object.values(projectDirectCosts).reduce((sum, cost) => sum + cost, 0);
        const allocations = this.calculateAllocations(projectDirectCosts, totalDirectCost, overheadPool);

        // 4. Generate Final Project Report
        const report = this.generateReport(projectMaster, projectDirectCosts, allocations);

        return {
            report,
            summary: this.calculateKPIs(report),
            processedJira
        };
    }

    processJiraDump(jiraDump, rateCard, resourceList) {
        const rateMap = new Map(rateCard.map(r => [r['Jira Name'] || r['Name'], parseFloat(r['Monthly Salary'] || 0)]));
        const resourceMap = new Map(resourceList.map(r => [r['Jira Name'] || r['Name'], r]));

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
            const requiredHours = resource ? parseFloat(resource['Required Hours (Formula)'] || 176) : 176;
            
            let cappedHours = timeSpent;
            if (authorTotalHours[author] > requiredHours) {
                cappedHours = (timeSpent / authorTotalHours[author]) * requiredHours;
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

    calculateAllocations(projectDirectCosts, totalDirectCost, overheadPool) {
        const pool = overheadPool[0] || { 'HR Overhead Total': 0, 'Infra Total': 0, 'OPE Total': 0, 'Commission Total': 0 };
        const allocations = {};
        Object.keys(projectDirectCosts).forEach(key => {
            const share = totalDirectCost > 0 ? projectDirectCosts[key] / totalDirectCost : 0;
            allocations[key] = {
                hr: share * (parseFloat(pool['HR Overhead Total']) || 0),
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
