# Product Requirements Document (PRD)

## 1. Product Overview
**Product Name:** FinanceOS (Jira Report Automation & Data Verification System)
**Purpose:** 
FinanceOS is an automated data ingestion, validation, and reporting platform designed to bridge the gap between HR timesheets, financial rate cards, and Jira project worklogs. It significantly reduces manual data processing time by automatically cross-referencing multiple data sources, flagging discrepancies (such as missing hours or unmapped resources), and generating executive-ready PowerPoint dashboards.

## 2. Target Audience
* **Finance & Operations Managers:** To track project profitability, resource costing, and revenue generation.
* **Project Management Office (PMO):** To ensure teams are accurately logging work hours in Jira and tracking project health.
* **Administrators / Data Analysts:** To ingest raw data files and run the weekly/monthly synchronization health checks before publishing reports.

## 3. Core Features
1. **Automated Data Ingestion (Sync Center):**
   - Capability to upload and parse multiple master data files: Resource List, Project Master, Rate Cards, Overhead Costs, and HR Attendance.
   - Dual-mode Jira worklog ingestion: Support for manual CSV/Excel uploads or direct extraction using the Jira REST API.
2. **Proactive Data Validation & KPIs:**
   - **Action Required (Data Mismatching):** Automatically flags resources that exist in HR records but lack corresponding Jira worklogs, or orphaned Jira projects.
   - **Jira Defaulters:** Highlights employees failing to meet their required logged hours within a defined period.
   - Real-time KPI dashboards utilizing visual indicators (e.g., green/red status metrics) to summarize the synchronization health.
3. **Pre-Report Verification Gate:**
   - A mandatory checklist modal ensuring administrators have accounted for closed projects, employee churn, and updated revenue figures before authorizing report generation.
4. **Automated Executive Reporting:**
   - Export mechanism utilizing `pptxgenjs` to instantly construct presentation-ready PowerPoint slides featuring project costing, resource utilization, and portfolio-level financial metrics.
5. **Data Export functionality:**
   - 1-click Excel/CSV generation for all error states (Action Required and Jira Defaulter lists) to facilitate easy remediation.

## 4. Success Metrics
* **Time Saved:** Reduction in manual report generation time from days/hours to minutes.
* **Data Accuracy:** Near 100% catch rate for synchronization mismatches between HR and Jira logic prior to executive reporting.
* **User Adoption:** Frequency of administrators utilizing the tool for monthly/weekly cycle closures instead of manual spreadsheet reconciliation.
