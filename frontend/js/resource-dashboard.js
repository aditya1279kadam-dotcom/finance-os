let currentReport = null;

document.addEventListener('DOMContentLoaded', () => {
    // Attempt to load from localStorage or trigger calculate
    const btnCalculate = document.getElementById('btnCalculate');
    const btnDownloadExcel = document.getElementById('btnDownloadExcel');
    const btnDownloadPPTX = document.getElementById('btnDownloadPPTX');


    setupFilters();

    btnCalculate.addEventListener('click', async () => {
        await applyFilters();
    });
});

let resourceChartInst = null;

function setupFilters() {
    const filters = ['filterFY', 'filterQuarter', 'filterMonth'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => applyFilters());
    });

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
            applyFilters();
        });
    }
}

async function applyFilters() {
    const fy = document.getElementById('filterFY') ? document.getElementById('filterFY').value : 'All';
    const q = document.getElementById('filterQuarter') ? document.getElementById('filterQuarter').value : 'All';
    const m = document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : 'All';

    const btnCalculate = document.getElementById('btnCalculate');
    const btnDownloadExcel = document.getElementById('btnDownloadExcel');
    const btnDownloadPPTX = document.getElementById('btnDownloadPPTX');

    try {
        btnCalculate.innerHTML = 'Calculating...';
        document.querySelector('.main-content').style.opacity = '0.5';

        const data = await API.calculateResourceReport({ year: fy, quarter: q, month: m });
        currentReport = data;
        renderDashboard(data);

        if (data.exportFiles) {
            btnDownloadExcel.style.display = 'inline-block';
            btnDownloadPPTX.style.display = 'inline-block';

            btnDownloadExcel.onclick = () => window.location.href = data.exportFiles.excel;
            btnDownloadPPTX.onclick = () => window.location.href = data.exportFiles.pptx;
        }
    } catch (err) {
        console.error(err);
        alert('Error generating report: ' + err.message);
    } finally {
        btnCalculate.innerHTML = 'Run Calculation';
        document.querySelector('.main-content').style.opacity = '1';
    }
}

function renderDashboard(data) {
    const { summary, qcReport } = data;

    // Render KPIs
    document.getElementById('kpiOverall').innerText = (summary.AvgOverallBillability * 100).toFixed(2) + '%';
    document.getElementById('kpiExternal').innerText = (summary.AvgExternalProductivity * 100).toFixed(2) + '%';
    document.getElementById('kpiInternal').innerText = (summary.AvgInternalProductivity * 100).toFixed(2) + '%';
    document.getElementById('kpiBench').innerText = (summary.AvgBench * 100).toFixed(2) + '%';

    // Highlight QC Warning if any issues
    if (qcReport.missingSheets.length || qcReport.unknownCategories.length || qcReport.failedCrossChecks.length) {
        document.getElementById('qcAlert').style.display = 'inline';
    }

    // Chart logic
    renderChart(summary.TopResources);

    // Table Logic
    renderBottomTable(summary.BottomBillability);

    // Summary & Footer
    const summaryText = `The company average billability stands at ${(summary.AvgOverallBillability * 100).toFixed(2)}%, driven by an external productivity rate of ${(summary.AvgExternalProductivity * 100).toFixed(2)}%. 
                        ${summary.AvgBench > 0.15 ? 'Key takeaway: Bench utilization is currently above 15%, suggesting a need for better project allocation.' : 'The current allocation remains healthy across the board.'}`;
    document.getElementById('summaryText').innerText = summaryText;
    document.getElementById('executiveSummary').style.display = 'block';

    if (data.lastRefreshed) {
        const badge = document.getElementById('lastRefreshedBadge');
        if (badge) {
            badge.textContent = `Refreshed: ${new Date(data.lastRefreshed).toLocaleString()}`;
            badge.style.display = 'inline-block';
        }
    }

    renderDefaulters(qcReport);

    document.getElementById('footerTimestamp').innerText = `Generated: ${new Date().toLocaleString()}`;
}

function renderDefaulters(qc) {
    const container = document.getElementById('defaultersContainer');
    const tableContainer = document.getElementById('defaultersTableContainer');
    if (!container || !tableContainer) return;

    const { defaulters = [], missingJiraIDs = [] } = qc;

    if (defaulters.length === 0 && missingJiraIDs.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; margin-top: 12px;">
            <thead>
                <tr style="border-bottom: 2px solid #fecaca; color: #b91c1c;">
                    <th style="padding: 12px;">Resource Name</th>
                    <th style="padding: 12px;">Issue Type</th>
                    <th style="padding: 12px;">Details</th>
                </tr>
            </thead>
            <tbody>
    `;

    missingJiraIDs.forEach(name => {
        html += `
            <tr style="border-bottom: 1px solid #fee2e2;">
                <td style="padding: 12px; font-weight: 600;">${name}</td>
                <td style="padding: 12px;"><span class="badge-pill" style="background:#fef2f2; border:1px solid #fecaca; color:#ef4444;">Missing Jira ID</span></td>
                <td style="padding: 12px; color: #7f1d1d;">Resource is mapped as Tech/Product but not found in Jira Dump.</td>
            </tr>
        `;
    });

    defaulters.forEach(d => {
        let msg = d.LoggedHours === 0 ? 'Zero hours logged in Jira.' : `Logged ${d.LoggedHours} hrs, expected ${d.RequiredHours} hrs.`;
        html += `
            <tr style="border-bottom: 1px solid #fee2e2;">
                <td style="padding: 12px; font-weight: 600;">${d.ResourceName}</td>
                <td style="padding: 12px;"><span class="badge-pill" style="background:#fef2f2; border:1px solid #fecaca; color:#ef4444;">Defaulter</span></td>
                <td style="padding: 12px; color: #7f1d1d;">${msg}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

function renderChart(top10) {
    const ctx = document.getElementById('resourceChart').getContext('2d');
    if (resourceChartInst) resourceChartInst.destroy();

    resourceChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(r => r.ResourceName.substring(0, 15)),
            datasets: [
                { label: 'External', data: top10.map(r => r.ExternalHours), backgroundColor: '#10b981' },
                { label: 'Internal', data: top10.map(r => r.InternalHours), backgroundColor: '#3b82f6' },
                { label: 'CAAPL', data: top10.map(r => r.CAAPL_Hours), backgroundColor: '#8b5cf6' },
                { label: 'LND', data: top10.map(r => r.LND_Hours), backgroundColor: '#f59e0b' },
                { label: 'Sales', data: top10.map(r => r.Sales_Hours), backgroundColor: '#06b6d4' },
                { label: 'Leaves', data: top10.map(r => r.Leaves_Hours_Final), backgroundColor: '#9ca3af' },
                { label: 'Bench', data: top10.map(r => r.FinalBench), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderBottomTable(bottom10) {
    let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                    <th style="padding: 12px;">Resource</th>
                    <th style="padding: 12px;">Billability</th>
                    <th style="padding: 12px;">Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    bottom10.forEach(r => {
        const p = (r.OverallBillability * 100).toFixed(1) + '%';
        let action = 'Review Allocation';
        if (r.OverallBillability < 0.5) action = 'Immediate Focus';
        if (r.BenchPercent > 0.3) action = 'Manage Bench Time';

        html += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px; font-weight: 600;">${r.ResourceName}</td>
                <td style="padding: 12px;">
                    <div style="font-weight: 700; color: #ef4444; margin-bottom: 4px;">${p}</div>
                    <div style="width: 100%; height: 4px; background: #eee; border-radius: 2px;">
                        <div style="width: ${p}; height: 100%; background: #ef4444; border-radius: 2px;"></div>
                    </div>
                </td>
                <td style="padding: 12px; color: var(--text-muted); font-size: 0.75rem;">${action}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById('bottomTableContainer').innerHTML = html;
}
