# Functional Requirements Document (FRD)

## 1. Introduction
This Functional Requirements Document (FRD) outlines the specific system behaviors, business logic rules, and technical requirements needed to successfully operate FinanceOS. The platform consists of an Angular 18 frontend communicating with a Node.js/Express backend algorithm engine.

## 2. Technical Stack
* **Frontend:** Angular 18 (TypeScript), TailwindCSS, Chart.js (for rendering metrics).
* **Backend:** Node.js, Express.js.
* **Data Processing Libraries:** `multer` (file buffering), `papaparse` (CSV ingestion), `xlsx` (Excel interactions), `string-similarity` (fuzzy matching name resolutions).
* **Reporting Output:** `pptxgenjs` (slide generation).
* **External Integrations:** Jira Cloud REST API (v3/search/jql).

## 3. System Behaviors & Feature Workflows

### 3.1 Data Ingestion & Synchronization
* **Requirements:** The user must be able to stage five critical master files and one optional Jira dump file via the Angular client.
* **Behavior:** 
  - If "CSV Mode" is selected, the user manually uploads the Jira export.
  - If "API Mode" is selected, the system triggers `/api/jira/extract` via a POST request, utilizing Server-Sent Events (SSE) to push real-time row extraction progress directly to the frontend progress bar.
* **Validation:** Before executing report generation, all staged files must be uploaded simultaneously via `FormData` to the `/api/upload/*` endpoints, saving them into the backend `/uploads/` cache.

### 3.2 Pre-Report Generation Gate
* **Requirements:** Force users to perform cognitive verification of operational blindspots.
* **Behavior:** Before invoking the calculation hooks, the UI triggers a modal containing three mandatory checkboxes: Projects Updated, Employees Updated, Revenue Updated. 
* **Rule:** The "Generate Dashboard" button remains disabled until the model is 100% acknowledged (`isVerified === true`).

### 3.3 Variance & Verification Algorithms (Health Stats)
* **API Endpoint:** `/api/sync-health`
* **Condition 1 (Action Required):** Compares the `Resource List` against ingested `Jira` logs. If a resource appears in HR timesheets but has NO associated Jira worklog data (or if variations exceed a programmed tolerance, e.g., 15%), it is flagged.
* **Condition 2 (Jira Defaulters):** Calculates `totalLoggedHours` per assigned resource. If `totalLoggedHours` < `requiredHours` (defaulting to 160 hrs/month if not explicitly defined), the resource is logged as a defaulter.
* **Outputs:** Returns aggregate totals for frontend KPI rendering. Corresponding detailed arrays are mapped to endpoints `/api/export-action-required` and `/api/jira-defaulters` for Excel `xlsx` exportation.

### 3.4 Report Generation Engine
* **Requirements:** Distill the cross-verified arrays into financial formats.
* **Behavior:** Endpoints like `/api/calculate` or `/api/calculate-resource` trigger underlying math scripts (`finance-engine.js`, `resource-engine.js`). Calculated payload metrics are merged into native shapes (charts, tables) and exported natively to a `.pptx` file streamed down to the user's browser.

## 4. Error Handling & Edge Cases
* **Missing API Tokens/Auth:** Jira extraction throws HTTP 401/403. UI catches the stream exception and updates the status badge to red, persisting the last known state.
* **Invalid File Headers:** CSV parser fails gracefully, notifying the user which columns are disjointed relative to the expected schema.
* **Port / Process Locking:** Handled by standard Node HTTP error propagation (`ERR_CONNECTION_REFUSED`).
