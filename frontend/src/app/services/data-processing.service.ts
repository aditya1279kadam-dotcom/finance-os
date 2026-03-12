import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {

  // --- NEW WORKFLOW PARSING & VALIDATION ENGINE ---

  async processSyncWorkflow(files: { [key: string]: File | null }) {
    const db: any = {
      projects: {},
      resources: {},
      missingProjects: [],
      missingResources: []
    };

    // 1. Parse Project Master
    if (files['projectMaster']) {
      const masterData = await this.readExcelOrCSV(files['projectMaster']);
      masterData.forEach((row: any) => {
        const key = String(row['Project Key'] || row['Key'] || '').trim().toUpperCase();
        if (key) {
          db.projects[key] = {
            ...row,
            name: row['Project Name'] || row['Name'],
            category: row['Category'] || 'Uncategorized',
            status: row['Status'] || 'Active'
          };
        }
      });
    }

    // 2. Parse Resource List
    if (files['resourceList']) {
      const resData = await this.readExcelOrCSV(files['resourceList']);
      resData.forEach((row: any) => {
        const email = String(row['Email'] || row['User Email'] || row['Name'] || '').trim().toLowerCase();
        if (email) {
          db.resources[email] = {
            ...row,
            name: row['Name'] || row['Resource Name'],
            role: row['Role'] || row['Title'] || 'Consultant'
          };
        }
      });
    }

    // 3. Parse HR Attendance (Timesheet)
    let attendanceData: any[] = [];
    if (files['attendance']) {
      attendanceData = await this.readExcelOrCSV(files['attendance']);

      const uniqueTimesheetEmails = new Set<string>();
      attendanceData.forEach((row: any) => {
        const email = String(row['Email'] || row['User'] || '').trim().toLowerCase();
        if (email) uniqueTimesheetEmails.add(email);
      });

      // Cross-Validate: Find Defaulters (Resources in Attendance but NOT in Resource List)
      uniqueTimesheetEmails.forEach(email => {
        if (!db.resources[email]) {
          db.missingResources.push({
            id: email,
            source: 'HR Attendance',
            reason: 'Resource logged hours but is missing from the authorized Resource Master Sheet.'
          });
        }
      });
    }

    // 4. Parse Financial Dump (P&L)
    let dumpData: any[] = [];
    if (files['dump']) {
      dumpData = await this.readExcelOrCSV(files['dump']);

      const uniqueDumpProjects = new Set<string>();
      dumpData.forEach((row: any) => {
        const key = String(row['Project Key'] || row['Project'] || '').trim().toUpperCase();
        if (key) uniqueDumpProjects.add(key);
      });

      // Cross-Validate: Find Defaulters (Projects in Fin Dump but NOT in Project Master)
      uniqueDumpProjects.forEach(key => {
        if (!db.projects[key]) {
          db.missingProjects.push({
            id: key,
            source: 'Financial Dump',
            reason: 'Financials exist for this Project Key but it is missing from the Project Master Sheet.'
          });
        }
      });
    }

    // Store the processed Unified DB locally for dashboards to consume
    localStorage.setItem('financeos_unified_db', JSON.stringify(db));

    // For backwards compatibility, generate a mock report matching the old Dashboard structures 
    // using the newly mapped data so the other UI components don't break immediately.
    this.generateDerivedReports(db, dumpData);
  }

  private generateDerivedReports(db: any, dumpData: any[]) {
    const legacyReport: any[] = [];
    const usedKeys = Object.keys(db.projects).length > 0 ? Object.keys(db.projects) : ['PRJ-1', 'PRJ-2'];

    usedKeys.forEach(key => {
      const p = db.projects[key] || {};
      // Mocking metrics for POC based on presence in Dump
      const finRow = dumpData.find(d => String(d['Project Key'] || d['Project']).trim().toUpperCase() === key) || {};

      const rev = parseFloat(finRow['Revenue'] || finRow['Total Revenue'] || '100000');
      const cost = parseFloat(finRow['Cost'] || finRow['Total Cost'] || '50000');

      legacyReport.push({
        projectKey: key,
        project: p.name || `Project ${key}`,
        product: p['Product'] || 'Default Product',
        category: p.category || 'Consulting',
        revenue: rev,
        grossProfit: rev - cost,
        grossMargin: rev > 0 ? (rev - cost) / rev : 0,
        fullyLoadedCost: cost + (cost * 0.2), // Adding theoretical overhead
        directCost: cost
      });
    });

    localStorage.setItem('pl_dashboard_results', JSON.stringify({ report: legacyReport, lastRefreshed: new Date().toISOString() }));

    // Mocking Resource Dashboard metrics
    const resReport: any[] = [];
    const usedEmails = Object.keys(db.resources).length > 0 ? Object.keys(db.resources) : ['dev1@example.com', 'dev2@example.com'];

    usedEmails.forEach((email) => {
      const res = db.resources[email] || {};
      resReport.push({
        resourceName: res.name || email,
        projectCode: 'MOCK-101',
        projectName: 'Mocked Project Mapping',
        totalHours: Math.floor(Math.random() * 160) + 40,
        apportionedCost: Math.floor(Math.random() * 5000) + 1000,
        isUnmapped: false
      });
    });
    localStorage.setItem('res_dashboard_results', JSON.stringify({ report: resReport, lastRefreshed: new Date().toISOString() }));
  }

  private readExcelOrCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }


  // --- LEGACY UTILITIES PRESERVED FOR DASHBOARDS ---

  calculateFilteredSummary(report: any[]) {
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

  getCategoryCardsData(report: any[]) {
    const catMap: Record<string, { profit: number, revenue: number }> = {};

    report.forEach(r => {
      if (!catMap[r.category]) catMap[r.category] = { profit: 0, revenue: 0 };
      catMap[r.category].profit += r.grossProfit;
      catMap[r.category].revenue += r.revenue;
    });

    return Object.keys(catMap).map(category => {
      const data = catMap[category];
      const margin = data.revenue > 0 ? (data.profit / data.revenue) : 0;
      return {
        category,
        profit: data.profit,
        margin: margin
      };
    }).sort((a, b) => b.profit - a.profit);
  }

  formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  }

  getMarginClass(margin: number): string {
    if (margin > 0.4) return 'bg-emerald';
    if (margin > 0.2) return 'bg-amber';
    return 'bg-rose';
  }
}
