/**
 * UI Components - Premium Editions
 */

const UI = {
    renderPaginatedTable(containerId, data, pageSize = 8) {
        const container = document.getElementById(containerId);
        let currentPage = 1;

        const render = (page) => {
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const paginatedData = data.slice(start, end);
            const totalPages = Math.ceil(data.length / pageSize);

            let html = `
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
                            ${paginatedData.map(row => `
                                <tr>
                                    <td style="position: sticky; left: 0; z-index: 5; background: white; font-weight: 700;">${row.project}</td>
                                    <td>${row.product}</td>
                                    <td><span class="badge-pill" style="background:#f1f5f9; color:#475569">${row.category}</span></td>
                                    <td style="font-family: monospace;">${row.projectKey}</td>
                                    <td><span class="badge-pill ${row.projectStatus === 'Active' ? 'bg-emerald' : 'bg-amber'}">${row.projectStatus}</span></td>
                                    <td style="font-weight: 600;">${this.formatCurrency(row.poAmount)}</td>
                                    <td>${this.formatCurrency(row.revenueFY25)}</td>
                                    <td>${this.formatCurrency(row.revenueFY26)}</td>
                                    <td style="font-weight: 600; color: var(--primary);">${this.formatCurrency(row.cumulativeRevenue)}</td>
                                    <td style="color: ${row.budgetToGo < 0 ? '#ef4444' : 'inherit'}">${this.formatCurrency(row.budgetToGo)}</td>
                                    <td>${this.formatCurrency(row.totalSignedHRCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(row.costTillLastQuarter)}</td>
                                    <td>${this.formatCurrency(row.openingRemainingSignedHRCost)}</td>
                                    <td>${this.formatCurrency(row.costIncurredCurrentQuarter)}</td>
                                    <td style="font-weight: 600;">${this.formatCurrency(row.totalDirectCostTillDate)}</td>
                                    <td style="color: ${row.closingRemainingSignedHRCost < 0 ? '#ef4444' : 'inherit'}">${this.formatCurrency(row.closingRemainingSignedHRCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(row.allocatedHROverhead)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(row.opeCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(row.infraCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(row.partnershipCommission)}</td>
                                    <td style="font-weight: 700; background: rgba(0,0,0,0.02);">${this.formatCurrency(row.totalFullyLoadedCost)}</td>
                                    <td style="font-weight: 800;">${this.formatCurrency(row.grossProfit)}</td>
                                    <td><span class="badge-pill ${this.getMarginClass(row.grossMargin)}">${(row.grossMargin * 100).toFixed(1)}%</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="pager">
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted)">
                        Record ${start + 1} to ${Math.min(end, data.length)} of ${data.length}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-ghost" ${page === 1 ? 'disabled' : ''} onclick="window.UI.tablePager(${page - 1})">Prev</button>
                        <button class="btn-ghost" ${page === totalPages ? 'disabled' : ''} onclick="window.UI.tablePager(${page + 1})">Next</button>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        };

        window.UI.tablePager = (page) => render(page);
        render(currentPage);
    },

    formatCurrency(num) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(num);
    },

    getMarginClass(margin) {
        if (margin > 0.4) return 'bg-emerald';
        if (margin > 0.2) return 'bg-amber';
        return 'bg-rose';
    }
};

window.UI = UI;
