import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-defaulters-report',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  template: `
    <app-header title="Jira Defaulter's Report" subtitle="Data Governance & Synchronization Exceptions" (toggleSidebar)="toggleSidebar()"></app-header>
    
    <div *ngIf="!db" style="height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="background: rgba(129, 140, 248, 0.1); padding: 40px; border-radius: 24px; border: 1px dashed rgba(129, 140, 248, 0.3);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" style="margin-bottom: 24px;"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path><path d="M16 5V3"></path><path d="M8 5V3"></path><path d="M3 9h18"></path><path d="M20 21l-3-3 3-3"></path><path d="M17 18h4"></path></svg>
            <h2 style="font-weight: 800; margin-bottom: 12px;">No Intelligence Generated Yet</h2>
            <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 32px;">Please go to the Sync Center to upload your data and trigger the validation engine.</p>
            <a href="/" class="btn-gold" style="text-decoration: none; padding: 12px 32px; display: inline-block;">Go to Sync Center</a>
        </div>
    </div>

    <ng-container *ngIf="db">
        <div class="kpi-row">
            <div class="kpi-panel" style="border-color: rgba(239, 68, 68, 0.3);">
                <div class="tag" style="color: #f87171;">Action Required</div>
                <div class="amount">{{ db.missingProjects?.length + db.missingResources?.length }}</div>
                <div class="growth" style="color: #fca5a5;">Total Missing Jira Maps</div>
            </div>
            <div class="kpi-panel">
                <div class="tag">Missing Resources</div>
                <div class="amount">{{ db.missingResources?.length }}</div>
                <div class="growth">From active timesheets</div>
            </div>
            <div class="kpi-panel">
                <div class="tag">Missing Projects</div>
                <div class="amount">{{ db.missingProjects?.length }}</div>
                <div class="growth">With posted financials</div>
            </div>
        </div>

        <div style="margin-top: 32px;" class="data-table-container">
            <div style="padding: 24px; border-bottom: 1px solid var(--border); display: flex; gap: 24px;">
                <button (click)="activeTab = 'resources'" [class]="activeTab === 'resources' ? 'tab-btn active' : 'tab-btn'">
                    Unmapped Resources ({{ db.missingResources?.length }})
                </button>
                <button (click)="activeTab = 'projects'" [class]="activeTab === 'projects' ? 'tab-btn active' : 'tab-btn'">
                    Unmapped Projects ({{ db.missingProjects?.length }})
                </button>
            </div>

            <!-- Missing Resources Table -->
            <div *ngIf="activeTab === 'resources'" style="overflow-x: auto;">
                <table class="compact-table">
                    <thead>
                        <tr>
                            <th>Identified Origin</th>
                            <th>Resource Email / ID</th>
                            <th>Flag Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of db.missingResources">
                            <td><span class="badge-pill margin-warning">{{ item.source }}</span></td>
                            <td style="font-weight: 700;">{{ item.id }}</td>
                            <td style="color: var(--text-muted);">{{ item.reason }}</td>
                        </tr>
                        <tr *ngIf="db.missingResources?.length === 0">
                            <td colspan="3" style="text-align: center; padding: 40px; color: var(--success);">
                                All resources in the timesheet successfully match the Resource Master!
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Missing Projects Table -->
            <div *ngIf="activeTab === 'projects'" style="overflow-x: auto;">
                <table class="compact-table">
                    <thead>
                        <tr>
                            <th>Identified Origin</th>
                            <th>Project Key</th>
                            <th>Flag Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of db.missingProjects">
                            <td><span class="badge-pill margin-danger">{{ item.source }}</span></td>
                            <td style="font-weight: 700;">{{ item.id }}</td>
                            <td style="color: var(--text-muted);">{{ item.reason }}</td>
                        </tr>
                        <tr *ngIf="db.missingProjects?.length === 0">
                            <td colspan="3" style="text-align: center; padding: 40px; color: var(--success);">
                                All financial records successfully match the Project Master!
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </ng-container>
  `,
  styles: [`
    .tab-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        padding-bottom: 8px;
        border-bottom: 2px solid transparent;
    }
    .tab-btn.active {
        color: white;
        border-bottom-color: #818cf8;
    }
  `]
})
export class DefaultersReportComponent implements OnInit {
  db: any = null;
  activeTab: 'resources' | 'projects' = 'resources';

  ngOnInit() {
    this.loadFromCache();
  }

  loadFromCache() {
    const stored = localStorage.getItem('financeos_unified_db');
    if (stored) {
      try {
        this.db = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse cached DB data', e);
      }
    }
  }

  toggleSidebar() {
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  }
}
