# Duck Farming — Complete Replacement V3

Premium React + Vite + Supabase website.

## Correct file structure
- `App.jsx` — project root
- `src/main.jsx` — Vite entry
- `src/styles.css` — premium UI styles
- `lib/supabase.js` — Supabase client
- `duck_farming_complete.sql` — complete database repair/setup

## Deployment
1. Replace the files in the `duck-farming` GitHub repository with this package.
2. Run `duck_farming_complete.sql` once in the correct Supabase project SQL Editor.
3. In Netlify, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`).
4. Trigger a fresh deploy.

Never put a Supabase service-role key in the frontend or Netlify public environment.
