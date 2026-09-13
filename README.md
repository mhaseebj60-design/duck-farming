# Duck Farming — Complete Fix Package

This package replaces the broken SQL and `App.jsx`.

## Critical SQL fix
The previous Supabase error:
`42P13: cannot change return type of existing function get_my_profile()`
is fixed by explicitly running:
`drop function if exists public.get_my_profile();`
before recreating the function.

## Files
- `App.jsx` — complete customer/admin application
- `duck_farming_complete.sql` — complete database/RLS/RPC/storage replacement
- `src/main.jsx`
- `src/styles.css`
- `lib/supabase.js`
- `package.json`
- `netlify.toml`
- `index.html`

## Netlify variables
Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do NOT use a service-role key in the frontend.

## Important
Run the SQL in Supabase SQL Editor. If your SQL editor still contains the old failed query, replace it with this complete SQL file instead of running only the last few lines.
