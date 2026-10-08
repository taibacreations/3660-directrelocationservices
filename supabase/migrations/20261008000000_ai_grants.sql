-- File: supabase/migrations/20261008000000_ai_grants.sql
-- Gives the service_role key (used by the dashboard and n8n) access to the AI Leads
-- tables, views and functions. New Supabase projects don't grant this automatically.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- anything created later in public gets the same access
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

notify pgrst, 'reload schema';