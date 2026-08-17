-- Create an admin user first in Supabase Authentication -> Users -> Add user.
-- Replace the UUID below with that user's UUID, then run this query.
update public.profiles set role='admin' where id='REPLACE_WITH_ADMIN_USER_UUID';
