-- File: supabase/migrations/20261008010000_ai_intake.sql
-- One call for n8n Workflow 1: logs Granot events and saves new leads.
-- p_channel: 'granot' | 'website'
-- p_event:   'new_lead' | 'priority_update' | 'booking' | 'unknown'

create or replace function ai_intake(p_channel text, p_event text, p_lead jsonb, p_raw jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_event_id bigint; r jsonb;
begin
  if p_channel = 'granot' then
    insert into ai_granot_events (event, job_number, payload)
    values (p_event, ai_nz(p_lead->>'job_number'), coalesce(p_raw, '{}'::jsonb))
    returning id into v_event_id;
  end if;

  if coalesce(p_event, 'new_lead') <> 'new_lead' then
    return jsonb_build_object('action', 'event_stored', 'event', p_event, 'contact_now', false);
  end if;

  r := ai_ingest_lead(p_channel, p_lead);

  if v_event_id is not null then
    update ai_granot_events set lead_id = (r->>'lead_id')::uuid, result = r->>'action' where id = v_event_id;
  end if;
  return r;
end $$;

revoke execute on function ai_intake(text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function ai_intake(text, text, jsonb, jsonb) to service_role;

notify pgrst, 'reload schema';