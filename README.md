# Duck Farming — Complete Replacement

This package is the replacement frontend/backend migration for the **Duck Farming** website.

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

## Netlify variables
Set:
VITE_SUPABASE_URL=https://kaggeadntgpsxrhrhdxu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable/anon key>

Never put a Supabase service_role key in frontend code.

## Supabase
Run `duck_farming_complete.sql` in Supabase SQL Editor.

## Important
The GitHub connector previously returned HTTP 403 when attempting to commit the replacement. This ZIP is therefore the complete file set to upload to the intended `mhaseebj60-design/duck-farming` repository; it does not claim that GitHub was automatically updated.
