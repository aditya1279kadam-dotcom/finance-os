/**
 * Financial Engine - Mandatory Logic Implementation
 */

class FinanceEngine {
    constructor() {
        this.results = null;
    }

    /**
     * Process all uploaded data
     */
    process(data) {
        const { jiraDump, rateCard, resourceList, projectMaster, overheadPool } = data;
        
        // 1. Process project keys and hourly rates in Jira Dump
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
        // Map rates and resource capacity
        const rateMap = new Map(rateCard.map(r => [r['Jira Name'] || r['Name'], parseFloat(r['Monthly Salary'] || 0)]));
        const resourceMap = new Map(resourceList.map(r => [r['Jira Name'] || r['Name'], r]));

        // Calculate Total Jira Hours per author for capping
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

            // Capacity Capping Logic
            const resource = resourceMap.get(author);
            const requiredHours = resource ? parseFloat(resource['Required Hours (Formula)'] || 176) : 176;
            
            let cappedHours = timeSpent;
            if (authorTotalHours[author] > requiredHours) {
                cappedHours = (timeSpent / authorTotalHours[author]) * requiredHours;
            }

            const rowCost = cappedHours * hourlyRate;

            return {
                ...row,
                projectKey,
                hourlyRate,
                cappedHours,
                rowCost
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
        const pool = overheadPool[0] || { 
            'HR Overhead Total': 0, 
            'Infra Total': 0, 
            'OPE Total': 0, 
            'Commission Total': 0 
        };

        const allocations = {};
        Object.keys(projectDirectCosts).forEach(key => {
            const directCost = projectDirectCosts[key];
            const share = totalDirectCost > 0 ? directCost / totalDirectCost : 0;

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
            // Note: In real logic, we match by the extracted key from Jira
            // Let's assume 'Client Code' in Master matches the prefix in Jira Issue
            const directCost = projectDirectCosts[key] || 0;
            const allocation = allocations[key] || { hr: 0, infra: 0, ope: 0, commission: 0 };
            
            const fullyLoadedCost = directCost + allocation.hr + allocation.infra + allocation.ope + allocation.commission;
            const revFY25 = parseFloat(proj['Revenue FY25'] || 0);
            const revFY26 = parseFloat(proj['Revenue FY26'] || 0);
            const cumulativeRevenue = revFY25 + revFY26;
            const grossProfit = cumulativeRevenue - fullyLoadedCost;
            const margin = cumulativeRevenue > 0 ? (grossProfit / cumulativeRevenue) : 0;

            return {
                project: proj['Customer Name'] || proj['Project'],
                product: proj['Product'],
                category: proj['Category'],
                poAmount: parseFloat(proj['PO Amount'] || 0),
                revenue: cumulativeRevenue,
                directCost,
                indirectCost: allocation.hr + allocation.infra + allocation.ope + allocation.commission,
                fullyLoadedCost,
                grossProfit,
                margin,
                budgetToGo: parseFloat(proj['PO Amount'] || 0) - cumulativeRevenue,
                hrRemaining: parseFloat(proj['Total Signed HR Cost'] || 0) - directCost
            };
        });
    }

    calculateKPIs(report) {
        const totalRevenue = report.reduce((sum, r) => sum + r.revenue, 0);
        const totalDirectCost = report.reduce((sum, r) => sum + r.directCost, 0);
        const totalFullyLoaded = report.reduce((sum, r) => sum + r.fullyLoadedCost, 0);
        const totalProfit = totalRevenue - totalFullyLoaded;
        const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) : 0;

        return {
            totalRevenue,
            totalDirectCost,
            totalFullyLoaded,
            totalProfit,
            avgMargin
        };
    }
}

// Export for use in processor
window.FinanceEngine = FinanceEngine;
