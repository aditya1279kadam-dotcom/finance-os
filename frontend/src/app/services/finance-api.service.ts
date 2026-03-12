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

  async uploadJiraDump(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post(`${this.baseUrl}/upload/jiraDump`, formData));
  }

  getJiraExtractUrl(): string {
    return `${this.baseUrl}/jira/extract`;
  }
}
