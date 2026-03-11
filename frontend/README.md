# FinanceOS - Angular Frontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21. It serves as the Executive Analytics Dashboard for the FinanceOS platform.

## Local Development Server

Run `npm start` (or `ng serve`) to spin up the local development server. Navigate your browser to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

**Backend Requirement:** Ensure the Node.js backend (`backend/` directory) is also running locally on port `3000` to process the file uploads and data queries successfully.

## Build

Run `npm run build` (or `ng build`) to build the project. The build artifacts will be compiled into the `dist/frontend/browser/` directory.

---

## 🚀 Deployment to Vercel

Vercel provides a seamless hosting environment specifically optimized for frontend frameworks like Angular. Follow these steps to deploy this application to Vercel:

### Step 1: Install Vercel CLI (Optional but recommended)
If you prefer deploying from your terminal instead of the Vercel Web Dashboard, install the Vercel CLI globally:
```bash
npm i -g vercel
```

### Step 2: Configure `vercel.json` (Included)
Angular uses client-side routing. This means when a user refreshes the page on `/project-dashboard`, Vercel's edge servers need to know to return the `index.html` file rather than throwing a 404 error. 

Ensure a `vercel.json` file exists in the root of the `frontend` folder containing the following rewrite rules:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 3: Deploy via CLI
Navigate to the `frontend` folder in your terminal and execute:
```bash
vercel
```
1. It will prompt you to log in to Vercel.
2. It will ask to set up and deploy (Type `Y`).
3. Which scope do you want to deploy to? (Select your profile).
4. Link to existing project? (Type `N`).
5. What's your project's name? (e.g. `financeos-frontend`).
6. In which directory is your code located? (Press Enter for default `./`).
7. Want to modify these settings? (Type `N` — Vercel strictly auto-detects Angular 18 settings).

Vercel will build the application in the cloud and return a Production URL.

### Step 4: Environment Variables (Important)
Once deployed, the frontend needs to know where your corresponding external **Backend API** is hosted (e.g., Render, Heroku). 

Before deploying to Vercel, open `src/environments/environment.ts` (this is the production environment file) and update the `apiUrl` property to point to your live backend domain:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-domain.onrender.com' // <-- Update this URL
};
```

When you run `npm start` locally, Angular automatically uses `environment.development.ts` which is safely configured to hit `http://localhost:3000`. When Vercel runs `ng build` in the cloud, it swaps in your production `apiUrl` dynamically!

---

## Further help
To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
