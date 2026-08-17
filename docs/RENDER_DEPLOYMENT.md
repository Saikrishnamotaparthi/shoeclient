# Render Deployment Guide — SoleVault

Complete guide to deploy SoleVault on [Render](https://render.com).

---

## Prerequisites

- GitHub repository with your code
- Render account (free tier works for testing)
- Firebase project with Firestore enabled
- Razorpay account (test or live)
- Delhivery API token
- Shadowfax API key

---

## Architecture on Render

```
┌─────────────────────────────────────────────────────────────┐
│                        Render                                │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  Static Site     │    │  Web Service                 │   │
│  │  (Frontend)      │    │  (Backend API)               │   │
│  │                  │    │                              │   │
│  │  React + Vite    │───▶│  Node.js + Express           │   │
│  │  Built to dist/  │    │  Port 10000                  │   │
│  └──────────────────┘    └──────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────┐              ┌──────────────────────┐
│  Firebase Auth   │              │  Firebase Firestore  │
│  (Users)         │              │  (Database)          │
└──────────────────┘              └──────────────────────┘
         │
         ▼
┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
│  Razorpay        │  │  Delhivery   │  │  Shadowfax     │
│  (Payments)      │  │  (Shipping)  │  │  (Shipping)    │
└──────────────────┘  └──────────────┘  └────────────────┘
```

---

## Step 1: Prepare Your Repository

### 1.1 Ensure code is committed

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Verify .gitignore

Make sure `.env` files are NOT committed:
```bash
git status
# .env files should NOT appear
```

---

## Step 2: Deploy Backend (Web Service)

### 2.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `solevault-backend`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (for testing) or `Starter` (for production)

### 2.2 Set Environment Variables

Click **"Environment"** tab and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render default |
| `FRONTEND_URL` | `https://your-frontend.onrender.com` | Set after frontend deploy |
| `FIREBASE_PROJECT_ID` | `your-project-id` | From Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` | From service account JSON |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | From service account JSON (keep \n as literal) |
| `RAZORPAY_KEY_ID` | `rzp_live_xxx` or `rzp_test_xxx` | From Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | `your_secret` | From Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | `your_webhook_secret` | Set after webhook config |
| `DELHIVERY_API_TOKEN` | `your_token` | From Delhivery |
| `SHADOWFAX_API_KEY` | `your_key` | From Shadowfax |
| `SHADOWFAX_BASE_URL` | `https://dale.shadowfax.in/api` | Production URL |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `your_email@gmail.com` | |
| `SMTP_PASSWORD` | `your_app_password` | Gmail App Password |
| `SMTP_FROM` | `SoleVault <noreply@yourdomain.com>` | |

### 2.3 Deploy

Click **"Create Web Service"**. Render will:
1. Install dependencies
2. Build TypeScript
3. Start the server

Your backend URL: `https://solevault-backend.onrender.com`

### 2.4 Verify Backend

```bash
curl https://solevault-backend.onrender.com/api/health
# Should return: {"status":"ok"}
```

---

## Step 3: Deploy Frontend (Static Site)

### 3.1 Create Static Site

1. Go to Render Dashboard
2. Click **"New"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `solevault-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

### 3.2 Set Environment Variables

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://solevault-backend.onrender.com/api` |
| `VITE_FIREBASE_API_KEY` | From Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `your_sender_id` |
| `VITE_FIREBASE_APP_ID` | `your_app_id` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` (optional) |

### 3.3 Configure Redirects

In Render Static Site settings, add a **Redirect/Rewrite Rule**:

| Source | Destination | Action |
|--------|-------------|--------|
| `/*` | `/index.html` | Rewrite |

This ensures React Router works for all client-side routes.

### 3.4 Deploy

Click **"Create Static Site"**. Render will:
1. Install dependencies
2. Build the React app
3. Serve static files from CDN

Your frontend URL: `https://solevault-frontend.onrender.com`

---

## Step 4: Update Backend CORS

After frontend is deployed, update the backend `FRONTEND_URL` environment variable:

```
FRONTEND_URL=https://solevault-frontend.onrender.com
```

Then redeploy the backend.

---

## Step 5: Configure Razorpay Webhook

### 5.1 Set Webhook URL

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **Webhooks**
3. Add webhook:
   - **URL:** `https://solevault-backend.onrender.com/api/webhooks/razorpay`
   - **Events:** `payment.captured`, `payment.failed`, `refund.failed`, `refund.processed`
   - **Secret:** Generate a strong secret (32+ chars)

### 5.2 Update Backend

Add the webhook secret to backend environment variables:
```
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Frontend Domain

1. In Render Static Site → **Settings** → **Custom Domains**
2. Add your domain (e.g., `www.solevault.com`)
3. Update DNS records as shown by Render

### 6.2 Backend Domain

1. In Render Web Service → **Settings** → **Custom Domains**
2. Add API domain (e.g., `api.solevault.com`)
3. Update DNS records

### 6.3 Update Environment Variables

Update all URLs to use custom domains:
- Backend: `FRONTEND_URL=https://www.solevault.com`
- Frontend: `VITE_API_URL=https://api.solevault.com/api`
- Razorpay: Update webhook URL

---

## Step 7: Production Checklist

- [ ] All environment variables set
- [ ] Backend health check returns `{"status":"ok"}`
- [ ] Frontend loads without errors
- [ ] User registration/login works
- [ ] Product browsing works
- [ ] Cart and checkout flow works
- [ ] Razorpay payment completes
- [ ] Order confirmation email sent
- [ ] Admin dashboard accessible
- [ ] Shipment booking works (Delhivery/Shadowfax)
- [ ] Webhook receives payment events

---

## Troubleshooting

### Backend won't start
- Check logs in Render Dashboard → Logs tab
- Verify `FIREBASE_PRIVATE_KEY` has literal `\n` (not actual newlines)
- Ensure `PORT` is set to `10000`

### Frontend shows blank page
- Check browser console for errors
- Verify `VITE_API_URL` is correct
- Ensure redirect rule is set (`/* → /index.html`)

### CORS errors
- Verify `FRONTEND_URL` in backend matches frontend URL exactly
- Redeploy backend after changing env vars

### Payments fail
- Check Razorpay dashboard for errors
- Verify webhook URL is accessible
- Ensure `RAZORPAY_WEBHOOK_SECRET` matches dashboard

### Firebase errors
- Verify service account JSON fields are correct
- Ensure Firestore is enabled in Firebase Console
- Check Firestore rules allow read/write

---

## Cost Estimate

| Service | Free Tier | Paid (Starter) |
|---------|-----------|----------------|
| Web Service (Backend) | 750 hrs/month | $7/month |
| Static Site (Frontend) | 100GB bandwidth | Free |
| **Total** | **Free** | **$7/month** |

Free tier spins down after 15 min of inactivity (first request takes ~30s). For production, use Starter plan.

---

## Auto-Deploy

Render auto-deploys on every push to `main`. To disable:
1. Go to service → **Settings**
2. Disable **Auto-Deploy**

---

## Monitoring

1. **Logs:** Render Dashboard → Logs tab
2. **Metrics:** Render Dashboard → Metrics tab
3. **Health:** Set up Render health checks:
   - Path: `/api/health`
   - Interval: 30 seconds
