# FinanceOS - Angular Frontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21. It serves as the Executive Analytics Dashboard for the FinanceOS platform.

## Local Development Server

Run `npm start` (or `ng serve`) to spin up the local development server. Navigate your browser to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

**Backend Requirement:** Ensure the Node.js backend (`backend/` directory) is also running locally on port `3000` to process the file uploads and data queries successfully.

## Build

Run `npm run build` (or `ng build`) to build the project. The build artifacts will be compiled into the `dist/frontend/browser/` directory.

---

### Step 1: Push your Code to GitHub
Vercel's easiest CI/CD pipeline runs directly from a Git repository. 
1. Commit all your latest changes in the `frontend` folder.
2. Push your code to a repository on GitHub, GitLab, or Bitbucket.

### Step 2: Configure `vercel.json` (Included)
Angular uses client-side routing. Vercel's edge servers need to know to return the `index.html` file rather than throwing a 404 error when refreshing a specific page. 

A `vercel.json` file is already included in the `frontend` directory with the following rewrite rules:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 3: Import Project in Vercel Dashboard
1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click **"Add New..."** -> **"Project"** from your dashboard.
3. Connect your GitHub account and **Import** your repository.
4. **Configure Project:**
   - **Framework Preset:** Vercel should automatically detect **Angular**. If not, select it from the dropdown.
   - **Root Directory:** If your Angular app is inside a subfolder (e.g. `frontend/`), click **Edit** and select the `frontend` directory. 
   - **Build Command:** Leave default (`ng build`).
   - **Output Directory:** Leave default (`dist/frontend`).

### Step 4: Environment Variables (Important)
Once deployed, the frontend needs to know where your corresponding external **Backend API** is hosted (e.g., Render, Heroku). 

Before pushing to GitHub, open `src/environments/environment.ts` (the production environment file) and update the `apiUrl` property to point to your live backend domain:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://finance-os.onrender.com' // <-- Update this to your live backend
};
```

### Step 5: Deploy
Click the **Deploy** button in the Vercel UI. Vercel will install dependencies, run the Angular build, and provide you with a live Production URL!

---

## Further help
To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
