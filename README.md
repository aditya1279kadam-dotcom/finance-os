# FinanceOS | Executive Profitability & P&L Dashboard

## 🚀 Deployment Guide
This project has been intelligently split into a decoupled Frontend and Backend to easily deploy on free cloud providers securely.

### 1. Backend Deployment (Render / Railway / Fly.io)
**Recommended Platform**: **[Render](https://render.com/)** (Free Tier available)

**Steps:**
1. Push this code to a GitHub repository.
2. Go to the Render Dashboard -> **New** -> **Web Service**.
3. Connect your GitHub repository and select the `backend` directory as the Root Directory.
4. Render will automatically detect the Node.js setup using the `package.json`.
5. Create the following **Environment Variables** in Render:
   - `JIRA_URL`: (Your Jira domain url)
   - `JIRA_EMAIL`: (Your Jira email)
   - `JIRA_API_TOKEN`: (Your Jira API token)
   *(Note: `PORT` is dynamically provided by Render in production)*
6. Click **Deploy**. Note the URL Render provides (e.g., `https://financeos-backend.onrender.com`).

### 2. Frontend Deployment (Vercel / Netlify)
**Recommended Platform**: **[Vercel](https://vercel.com/)** (Free Tier available)

**Steps:**
1. Go to the Vercel Dashboard -> **Add New** -> **Project**.
2. Connect your GitHub repository.
3. Select the `frontend` folder as the **Root Directory**. Vercel will automatically detect `Vite` and configure the build settings.
4. Open the **Environment Variables** section and add:
   - `VITE_API_BASE_URL`: The deployed URL you received from your backend (e.g., `https://financeos-backend.onrender.com`).
5. Click **Deploy**. The frontend will compile and go live.

---

## 🛠️ Local Development

### Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Use your IDE or a text editor to set up your local `.env` file containing your JIRA credentials.
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Open another terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development framework:
   ```bash
   npm run dev
   ```
*(Frontend runs on `http://localhost:5173` locally, and connects seamlessly to the backend based on the local `frontend/.env` variables).*
