import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-sync-center',
    standalone: true,
    imports: [CommonModule, HeaderComponent],
    template: `
    <app-header title="Sync Center" subtitle="Automated Data Ingestion & Health Checks" (toggleSidebar)="toggleSidebar.emit()"></app-header>
    
    <!-- Using exact vanilla HTML structure adapted to Angular conditionals -->
    <div class="kpi-row" style="margin-top: 24px;">
      <div class="kpi-panel">
        <div class="tag">Environment Health</div>
        <div class="amount" [ngStyle]="{'color': serverStatus === 'Online' ? '#10b981' : '#ef4444' }">{{ serverStatus }}</div>
        <div class="growth">Engine Status</div>
      </div>
      <div class="kpi-panel">
        <div class="tag">P&L Records</div>
        <div class="amount">{{ stats.plRecords }}</div>
        <div class="growth">Processed successfully</div>
      </div>
      <div class="kpi-panel">
        <div class="tag">Resource Records</div>
        <div class="amount">{{ stats.resourceRecords }}</div>
        <div class="growth">Processed successfully</div>
      </div>
      <div class="kpi-panel">
        <div class="tag">Missing Jira Maps</div>
        <div class="amount" [ngStyle]="{'color': stats.missingProjects > 0 ? '#ef4444' : 'inherit' }">{{ stats.missingProjects }}</div>
        <div class="growth">Requires attention</div>
      </div>
    </div>

    <div class="charts-layout">
        <div class="card" style="grid-column: span 2;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3><svg width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Ingestion Engine</h3>
            </div>
            
            <div class="glass-panel" style="margin-bottom: 24px;">
                <h4 style="margin-top: 0; font-weight: 700;">1. Project Financial Data (P&L)</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Upload standard financial extracts to calculate project-wise yields and margins.</p>
                <form (submit)="uploadFile($event, 'pl')" style="display: flex; gap: 12px; align-items: center;">
                    <input type="file" id="plFile" accept=".csv" class="glass-panel" style="flex: 1; padding: 10px;" required>
                    <button type="submit" class="btn-gold" [disabled]="plUploading">
                        {{ plUploading ? 'Syncing...' : 'Sync Dataset' }}
                    </button>
                </form>
            </div>

            <div class="glass-panel">
                <h4 style="margin-top: 0; font-weight: 700;">2. Resource Timesheet Data</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Upload timesheet extracts to map resource costs against their primary project mapping.</p>
                <form (submit)="uploadFile($event, 'resource')" style="display: flex; gap: 12px; align-items: center;">
                    <input type="file" id="resFile" accept=".csv" class="glass-panel" style="flex: 1; padding: 10px;" required>
                    <button type="submit" class="btn-gold" [disabled]="resUploading" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        {{ resUploading ? 'Syncing...' : 'Sync Dataset' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
  `,
    styles: ``
})
export class SyncCenterComponent {
    @Output() toggleSidebar = new EventEmitter<void>();

    serverStatus = 'Checking...';
    stats = {
        plRecords: 0,
        resourceRecords: 0,
        missingProjects: 0
    };

    plUploading = false;
    resUploading = false;

    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {
        this.checkHealth();
    }

    async checkHealth() {
        try {
            const res: any = await firstValueFrom(this.http.get(this.baseUrl + '/api/health'));
            this.serverStatus = res.status === 'ok' ? 'Online' : 'Warning';
            this.stats.plRecords = res.dataCounts.pl;
            this.stats.resourceRecords = res.dataCounts.resources;
            this.stats.missingProjects = 0; // Or update logic if provided by API later
        } catch (e) {
            console.error(e);
            this.serverStatus = 'Offline';
        }
    }

    async uploadFile(event: Event, type: 'pl' | 'resource') {
        event.preventDefault();
        if (type === 'pl') this.plUploading = true;
        if (type === 'resource') this.resUploading = true;

        try {
            const fileInputId = type === 'pl' ? 'plFile' : 'resFile';
            const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
            const file = fileInput.files?.[0];

            if (!file) throw new Error("Please select a file first");

            const formData = new FormData();
            formData.append(type === 'pl' ? 'dashboardFile' : 'resourceFile', file);

            const endpoint = type === 'pl' ? '/api/upload' : '/api/upload-resource';

            const res: any = await firstValueFrom(this.http.post(this.baseUrl + endpoint, formData));
            alert(res.message || 'Upload successful');

            // Reset logic
            fileInput.value = '';
            this.checkHealth(); // Refresh counts

            // clear local storage since uploaded new data
            if (type === 'pl') localStorage.removeItem('pl_dashboard_results');
            if (type === 'resource') localStorage.removeItem('res_dashboard_results');

        } catch (err: any) {
            alert('Upload failed: ' + (err.error?.error || err.message || 'Unknown error'));
        } finally {
            if (type === 'pl') this.plUploading = false;
            if (type === 'resource') this.resUploading = false;
        }
    }
}
