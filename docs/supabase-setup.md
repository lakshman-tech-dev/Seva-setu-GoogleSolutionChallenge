# Supabase Setup Checklist

Complete these steps to configure the CommunityPulse database.

---

## 1. Create Project

- [ ] Go to [supabase.com](https://supabase.com) and sign in
- [ ] Click **New Project**
- [ ] Choose your organization
- [ ] Set project name: `communitypulse`
- [ ] Set a strong database password (save it somewhere safe)
- [ ] Select region closest to your users (e.g. `ap-south-1` for India)
- [ ] Click **Create new project** — wait ~2 minutes for provisioning

## 2. Run Schema SQL

- [ ] Go to **SQL Editor** → **New Query**
- [ ] Open `supabase/schema.sql` from your repo
- [ ] Copy the entire file contents and paste into the editor
- [ ] Click **Run** — should show "Success. No rows returned"
- [ ] Run `supabase/migrations/002_add_feedback_sms_sent_at.sql` the same way

### Tables created:
| Table | Purpose |
|-------|---------|
| `volunteers` | Registered volunteers with skills, location, reliability |
| `hotspot_clusters` | Geographic clusters of recurring needs |
| `community_needs` | Every community need report (core table) |
| `tasks` | Assignment linking a need to a volunteer |
| `beneficiary_feedback` | Yes/no confirmation from beneficiaries |

## 3. Get API Keys

- [ ] Go to **Settings → API**
- [ ] Copy **Project URL** → paste into `SUPABASE_URL` in `.env`
- [ ] Copy **anon (public) key** → paste into `SUPABASE_ANON_KEY` and frontend's `VITE_SUPABASE_ANON_KEY`
- [ ] Copy **service_role (secret) key** → paste into `SUPABASE_SERVICE_KEY`

> **Warning:** The `service_role` key bypasses Row Level Security. Never expose it in frontend code.

## 4. Verify Row Level Security

The schema already enables RLS and creates policies. Verify:

- [ ] Go to **Authentication → Policies**
- [ ] Confirm each table has policies listed (public read, authenticated write)
- [ ] If policies are missing, re-run the RLS section of `schema.sql`

## 5. Enable Realtime

The schema adds `community_needs` and `tasks` to the realtime publication. Verify:

- [ ] Go to **Database → Replication**
- [ ] Under **supabase_realtime**, confirm `community_needs` and `tasks` are listed
- [ ] If not, run:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE community_needs;
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ```

## 6. Seed Test Data (Optional)

```bash
cd backend
node seed.js
```

Or paste the seed SQL from the bottom of `schema.sql` (uncomment the `SEED DATA` section).

---

## Quick Verify

Once setup is complete, test with:

```bash
# Should return empty array (no needs yet)
curl https://YOUR_PROJECT.supabase.co/rest/v1/community_needs \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
