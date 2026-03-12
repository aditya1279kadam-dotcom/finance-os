import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceApiService {
  private baseUrl = environment.apiUrl + '/api';

  constructor(private http: HttpClient) { }

  async calculateReport(filters: any = {}): Promise<any> {
    const params = new URLSearchParams(filters).toString();
    const url = `${this.baseUrl}/calculate${params ? '?' + params : ''}`;
    return firstValueFrom(this.http.get(url));
  }

  async calculateResourceReport(filters: any = {}): Promise<any> {
    const params = new URLSearchParams(filters).toString();
    const url = `${this.baseUrl}/calculate-resource${params ? '?' + params : ''}`;
    return firstValueFrom(this.http.get(url));
  }

  async getMetadata(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.baseUrl}/metadata`));
  }

  async testJiraConnection(config: { jiraUrl: string; email: string; apiToken: string }): Promise<any> {
    return firstValueFrom(this.http.post(`${this.baseUrl}/jira/test-connection`, config));
  }

  async uploadFile(type: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post(`${this.baseUrl}/upload/${type}`, formData));
  }

  async uploadJiraDump(file: File): Promise<any> {
    return this.uploadFile('jiraDump', file);
  }

  getJiraExtractUrl(): string {
    return `${this.baseUrl}/jira/extract`;
  }

  getJiraExportUrl(): string {
    return `${this.baseUrl}/jira/export`;
  }

  getActionRequiredExportUrl(): string {
    return `${this.baseUrl}/export-action-required`;
  }

  getJiraDefaultersExportUrl(): string {
    return `${this.baseUrl}/jira-defaulters`;
  }

  async syncAllFiles(files: { [key: string]: File | null }): Promise<any> {
    const promises = Object.entries(files).map(([type, file]) => {
      if (file) {
        return this.uploadFile(type, file);
      }
      return Promise.resolve();
    });
    return Promise.all(promises);
  }

  async getSyncHealth(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.baseUrl}/sync-health`));
  }
}
