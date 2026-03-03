(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function a(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=a(r);fetch(r.href,s)}})();const c="http://localhost:3001",C={async uploadFile(t,e){const a=new FormData;a.append("file",e);const n=await fetch(`${c}/api/upload/${t}`,{method:"POST",body:a});if(!n.ok){const r=await n.json().catch(()=>({}));throw new Error(r.error||"Upload failed")}return n.json()},async calculateReport(){const t=await fetch(`${c}/api/calculate`);if(!t.ok)throw new Error("Calculation failed");return t.json()},async uploadAttendanceFile(t){const e=new FormData;e.append("file",t);const a=await fetch(`${c}/api/upload/attendance`,{method:"POST",body:e});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.error||"Attendance upload failed")}return a.json()},async calculateResourceReport(){const t=await fetch(`${c}/api/calculate-resource`);if(!t.ok)throw new Error("Resource calculation failed");return console.log(t),t.json()},async fetchJira(){const t=await fetch(`${c}/api/jira/worklogs`);if(!t.ok)throw new Error("Jira fetch failed");return t.json()},async getMetadata(){const t=await fetch(`${c}/api/metadata`);if(!t.ok)throw new Error("Failed to fetch metadata");return t.json()},async saveMetadata(t){const e=await fetch(`${c}/api/metadata`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok)throw new Error("Failed to save metadata");return e.json()},async clearData(){const t=await fetch(`${c}/api/clear`,{method:"POST"});if(!t.ok)throw new Error("Failed to clear data");return t.json()}};window.API=C;const w={renderPaginatedTable(t,e,a=8){const n=document.getElementById(t);let r=1;const s=i=>{const u=(i-1)*a,h=u+a,y=e.slice(u,h),m=Math.ceil(e.length/a);let g=`
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
                            ${y.map(o=>`
                                <tr>
                                    <td style="position: sticky; left: 0; z-index: 5; background: white; font-weight: 700;">${o.project}</td>
                                    <td>${o.product}</td>
                                    <td><span class="badge-pill" style="background:#f1f5f9; color:#475569">${o.category}</span></td>
                                    <td style="font-family: monospace;">${o.projectKey}</td>
                                    <td><span class="badge-pill ${o.projectStatus==="Active"?"bg-emerald":"bg-amber"}">${o.projectStatus}</span></td>
                                    <td style="font-weight: 600;">${this.formatCurrency(o.poAmount)}</td>
                                    <td>${this.formatCurrency(o.revenueFY25)}</td>
                                    <td>${this.formatCurrency(o.revenueFY26)}</td>
                                    <td style="font-weight: 600; color: var(--primary);">${this.formatCurrency(o.cumulativeRevenue)}</td>
                                    <td style="color: ${o.budgetToGo<0?"#ef4444":"inherit"}">${this.formatCurrency(o.budgetToGo)}</td>
                                    <td>${this.formatCurrency(o.totalSignedHRCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(o.costTillLastQuarter)}</td>
                                    <td>${this.formatCurrency(o.openingRemainingSignedHRCost)}</td>
                                    <td>${this.formatCurrency(o.costIncurredCurrentQuarter)}</td>
                                    <td style="font-weight: 600;">${this.formatCurrency(o.totalDirectCostTillDate)}</td>
                                    <td style="color: ${o.closingRemainingSignedHRCost<0?"#ef4444":"inherit"}">${this.formatCurrency(o.closingRemainingSignedHRCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(o.allocatedHROverhead)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(o.opeCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(o.infraCost)}</td>
                                    <td style="color: var(--text-muted)">${this.formatCurrency(o.partnershipCommission)}</td>
                                    <td style="font-weight: 700; background: rgba(0,0,0,0.02);">${this.formatCurrency(o.totalFullyLoadedCost)}</td>
                                    <td style="font-weight: 800;">${this.formatCurrency(o.grossProfit)}</td>
                                    <td><span class="badge-pill ${this.getMarginClass(o.grossMargin)}">${(o.grossMargin*100).toFixed(1)}%</span></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                <div class="pager">
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted)">
                        Record ${u+1} to ${Math.min(h,e.length)} of ${e.length}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-ghost" ${i===1?"disabled":""} onclick="window.UI.tablePager(${i-1})">Prev</button>
                        <button class="btn-ghost" ${i===m?"disabled":""} onclick="window.UI.tablePager(${i+1})">Next</button>
                    </div>
                </div>
            `;n.innerHTML=g};window.UI.tablePager=i=>s(i),s(r)},formatCurrency(t){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(t)},getMarginClass(t){return t>.4?"bg-emerald":t>.2?"bg-amber":"bg-rose"}};window.UI=w;let l={categories:[]};window.init=f;window.renderCategories=d;window.addCategory=v;window.removeCategory=$;window.handleUpload=b;window.handleAttendanceUpload=p;async function f(){try{l=await API.getMetadata(),d()}catch(t){console.error("Failed to load initial metadata",t)}}f();function d(){const t=document.getElementById("categoryContainer");t.innerHTML=l.categories.map(e=>`
                <div class="badge-pill" style="background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-weight: 700;">
                    ${e}
                    <span onclick="removeCategory('${e}')" style="cursor: pointer; font-size: 1.2rem; line-height: 1; opacity: 0.5;">&times;</span>
                </div>
            `).join("")}async function v(){const t=document.getElementById("newCategoryInput"),e=t.value.trim();if(!e)return;if(l.categories.some(n=>n.toLowerCase()===e.toLowerCase())){alert(`Definition "${e}" already exists in the Master Data list.`),t.value="";return}l.categories.push(e),t.value="",await API.saveMetadata(l),d()}async function $(t){l.categories=l.categories.filter(e=>e!==t),await API.saveMetadata(l),d()}async function b(t,e){if(t==="attendanceHR")return p(e);const a=e.files[0];if(a)try{const n=await API.uploadFile(t,a),r=document.querySelector(`[data-file-type="${t}"]`);r.classList.add("synced"),r.querySelector(".status").innerHTML=`<span class="badge-pill bg-emerald">✓ Synced: ${n.rowCount} rows</span>`,n.preview&&n.preview.length>0&&(r.querySelector(".preview").innerHTML=`<div style="color: var(--text-muted); opacity: 0.6">Latest issue: ${n.preview[0].Issue||"N/A"}</div>`)}catch(n){alert("Upload failed: "+n.message)}}async function p(t){const e=t.files[0];if(e)try{const a=await API.uploadAttendanceFile(e),n=document.querySelector('[data-file-type="attendanceHR"]');n.classList.add("synced"),n.querySelector(".status").innerHTML=`<span class="badge-pill bg-emerald">✓ Synced: ${a.resourceCount} resources</span>`,n.querySelector(".preview").innerHTML=`<div style="color: var(--text-muted); opacity: 0.6">Parsed ${a.rowCount} rows. View QC in Report.</div>`;let r=`Attendance processed: Computed leaves for ${a.resourceCount} resources.`;a.unmatchedCount>0&&(r+=`

Note: ${a.unmatchedCount} names unmatched:
- ${a.unmatchedNames.join(`
- `)}`),a.qcCount&&a.qcCount>0&&(r+=`

Data Errors Detected (${a.qcCount}):
- ${a.qcExamples.join(`
- `)}`,a.qcCount>5&&(r+=`
...and ${a.qcCount-5} more (see full QC report in Excel).`)),alert(r)}catch(a){alert("Attendance Upload failed: "+a.message)}}document.getElementById("calculateBtn").addEventListener("click",async()=>{try{const t=await API.calculateReport();localStorage.setItem("pl_dashboard_results",JSON.stringify(t)),window.location.href="dashboard.html"}catch(t){alert("Calculation failed: "+t.message)}});document.getElementById("clearDataBtn").addEventListener("click",async()=>{if(confirm("Are you sure you want to clear all uploaded project data? Master categories will persist."))try{await API.clearData(),alert("Data cleared successfully."),window.location.reload()}catch(t){alert("Clear failed: "+t.message)}});
