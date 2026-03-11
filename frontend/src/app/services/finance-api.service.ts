import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanceApiService {
  private baseUrl = 'http://localhost:3000/api';

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
}
