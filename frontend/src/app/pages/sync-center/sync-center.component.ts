import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { DataProcessingService } from '../../services/data-processing.service';

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
      <div class="kpi-panel">
        <div class="tag">Jira Defaulters</div>
        <div class="amount" [ngStyle]="{'color': stats.defaulters > 0 ? '#ef4444' : 'inherit' }">{{ stats.defaulters }}</div>
        <div class="growth">Missing mappings</div>
      </div>
    </div>

    <!-- Main Upload Grid replacing the legacy 2-file system -->
    <div class="charts-layout" style="margin-top: 32px;">
        <div class="card" style="grid-column: span 2;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3><svg width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" viewBox="0 0 24 24" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Ingestion Workflows</h3>
                <button (click)="generateReports()" class="btn-gold" [disabled]="processing" style="padding: 12px 24px;">
                     {{ processing ? 'Processing Data...' : 'Generate Dashboard Reports & Validate Data' }}
                </button>
            </div>
            
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 32px;">
                Upload the required CSV or Excel datasets into the browser memory. Once all required files are staged, click the Generate button to cross-validate maps and build the Executive Dashboards.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
                
                <!-- 1. Dump -->
                <div class="glass-panel" style="margin: 0;">
                    <h4 style="margin-top: 0; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        1. Financial Dump 
                        <span *ngIf="files['dump']" class="status-dot active"></span>
                    </h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Core P&L entries and financial extracts.</p>
                    <input type="file" (change)="onFileSelected($event, 'dump')" accept=".csv, .xlsx, .xls" class="file-input">
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
    }
    `]
})
export class SyncCenterComponent {
    @Output() toggleSidebar = new EventEmitter<void>();

    hasCachedData = false;
    processing = false;

    stats = {
        projects: 0,
        resources: 0,
        defaulters: 0
    };

    // Staging area for selected files before generation
    files: { [key: string]: File | null } = {
        dump: null,
        resourceList: null,
        projectMaster: null,
        rateCard: null,
        overhead: null,
        attendance: null
    };

    constructor(private dataProc: DataProcessingService) {
        this.checkCacheStatus();
    }

    checkCacheStatus() {
        const stored = localStorage.getItem('financeos_unified_db');
        if (stored) {
            this.hasCachedData = true;
            try {
                const db = JSON.parse(stored);
                this.stats.projects = Object.keys(db.projects || {}).length;
                this.stats.resources = Object.keys(db.resources || {}).length;
                this.stats.defaulters = (db.missingProjects?.length || 0) + (db.missingResources?.length || 0);
            } catch (e) {
                console.error("Failed to parse cached DB", e);
            }
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

    async generateReports() {
        // Validate required files are present (decide which ones are stricly mandatory for a PoC)
        if (!this.files['dump'] || !this.files['resourceList'] || !this.files['projectMaster'] || !this.files['attendance']) {
            alert("Please upload at least the Dump, Resource List, Project Master, and HR Attendance to generate insights.");
            return;
        }

        this.processing = true;

        try {
            // Send the File objects to the DataProcessing service to parse via xlsx library
            await this.dataProc.processSyncWorkflow(this.files);

            this.checkCacheStatus();

            if (this.stats.defaulters > 0) {
                alert(`Processing Complete! \nWarning: ${this.stats.defaulters} Jira Defaulter Map issues found! Missing resources or projects have been flagged.`);
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
