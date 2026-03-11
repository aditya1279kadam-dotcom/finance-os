import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessingService } from '../../services/data-processing.service';

@Component({
  selector: 'app-performance-ledger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="overflow-x: auto; border-radius: 12px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; min-width: 2500px;">
            <thead>
                <tr>
                    <th style="position: sticky; left: 0; z-index: 10; background: #f8fafc;">Project</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Project Key</th>
                    <th>Status</th>
                    <th>PO Amount</th>
                    <th>Revenue FY25</th>
                    <th>Revenue FY26</th>
                    <th>Cumulative Revenue</th>
                    <th>Budget To Go</th>
                    <th>Total Signed HR Cost</th>
                    <th>Cost Till Last Quarter</th>
                    <th>Opening Remaining Cost</th>
                    <th>Cost Current Quarter</th>
                    <th>Direct Cost Till Date</th>
                    <th>Closing Remaining Cost</th>
                    <th>HR Overhead</th>
                    <th>OPE Cost</th>
                    <th>Infra Cost</th>
                    <th>Partnership Commission</th>
                    <th>Total Fully Loaded Cost</th>
                    <th>Gross Profit</th>
                    <th>Gross Margin %</th>
                </tr>
            </thead>
            <tbody>
                <tr *ngFor="let row of paginatedData">
                    <td style="position: sticky; left: 0; z-index: 5; background: white; font-weight: 700;">
                        <div style="display:flex; align-items:center;">
                            {{ row.project }}
                            <span *ngIf="row.projectMissingInJira" class="badge-pill" 
                                  style="background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; margin-left: 8px;">
                                Missing Logs
                            </span>
                        </div>
                    </td>
                    <td>{{ row.product }}</td>
                    <td><span class="badge-pill" style="background:#f1f5f9; color:#475569">{{ row.category }}</span></td>
                    <td style="font-family: monospace;">{{ row.projectKey }}</td>
                    <td><span class="badge-pill" [ngClass]="row.projectStatus === 'Active' ? 'bg-emerald' : 'bg-amber'">{{ row.projectStatus }}</span></td>
                    <td style="font-weight: 600;">{{ dataProc.formatCurrency(row.poAmount) }}</td>
                    <td>{{ dataProc.formatCurrency(row.revenueFY25) }}</td>
                    <td>{{ dataProc.formatCurrency(row.revenueFY26) }}</td>
                    <td style="font-weight: 600; color: var(--primary);">{{ dataProc.formatCurrency(row.cumulativeRevenue) }}</td>
                    <td [ngStyle]="{'color': row.budgetToGo < 0 ? '#ef4444' : 'inherit'}">{{ dataProc.formatCurrency(row.budgetToGo) }}</td>
                    <td>{{ dataProc.formatCurrency(row.totalSignedHRCost) }}</td>
                    <td style="color: var(--text-muted)">{{ dataProc.formatCurrency(row.costTillLastQuarter) }}</td>
                    <td>{{ dataProc.formatCurrency(row.openingRemainingSignedHRCost) }}</td>
                    <td>{{ dataProc.formatCurrency(row.costIncurredCurrentQuarter) }}</td>
                    <td style="font-weight: 600;">{{ dataProc.formatCurrency(row.totalDirectCostTillDate) }}</td>
                    <td [ngStyle]="{'color': row.closingRemainingSignedHRCost < 0 ? '#ef4444' : 'inherit'}">{{ dataProc.formatCurrency(row.closingRemainingSignedHRCost) }}</td>
                    <td style="color: var(--text-muted)">{{ dataProc.formatCurrency(row.allocatedHROverhead) }}</td>
                    <td style="color: var(--text-muted)">{{ dataProc.formatCurrency(row.opeCost) }}</td>
                    <td style="color: var(--text-muted)">{{ dataProc.formatCurrency(row.infraCost) }}</td>
                    <td style="color: var(--text-muted)">{{ dataProc.formatCurrency(row.partnershipCommission) }}</td>
                    <td style="font-weight: 700; background: rgba(0,0,0,0.02);">{{ dataProc.formatCurrency(row.totalFullyLoadedCost) }}</td>
                    <td style="font-weight: 800;">{{ dataProc.formatCurrency(row.grossProfit) }}</td>
                    <td><span class="badge-pill" [ngClass]="getMarginClass(row.grossMargin)">{{ (row.grossMargin * 100).toFixed(1) }}%</span></td>
                </tr>
                <tr *ngIf="paginatedData.length === 0">
                    <td colspan="23" style="text-align: center; padding: 32px; color: var(--text-muted);">No records found in this category.</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="pager" *ngIf="data.length > 0">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted)">
            Record {{ ((currentPage - 1) * pageSize) + 1 }} to {{ Math.min(currentPage * pageSize, data.length) }} of {{ data.length }}
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn-ghost" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">Prev</button>
            <button class="btn-ghost" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">Next</button>
        </div>
    </div>
  `,
  styles: ``
})
export class PerformanceLedgerComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() pageSize = 8;

  currentPage = 1;
  paginatedData: any[] = [];
  Math = Math;

  constructor(public dataProc: DataProcessingService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.currentPage = 1;
      this.updatePagination();
    }
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.data.length / this.pageSize));
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  private updatePagination() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedData = this.data.slice(start, end);
  }

  getMarginClass(margin: number) {
    return this.dataProc.getMarginClass(margin);
  }
}
