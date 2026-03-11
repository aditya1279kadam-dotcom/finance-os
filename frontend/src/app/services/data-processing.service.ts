import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {
  calculateFilteredSummary(report: any[]) {
    const totalRevenue = report.reduce((sum, r) => sum + r.revenue, 0);
    const totalFullyLoaded = report.reduce((sum, r) => sum + r.fullyLoadedCost, 0);
    return {
      totalRevenue,
      totalDirectCost: report.reduce((sum, r) => sum + r.directCost, 0),
      totalFullyLoaded,
      totalProfit: totalRevenue - totalFullyLoaded,
      avgMargin: totalRevenue > 0 ? ((totalRevenue - totalFullyLoaded) / totalRevenue) : 0
    };
  }

  getCategoryCardsData(report: any[]) {
    const catMap: Record<string, { profit: number, revenue: number }> = {};

    report.forEach(r => {
      if (!catMap[r.category]) catMap[r.category] = { profit: 0, revenue: 0 };
      catMap[r.category].profit += r.grossProfit;
      catMap[r.category].revenue += r.revenue;
    });

    return Object.keys(catMap).map(category => {
      const data = catMap[category];
      const margin = data.revenue > 0 ? (data.profit / data.revenue) : 0;
      return {
        category,
        profit: data.profit,
        margin: margin
      };
    }).sort((a, b) => b.profit - a.profit); // Sort by highest profit
  }

  formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  }

  getMarginClass(margin: number): string {
    if (margin > 0.4) return 'bg-emerald';
    if (margin > 0.2) return 'bg-amber';
    return 'bg-rose';
  }
}
