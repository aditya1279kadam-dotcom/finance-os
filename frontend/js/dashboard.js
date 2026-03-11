/**
 * Premium Dashboard Logic
 */

class Dashboard {
    constructor() {
        console.log('FinanceOS: Initializing Dashboard...');
        const storedData = localStorage.getItem('pl_dashboard_results');

        if (!storedData) {
            console.warn('FinanceOS: No calculation data found in localStorage. Prompting for sync.');
            this.showEmptyState();
            return;
        }

        try {
            this.data = JSON.parse(storedData);
            console.log('FinanceOS: Data loaded successfully:', this.data);
            this.charts = {};
            this.init();
        } catch (e) {
            console.error('FinanceOS: Failed to parse sync data', e);
            this.showEmptyState();
        }
    }

    showEmptyState() {
        const container = document.querySelector('.main-content');
        container.innerHTML = `
            <div style="height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <div style="background: rgba(129, 140, 248, 0.1); padding: 40px; border-radius: 24px; border: 1px dashed rgba(129, 140, 248, 0.3);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" style="margin-bottom: 24px;"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"></path><path d="M16 5V3"></path><path d="M8 5V3"></path><path d="M3 9h18"></path><path d="M20 21l-3-3 3-3"></path><path d="M17 18h4"></path></svg>
                    <h2 style="font-weight: 800; margin-bottom: 12px;">No Intelligence Generated Yet</h2>
                    <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 32px;">We couldn't find any financial results. Please go to the Sync Center to upload your data and generate intelligence.</p>
                    <a href="index.html" class="btn-gold" style="text-decoration: none; padding: 12px 32px; display: inline-block;">Go to Sync Center</a>
                </div>
            </div>
        `;
    }

    async init() {
        this.originalReport = [...this.data.report];
        await this.loadCategoryFilter();
        this.renderKPIs(this.data.summary);
        this.renderCharts(this.data.report);
        UI.renderPaginatedTable('tableContainer', this.data.report, 8);
        this.updateLastRefreshed(this.data.lastRefreshed);
        this.setupFilters();
    }

    updateLastRefreshed(timestamp) {
        const badge = document.getElementById('lastRefreshedBadge');
        if (badge && timestamp) {
            const date = new Date(timestamp);
            badge.textContent = `Refreshed: ${date.toLocaleString()}`;
            badge.style.display = 'inline-block';
        }
    }

    async loadCategoryFilter() {
        try {
            const metadata = await API.getMetadata();
            const filterEl = document.getElementById('filterCategory');
            if (filterEl) {
                // Keep "All Categories" and add dynamic ones
                filterEl.innerHTML = '<option value="All">All Categories</option>' +
                    metadata.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            }
        } catch (err) {
            console.error('Failed to load dynamic categories', err);
        }
    }

    setupFilters() {
        const filters = ['filterFY', 'filterQuarter', 'filterMonth', 'filterCategory'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.applyFilters());
        });

        // Cascading Month
        const qEl = document.getElementById('filterQuarter');
        const mEl = document.getElementById('filterMonth');
        if (qEl && mEl) {
            qEl.addEventListener('change', () => {
                const qMap = {
                    'Q1': ['Apr', 'May', 'Jun'],
                    'Q2': ['Jul', 'Aug', 'Sep'],
                    'Q3': ['Oct', 'Nov', 'Dec'],
                    'Q4': ['Jan', 'Feb', 'Mar']
                };
                mEl.innerHTML = '<option value="All">All Months</option>';
                if (qMap[qEl.value]) {
                    qMap[qEl.value].forEach(m => mEl.innerHTML += `<option value="${m}">${m}</option>`);
                }
            });
        }

        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                filters.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = 'All';
                });
                this.applyFilters();
            });
        }

        // New listener for resetFilters (from provided snippet)
        document.getElementById('resetFilters')?.addEventListener('click', () => {
            filters.forEach(id => document.getElementById(id).value = 'All');
            this.applyFilters();
        });

        // New listener for clearDataBtn (from provided snippet)
        document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all data? This will reset the state on the server.')) {
                try {
                    await API.clearData();
                    localStorage.removeItem('pl_dashboard_results');
                    alert('Data cleared successfully.');
                    window.location.href = 'index.html';
                } catch (err) {
                    alert('Clear failed: ' + err.message);
                }
            }
        });
    }

    async applyFilters() {
        const fy = document.getElementById('filterFY').value;
        const q = document.getElementById('filterQuarter').value;
        const m = document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : 'All';
        const cat = document.getElementById('filterCategory').value;

        // Visual loading state
        document.querySelector('.main-content').style.opacity = '0.5';
        document.querySelector('.main-content').style.pointerEvents = 'none';

        try {
            // Fetch dynamically from backend
            const newData = await API.calculateReport({ year: fy, quarter: q, month: m });
            this.data = newData;
            localStorage.setItem('pl_dashboard_results', JSON.stringify(newData));
            this.updateLastRefreshed(newData.lastRefreshed);

            // Client-side category filtering (since backend might not filter it if not asked, or we do it here)
            const filteredReport = this.data.report.filter(row => {
                const matchCat = cat === 'All' || row.category === cat;
                return matchCat;
            });

            const filteredSummary = this.calculateFilteredSummary(filteredReport);

            this.renderKPIs(filteredSummary);
            this.renderCharts(filteredReport);
            UI.renderPaginatedTable('tableContainer', filteredReport, 8);

            // Highlight missing projects
            this.highlightMissingProjects(filteredReport);

        } catch (e) {
            console.error('Filter apply failed', e);
            alert('Failed to calculate report with these filters');
        } finally {
            document.querySelector('.main-content').style.opacity = '1';
            document.querySelector('.main-content').style.pointerEvents = 'auto';
        }
    }

    highlightMissingProjects(report) {
        setTimeout(() => {
            const rows = document.querySelectorAll('#tableContainer tbody tr');
            rows.forEach(tr => {
                const projectName = tr.querySelector('td:nth-child(1) div').textContent.trim();
                const projectData = report.find(r => r.project === projectName);
                if (projectData && projectData.projectMissingInJira) {
                    const badge = document.createElement('span');
                    badge.className = 'badge-pill';
                    badge.style.backgroundColor = '#fef2f2';
                    badge.style.color = '#ef4444';
                    badge.style.border = '1px solid #fecaca';
                    badge.style.marginLeft = '8px';
                    badge.textContent = 'Missing Logs';
                    tr.querySelector('td:nth-child(1)').appendChild(badge);
                }
            });
        }, 100);
    }

    calculateFilteredSummary(report) {
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

    renderKPIs(summary) {
        document.getElementById('kpiRevenue').textContent = UI.formatCurrency(summary.totalRevenue);
        document.getElementById('kpiFullyLoaded').textContent = UI.formatCurrency(summary.totalFullyLoaded);
        document.getElementById('kpiProfit').textContent = UI.formatCurrency(summary.totalProfit);
        document.getElementById('kpiMargin').textContent = (summary.avgMargin * 100).toFixed(1) + '%';

        // Status indicator in KPI panel
        const marginEl = document.getElementById('marginIndicator');
        const marginClass = UI.getMarginClass(summary.avgMargin);
        marginEl.innerHTML = `<span class="badge-pill ${marginClass}">Portfolio Average</span>`;
    }

    renderCharts(report) {
        const ctxRev = document.getElementById('revCostChart').getContext('2d');
        const ctxMargin = document.getElementById('marginChart').getContext('2d');

        // Chart.js Default Overrides for Premium Look
        Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#64748b';

        // 1. Revenue vs Cost (Premium Bar Chart)
        if (this.charts.rev) this.charts.rev.destroy();
        this.charts.rev = new Chart(ctxRev, {
            type: 'bar',
            data: {
                labels: report.map(r => r.project),
                datasets: [
                    { label: 'Net Revenue', data: report.map(r => r.revenue), backgroundColor: '#4f46e5', borderRadius: 6, barThickness: 24 },
                    { label: 'Loaded Cost', data: report.map(r => r.fullyLoadedCost), backgroundColor: '#e2e8f0', borderRadius: 6, barThickness: 24 }
                ]
            },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle' } } },
                scales: {
                    y: { grid: { borderDash: [4, 4], color: '#f1f5f9' }, border: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 2. Margin by Category (HORIZONTAL BAR WITH BENCHMARKS)
        const catMap = {};
        report.forEach(r => {
            if (!catMap[r.category]) catMap[r.category] = { profit: 0, revenue: 0 };
            catMap[r.category].profit += r.grossProfit;
            catMap[r.category].revenue += r.revenue;
        });

        const categories = Object.keys(catMap);
        const marginData = categories.map(c => {
            const margin = catMap[c].revenue > 0 ? (catMap[c].profit / catMap[c].revenue) : 0;
            return { category: c, margin: margin * 100 };
        });

        if (this.charts.margin) this.charts.margin.destroy();
        this.charts.margin = new Chart(ctxMargin, {
            type: 'bar',
            data: {
                labels: marginData.map(d => d.category),
                datasets: [{
                    label: 'Operating Margin %',
                    data: marginData.map(d => d.margin),
                    backgroundColor: marginData.map(d => {
                        if (d.margin > 40) return '#10b981'; // Emerald
                        if (d.margin > 20) return '#f59e0b'; // Amber
                        return '#ef4444'; // Rose
                    }),
                    borderRadius: 8,
                    barThickness: 32
                }]
            },
            options: {
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` Margin: ${ctx.parsed.x.toFixed(1)}%` } }
                },
                scales: {
                    x: {
                        max: 100,
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        title: { display: true, text: 'Percentage (%)', font: { weight: '700' } }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }
}

// Global Export CSV
window.exportCSV = function () {
    const res = JSON.parse(localStorage.getItem('pl_dashboard_results'));
    if (!res) return;

    const headers = [
        "Project", "Product", "Category", "Project Key", "Status",
        "PO Amount", "Revenue FY25", "Revenue FY26", "Cumulative Revenue", "Budget To Go",
        "Total Signed HR Cost", "Cost Till Last Quarter", "Opening Remaining Cost",
        "Cost Current Quarter", "Direct Cost Till Date", "Closing Remaining Cost",
        "HR Overhead", "OPE Cost", "Infra Cost", "Partnership Commission",
        "Total Fully Loaded Cost", "Gross Profit", "Gross Margin %"
    ];

    let csv = headers.join(',') + '\n';

    res.report.forEach(row => {
        const values = [
            row.project, row.product, row.category, row.projectKey, row.projectStatus,
            row.poAmount, row.revenueFY25, row.revenueFY26, row.cumulativeRevenue, row.budgetToGo,
            row.totalSignedHRCost, row.costTillLastQuarter, row.openingRemainingSignedHRCost,
            row.costIncurredCurrentQuarter, row.totalDirectCostTillDate, row.closingRemainingSignedHRCost,
            row.allocatedHROverhead, row.opeCost, row.infraCost, row.partnershipCommission,
            row.totalFullyLoadedCost, row.grossProfit, (row.grossMargin * 100).toFixed(2) + '%'
        ];
        csv += values.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinanceOS_Executive_P&L_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

window.dashboard = new Dashboard();
