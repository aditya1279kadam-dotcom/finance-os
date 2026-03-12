import { Component, Output, EventEmitter, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { DataProcessingService } from '../../services/data-processing.service';
import { FinanceApiService } from '../../services/finance-api.service';

@Component({
    selector: 'app-sync-center',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent],
    template: `
    <app-header title="Data Center" subtitle="Automated Data Ingestion & Health Checks" (toggleSidebar)="toggleSidebar.emit()"></app-header>
    
    <div class="kpi-row" style="margin-top: 24px;">
      <div class="kpi-panel">
        <div class="tag">Local Cache Status</div>
        <div class="amount" [ngStyle]="{'color': hasCachedData ? '#10b981' : '#f59e0b' }">{{ hasCachedData ? 'Active' : 'Empty' }}</div>
        <div class="growth">Dashboard Engine</div>
      </div>
      <div class="kpi-panel">
        <div class="tag">Projects Tracked</div>
        <div class="amount">{{ stats.projects }}</div>
        <div class="growth">In current dataset</div>
      </div>
      <div class="kpi-panel">
        <div class="tag">Resources Tracked</div>
        <div class="amount">{{ stats.resources }}</div>
        <div class="growth">In current dataset</div>
      </div>
      <div class="kpi-panel" [ngStyle]="{'background': stats.defaulters > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 'border-color': stats.defaulters > 0 ? '#ef4444' : '#10b981' }">
        <div class="tag">Action Required</div>
        <div class="amount" [ngStyle]="{'color': stats.defaulters > 0 ? '#ef4444' : '#10b981' }">
            {{ stats.defaulters }}
            <svg *ngIf="stats.defaulters > 0" width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" style="margin-left: 8px; vertical-align: middle;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <svg *ngIf="stats.defaulters === 0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" style="margin-left: 8px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="growth" style="display: flex; justify-content: space-between; align-items: center;">
            Mapping Issues 
            <button *ngIf="stats.defaulters > 0" (click)="downloadActionRequired()" class="mini-btn">Excel</button>
        </div>
      </div>
      <div class="kpi-panel">
        <div class="tag">Jira Defaulter's</div>
        <div class="amount" style="color: #f59e0b;">{{ stats.jiraDefaultersCount || 0 }}</div>
        <div class="growth" style="display: flex; justify-content: space-between; align-items: center;">
            Missing Hours
            <button (click)="downloadJiraDefaulters()" class="mini-btn" style="border-color: #f59e0b; color: #f59e0b;">Excel</button>
        </div>
      </div>
    </div>

    <!-- Main Upload Grid -->
    <div class="charts-layout" style="margin-top: 32px;">
        <div class="card" style="grid-column: span 2;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3><svg width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" viewBox="0 0 24 24" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Ingestion Workflows</h3>
                <button (click)="triggerGenerateGate()" class="btn-gold" [disabled]="processing" style="padding: 12px 24px;">
                     {{ processing ? 'Processing Data...' : 'Generate Dashboard Reports & Validate Data' }}
                </button>
            </div>
            
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 32px;">
                Upload the required CSV or Excel datasets into the browser memory. Once all required files are staged, click the Generate button to cross-validate maps and build the Executive Dashboards.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
                
                <!-- 1. Jira Dump (CSV or API Toggle) -->
                <div class="glass-panel jira-panel" style="margin: 0; grid-column: 1 / -1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <h4 style="margin: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            1. Jira Dump
                            <span *ngIf="files['dump'] || jiraExtractComplete" class="status-dot active"></span>
                        </h4>
                        <div class="mode-toggle">
                            <button [class.active]="jiraDumpMode === 'csv'" (click)="jiraDumpMode = 'csv'; resetJiraState()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                CSV Upload
                            </button>
                            <button [class.active]="jiraDumpMode === 'api'" (click)="jiraDumpMode = 'api'; resetJiraState()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                JIRA API
                            </button>
                        </div>
                    </div>

                    <!-- CSV Mode -->
                    <div *ngIf="jiraDumpMode === 'csv'" style="margin-top: 16px;">
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Upload Jira worklog export as CSV or Excel.</p>
                        <input type="file" (change)="onFileSelected($event, 'dump')" accept=".csv, .xlsx, .xls" class="file-input">
                    </div>

                    <!-- API Mode -->
                    <div *ngIf="jiraDumpMode === 'api'" style="margin-top: 16px;">
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Connect directly to your JIRA instance and extract worklogs via REST API.</p>
                        
                        <div class="jira-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>JIRA URL</label>
                                    <input type="text" [(ngModel)]="jiraConfig.jiraUrl" placeholder="https://your-domain.atlassian.net" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" [(ngModel)]="jiraConfig.email" placeholder="your-email@example.com" class="form-input">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>API Token</label>
                                    <input type="password" [(ngModel)]="jiraConfig.apiToken" placeholder="Your Atlassian API token" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label>Days Back</label>
                                    <input type="number" [(ngModel)]="jiraConfig.daysBack" min="1" max="365" class="form-input">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex: 1;">
                                    <label>JQL Query <span style="color: var(--text-muted); font-weight: 400;">(auto-generated from days, or customize)</span></label>
                                    <input type="text" [ngModel]="effectiveJql" (ngModelChange)="jiraConfig.customJql = $event" placeholder="worklogDate >= -30d" class="form-input">
                                </div>
                            </div>

                            <div class="jira-actions">
                                <button (click)="testJiraConnection()" [disabled]="jiraExtracting || jiraTesting" class="btn-outline">
                                    {{ jiraTesting ? '⏳ Testing...' : '🔗 Test Connection' }}
                                </button>
                                <button (click)="extractJiraWorklogs()" [disabled]="jiraExtracting || jiraTesting" class="btn-primary-jira">
                                    {{ jiraExtracting ? '⏳ Extracting...' : '🚀 Extract Worklogs' }}
                                </button>
                                <button *ngIf="jiraExtractComplete" (click)="downloadJiraCsv()" class="btn-outline" style="margin-left: auto; border-color: #10b981; color: #10b981;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                                    Download CSV
                                </button>
                            </div>
                        </div>

                        <!-- Status Messages -->
                        <div *ngIf="jiraStatusMessage" class="jira-status" [class.success]="jiraStatusType === 'success'" [class.error]="jiraStatusType === 'error'" [class.info]="jiraStatusType === 'info'">
                            {{ jiraStatusMessage }}
                        </div>

                        <!-- Progress Bar -->
                        <div *ngIf="jiraExtracting || jiraExtractComplete" class="jira-progress-container">
                            <div class="progress-header">
                                <span class="progress-label">{{ jiraProgressStatus }}</span>
                                <span class="progress-percent">{{ jiraProgressPercent }}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" [style.width.%]="jiraProgressPercent" [class.complete]="jiraExtractComplete"></div>
                            </div>
                            <div class="progress-details" *ngIf="jiraExtracting">
                                <span *ngIf="jiraCurrentIssue">Current: <strong>{{ jiraCurrentIssue }}</strong></span>
                                <span *ngIf="jiraEta">ETA: <strong>{{ jiraEta }}</strong></span>
                                <span *ngIf="jiraRowsExtracted > 0">Rows: <strong>{{ jiraRowsExtracted }}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Resource List -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        2. Resource List
                        <span *ngIf="files['resourceList']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Jira mapped list of legitimate resources.</p>
                    <input type="file" (change)="onFileSelected($event, 'resourceList')" accept=".csv, .xlsx, .xls" class="file-input">
                </div>

                <!-- 3. Project Master Sheet -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        3. Project Master Sheet
                        <span *ngIf="files['projectMaster']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Master catalog of all active and Jira mapped projects.</p>
                    <input type="file" (change)="onFileSelected($event, 'projectMaster')" accept=".csv, .xlsx, .xls" class="file-input">
                </div>

                <!-- 4. Rate Card -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        4. Rate Card
                        <span *ngIf="files['rateCard']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Costing metrics specific to bands and regions.</p>
                    <input type="file" (change)="onFileSelected($event, 'rateCard')" accept=".csv, .xlsx, .xls" class="file-input">
                </div>

                <!-- 5. Other Overhead Cost -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        5. Other Overhead Cost
                        <span *ngIf="files['overhead']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Indirect allocations (HR, Admin, Infra).</p>
                    <input type="file" (change)="onFileSelected($event, 'overhead')" accept=".csv, .xlsx, .xls" class="file-input">
                </div>

                <!-- 6. HR Attendance -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        6. HR / Timesheet Data
                        <span *ngIf="files['attendance']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Logged hours and utilization per resource.</p>
                    <input type="file" (change)="onFileSelected($event, 'attendance')" accept=".csv, .xlsx, .xls" class="file-input">
                </div>

            </div>
        </div>
    </div>

    <!-- VERIFICATION MODAL -->
    <div *ngIf="showVerificationModal" class="modal-overlay">
        <div class="modal-card">
            <h3 style="margin-top: 0; color: #4f46e5; border-bottom: 2px solid #f3f4f6; padding-bottom: 16px;">Pre-Report Verification</h3>
            <p style="margin: 20px 0; color: var(--text-primary); font-weight: 500;">
                Please confirm the following updates have been completed before generating the report:
            </p>
            
            <div class="checklist">
                <div class="check-item" style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="check1" [(ngModel)]="verificationState.projectsUpdated" style="width: 18px; height: 18px; cursor: pointer;">
                    <label for="check1" style="cursor: pointer; font-size: 0.95rem;">Closed projects status updated?</label>
                </div>
                <div class="check-item" style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="check2" [(ngModel)]="verificationState.employeesUpdated" style="width: 18px; height: 18px; cursor: pointer;">
                    <label for="check2" style="cursor: pointer; font-size: 0.95rem;">Recent Employee Joinings/Exits accounted for?</label>
                </div>
                <div class="check-item" style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="check3" [(ngModel)]="verificationState.revenueUpdated" style="width: 18px; height: 18px; cursor: pointer;">
                    <label for="check3" style="cursor: pointer; font-size: 0.95rem;">MoM Revenue data updated?</label>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                <button (click)="showVerificationModal = false" class="btn-outline">Cancel</button>
                <button (click)="confirmAndGenerate()" [disabled]="!isVerified" class="btn-primary-jira">Acknowledge & Generate</button>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .file-input {
        width: 100%;
        background: rgba(0,0,0,0.2);
        padding: 10px;
        border-radius: 8px;
        border: 1px dashed var(--border);
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
        box-sizing: border-box;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease-out;
    }

    .modal-card {
        background: white;
        padding: 32px;
        border-radius: 16px;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--border);
    }

    .checklist {
        background: #f8fafc;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }

    /* Mini Button for KPI exports */
    .mini-btn {
        padding: 2px 8px;
        font-size: 0.7rem;
        border-radius: 4px;
        border: 1px solid #ef4444;
        background: transparent;
        color: #ef4444;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        text-transform: uppercase;
    }
    .mini-btn:hover {
        background: rgba(239, 68, 68, 0.1);
    }

    /* Jira Panel - Wider */
    .jira-panel {
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(129, 140, 248, 0.04));
        border: 1px solid rgba(79, 70, 229, 0.15);
    }

    /* Mode Toggle */
    .mode-toggle {
        display: flex;
        gap: 0;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 8px;
        padding: 3px;
    }
    .mode-toggle button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', sans-serif;
    }
    .mode-toggle button.active {
        background: white;
        color: #4f46e5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        font-weight: 600;
    }
    .mode-toggle button:hover:not(.active) {
        color: var(--text-primary);
    }

    /* Jira Form */
    .jira-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .form-row {
        display: flex;
        gap: 14px;
    }
    .form-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .form-group label {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .form-input {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.03);
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        font-size: 0.88rem;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }
    .form-input:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    /* Jira Actions */
    .jira-actions {
        display: flex;
        gap: 12px;
        margin-top: 4px;
    }
    .btn-outline {
        padding: 9px 18px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: transparent;
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-outline:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.04);
        border-color: #4f46e5;
    }
    .btn-outline:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .btn-primary-jira {
        padding: 9px 20px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: white;
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }
    .btn-primary-jira:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }
    .btn-primary-jira:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    /* Status Message */
    .jira-status {
        margin-top: 14px;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .jira-status.success {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .jira-status.error {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .jira-status.info {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        border: 1px solid rgba(59, 130, 246, 0.2);
    }

    /* Progress Bar */
    .jira-progress-container {
        margin-top: 16px;
        padding: 14px 16px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 10px;
        border: 1px solid var(--border);
    }
    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    .progress-label {
        font-size: 0.82rem;
        color: var(--text-primary);
        font-weight: 500;
    }
    .progress-percent {
        font-size: 0.85rem;
        font-weight: 700;
        color: #4f46e5;
    }
    .progress-bar-bg {
        width: 100%;
        height: 8px;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 4px;
        overflow: hidden;
    }
    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4f46e5, #818cf8);
        border-radius: 4px;
        transition: width 0.4s ease;
    }
    .progress-bar-fill.complete {
        background: linear-gradient(90deg, #059669, #10b981);
    }
    .progress-details {
        display: flex;
        gap: 20px;
        margin-top: 10px;
        font-size: 0.8rem;
        color: var(--text-muted);
    }
    .progress-details strong {
        color: var(--text-primary);
    }

    @media (max-width: 768px) {
        .form-row {
            flex-direction: column;
        }
        .jira-actions {
            flex-direction: column;
        }
    }
    `]
})
export class SyncCenterComponent implements OnDestroy {
    @Output() toggleSidebar = new EventEmitter<void>();

    hasCachedData = false;
    processing = false;

    stats = {
        projects: 0,
        resources: 0,
        defaulters: 0,
        jiraDefaultersCount: 0
    };

    // Pre-Report Gate Modal
    showVerificationModal = false;
    verificationState = {
        projectsUpdated: false,
        employeesUpdated: false,
        revenueUpdated: false
    };

    get isVerified(): boolean {
        return this.verificationState.projectsUpdated && 
               this.verificationState.employeesUpdated && 
               this.verificationState.revenueUpdated;
    }

    // Staging area for selected files before generation
    files: { [key: string]: File | null } = {
        dump: null,
        resourceList: null,
        projectMaster: null,
        rateCard: null,
        overhead: null,
        attendance: null
    };

    // JIRA API Mode
    jiraDumpMode: 'csv' | 'api' = 'csv';

    jiraConfig = {
        jiraUrl: 'https://careedge.atlassian.net',
        email: 'aditya.kadam@careedge.in',
        apiToken: '',
        daysBack: 30,
        customJql: ''
    };

    // JIRA state
    jiraTesting = false;
    jiraExtracting = false;
    jiraExtractComplete = false;
    jiraStatusMessage = '';
    jiraStatusType: 'success' | 'error' | 'info' = 'info';
    jiraProgressPercent = 0;
    jiraProgressStatus = '';
    jiraCurrentIssue = '';
    jiraEta = '';
    jiraRowsExtracted = 0;

    private eventSource: EventSource | null = null;

    constructor(
        private dataProc: DataProcessingService,
        private financeApi: FinanceApiService,
        private ngZone: NgZone
    ) {
        this.checkCacheStatus();
    }

    ngOnDestroy() {
        this.closeEventSource();
    }

    get effectiveJql(): string {
        return this.jiraConfig.customJql || `worklogDate >= -${this.jiraConfig.daysBack}d`;
    }

    resetJiraState() {
        this.jiraStatusMessage = '';
        this.jiraExtractComplete = false;
        this.jiraProgressPercent = 0;
        this.jiraProgressStatus = '';
        this.jiraCurrentIssue = '';
        this.jiraEta = '';
        this.jiraRowsExtracted = 0;
        this.closeEventSource();
    }

    private closeEventSource() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    async checkCacheStatus() {
        // Local state check
        const stored = localStorage.getItem('financeos_unified_db');
        if (stored) {
            this.hasCachedData = true;
        }

        // Sync with Backend health
        try {
            const health = await this.financeApi.getSyncHealth();
            this.stats.projects = health.projectsCount || 0;
            this.stats.resources = health.resourcesCount || 0;
            this.stats.defaulters = health.actionRequiredCount || 0;
            this.stats.jiraDefaultersCount = health.jiraDefaultersCount || 0;
        } catch (e) {
            console.error("Failed to fetch backend health stats", e);
        }
    }

    onFileSelected(event: any, type: string) {
        const file = event.target.files[0];
        if (file) {
            this.files[type] = file;
        } else {
            this.files[type] = null;
        }
    }

    async testJiraConnection() {
        if (!this.jiraConfig.jiraUrl || !this.jiraConfig.email || !this.jiraConfig.apiToken) {
            this.jiraStatusMessage = 'Please fill in JIRA URL, Email, and API Token.';
            this.jiraStatusType = 'error';
            return;
        }

        this.jiraTesting = true;
        this.jiraStatusMessage = '';

        try {
            const result = await this.financeApi.testJiraConnection({
                jiraUrl: this.jiraConfig.jiraUrl,
                email: this.jiraConfig.email,
                apiToken: this.jiraConfig.apiToken
            });
            this.jiraStatusMessage = `✅ Connected as ${result.user} (${result.email}). Found ${result.projectCount} projects.`;
            this.jiraStatusType = 'success';
        } catch (err: any) {
            this.jiraStatusMessage = `❌ ${err.error?.error || err.message || 'Connection failed'}`;
            this.jiraStatusType = 'error';
        } finally {
            this.jiraTesting = false;
        }
    }

    extractJiraWorklogs() {
        if (!this.jiraConfig.jiraUrl || !this.jiraConfig.email || !this.jiraConfig.apiToken) {
            this.jiraStatusMessage = 'Please fill in all JIRA credentials before extracting.';
            this.jiraStatusType = 'error';
            return;
        }

        this.jiraExtracting = true;
        this.jiraExtractComplete = false;
        this.jiraProgressPercent = 0;
        this.jiraProgressStatus = 'Connecting to JIRA...';
        this.jiraCurrentIssue = '';
        this.jiraEta = '';
        this.jiraRowsExtracted = 0;
        this.jiraStatusMessage = '';
        this.closeEventSource();

        const url = this.financeApi.getJiraExtractUrl();
        const body = {
            jiraUrl: this.jiraConfig.jiraUrl,
            email: this.jiraConfig.email,
            apiToken: this.jiraConfig.apiToken,
            jql: this.effectiveJql
        };

        // Use fetch with ReadableStream for SSE over POST
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(response => {
            if (!response.ok || !response.body) {
                throw new Error('Failed to connect to extraction endpoint');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const readChunk = (): void => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        this.ngZone.run(() => {
                            if (!this.jiraExtractComplete) {
                                this.jiraExtracting = false;
                            }
                        });
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            const eventType = line.substring(7).trim();
                            // Next line should be data
                            const dataIdx = lines.indexOf(line) + 1;
                            if (dataIdx < lines.length && lines[dataIdx].startsWith('data: ')) {
                                // Handled below
                            }
                        } else if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                this.ngZone.run(() => this.handleSSEData(data));
                            } catch (e) {
                                // Skip malformed
                            }
                        }
                    }

                    readChunk();
                }).catch(err => {
                    this.ngZone.run(() => {
                        this.jiraExtracting = false;
                        this.jiraStatusMessage = `❌ Stream error: ${err.message}`;
                        this.jiraStatusType = 'error';
                    });
                });
            };

            readChunk();
        }).catch(err => {
            this.ngZone.run(() => {
                this.jiraExtracting = false;
                this.jiraStatusMessage = `❌ ${err.message}`;
                this.jiraStatusType = 'error';
            });
        });
    }

    downloadJiraCsv() {
        if (!this.jiraExtractComplete) return;
        
        const url = this.financeApi.getJiraExportUrl();
        window.open(url, '_blank');
    }

    downloadActionRequired() {
        const url = this.financeApi.getActionRequiredExportUrl();
        window.open(url, '_blank');
    }

    downloadJiraDefaulters() {
        const url = this.financeApi.getJiraDefaultersExportUrl();
        window.open(url, '_blank');
    }

    private handleSSEData(data: any) {
        if (data.percent !== undefined) {
            // Progress event
            this.jiraProgressPercent = data.percent;
            this.jiraProgressStatus = data.status || '';
            this.jiraCurrentIssue = data.issue || '';
            this.jiraEta = data.eta || '';
            this.jiraRowsExtracted = data.rowsExtracted || this.jiraRowsExtracted;
        }

        if (data.rowCount !== undefined && data.message) {
            // Complete event
            this.jiraExtracting = false;
            this.jiraExtractComplete = true;
            this.jiraProgressPercent = 100;
            this.jiraProgressStatus = data.message;
            this.jiraStatusMessage = `✅ ${data.message}`;
            this.jiraStatusType = 'success';
            this.jiraCurrentIssue = '';
            this.jiraEta = '';
            this.jiraRowsExtracted = data.rowCount;
        }

        if (data.message && !data.rowCount && data.rowCount !== 0 && !data.percent && data.percent !== 0) {
            // Error or warning event
            if (data.message.includes('failed') || data.message.includes('Error')) {
                this.jiraExtracting = false;
                this.jiraStatusMessage = `❌ ${data.message}`;
                this.jiraStatusType = 'error';
            }
        }
    }

    triggerGenerateGate() {
        // Basic check before showing modal
        const dumpRequired = this.jiraDumpMode === 'csv' ? !!this.files['dump'] : this.jiraExtractComplete;
        if (!dumpRequired || !this.files['resourceList'] || !this.files['projectMaster'] || !this.files['attendance']) {
            this.generateReports(); // Let it trigger the alert
            return;
        }
        this.showVerificationModal = true;
    }

    async confirmAndGenerate() {
        if (!this.isVerified) return;
        this.showVerificationModal = false;
        
        this.processing = true;
        try {
            // 1. Sync all files to backend so Excel exports are valid
            await this.financeApi.syncAllFiles(this.files);
            
            // 2. Process locally for dashboards
            await this.generateReports();
        } catch (e: any) {
            alert('Sync failed: ' + e.message);
            this.processing = false;
        }
    }

    async generateReports() {
        // In API mode, we don't require the dump file (it was already sent to backend)
        const dumpRequired = this.jiraDumpMode === 'csv' ? !!this.files['dump'] : this.jiraExtractComplete;

        if (!dumpRequired || !this.files['resourceList'] || !this.files['projectMaster'] || !this.files['attendance']) {
            const missing = [];
            if (!dumpRequired) missing.push(this.jiraDumpMode === 'csv' ? 'Jira Dump (CSV)' : 'Jira Dump (extract first via API)');
            if (!this.files['resourceList']) missing.push('Resource List');
            if (!this.files['projectMaster']) missing.push('Project Master');
            if (!this.files['attendance']) missing.push('HR Attendance');
            alert(`Please provide: ${missing.join(', ')}`);
            return;
        }

        this.processing = true;

        try {
            await this.dataProc.processSyncWorkflow(this.files);
            await this.checkCacheStatus(); // Refresh KPIs from backend after sync

            if (this.stats.defaulters > 0) {
                alert(`Processing Complete! \nWarning: ${this.stats.defaulters} Action Required issues found! Check the flags above.`);
            } else {
                alert("Data successfully synchronized and validated. Perfect mappings!");
            }
        } catch (e: any) {
            alert('Generation failed: ' + e.message);
        } finally {
            this.processing = false;
        }
    }
}
