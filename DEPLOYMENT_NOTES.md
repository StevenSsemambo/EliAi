# Deployment Notes for Vercel

## IMPORTANT: Root Directory Setting
When deploying on Vercel, make sure:
- Framework Preset: **Vite**
- Root Directory: **./  (leave empty/default)**
- Build Command: **npm run build**
- Output Directory: **dist**

## Environment Variables (Optional)
Only needed if you want cloud sync:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

App works fully offline WITHOUT these variables.
