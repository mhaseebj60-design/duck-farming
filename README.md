# Duck Farming — Complete Replacement V2

This is the corrected complete replacement package for the **Duck Farming** site.

## Build/deployment fix included
- `src/main.jsx` is now in the correct Vite source folder.
- `src/styles.css` is now in the correct Vite source folder.
- `index.html` now loads `/src/main.jsx`.
- `src/main.jsx` correctly imports the root `App.jsx` with `../App`.
- Netlify is pinned to Node `22.12.0`, compatible with the included Vite version.
- `package.json` includes the same Node requirement.

## Included
- React/Vite frontend
- Premium responsive UI
- Customer authentication
- Admin/customer role routing
- Multiple duck types
- Duck price, lifetime (1–100 days), egg interval, enable/disable
- Payment methods CRUD
- Payment slip + TID submission
- Admin deposit approval/rejection
- First egg on approved purchase
- Automatic due-egg claiming
- Referral ID registration
- Referral reward: one egg every 24h for 3 days after referred customer buys a duck and payment is approved
- Per-customer referral commission 1–100%
- Withdrawal ranges/rates CRUD
- Withdrawal review
- Customer management
- Site/admin settings
- Supabase Storage payment-slips bucket
- Netlify SPA redirect

## Supabase environment variables
Set these in Netlify:
- `VITE_SUPABASE_URL=https://kaggeadntgpsxrhrhdxu.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable/anon key>`

Never put a Supabase `service_role` key in frontend code.

## Supabase database
Run `duck_farming_complete.sql` in the Supabase SQL Editor.

## Correct project structure
```text
duck-farming/
├── App.jsx
├── index.html
├── package.json
├── netlify.toml
├── .nvmrc
├── .env.example
├── duck_farming_complete.sql
├── README.md
├── lib/
│   └── supabase.js
└── src/
    ├── main.jsx
    └── styles.css
```

## Important
This ZIP is a file replacement package. It does not claim that the GitHub repository was automatically updated.
