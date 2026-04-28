# 🩵 CommunityPulse

**Smart NGO Volunteer Coordination Platform — Google Solution Challenge 2026**

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        INTAKE CHANNELS                               │
│   WhatsApp  ──┐                                                      │
│   SMS       ──┤──→  Twilio Webhooks ──→  Express API (Railway)       │
│   Web Form  ──┤         │                     │                      │
│   Voice     ──┘         ▼                     ▼                      │
│                  ┌─────────────┐     ┌──────────────────┐            │
│                  │ Claude AI   │     │ Priority Scoring  │            │
│                  │ Triage      │────▶│ Algorithm         │            │
│                  │ (Haiku)     │     │ (4-component)     │            │
│                  └─────────────┘     └────────┬─────────┘            │
│                                               │                      │
│                  ┌────────────────────────────▼─────────┐            │
│                  │         Supabase (PostgreSQL)         │            │
│                  │  community_needs │ volunteers │ tasks │            │
│                  │  clusters │ beneficiary_feedback      │            │
│                  │         + Realtime Subscriptions      │            │
│                  └──────┬───────────────────┬───────────┘            │
│                         │                   │                        │
│              ┌──────────▼──────┐   ┌───────▼──────────┐             │
│              │  Coordinator    │   │  Volunteer PWA   │             │
│              │  Dashboard      │   │  (Mobile-first)  │             │
│              │  (React/Vite)   │   │  (React/Vite)    │             │
│              │  Vercel         │   │  Vercel          │             │
│              └─────────────────┘   └──────────────────┘             │
│                                                                      │
│   Matching Engine ──→ Twilio SMS/WhatsApp ──→ Volunteer Notification │
│   Feedback Cron   ──→ Twilio SMS ──→ Beneficiary Satisfaction Survey │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 18 | Backend + frontend runtime |
| **npm** | ≥ 9 | Package management |
| **Supabase** | Cloud account | PostgreSQL database + Realtime |
| **Anthropic** | API key | Claude AI triage (claude-haiku-4-5-20251001) |
| **Twilio** | Account + sandbox | WhatsApp / SMS webhooks |
| **OpenCage** | API key (free tier) | Geocoding location text → lat/lng |
| **Git** | Any | Version control |

Optional:
- **Railway** account — backend deployment
- **Vercel** account — frontend deployment
- **OneSignal** account — push notifications
- **Docker** — containerized backend

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/communitypulse.git
cd communitypulse

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your Supabase, Anthropic, Twilio keys

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your Supabase public URL + anon key
```

### 3. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the entire contents of `supabase/schema.sql` and run it
4. Run `supabase/migrations/002_add_feedback_sms_sent_at.sql`
5. Copy your **Project URL**, **anon key**, and **service_role key** from **Settings → API**
6. Paste them into `backend/.env`

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open the coordinator dashboard at **http://localhost:5173**
Open the volunteer PWA at **http://localhost:5173/volunteer**

### 5. Seed Sample Data (Optional)

```bash
cd backend
node seed.js
```

---

## API Endpoint Documentation

Base URL: `http://localhost:4000/api`

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health status |

### Needs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/needs/submit` | Submit a new community need (AI triage pipeline) |
| `GET` | `/api/needs` | List needs (paginated, filtered) |
| `GET` | `/api/needs/stats/summary` | Dashboard summary statistics |
| `GET` | `/api/needs/map/pins` | Lightweight map markers for Leaflet |
| `GET` | `/api/needs/:id` | Single need detail + volunteer suggestions |
| `PATCH` | `/api/needs/:id/status` | Update need status with side-effects |

<details>
<summary><b>POST /api/needs/submit</b></summary>

**Body:**
```json
{
  "raw_input": "Family of 5 near Saket metro has no food since 2 days",
  "source_channel": "web_form",
  "phone_number": "+919876543210"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "id": "uuid", "category": "food", "priority_score": 82.5, "..." },
  "triage": { "category": "food", "urgency_score": 85, "vulnerability_flags": ["child"], "..." },
  "cluster": { "id": "uuid", "report_count": 4 }
}
```
</details>

<details>
<summary><b>GET /api/needs</b></summary>

**Query params:** `?status=open&category=food&limit=50&offset=0`

**Response:**
```json
{
  "success": true,
  "count": 42,
  "limit": 50,
  "offset": 0,
  "data": [{ "id": "uuid", "category": "food", "priority_score": 82.5, "assigned_volunteer_name": "Priya", "..." }]
}
```
</details>

<details>
<summary><b>GET /api/needs/stats/summary</b></summary>

```json
{
  "success": true,
  "data": {
    "total_open": 12,
    "total_completed_today": 5,
    "total_volunteers_active": 8,
    "top_categories": [{ "category": "food", "count": 6 }],
    "avg_priority_score_open": 61.3,
    "hotspot_clusters_active": 2
  }
}
```
</details>

<details>
<summary><b>PATCH /api/needs/:id/status</b></summary>

**Body:**
```json
{ "status": "completed", "coordinator_notes": "Food delivered by Rahul" }
```

Side-effects on `completed`: volunteer hours +2, SMS feedback sent to beneficiary.
</details>

### Volunteers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/volunteers` | List all volunteers |
| `GET` | `/api/volunteers/:id` | Single volunteer detail |
| `POST` | `/api/volunteers` | Register a new volunteer |
| `PATCH` | `/api/volunteers/:id` | Update volunteer profile |
| `GET` | `/api/volunteers/:id/tasks` | Tasks assigned to a volunteer |

<details>
<summary><b>POST /api/volunteers</b></summary>

**Body:**
```json
{
  "name": "Priya Sharma",
  "phone": "+919876543210",
  "email": "priya@example.com",
  "skills": ["medical", "first_aid", "counseling"],
  "latitude": 28.6139,
  "longitude": 77.2090
}
```
</details>

### Triage & Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/triage/analyze` | Dry-run AI triage (no DB save) |
| `POST` | `/api/triage/assign` | Assign volunteer to need + notify |
| `PATCH` | `/api/triage/task/:id` | Update task status (accept/complete/fail) |

<details>
<summary><b>POST /api/triage/assign</b></summary>

**Body:**
```json
{ "need_id": "uuid", "volunteer_id": "uuid (optional — auto-match if omitted)" }
```
</details>

### Clusters

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clusters` | List active hotspot clusters |
| `GET` | `/api/clusters/:id` | Single cluster detail |
| `POST` | `/api/clusters/rebuild` | Rebuild all clusters |

### Trust Map

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trustmap/data` | Aggregated feedback by grid cell |

<details>
<summary><b>GET /api/trustmap/data</b></summary>

```json
{
  "success": true,
  "cell_size_degrees": 0.01,
  "count": 8,
  "data": [
    { "lat": 28.5250, "lon": 77.2150, "yes_count": 3, "no_count": 5, "total": 8, "trust_score": 38 }
  ]
}
```
</details>

### Webhooks (Twilio)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/whatsapp` | WhatsApp incoming message webhook |
| `POST` | `/api/webhooks/sms` | SMS incoming message webhook |
| `POST` | `/api/webhooks/feedback` | SMS feedback reply (YES/NO) |
| `GET` | `/api/webhooks/feedback/:needId` | Direct feedback link from SMS |

---

## Deployment

### Backend → Railway

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo, set root directory to `backend`
4. Add all environment variables from `.env.example` in Railway settings
5. Railway auto-detects the Dockerfile and deploys
6. Copy your Railway public URL (e.g. `https://communitypulse-api.up.railway.app`)
7. Set `BACKEND_URL` to this URL in Railway env vars
8. Set `FRONTEND_URL` to your Vercel URL for CORS
9. Update your Twilio webhook URLs to point to Railway

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. Select your repo, set root directory to `frontend`
3. Set build command: `npm run build` and output: `dist`
4. Add environment variables:
   - `VITE_API_URL` = your Railway backend URL
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy — Vercel handles the React Router rewrites via `vercel.json`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 + TailwindCSS 3 |
| State Management | React Query (TanStack Query v5) |
| Maps | Leaflet + react-leaflet + CartoDB dark tiles |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + Realtime) |
| AI Engine | Anthropic Claude Haiku (claude-haiku-4-5-20251001) |
| SMS/WhatsApp | Twilio |
| Push Notifications | OneSignal |
| Geocoding | OpenCage |
| Backend Hosting | Railway |
| Frontend Hosting | Vercel |

---

## Project Structure

```
communitypulse/
├── backend/
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   │   ├── needs.js     # Community needs CRUD + stats + map pins
│   │   │   ├── volunteers.js # Volunteer registration + management
│   │   │   ├── webhooks.js  # Twilio WhatsApp/SMS/feedback webhooks
│   │   │   ├── triage.js    # AI triage + volunteer assignment
│   │   │   ├── clusters.js  # Hotspot cluster management
│   │   │   └── trustmap.js  # Community trust map data
│   │   ├── services/        # Business logic services
│   │   │   ├── claudeService.js      # AI triage (2-step: translate + triage)
│   │   │   ├── matchingService.js    # Volunteer matching (composite scoring)
│   │   │   ├── clusterService.js     # Geographic clustering
│   │   │   ├── geocodingService.js   # OpenCage geocoding
│   │   │   ├── notificationService.js # Twilio + OneSignal
│   │   │   ├── feedbackService.js    # Automated 24h feedback cron
│   │   │   └── supabaseService.js    # Database query helpers
│   │   ├── middleware/
│   │   │   ├── validate.js   # express-validator rules
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── priorityScore.js # 4-component scoring algorithm
│   │   │   └── distanceCalc.js  # Haversine distance
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # HTTP server + cron startup
│   ├── Dockerfile
│   ├── package.json
│   ├── seed.js               # Demo data seeder
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level pages
│   │   ├── hooks/            # React Query + Realtime + Geolocation
│   │   └── services/         # Axios API client
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
└── supabase/
    ├── schema.sql            # Full database schema
    └── migrations/           # Incremental migrations
```

---

## License

Built for the Google Solution Challenge 2026.
