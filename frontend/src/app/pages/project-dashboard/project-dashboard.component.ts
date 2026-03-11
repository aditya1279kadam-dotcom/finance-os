import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { FinanceApiService } from '../../services/finance-api.service';
import { DataProcessingService } from '../../services/data-processing.service';
import { CategoryCardComponent } from '../../components/category-card/category-card.component';
import { PerformanceLedgerComponent } from '../../components/performance-ledger/performance-ledger.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, CategoryCardComponent, PerformanceLedgerComponent],
  template: `
    <app-header title="Executive Analytics" subtitle="Enterprise Profitability & Margin Performance Ledger" [lastRefreshed]="data?.lastRefreshed" (toggleSidebar)="toggleSidebar()">
      <button (click)="resetEnvironment()" class="btn-ghost"
              style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2); height: 44px; display: flex; align-items: center; gap: 8px; font-weight: 600;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 6L5 20M5 6l14 14" />
          </svg>
          Reset Environment
      </button>
      <button (click)="exportCSV()" class="btn-gold" style="height: 44px;">Download Report (CSV)</button>
    </app-header>

    <div *ngIf="!data" style="height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="background: rgba(129, 140, 248, 0.1); padding: 40px; border-radius: 24px; border: 1px dashed rgba(129, 140, 248, 0.3);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" style="margin-bottom: 24px;"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path><path d="M16 5V3"></path><path d="M8 5V3"></path><path d="M3 9h18"></path><path d="M20 21l-3-3 3-3"></path><path d="M17 18h4"></path></svg>
            <h2 style="font-weight: 800; margin-bottom: 12px;">No Intelligence Generated Yet</h2>
            <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 32px;">We couldn't find any financial results. Please go to the Sync Center to upload your data and generate intelligence.</p>
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
          <div class="filter-group">
              <label>Category</label>
              <select [(ngModel)]="filters.category" (change)="applyFilters()">
                  <option value="All">All Categories</option>
                  <option *ngFor="let c of categories" [value]="c">{{c}}</option>
              </select>
          </div>
          <div style="flex: 0;">
              <button (click)="resetFilters()" class="btn-ghost" style="padding: 10px 16px;">Reset</button>
          </div>
      </div>

      <!-- KPI Panels -->
      <div class="kpi-row" [style.opacity]="loading ? '0.5' : '1'">
          <div class="kpi-panel">
              <div class="tag">Net Revenue</div>
              <div class="amount">{{ dataProc.formatCurrency(summary.totalRevenue) }}</div>
              <div class="growth" style="color: #10b981;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path d="m18 15-6-6-6 6" />
                  </svg>
                  Portfolio Total
              </div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Fully Loaded Cost</div>
              <div class="amount">{{ dataProc.formatCurrency(summary.totalFullyLoaded) }}</div>
              <div class="growth" style="color: var(--text-muted);">
                  Include Indirect Allocations
              </div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Gross Profit</div>
              <div class="amount">{{ dataProc.formatCurrency(summary.totalProfit) }}</div>
              <div class="growth">Realized Earnings</div>
          </div>
          <div class="kpi-panel">
              <div class="tag">Operating Margin</div>
              <div class="amount">{{ (summary.avgMargin * 100).toFixed(1) }}%</div>
              <div class="growth">
                  <span class="badge-pill" [ngClass]="dataProc.getMarginClass(summary.avgMargin)">Portfolio Average</span>
              </div>
          </div>
      </div>

      <!-- Content Area toggle between Cards & Ledger -->
      <div class="data-table-container" style="margin-top: 24px;" [style.opacity]="loading ? '0.5' : '1'">
          <div style="padding: 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 16px;">
                 <button *ngIf="selectedCategory" (click)="selectedCategory = null" class="btn-ghost" style="padding: 6px 12px; height: auto;">
                    ← Back
                 </button>
                 <h3 style="margin:0; font-weight: 800;">
                    {{ selectedCategory ? 'Performance Ledger: ' + selectedCategory : 'Portfolio Categories' }}
                 </h3>
              </div>
              <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">
                  {{ selectedCategory ? 'Showing project-level profitability' : 'Showing aggregated category profitability' }}
              </div>
          </div>
          
          <div style="padding: 24px;">
              <!-- Category Cards View -->
              <div *ngIf="!selectedCategory" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                  <app-category-card 
                      *ngFor="let card of categoryCards"
                      [category]="card.category"
                      [profit]="card.profit"
                      [margin]="card.margin"
                      (onClick)="openCategory($event)"
                  ></app-category-card>
                  
                  <div *ngIf="categoryCards.length === 0" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    No category data available for the current filters.
                  </div>
              </div>

              <!-- Detailed Ledger View -->
              <div *ngIf="selectedCategory">
                  <app-performance-ledger [data]="filteredLedgerData"></app-performance-ledger>
              </div>
          </div>
      </div>
    </ng-container>
  `,
  styles: ``
})
export class ProjectDashboardComponent implements OnInit {
  data: any = null;
  loading = false;

  categories: string[] = ['Implementation', 'Support', 'Consulting']; // default, overwritten by metadata
  availableMonths: string[] = [];

  filters = {
    year: 'All',
    quarter: 'All',
    month: 'All',
    category: 'All'
  };

  summary: any = {};
  filteredLedgerData: any[] = [];
  categoryCards: any[] = [];

  selectedCategory: string | null = null; // null means show cards

  constructor(
    private api: FinanceApiService,
    public dataProc: DataProcessingService
  ) { }

  async ngOnInit() {
    this.loadFromCache();
    await this.fetchMetadata();
  }

  loadFromCache() {
    const stored = localStorage.getItem('pl_dashboard_results');
    if (stored) {
      try {
        this.data = JSON.parse(stored);
        this.processData();
      } catch (e) {
        console.error('Failed to parse cached data', e);
      }
    }
  }

  async fetchMetadata() {
    try {
      const meta = await this.api.getMetadata();
      if (meta && meta.categories) {
        this.categories = meta.categories;
      }
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    }
  }

  async applyFilters() {
    this.loading = true;
    try {
      // Re-fetch calculations based on server filters (Year, Quarter, Month)
      const newData = await this.api.calculateReport({
        year: this.filters.year,
        quarter: this.filters.quarter,
        month: this.filters.month
      });
      this.data = newData;
      localStorage.setItem('pl_dashboard_results', JSON.stringify(newData));
      this.processData();

      // Ensure if we are inside a category, and we filter and it has no projects, it still works
      if (this.selectedCategory) {
        this.openCategory(this.selectedCategory);
      }
    } catch (err) {
      alert('Failed to calculate report with these filters');
    } finally {
      this.loading = false;
    }
  }

  processData() {
    if (!this.data || !this.data.report) return;

    // Apply Client-Side Category Filter
    let report = this.data.report;
    if (this.filters.category !== 'All') {
      report = report.filter((r: any) => r.category === this.filters.category);
    }

    this.summary = this.dataProc.calculateFilteredSummary(report);
    // Feed the cards data the unfiltered global report if we want to see all categories?
    // Instruction didn't specify, but usually if global filter is set to Category X, you only see Card X.
    this.categoryCards = this.dataProc.getCategoryCardsData(report);
    this.filteredLedgerData = report; // used if we skip cards
  }

  openCategory(categoryName: string) {
    this.selectedCategory = categoryName;
    // Further filter the already processed report by this specific category 
    // (useful if global filter is All, but we clicked a specific card)
    let baseReport = this.data.report;
    if (this.filters.category !== 'All') {
      baseReport = baseReport.filter((r: any) => r.category === this.filters.category);
    }
    this.filteredLedgerData = baseReport.filter((r: any) => r.category === categoryName);
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
    this.filters = { year: 'All', quarter: 'All', month: 'All', category: 'All' };
    this.availableMonths = [];
    this.applyFilters();
  }

  async resetEnvironment() {
    if (confirm('Are you sure you want to clear all data? This will reset the state on the server.')) {
      try {
        await fetch(`${environment.apiUrl}/api/clear-data`, { method: 'POST' }); // Using plain fetch for quick clear
        localStorage.removeItem('pl_dashboard_results');
        localStorage.removeItem('res_dashboard_results');
        alert('Data cleared successfully.');
        window.location.href = '/';
      } catch (err: any) {
        alert('Clear failed: ' + err.message);
      }
    }
  }

  exportCSV() {
    if (!this.data) return;
    const res = this.data;

    const headers = [
      "Project", "Product", "Category", "Project Key", "Status",
      "PO Amount", "Revenue FY25", "Revenue FY26", "Cumulative Revenue", "Budget To Go",
      "Total Signed HR Cost", "Cost Till Last Quarter", "Opening Remaining Cost",
      "Cost Current Quarter", "Direct Cost Till Date", "Closing Remaining Cost",
      "HR Overhead", "OPE Cost", "Infra Cost", "Partnership Commission",
      "Total Fully Loaded Cost", "Gross Profit", "Gross Margin %"
    ];

    let csv = headers.join(',') + '\n';

    // Export the data visible on screen based on card or filters
    const exportData = this.selectedCategory ? this.filteredLedgerData : this.data.report.filter((r: any) => this.filters.category === 'All' || r.category === this.filters.category);

    exportData.forEach((row: any) => {
      const values = [
        row.project, row.product, row.category, row.projectKey, row.projectStatus,
        row.poAmount, row.revenueFY25, row.revenueFY26, row.cumulativeRevenue, row.budgetToGo,
        row.totalSignedHRCost, row.costTillLastQuarter, row.openingRemainingSignedHRCost,
        row.costIncurredCurrentQuarter, row.totalDirectCostTillDate, row.closingRemainingSignedHRCost,
        row.allocatedHROverhead, row.opeCost, row.infraCost, row.partnershipCommission,
        row.totalFullyLoadedCost, row.grossProfit, (row.grossMargin * 100).toFixed(2) + '%'
      ];
      csv += values.map((v: any) => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinanceOS_Executive_P&L_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  toggleSidebar() {
    const event = new CustomEvent('toggleSidebar');
    window.dispatchEvent(event);
  }
}
