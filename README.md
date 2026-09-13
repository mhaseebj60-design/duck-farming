# Duck Farming — Complete Fix

This replacement fixes two errors shown by the deployed site:

1. **Supabase 42P13** — `get_my_profile()` is dropped before its return type is recreated.
2. **Database error saving new user** — the signup trigger now calls `extensions.gen_random_bytes()` explicitly. In Supabase the pgcrypto function is in the `extensions` schema, while the old trigger used `search_path=public`.
3. **Admin relationship error** — `App.jsx` uses the explicit foreign-key relationship for `payment_requests -> profiles` and `withdrawal_requests -> profiles`, so PostgREST no longer sees two possible profile relationships.

## Correct structure

```text
duck-farming/
├── App.jsx
├── index.html
├── package.json
├── netlify.toml
├── .nvmrc
├── .env.example
├── duck_farming_complete.sql
├── lib/
│   └── supabase.js
└── src/
    ├── main.jsx
    └── styles.css
```

## Supabase

Run the **entire** `duck_farming_complete.sql` in the Supabase SQL Editor from the first line to the last line.

Do not put a service-role key in the website. Netlify must use the public Supabase publishable/anon key as `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Netlify

Build command: `npm run build`
Publish directory: `dist`
Node: `22.12.0`

After replacing the GitHub files, trigger a fresh Netlify deploy.
