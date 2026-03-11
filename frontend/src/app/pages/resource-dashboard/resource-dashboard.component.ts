import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { FinanceApiService } from '../../services/finance-api.service';
import { DataProcessingService } from '../../services/data-processing.service';

@Component({
  selector: 'app-resource-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
    <app-header title="Resource Analytics" subtitle="Timesheet & Cost Allocation Performance" [lastRefreshed]="data?.lastRefreshed" (toggleSidebar)="toggleSidebar()">
      <button (click)="exportCSV()" class="btn-gold" style="height: 44px;">Download Report (CSV)</button>
    </app-header>

    <div *ngIf="!data" style="height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="background: rgba(129, 140, 248, 0.1); padding: 40px; border-radius: 24px; border: 1px dashed rgba(129, 140, 248, 0.3);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" style="margin-bottom: 24px;"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path><path d="M16 5V3"></path><path d="M8 5V3"></path><path d="M3 9h18"></path><path d="M20 21l-3-3 3-3"></path><path d="M17 18h4"></path></svg>
            <h2 style="font-weight: 800; margin-bottom: 12px;">No Resource Intelligence</h2>
            <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 32px;">We couldn't find any resource timesheet results. Please go to the Sync Center to upload your timesheet extracts.</p>
            <a href="/" class="btn-gold" style="text-decoration: none; padding: 12px 32px; display: inline-block;">Go to Sync Center</a>
        </div>
    </div>

    <ng-container *ngIf="data">
      <!-- Dynamic Filter Bar -->
      <div class="filter-bar" [style.opacity]="loading ? '0.5' : '1'">
          <div class="filter-group">
              <label>Financial Year</label>
              <select [(ngModel)]="filters.year" (change)="applyFilters()">
                  <option value="All">All Years</option>
                  <option value="FY25">FY 2024-25</option>
                  <option value="FY26">FY 2025-26</option>
              </select>
          </div>
          <div class="filter-group">
              <label>Quarter</label>
              <select [(ngModel)]="filters.quarter" (change)="onQuarterChange()">
                  <option value="All">All Quarters</option>
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
              </select>
          </div>
          <div class="filter-group">
              <label>Month</label>
              <select [(ngModel)]="filters.month" (change)="applyFilters()">
                  <option value="All">All Months</option>
                  <option *ngFor="let m of availableMonths" [value]="m">{{m}}</option>
              </select>
          </div>
          <div style="flex: 0;">
              <button (click)="resetFilters()" class="btn-ghost" style="padding: 10px 16px;">Reset</button>
          </div>
      </div>

      <!-- KPI Panels -->
      <div class="kpi-row" [style.opacity]="loading ? '0.5' : '1'">
          <div class="kpi-panel">
              <div class="tag">Total Mapped Resources</div>
              <div class="amount">{{ summary.totalResources }}</div>
              <div class="growth" style="color: #10b981;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Headcount
              </div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Timesheet Hours Driven</div>
              <div class="amount">{{ summary.totalHours }}</div>
              <div class="growth" style="color: var(--text-muted);">
                  Productive time
              </div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Direct Salary Cost Allocated</div>
              <div class="amount">{{ dataProc.formatCurrency(summary.totalCost) }}</div>
              <div class="growth">Financial Impact</div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Utilization Benchmark</div>
              <div class="amount">Tracking</div>
              <div class="growth">
                  <span class="badge-pill bg-emerald">Healthy</span>
              </div>
          </div>
      </div>

      <div class="data-table-container" style="margin-top: 24px;" [style.opacity]="loading ? '0.5' : '1'">
          <div style="padding: 24px; border-bottom: 1px solid var(--border); border-top-left-radius: 12px; border-top-right-radius: 12px; background: white;">
              <h3 style="margin:0; font-weight: 800;">Resource Extraction Ledger</h3>
          </div>
          <div style="overflow-x: auto; border-radius: 0 0 12px 12px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1000px;">
                  <thead>
                      <tr>
                          <th style="position: sticky; left: 0; z-index: 10; background: #f8fafc;">Resource Name</th>
                          <th>Project Code</th>
                          <th>Mapped Project Name</th>
                          <th>Total Hours</th>
                          <th>Calculated Apportioned Cost</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr *ngFor="let row of paginatedData">
                          <td style="position: sticky; left: 0; z-index: 5; background: white; font-weight: 700;">
                               {{ row.resourceName }}
                          </td>
                          <td style="font-family: monospace;">{{ row.projectCode }}</td>
                          <td>
                              {{ row.projectName || 'Unmapped / Overhead' }}
                              <span *ngIf="row.isUnmapped" class="badge-pill" style="background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; margin-left: 8px;">
                                 No P&L Project
                              </span>
                          </td>
                          <td style="font-weight: 600;">{{ row.totalHours }}h</td>
                          <td style="font-weight: 800; color: var(--primary);">{{ dataProc.formatCurrency(row.apportionedCost) }}</td>
                      </tr>
                      <tr *ngIf="paginatedData.length === 0">
                          <td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No resource records matched.</td>
                      </tr>
                  </tbody>
              </table>
          </div>
          <div class="pager" *ngIf="data.report?.length > 0">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted)">
                  Record {{ ((currentPage - 1) * pageSize) + 1 }} to {{ Math.min(currentPage * pageSize, data.report.length) }} of {{ data.report.length }}
              </div>
              <div style="display: flex; gap: 8px;">
                  <button class="btn-ghost" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">Prev</button>
                  <button class="btn-ghost" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">Next</button>
              </div>
          </div>
      </div>
    </ng-container>
  `,
  styles: ``
})
export class ResourceDashboardComponent implements OnInit {
  data: any = null;
  loading = false;
  Math = Math;

  availableMonths: string[] = [];

  filters = {
    year: 'All',
    quarter: 'All',
    month: 'All'
  };

  summary: any = {
    totalResources: 0,
    totalHours: 0,
    totalCost: 0
  };

  paginatedData: any[] = [];
  currentPage = 1;
  pageSize = 10;

  constructor(private api: FinanceApiService, public dataProc: DataProcessingService) { }

  ngOnInit() {
    this.loadFromCache();
  }

  loadFromCache() {
    const stored = localStorage.getItem('res_dashboard_results');
    if (stored) {
      try {
        this.data = JSON.parse(stored);
        this.processData();
      } catch (e) {
        console.error('Failed to parse cached data', e);
      }
    }
  }

  get totalPages() {
    return this.data?.report ? Math.max(1, Math.ceil(this.data.report.length / this.pageSize)) : 1;
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  private updatePagination() {
    if (!this.data?.report) return;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedData = this.data.report.slice(start, end);
  }

  async applyFilters() {
    this.loading = true;
    try {
      const newData = await this.api.calculateResourceReport({
        year: this.filters.year,
        quarter: this.filters.quarter,
        month: this.filters.month
      });
      this.data = newData;
      localStorage.setItem('res_dashboard_results', JSON.stringify(newData));
      this.currentPage = 1;
      this.processData();
    } catch (err) {
      alert('Failed to calculate resource report with these filters');
    } finally {
      this.loading = false;
    }
  }

  processData() {
    if (!this.data || !this.data.report) return;

    // Calculate dynamic summarization
    const uniqueRes = new Set(this.data.report.map((r: any) => r.resourceName));
    this.summary.totalResources = uniqueRes.size;
    this.summary.totalHours = this.data.report.reduce((sum: number, r: any) => sum + r.totalHours, 0);
    this.summary.totalCost = this.data.report.reduce((sum: number, r: any) => sum + r.apportionedCost, 0);

    this.updatePagination();
  }

  onQuarterChange() {
    const qMap: any = {
      'Q1': ['Apr', 'May', 'Jun'],
      'Q2': ['Jul', 'Aug', 'Sep'],
      'Q3': ['Oct', 'Nov', 'Dec'],
      'Q4': ['Jan', 'Feb', 'Mar']
    };
    this.availableMonths = qMap[this.filters.quarter] || [];
    this.filters.month = 'All';
    this.applyFilters();
  }

  resetFilters() {
    this.filters = { year: 'All', quarter: 'All', month: 'All' };
    this.availableMonths = [];
    this.applyFilters();
  }

  exportCSV() {
    if (!this.data || !this.data.report) return;

    const headers = [
      "Resource Name", "Project Code", "Mapped Project Name", "Total Hours", "Apportioned Cost"
    ];

    let csv = headers.join(',') + '\n';

    this.data.report.forEach((row: any) => {
      const values = [
        row.resourceName, row.projectCode, row.projectName || 'Unmapped',
        row.totalHours, row.apportionedCost
      ];
      csv += values.map((v: any) => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinanceOS_Resource_Extract_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  toggleSidebar() {
    const event = new CustomEvent('toggleSidebar');
    window.dispatchEvent(event);
  }
}
