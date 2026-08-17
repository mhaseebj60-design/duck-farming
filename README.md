# Duck Farming — Netlify + Supabase

React + Vite + Supabase customer/admin website. Mobile-first duck-farming dashboard.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Put your Supabase Project URL and Publishable Key in `.env.local`.
3. You already ran the main schema and created `payment-slips`. Run `supabase/02_app_functions.sql` in Supabase SQL Editor.
4. Create an admin in Supabase Authentication, then use `supabase/03_create_admin.sql` with that user's UUID.
5. Run `npm install` then `npm run dev` to test.
6. Push the folder to GitHub and import the repository into Netlify.
7. Netlify build command: `npm run build`; publish directory: `dist`.
8. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Netlify environment variables.

## Security
Never put a Supabase secret/service-role key in this project. Use only the publishable key in browser code. Keep RLS enabled. Payment slips use a private Storage bucket.

## Business rules
One active duck lasts 80 days by default. One egg becomes due every 24 hours. Egg generation is performed by the database function `claim_due_eggs()` rather than trusting the customer's browser clock. Manual payment is recorded with TID + slip and requires admin approval.

Test all payment, approval, egg and withdrawal flows before accepting real money.
