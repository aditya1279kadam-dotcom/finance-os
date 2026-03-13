# Code Explanation & Architectural Overview

## 1. High-Level Architecture
FinanceOS follows a standard Client-Server architectural pattern:
* **Frontend (Client):** An Angular 18 Single Page Application (SPA) responsible for UI rendering, staging data files (CSV/Excel), collecting Jira credentials, managing validation gates, and presenting the generated dashboards.
* **Backend (Server):** A Node.js application built with Express.js that acts as the computation and algorithmic engine. It parses file binaries, connects directly to Jira's REST API, runs cross-referencing algorithms for project costing and resource utilization, and dynamically outputs `.pptx` or `.xlsx` files.
* **Communication:** The frontend communicates via REST endpoints (`/api/*`). For long-running tasks like fetching thousands of Jira worklogs, it exclusively utilizes Server-Sent Events (SSE) `/api/jira/extract` to push incremental progress states without HTTP timeouts.

## 2. Folder Structure
### 2.1 Backend (`/poc-project/backend`)
* `server.js`: The central Express application. Contains all routing definitions (`/api/upload`, `/api/calculate`, `/api/sync-health`, `/api/jira/extract`). Handles CORS, Multer disk storage config, global file caching maps (`req.app.locals`), and the SSE broadcast pipeline for Jira integration.
* `finance-engine.js`: The algorithmic core for project-level math. Maps Jira worklogs to internal Projects, calculates gross margins utilizing the rate card/overhead data, and instantiates the `PptxGenJS` logic to stamp financial slides.
* `resource-engine.js`: Analyzes utilization. Compares expected total HR hours versus what each individual logged against Jira, checking for under/over utilized employee performance metrics.
* `/uploads/`: The physical staging directory where Multer drops temporal `.csv` or `.xlsx` blobs prior to memory parsing.

### 2.2 Frontend (`/poc-project/frontend/src/app`)
* `/components/`: Reusable, atomic UI widgets (e.g., `CategoryCardComponent`, `HeaderComponent`, `LayoutComponent`).
* `/pages/sync-center/sync-center.component.ts`: The control panel. Handles staging up to 6 distinct file types. Orchestrates the Pre-Report verification modal, queries `/api/sync-health` for the `Action Required` and `Jira Defaulters` KPIs, and parses backend Server-Sent Events for the Jira API progress bar.
* `/pages/dashboard/`: Contains the master reporting views (e.g., `FinancialDashboardComponent`) that map calculated backend metrics (via Chart.js natively or by consuming the PPTX generation stream).
* `/services/finance-api.service.ts`: An injectable wrapper handling all `HttpClient` calls to the Node server, wrapping operations in Angular's `firstValueFrom` paradigm.

## 3. Key Logic & Algorithms

### 3.1 Server-Sent Events (SSE) for Jira Extraction (`server.js`)
* **Logic:** Jira pagination limits searches (JQL) to 50 results per query. Requesting 3,000+ worklogs inherently takes time. 
* **Implementation:** The `/api/jira/extract` endpoint initially sets `Content-Type: text/event-stream`. For each 50-item page, it downloads worklogs, processes them, writes to the output CSV locally, and executes asynchronous `res.write()` statements dispatching JSON payloads to the frontend showcasing `rowsExtracted`, `percent`, and `currentIssue`.

### 3.2 Automated Anomaly Detection (`/api/sync-health` & `/api/export-action-required`)
* **Gross Anomaly Matching:** Iterates through `attendanceState.data` (HR records). Identifies matches in `projectState.jiraDump`. If an HR resource is completely absent in the Jira maps, their record is instantly appended to the `Orphaned / Missing Resources` exception bucket.
* **Jira Defaulters Identification:** For each `resourceList` object, the system tallies the sum total of `timeSpentSeconds` filtered from Jira worklogs for that specific user. If the aggregate sum `/ 3600` is less than `user.RequiredHours` (falling back to 160 hrs/mo), the user is formally flagged.
* **Fuzzy String Resolution:** Employs `string-similarity` (Sorensen-Dice coefficient) within mapping operations to resolve minor typos between strict HR system names and informal Jira usernames.

### 3.3 Executive Presentation Engine (`pptxgenjs` in `finance-engine.js`)
* **Logic:** Instead of forcing executives to parse CSV dumps, the app translates algorithmic outputs directly into PowerPoint slides.
* **Implementation:** `let pptx = new pptxgen();`. Iteratively builds slide objects (`pptx.addSlide()`). Utilizes native Chart building APIs (e.g., `pptx.addChart(pptx.ChartType.bar, data, opts)`) to inject interactive, precisely positioned visual vectors containing calculated margin metrics and financial yields directly onto the `.pptx` canvas before piping the binary buffer directly to the user's `window.open` handle.

## 4. Environment Variables
* Both ends rely on `.env` (backend) or `.ts` environment files (frontend).
* **Crucial configurations:** `PORT` defaults, `API_URL` pointing dynamically to `localhost` vs `finance-os.onrender.com`.

## 5. Detailed Logic Flow: "Life of a Data Sync"
If you need to understand the exact processing timeline from file ingestion to executive dashboard generation, follow this step-by-step logic flow:

### Step 1: Ingestion & Parsing (The "Pull")
1. **Frontend Collection:** The Angular UI (`sync-center.component.ts`) collects up to six files via `<input type="file">`. 
2. **Multipart Upload:** When the user clicks "Generate", Angular wraps these files in `FormData` and `POST`s them to `/api/upload/:type`.
3. **Backend Buffering:** Express intercepts the request using `multer`. `multer` assigns a temporary physical file name and saves it to the `/uploads/` directory on the server.
4. **CSV/Excel Translation:** The `processFile()` utility in `server.js` reads the saved buffer. 
   - If it's a `.csv`, it leverages `papaparse` to stream and convert comma-separated strings into native JSON Arrays.
   - If it's an `.xlsx` (Excel), it invokes the `xlsx` module, reading the first Worksheet and executing `XLSX.utils.sheet_to_json()` to achieve the same unified JSON structure.
5. **Caching:** The resulting JSON array is cached inside Node's global `req.app.locals[targetKey]` (e.g., `app.locals.projectMaster`), making it instantly accessible to algorithmic endpoints without requiring immediate database writes.

### Step 2: The Core Algorithm (The "Math")
When the frontend requests `/api/calculate`, the `finance-engine.js` script takes over:
1. **Project Identification:** It grabs the `projectMaster` arrays and iterates. For each valid project, it creates an internal `Project` class model.
2. **Jira Worklog Attribution:** It iterates through the thousands of rows in the `jiraDump`. If the worklog's `ProjectKey` matches a modeled project, it adds the logged `timeSpentSeconds` to that project's ledger.
3. **Costing & Rate Calculation:** It cross-references the resource who logged the time against the `rateCard` JSON array.
   - **Formula:** `Cost = (timeSpentSeconds / 3600) * HourlyRate`.
   - **Overhead:** It pulls the generic non-billable overhead multipliers from the `overhead` sheet and layers it onto the baseline cost to find the True Cost.
4. **Revenue & Margins:** If the `projectMaster` defined fixed contract revenue, it calculates `Gross Margin = Revenue - True Cost`.
5. **Aggregation:** The engine reduces these discrete transactions into Portfolio Level metrics (e.g., Total Spend across all Delivery Projects vs Total Margin).

### Step 3: Output Generation (The "Export")
Once the metrics are finalized in memory, the system skips raw CSVs and builds a presentation.
1. **PPTX Initialization:** `let pptx = new pptxgen();` establishes a blank PowerPoint presentation buffer in memory.
2. **Slide Stamping:** The script builds Title Slides, then functional slides like "Project Profitability".
3. **Chart Vectors:** It utilizes the processed JSON arrays to plot `pptx.addChart()`. For example, mapping the top 10 most expensive projects onto a Bar Chart vector. Because it writes native MS Office vectors (not images), the charts remain interactive if a user opens the `.pptx` in PowerPoint to edit them.
4. **Streaming to Client:** Finally, `pptx.write('nodebuffer')` converts the presentation into binary. The Express controller sets the HTTP Headers to `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation` and streams the buffer back strictly to the user's browser, triggering a native file download.
