-- File: supabase/migrations/20261007000000_ai_lead_system.sql
-- (Run once in Supabase → SQL Editor. Not imported by the app.)

-- =====================================================================
-- Direct Relocation Services — AI Lead Response & Warm Transfer System
-- Phase 1 database: ai_leads, dedupe, source filter, sequence engine,
-- contact-window rules (business hours + customer 8am–9pm), opt-outs,
-- SMS/call logs, dashboard views.
--
-- Run once in a NEW Supabase project (SQL Editor → paste → Run).
-- n8n talks to this DB with the service_role key via RPC (/rest/v1/rpc/...).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. SETTINGS (single row)
-- ---------------------------------------------------------------------
create table if not exists ai_settings (
  id                    int primary key default 1 check (id = 1),
  business_tz           text not null default 'America/New_York',
  transfer_number       text not null default '+18553783110',
  quiet_start           time not null default '08:00',   -- customer local
  quiet_end             time not null default '21:00',   -- customer local
  call_cutoff_minutes   int  not null default 10,        -- no new ai_calls this close to closing
  dedupe_days           int  not null default 30,
  after_hours_mode      text not null default 'hold'     -- 'hold' = Phase 1, 'sequence' = Phase 2
                        check (after_hours_mode in ('hold','sequence')),
  ai_enabled            boolean not null default true,   -- global kill switch
  stop_footer           text not null default 'Reply STOP to unsubscribe.',
  updated_at            timestamptz not null default now()
);
insert into ai_settings (id) values (1) on conflict do nothing;

-- AI call disclosure ("this is an automated assistant") at the start of the call:
--   'california' = only for California leads (default), 'all' = every call, 'off' = never.
-- The assistant always answers honestly if asked whether it is an AI.
alter table ai_settings add column if not exists ai_disclosure text not null default 'california';
do $$ begin
  alter table ai_settings add constraint ai_settings_disclosure_chk check (ai_disclosure in ('off','california','all'));
exception when duplicate_object then null; end $$;

-- California = move-from state CA, or a California phone area code
create or replace function ai_is_california(p_state text, p_phone text) returns boolean
language sql immutable as $fn$
  select upper(coalesce(p_state,'')) = 'CA'
      or substr(coalesce(p_phone,''), 3, 3) = any (array[
         '209','213','279','310','323','341','350','357','369','408','415','424','442','510','530',
         '559','562','619','626','628','650','657','661','669','707','714','738','747','760','805',
         '818','820','831','837','840','858','909','916','925','949','951'])
$fn$;

-- Business hours in business_tz. dow: 0=Sun … 6=Sat. No row = closed.
create table if not exists ai_business_hours (
  dow         int primary key check (dow between 0 and 6),
  open_time   time not null,
  close_time  time not null,
  check (close_time > open_time)
);
insert into ai_business_hours (dow, open_time, close_time) values
  (1,'09:00','19:00'),(2,'09:00','19:00'),(3,'09:00','19:00'),
  (4,'09:00','19:00'),(5,'09:00','19:00'),(6,'10:00','16:00')
on conflict (dow) do nothing;

create table if not exists ai_holidays (
  day   date primary key,
  label text
);

-- ---------------------------------------------------------------------
-- 2. LEAD SOURCES (admin decides which sources the AI contacts)
-- ---------------------------------------------------------------------
create table if not exists ai_lead_sources (
  name        text primary key,
  enabled     boolean not null default false,  -- unknown/new sources start OFF
  note        text,
  first_seen  timestamptz not null default now()
);
insert into ai_lead_sources (name, enabled, note) values
  ('Website Form', true, 'Fluent Forms quote form (direct webhook)')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. US state → time zone (customer local time for 8am–9pm rule)
-- Multi-zone states use the zone covering most of the population.
-- ---------------------------------------------------------------------
create table if not exists ai_state_timezones (
  state text primary key,
  tz    text not null
);
insert into ai_state_timezones (state, tz) values
 ('AL','America/Chicago'),('AK','America/Anchorage'),('AZ','America/Phoenix'),
 ('AR','America/Chicago'),('CA','America/Los_Angeles'),('CO','America/Denver'),
 ('CT','America/New_York'),('DE','America/New_York'),('DC','America/New_York'),
 ('FL','America/New_York'),('GA','America/New_York'),('HI','Pacific/Honolulu'),
 ('ID','America/Boise'),('IL','America/Chicago'),('IN','America/Indiana/Indianapolis'),
 ('IA','America/Chicago'),('KS','America/Chicago'),('KY','America/New_York'),
 ('LA','America/Chicago'),('ME','America/New_York'),('MD','America/New_York'),
 ('MA','America/New_York'),('MI','America/Detroit'),('MN','America/Chicago'),
 ('MS','America/Chicago'),('MO','America/Chicago'),('MT','America/Denver'),
 ('NE','America/Chicago'),('NV','America/Los_Angeles'),('NH','America/New_York'),
 ('NJ','America/New_York'),('NM','America/Denver'),('NY','America/New_York'),
 ('NC','America/New_York'),('ND','America/Chicago'),('OH','America/New_York'),
 ('OK','America/Chicago'),('OR','America/Los_Angeles'),('PA','America/New_York'),
 ('RI','America/New_York'),('SC','America/New_York'),('SD','America/Chicago'),
 ('TN','America/Chicago'),('TX','America/Chicago'),('UT','America/Denver'),
 ('VT','America/New_York'),('VA','America/New_York'),('WA','America/Los_Angeles'),
 ('WV','America/New_York'),('WI','America/Chicago'),('WY','America/Denver'),
 ('PR','America/Puerto_Rico')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. MESSAGE TEMPLATES (every SMS must end with the STOP footer)
-- Placeholders: {first_name} {from_city} {to_city} {sales_number}
-- ---------------------------------------------------------------------
create table if not exists ai_message_templates (
  key         text primary key,
  body        text not null,
  description text,
  updated_at  timestamptz not null default now(),
  constraint sms_has_stop_footer check (body like '%Reply STOP to unsubscribe.')
);
insert into ai_message_templates (key, body, description) values
 ('bh_initial',
  'Hi! This is Direct Relocation Services. We received your quote request and would love to help with your move! Are you ready to get your free quote? Call us at 855-378-3110 or reply YES and we''ll call you right now. Reply STOP to unsubscribe.',
  'Step 1 — immediate text (client-approved wording)'),
 ('bh_followup_1h',
  'Hi {first_name}, it''s Direct Relocation Services following up on your moving quote. A specialist is available now. Reply YES and we''ll call you right away, or call 855-378-3110. Reply STOP to unsubscribe.',
  'Step 3 — text at +1 hour (DRAFT, needs client approval)'),
 ('bh_next_morning',
  'Good morning {first_name}! Direct Relocation Services here. Still planning your move? Reply YES and a relocation specialist will call you now with your free quote. Reply STOP to unsubscribe.',
  'Step 5 — next business morning (DRAFT)'),
 ('bh_final',
  'Hi {first_name}, last message from Direct Relocation Services about your moving quote. If you''d still like a free quote, reply YES or call 855-378-3110 anytime. Reply STOP to unsubscribe.',
  'Step 7 — final text, day 3 (DRAFT)'),
 ('yes_after_hours',
  'Thanks {first_name}! Our team is offline right now. We''ll call you as soon as we open (Mon–Fri 9am–7pm, Sat 10am–4pm EST). Reply STOP to unsubscribe.',
  'Reply when customer says YES outside contact hours (DRAFT)'),
 ('missed_transfer',
  'Sorry {first_name}, our specialists were all on the line. Reply YES and we''ll call you right back, or call 855-378-3110. Reply STOP to unsubscribe.',
  'Sent when the transfer is not answered (DRAFT)'),
 ('opt_out_confirm',
  'You''ve been unsubscribed and won''t receive more messages from Direct Relocation Services. Reply STOP to unsubscribe.',
  'Confirmation for NO / NOT INTERESTED (STOP is confirmed by Twilio itself)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 5. SEQUENCE DEFINITION (editable without code changes)
-- timing = 'minutes'      → anchor + offset_minutes
-- timing = 'business_day' → Nth business day after anchor day, at local_time
--                           (null local_time = that day's opening time)
-- action: sms | call | mark_unresponsive
-- ---------------------------------------------------------------------
create table if not exists ai_sequence_steps (
  sequence        text not null,
  step_no         int  not null,
  action          text not null check (action in ('sms','call','mark_unresponsive')),
  timing          text not null check (timing in ('minutes','business_day')),
  offset_minutes  int,
  business_day    int,
  local_time      time,
  template_key    text references ai_message_templates(key),
  label           text,
  primary key (sequence, step_no)
);
insert into ai_sequence_steps
  (sequence, step_no, action, timing, offset_minutes, business_day, local_time, template_key, label) values
  ('bh',1,'sms', 'minutes',     0,   null, null,    'bh_initial',      'Text — immediate'),
  ('bh',2,'call','minutes',     5,   null, null,    null,              'AI call — +5 min'),
  ('bh',3,'sms', 'minutes',     60,  null, null,    'bh_followup_1h',  'Text — +1 hour'),
  ('bh',4,'call','minutes',     180, null, null,    null,              'AI call — +3 hours'),
  ('bh',5,'sms', 'business_day',null,1,    null,    'bh_next_morning', 'Text — next business morning'),
  ('bh',6,'call','business_day',null,1,    '14:00', null,              'AI call — next business afternoon'),
  ('bh',7,'sms', 'business_day',null,2,    '11:00', 'bh_final',        'Final text — day 3'),
  ('bh',8,'mark_unresponsive','business_day',null,3,null,null,         'Mark unresponsive')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 6. CORE TABLES
-- ---------------------------------------------------------------------
create table if not exists ai_leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  phone_e164          text not null,
  first_name          text,
  last_name           text,
  email               text,
  from_city text, from_state text, from_zip text,
  to_city   text, to_state   text, to_zip   text,
  move_date           date,
  source              text,                 -- primary source shown on dashboard
  origin_channel      text not null check (origin_channel in ('website','granot','manual')),
  granot_job_number   text,
  granot_source       text,
  assigned_rep        text,
  customer_tz         text,
  status              text not null default 'new' check (status in (
                        'new','held','active','opted_in','transferred','missed_transfer',
                        'opted_out','unresponsive','excluded','invalid')),
  status_reason       text,
  sequence            text not null default 'bh',
  sequence_anchor     timestamptz,
  attempt_count       int not null default 0,
  last_outbound_at    timestamptz,
  last_inbound_at     timestamptz,
  opted_in_at         timestamptz,
  transferred_at      timestamptz,          -- first successful live connection
  opted_out_at        timestamptz,
  unresponsive_at     timestamptz,
  raw                 jsonb not null default '{}'::jsonb,
  updated_at          timestamptz not null default now()
);
create index if not exists ai_leads_phone_idx   on ai_leads (phone_e164, created_at desc);
create index if not exists ai_leads_status_idx  on ai_leads (status);
create index if not exists ai_leads_created_idx on ai_leads (created_at desc);
create unique index if not exists ai_leads_job_uidx on ai_leads (granot_job_number) where granot_job_number is not null;

create table if not exists ai_opt_outs (
  phone_e164  text primary key,
  channel     text not null check (channel in ('sms','voice','admin','carrier')),
  keyword     text,
  lead_id     uuid references ai_leads(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists ai_tasks (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references ai_leads(id) on delete cascade,
  step_no       int,                      -- null = ad-hoc (YES reply, missed transfer)
  action        text not null check (action in ('sms','call','mark_unresponsive')),
  template_key  text references ai_message_templates(key),
  reason        text,                     -- 'sequence','yes_reply','inbound_reply','missed_transfer'
  run_at        timestamptz not null,
  status        text not null default 'pending'
                check (status in ('pending','processing','done','cancelled','failed')),
  attempts      int not null default 0,
  last_error    text,
  claimed_at    timestamptz,
  done_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists ai_tasks_due_idx on ai_tasks (run_at) where status = 'pending';
create index if not exists ai_tasks_lead_idx on ai_tasks (lead_id);

create table if not exists ai_messages (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references ai_leads(id) on delete set null,
  task_id     uuid references ai_tasks(id) on delete set null,
  direction   text not null check (direction in ('outbound','inbound')),
  from_number text,
  to_number   text,
  body        text not null,
  intent      text,                        -- inbound: yes | opt_out | other
  twilio_sid  text unique,
  status      text,                        -- queued/sent/delivered/failed/received
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists ai_messages_lead_idx on ai_messages (lead_id, created_at);

create table if not exists ai_calls (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references ai_leads(id) on delete set null,
  task_id           uuid references ai_tasks(id) on delete set null,
  vapi_call_id      text unique,
  reason            text,
  status            text not null default 'queued'
                    check (status in ('queued','in_progress','ended','failed')),
  outcome           text,   -- transferred | missed_transfer | opted_out | declined | no_answer | voicemail | busy | not_ready | error
  ended_reason      text,
  intent            text,
  duration_seconds  int,
  recording_url     text,
  transcript        text,
  summary           text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  raw               jsonb
);
create index if not exists ai_calls_lead_idx on ai_calls (lead_id, started_at);

-- Every warm transfer attempt (dashboard: completed vs missed)
create table if not exists ai_transfers (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references ai_leads(id) on delete set null,
  call_id     uuid references ai_calls(id) on delete set null,
  status      text not null check (status in ('completed','missed')),
  created_at  timestamptz not null default now()
);

-- Raw Granot webhook log (all events, incl. priority/booking for later use)
create table if not exists ai_granot_events (
  id          bigserial primary key,
  event       text,
  job_number  text,
  payload     jsonb not null,
  lead_id     uuid references ai_leads(id) on delete set null,
  result      text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. HELPERS
-- ---------------------------------------------------------------------
create or replace function ai_normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if length(d) = 10 then return '+1' || d; end if;
  if length(d) = 11 and left(d,1) = '1' then return '+' || d; end if;
  return null;   -- non-US / invalid → lead marked invalid
end $$;

create or replace function ai_parse_us_date(p text) returns date
language plpgsql immutable as $$
begin
  if p is null or btrim(p) = '' then return null; end if;
  if p ~ '^\d{1,2}/\d{1,2}/\d{4}$' then return to_date(p, 'MM/DD/YYYY'); end if;
  if p ~ '^\d{4}-\d{2}-\d{2}' then return left(p,10)::date; end if;
  return null;
exception when others then return null;
end $$;

create or replace function ai_nz(p text) returns text
language sql immutable as $$ select nullif(btrim(p), '') $$;

-- Is a contact allowed at moment t for a customer in tz ctz?
--   * inside business hours (business tz), not a holiday
--   * inside customer quiet window 8:00–21:00 (unknown tz → must pass ET *and* PT)
--   * ai_calls: not within call_cutoff_minutes of closing
create or replace function ai_is_contact_allowed(t timestamptz, ctz text, p_action text default 'sms')
returns boolean language plpgsql stable as $$
declare
  s ai_settings%rowtype;
  bt timestamp; bh ai_business_hours%rowtype; ct time; z text;
begin
  select * into s from ai_settings where id = 1;
  bt := t at time zone s.business_tz;
  if exists (select 1 from ai_holidays where day = bt::date) then return false; end if;
  select * into bh from ai_business_hours where dow = extract(dow from bt)::int;
  if not found then return false; end if;
  if bt::time < bh.open_time or bt::time >= bh.close_time then return false; end if;
  if p_action = 'call'
     and bt::time >= bh.close_time - make_interval(mins => s.call_cutoff_minutes) then
    return false;
  end if;
  foreach z in array case when ctz is null then array['America/New_York','America/Los_Angeles'] else array[ctz] end loop
    ct := (t at time zone z)::time;
    if ct < s.quiet_start or ct >= s.quiet_end then return false; end if;
  end loop;
  return true;
end $$;

-- Earliest moment >= t when contact is allowed (5-minute grid, searches 14 days)
create or replace function ai_next_allowed_time(t timestamptz, ctz text, p_action text default 'sms')
returns timestamptz language plpgsql stable as $$
declare c timestamptz; i int := 0;
begin
  if ai_is_contact_allowed(t, ctz, p_action) then return t; end if;
  c := date_trunc('hour', t) + make_interval(mins => (ceil(extract(minute from t) / 5.0) * 5)::int);
  if c <= t then c := c + interval '5 minutes'; end if;
  while i < 14 * 24 * 12 loop
    if ai_is_contact_allowed(c, ctz, p_action) then return c; end if;
    c := c + interval '5 minutes';
    i := i + 1;
  end loop;
  return null;
end $$;

-- Nth business day after the anchor's local date, at local_time (or opening time)
create or replace function ai_business_day_at(anchor timestamptz, n int, p_local time)
returns timestamptz language plpgsql stable as $$
declare
  s ai_settings%rowtype; d date; found_n int := 0; bh ai_business_hours%rowtype; lt time;
begin
  select * into s from ai_settings where id = 1;
  d := (anchor at time zone s.business_tz)::date;
  loop
    d := d + 1;
    select * into bh from ai_business_hours where dow = extract(dow from d)::int;
    if found and not exists (select 1 from ai_holidays where day = d) then
      found_n := found_n + 1;
      if found_n = n then
        lt := coalesce(p_local, bh.open_time);
        if lt < bh.open_time or lt >= bh.close_time then lt := bh.open_time; end if;
        return (d + lt) at time zone s.business_tz;
      end if;
    end if;
    exit when d > (anchor at time zone s.business_tz)::date + 30;
  end loop;
  return null;
end $$;

create or replace function ai_render_template(p_key text, p_lead ai_leads)
returns text language sql stable as $$
  select replace(replace(replace(replace(body,
          '{first_name}', coalesce(ai_nz(initcap(p_lead.first_name)), 'there')),
          '{from_city}',  coalesce(p_lead.from_city, '')),
          '{to_city}',    coalesce(p_lead.to_city, '')),
          '{sales_number}', '855-378-3110')
  from ai_message_templates where key = p_key
$$;

create or replace function ai_cancel_pending_tasks(p_lead uuid, p_reason text)
returns int language plpgsql as $$
declare n int;
begin
  update ai_tasks set status = 'cancelled', last_error = p_reason, done_at = now()
   where lead_id = p_lead and status = 'pending';
  get diagnostics n = row_count;
  return n;
end $$;

-- Build the follow-up sequence for a lead from ai_sequence_steps.
create or replace function ai_schedule_sequence(p_lead uuid, p_anchor timestamptz)
returns int language plpgsql as $$
declare
  l ai_leads%rowtype; st ai_sequence_steps%rowtype;
  planned timestamptz; t timestamptz; prev_planned timestamptz; prev_actual timestamptz;
  gap interval; n int := 0;
begin
  select * into l from ai_leads where id = p_lead;
  for st in select * from ai_sequence_steps where sequence = l.sequence order by step_no loop
    if st.timing = 'minutes' then
      planned := p_anchor + make_interval(mins => st.offset_minutes);
    else
      planned := ai_business_day_at(p_anchor, st.business_day, st.local_time);
    end if;
    t := planned;
    -- When an earlier step was pushed (e.g. lead came in near closing), keep
    -- the steps in order and spaced: same gap as planned, capped at 60 min, min 5 min.
    if prev_actual is not null then
      gap := greatest(interval '5 minutes', least(planned - prev_planned, interval '60 minutes'));
      t := greatest(planned, prev_actual + gap);
    end if;
    if st.action <> 'mark_unresponsive' then
      t := ai_next_allowed_time(t, l.customer_tz, st.action);
    end if;
    insert into ai_tasks (lead_id, step_no, action, template_key, reason, run_at)
    values (p_lead, st.step_no, st.action, st.template_key, 'sequence', t);
    prev_planned := planned; prev_actual := t; n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 8. RPC: ai_ingest_lead  (called by n8n for Fluent Forms and Granot)
-- p_channel: 'website' | 'granot' | 'manual'
-- p jsonb (normalized by n8n): first_name, last_name, full_name, phone, email,
--   from_city, from_state, from_zip, to_city, to_state, to_zip, move_date,
--   source, job_number, assigned_rep
-- Returns: { lead_id, action, contact_now, status }
--   action: created | merged_duplicate | excluded_source | opted_out | invalid_phone | ai_disabled
-- ---------------------------------------------------------------------
create or replace function ai_ingest_lead(p_channel text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s ai_settings%rowtype;
  v_phone text; v_source text; v_job text; v_first text; v_last text;
  v_src_enabled boolean; v_existing ai_leads%rowtype; v_id uuid; v_tz text;
  v_anchor timestamptz; v_status text; v_now timestamptz := now();
begin
  select * into s from ai_settings where id = 1;
  v_phone := ai_normalize_phone(p->>'phone');
  v_job   := ai_nz(p->>'job_number');
  v_source := coalesce(ai_nz(p->>'source'), case when p_channel = 'website' then 'Website Form' else 'Unknown' end);
  v_first := ai_nz(p->>'first_name');
  v_last  := ai_nz(p->>'last_name');
  if v_first is null and ai_nz(p->>'full_name') is not null then
    v_first := split_part(btrim(p->>'full_name'), ' ', 1);
    v_last  := coalesce(v_last, ai_nz(substr(btrim(p->>'full_name'), length(v_first) + 2)));
  end if;

  -- register new sources as disabled so admin can switch them on
  insert into ai_lead_sources (name, enabled) values (v_source, false) on conflict do nothing;
  select enabled into v_src_enabled from ai_lead_sources where name = v_source;

  if v_phone is null then
    insert into ai_leads (phone_e164, first_name, last_name, email, source, origin_channel,
                       granot_job_number, status, status_reason, raw)
    values ('invalid', v_first, v_last, ai_nz(p->>'email'), v_source, p_channel,
            v_job, 'invalid', 'missing or non-US phone', p)
    returning id into v_id;
    return jsonb_build_object('lead_id', v_id, 'action', 'invalid_phone', 'contact_now', false, 'status', 'invalid');
  end if;

  -- serialize concurrent webhooks for the same phone (website + Granot race)
  perform pg_advisory_xact_lock(hashtext(v_phone));

  -- DEDUPE: same Granot job number, or same phone inside the dedupe window
  select * into v_existing from ai_leads
   where (v_job is not null and granot_job_number = v_job)
      or (phone_e164 = v_phone and created_at > v_now - make_interval(days => s.dedupe_days))
   order by created_at asc limit 1;

  if found then
    update ai_leads set
      granot_job_number = coalesce(granot_job_number, v_job),
      granot_source     = case when p_channel = 'granot' then coalesce(granot_source, v_source) else granot_source end,
      assigned_rep      = coalesce(assigned_rep, ai_nz(p->>'assigned_rep')),
      email             = coalesce(email, ai_nz(p->>'email')),
      first_name        = coalesce(first_name, v_first),
      last_name         = coalesce(last_name, v_last),
      from_city = coalesce(from_city, ai_nz(p->>'from_city')), from_state = coalesce(from_state, upper(ai_nz(p->>'from_state'))),
      from_zip  = coalesce(from_zip,  ai_nz(p->>'from_zip')),
      to_city   = coalesce(to_city,   ai_nz(p->>'to_city')),   to_state   = coalesce(to_state,   upper(ai_nz(p->>'to_state'))),
      to_zip    = coalesce(to_zip,    ai_nz(p->>'to_zip')),
      move_date = coalesce(move_date, ai_parse_us_date(p->>'move_date')),
      raw       = raw || jsonb_build_object(p_channel, p),
      updated_at = v_now
    where id = v_existing.id;
    return jsonb_build_object('lead_id', v_existing.id, 'action', 'merged_duplicate',
                              'contact_now', false, 'status', v_existing.status);
  end if;

  v_tz := (select tz from ai_state_timezones where state = upper(ai_nz(p->>'from_state')));

  insert into ai_leads (phone_e164, first_name, last_name, email,
                     from_city, from_state, from_zip, to_city, to_state, to_zip, move_date,
                     source, origin_channel, granot_job_number, granot_source, assigned_rep,
                     customer_tz, status, raw)
  values (v_phone, v_first, v_last, ai_nz(p->>'email'),
          ai_nz(p->>'from_city'), upper(ai_nz(p->>'from_state')), ai_nz(p->>'from_zip'),
          ai_nz(p->>'to_city'),   upper(ai_nz(p->>'to_state')),   ai_nz(p->>'to_zip'),
          ai_parse_us_date(p->>'move_date'),
          v_source, p_channel, v_job, case when p_channel = 'granot' then v_source end,
          ai_nz(p->>'assigned_rep'), v_tz, 'new', jsonb_build_object(p_channel, p))
  returning id into v_id;

  if exists (select 1 from ai_opt_outs where phone_e164 = v_phone) then
    update ai_leads set status = 'opted_out', status_reason = 'previously opted out', opted_out_at = v_now where id = v_id;
    return jsonb_build_object('lead_id', v_id, 'action', 'opted_out', 'contact_now', false, 'status', 'opted_out');
  end if;

  if not coalesce(v_src_enabled, false) then
    update ai_leads set status = 'excluded', status_reason = 'source disabled: ' || v_source where id = v_id;
    return jsonb_build_object('lead_id', v_id, 'action', 'excluded_source', 'contact_now', false, 'status', 'excluded');
  end if;

  if not s.ai_enabled then
    update ai_leads set status = 'excluded', status_reason = 'AI globally disabled' where id = v_id;
    return jsonb_build_object('lead_id', v_id, 'action', 'ai_disabled', 'contact_now', false, 'status', 'excluded');
  end if;

  -- Phase 1: after-hours ai_leads are held; the sequence starts at the next allowed moment
  v_anchor := ai_next_allowed_time(v_now, v_tz, 'sms');
  v_status := case when v_anchor > v_now + interval '1 minute' then 'held' else 'active' end;
  update ai_leads set status = v_status, sequence_anchor = v_anchor,
         status_reason = case when v_status = 'held' then 'after hours — held until next business window' end
   where id = v_id;
  perform ai_schedule_sequence(v_id, v_anchor);

  return jsonb_build_object('lead_id', v_id, 'action', 'created',
                            'contact_now', v_status = 'active', 'status', v_status,
                            'first_contact_at', v_anchor);
end $$;

-- ---------------------------------------------------------------------
-- 9. RPC: ai_claim_due_tasks  (n8n scheduler every minute; also called right
-- after ingest / YES reply with p_lead to send instantly)
-- Re-checks lead state + contact window at send time. Returns ready-to-run
-- jobs with rendered SMS text and lead fields for the Vapi call.
-- ---------------------------------------------------------------------
create or replace function ai_claim_due_tasks(p_limit int default 20, p_lead uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t ai_tasks%rowtype; l ai_leads%rowtype; s ai_settings%rowtype;
  v_out jsonb := '[]'::jsonb; nxt timestamptz; v_body text;
begin
  select * into s from ai_settings where id = 1;

  -- recover ai_tasks stuck in processing (n8n crashed mid-run)
  update ai_tasks set status = 'pending', last_error = 'reclaimed after timeout'
   where status = 'processing' and claimed_at < now() - interval '10 minutes' and attempts < 3;

  for t in
    select * from ai_tasks
     where status = 'pending' and run_at <= now()
       and (p_lead is null or lead_id = p_lead)
     order by run_at, step_no nulls first
     limit p_limit
     for update skip locked
  loop
    select * into l from ai_leads where id = t.lead_id;

    -- lead no longer contactable → cancel
    if l.status in ('opted_out','transferred','unresponsive','excluded','invalid')
       or exists (select 1 from ai_opt_outs where phone_e164 = l.phone_e164) then
      update ai_tasks set status = 'cancelled', last_error = 'lead status ' || l.status, done_at = now() where id = t.id;
      continue;
    end if;

    if t.action = 'mark_unresponsive' then
      update ai_leads set status = 'unresponsive', unresponsive_at = now(), updated_at = now() where id = l.id;
      update ai_tasks set status = 'done', done_at = now() where id = t.id;
      continue;
    end if;

    if not s.ai_enabled then
      continue;  -- leave pending; resumes when switched back on
    end if;

    -- outside the contact window right now → push to next allowed time
    if not ai_is_contact_allowed(now(), l.customer_tz, t.action) then
      nxt := ai_next_allowed_time(now(), l.customer_tz, t.action);
      update ai_tasks set run_at = nxt where id = t.id;
      continue;
    end if;

    -- one live call at a time per lead
    if t.action = 'call' and exists (
        select 1 from ai_calls where lead_id = l.id and status in ('queued','in_progress')
          and started_at > now() - interval '15 minutes') then
      update ai_tasks set run_at = now() + interval '5 minutes' where id = t.id;
      continue;
    end if;

    update ai_tasks set status = 'processing', claimed_at = now(), attempts = attempts + 1 where id = t.id;
    if l.status in ('new','held') then
      update ai_leads set status = 'active', status_reason = null, updated_at = now() where id = l.id;
    end if;

    v_body := case when t.action = 'sms' then ai_render_template(t.template_key, l) end;

    v_out := v_out || jsonb_build_object(
      'task_id', t.id, 'lead_id', l.id, 'action', t.action, 'step_no', t.step_no,
      'reason', t.reason, 'to', l.phone_e164, 'sms_body', v_body,
      'lead', jsonb_build_object(
        'first_name', l.first_name, 'last_name', l.last_name,
        'from_city', l.from_city, 'from_state', l.from_state,
        'to_city', l.to_city, 'to_state', l.to_state,
        'move_date', l.move_date, 'source', l.source),
      'disclose', case s.ai_disclosure
                    when 'all' then true
                    when 'california' then ai_is_california(l.from_state, l.phone_e164)
                    else false end,
      'whisper', 'Incoming lead transfer. ' || coalesce(ai_nz(l.first_name || ' ' || coalesce(l.last_name,'')), 'Customer')
                 || case when l.from_city is not null or l.to_city is not null then
                      ', moving from ' || coalesce(l.from_city || ' ' || coalesce(l.from_state,''), 'unknown')
                      || ' to ' || coalesce(l.to_city || ' ' || coalesce(l.to_state,''), 'unknown') else '' end
                 || '. Customer is ready for their quote.'
    );
  end loop;
  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- 10. RPC: result logging from n8n
-- ---------------------------------------------------------------------
-- After Twilio send (success or failure)
create or replace function ai_log_sms_sent(p_task uuid, p_body text, p_sid text, p_ok boolean,
                                        p_error text default null, p_from text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t ai_tasks%rowtype; l ai_leads%rowtype;
begin
  select * into t from ai_tasks where id = p_task;
  select * into l from ai_leads where id = t.lead_id;
  insert into ai_messages (lead_id, task_id, direction, from_number, to_number, body, twilio_sid, status, error)
  values (l.id, t.id, 'outbound', p_from, l.phone_e164, p_body, p_sid,
          case when p_ok then 'sent' else 'failed' end, p_error);
  if p_ok then
    update ai_tasks set status = 'done', done_at = now() where id = t.id;
    update ai_leads set attempt_count = attempt_count + 1, last_outbound_at = now(), updated_at = now() where id = l.id;
  else
    update ai_tasks set status = case when attempts >= 3 then 'failed' else 'pending' end,
                     run_at = now() + interval '5 minutes', last_error = p_error where id = t.id;
  end if;
end $$;

-- Twilio delivery status callback
create or replace function ai_update_sms_status(p_sid text, p_status text, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update ai_messages set status = p_status, error = coalesce(p_error, error) where twilio_sid = p_sid
$$;

-- Ad-hoc SMS sent outside a task (confirmations, after-hours YES ack, etc.)
create or replace function ai_log_sms_adhoc(p_lead uuid, p_body text, p_sid text, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = public as $$
  insert into ai_messages (lead_id, direction, to_number, body, twilio_sid, status, error)
  select id, 'outbound', phone_e164, p_body, p_sid, case when p_ok then 'sent' else 'failed' end, p_error
    from ai_leads where id = p_lead
$$;

-- After Vapi "create call" request
create or replace function ai_log_call_started(p_task uuid, p_vapi_call_id text, p_ok boolean, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t ai_tasks%rowtype;
begin
  select * into t from ai_tasks where id = p_task;
  if p_ok then
    insert into ai_calls (lead_id, task_id, vapi_call_id, reason, status)
    values (t.lead_id, t.id, p_vapi_call_id, t.reason, 'queued')
    on conflict (vapi_call_id) do nothing;
    update ai_tasks set status = 'done', done_at = now() where id = t.id;
    update ai_leads set attempt_count = attempt_count + 1, last_outbound_at = now(), updated_at = now() where id = t.lead_id;
  else
    insert into ai_calls (lead_id, task_id, reason, status, outcome, ended_reason, ended_at)
    values (t.lead_id, t.id, t.reason, 'failed', 'error', p_error, now());
    update ai_tasks set status = case when attempts >= 3 then 'failed' else 'pending' end,
                     run_at = now() + interval '5 minutes', last_error = p_error where id = t.id;
  end if;
end $$;

-- Vapi status-update (in-progress etc.)
create or replace function ai_update_call_status(p_vapi_call_id text, p_status text)
returns void language sql security definer set search_path = public as $$
  update ai_calls set status = case when p_status in ('in-progress','ringing','forwarding') then 'in_progress' else status end
   where vapi_call_id = p_vapi_call_id and status in ('queued','in_progress')
$$;

-- ---------------------------------------------------------------------
-- 11. RPC: ai_opt_out_phone  (STOP / NO / NOT INTERESTED by text or voice)
-- ---------------------------------------------------------------------
create or replace function ai_opt_out_phone(p_phone text, p_channel text, p_keyword text, p_lead uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_phone text := coalesce(ai_normalize_phone(p_phone), p_phone); r record; n int := 0;
begin
  insert into ai_opt_outs (phone_e164, channel, keyword, lead_id)
  values (v_phone, p_channel, p_keyword, p_lead)
  on conflict (phone_e164) do nothing;
  for r in select id from ai_leads where phone_e164 = v_phone loop
    perform ai_cancel_pending_tasks(r.id, 'opted out');
    update ai_leads set status = 'opted_out', opted_out_at = coalesce(opted_out_at, now()),
                     status_reason = p_channel || ': ' || coalesce(p_keyword,''), updated_at = now()
     where id = r.id and status <> 'transferred';
    n := n + 1;
  end loop;
  return jsonb_build_object('phone', v_phone, 'leads_updated', n);
end $$;

-- ---------------------------------------------------------------------
-- 12. RPC: ai_handle_inbound_sms
-- caller classifies intent first: 'yes' | 'opt_out' | 'later' | 'other'
-- (keywords YES/Y/YEP… and STOP/NO/NOT INTERESTED handled by regex in n8n;
--  anything else goes through OpenAI, which returns one of the three)
-- Returns { lead_id, action, reply_text } where action:
--   call_now        → n8n immediately runs ai_claim_due_tasks(p_lead) and places the call
--   call_scheduled  → outside hours; send reply_text
--   opted_out       → send reply_text (unless keyword was STOP — Twilio confirms that)
--   unknown_number  → log only
--   ignored         → lead already transferred/closed
--   logged          → 'later' reply, drip continues
-- ---------------------------------------------------------------------
create or replace function ai_handle_inbound_sms(p_from text, p_to text, p_body text, p_intent text, p_sid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := ai_normalize_phone(p_from); l ai_leads%rowtype; nxt timestamptz; v_reply text;
begin
  select * into l from ai_leads where phone_e164 = v_phone order by created_at desc limit 1;

  insert into ai_messages (lead_id, direction, from_number, to_number, body, intent, twilio_sid, status)
  values (l.id, 'inbound', p_from, p_to, p_body, p_intent, p_sid, 'received')
  on conflict (twilio_sid) do nothing;

  if l.id is null then
    if p_intent = 'opt_out' then perform ai_opt_out_phone(v_phone, 'sms', upper(btrim(p_body))); end if;
    return jsonb_build_object('lead_id', null, 'action', 'unknown_number');
  end if;

  update ai_leads set last_inbound_at = now(), updated_at = now() where id = l.id;

  if p_intent = 'opt_out' then
    perform ai_opt_out_phone(v_phone, 'sms', upper(btrim(p_body)), l.id);
    return jsonb_build_object('lead_id', l.id, 'action', 'opted_out',
      'reply_text', case when upper(btrim(p_body)) in ('STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT')
                         then null else ai_render_template('opt_out_confirm', l) end);
  end if;

  if l.status in ('opted_out','transferred','excluded','invalid') then
    return jsonb_build_object('lead_id', l.id, 'action', 'ignored', 'status', l.status);
  end if;

  -- "not now / later" → log only, keep the drip running (callback booking is Phase 2)
  if p_intent = 'later' then
    return jsonb_build_object('lead_id', l.id, 'action', 'logged');
  end if;

  -- YES (or a question / any other engaged reply) → call right away, stop the drip
  perform ai_cancel_pending_tasks(l.id, 'customer replied');
  update ai_leads set status = case when p_intent = 'yes' then 'opted_in' else 'active' end,
                   opted_in_at = case when p_intent = 'yes' then coalesce(opted_in_at, now()) else opted_in_at end,
                   status_reason = null
   where id = l.id;

  if ai_is_contact_allowed(now(), l.customer_tz, 'call') then
    insert into ai_tasks (lead_id, action, reason, run_at)
    values (l.id, 'call', case when p_intent = 'yes' then 'yes_reply' else 'inbound_reply' end, now());
    return jsonb_build_object('lead_id', l.id, 'action', 'call_now');
  else
    nxt := ai_next_allowed_time(now(), l.customer_tz, 'call');
    insert into ai_tasks (lead_id, action, reason, run_at)
    values (l.id, 'call', case when p_intent = 'yes' then 'yes_reply' else 'inbound_reply' end, nxt);
    v_reply := ai_render_template('yes_after_hours', l);
    return jsonb_build_object('lead_id', l.id, 'action', 'call_scheduled', 'call_at', nxt, 'reply_text', v_reply);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 13. RPC: ai_process_call_report  (Vapi end-of-call-report, normalized by n8n)
-- p_intent from Vapi structured output: yes | no | opt_out | not_now | unclear
-- p_transfer: 'completed' | 'missed' | null (no transfer attempted)
-- p_ended_reason: Vapi endedReason (e.g. customer-did-not-answer, voicemail,
--                 customer-busy, assistant-forwarded-call, customer-ended-call)
-- Returns { lead_id, outcome, send_sms_text }
-- ---------------------------------------------------------------------
create or replace function ai_process_call_report(
  p_vapi_call_id text, p_ended_reason text, p_intent text, p_transfer text,
  p_duration int, p_recording_url text, p_transcript text, p_summary text, p_raw jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c ai_calls%rowtype; l ai_leads%rowtype; v_outcome text; v_sms text;
begin
  select * into c from ai_calls where vapi_call_id = p_vapi_call_id;
  if not found then
    return jsonb_build_object('error', 'unknown call', 'vapi_call_id', p_vapi_call_id);
  end if;
  select * into l from ai_leads where id = c.lead_id;

  -- customer already opted out during this call (record_opt_out tool)
  if p_intent is null and l.status = 'opted_out' then
    p_intent := 'opt_out';
  end if;

  v_outcome := case
    when p_transfer = 'completed' or p_ended_reason = 'assistant-forwarded-call' then 'transferred'
    when p_transfer = 'missed'                         then 'missed_transfer'
    when p_intent in ('no','opt_out')                  then 'opted_out'
    when p_ended_reason ilike '%voicemail%'            then 'voicemail'
    when p_ended_reason ilike '%did-not-answer%' or p_ended_reason ilike '%no-answer%' then 'no_answer'
    when p_ended_reason ilike '%busy%'                 then 'busy'
    when p_intent = 'not_now'                          then 'not_ready'
    when p_ended_reason ilike '%error%' or p_ended_reason ilike '%failed%' then 'error'
    else 'declined'
  end;

  update ai_calls set status = 'ended', outcome = v_outcome, ended_reason = p_ended_reason,
                   intent = p_intent, duration_seconds = p_duration, recording_url = p_recording_url,
                   transcript = p_transcript, summary = p_summary, ended_at = now(), raw = p_raw
   where id = c.id;

  if v_outcome = 'transferred' then
    insert into ai_transfers (lead_id, call_id, status) values (l.id, c.id, 'completed');
    perform ai_cancel_pending_tasks(l.id, 'transferred');
    update ai_leads set status = 'transferred', transferred_at = coalesce(transferred_at, now()),
                     opted_in_at = coalesce(opted_in_at, now()), status_reason = null, updated_at = now()
     where id = l.id;

  elsif v_outcome = 'missed_transfer' then
    insert into ai_transfers (lead_id, call_id, status) values (l.id, c.id, 'missed');
    perform ai_cancel_pending_tasks(l.id, 'missed transfer — re-engaging');
    update ai_leads set status = 'missed_transfer', opted_in_at = coalesce(opted_in_at, now()), updated_at = now()
     where id = l.id;
    v_sms := ai_render_template('missed_transfer', l);
    -- retry the call in 15 min (inside contact window); if that fails too, the re-engage drip below takes over
    insert into ai_tasks (lead_id, action, reason, run_at)
    values (l.id, 'call', 'missed_transfer_retry',
            ai_next_allowed_time(now() + interval '15 minutes', l.customer_tz, 'call'));

  elsif v_outcome = 'opted_out' then
    perform ai_opt_out_phone(l.phone_e164, 'voice', coalesce(p_intent, 'no'), l.id);

  elsif c.reason in ('yes_reply','inbound_reply','missed_transfer_retry') and l.status in ('opted_in','active','missed_transfer') then
    -- customer engaged but the call didn't connect → put a short drip back
    insert into ai_tasks (lead_id, step_no, action, template_key, reason, run_at)
    values (l.id, null, 'sms', 'bh_followup_1h', 'reengage',
            ai_next_allowed_time(now() + interval '60 minutes', l.customer_tz, 'sms'));
    insert into ai_tasks (lead_id, action, reason, run_at)
    values (l.id, 'call', 'reengage', ai_next_allowed_time(now() + interval '180 minutes', l.customer_tz, 'call'));
    insert into ai_tasks (lead_id, action, reason, run_at)
    values (l.id, 'mark_unresponsive', 'reengage', ai_business_day_at(now(), 3, null));
  end if;

  return jsonb_build_object('lead_id', l.id, 'outcome', v_outcome, 'to', l.phone_e164, 'send_sms_text', v_sms);
end $$;

-- ---------------------------------------------------------------------
-- 14. DASHBOARD VIEWS
-- ---------------------------------------------------------------------
create or replace view v_ai_leads as
select l.id, l.created_at, l.first_name, l.last_name, l.phone_e164, l.email,
       l.from_city, l.from_state, l.to_city, l.to_state, l.move_date,
       l.source, l.origin_channel, l.granot_job_number, l.status, l.status_reason,
       l.attempt_count, l.last_outbound_at, l.last_inbound_at, l.transferred_at,
       extract(epoch from (l.transferred_at - l.created_at))::int as seconds_to_connect,
       (select min(run_at) from ai_tasks t where t.lead_id = l.id and t.status = 'pending') as next_action_at,
       (select action from ai_tasks t where t.lead_id = l.id and t.status = 'pending' order by run_at limit 1) as next_action
from ai_leads l;

create or replace view v_ai_activity as
select m.lead_id, m.created_at as at, 'sms_' || m.direction as kind, m.body as detail, m.status, null::text as recording_url
  from ai_messages m
union all
select c.lead_id, c.started_at, 'call', coalesce(c.summary, c.ended_reason, c.reason), coalesce(c.outcome, c.status), c.recording_url
  from ai_calls c
union all
select t.lead_id, t.created_at, 'transfer', null, t.status, null from ai_transfers t;

create or replace view v_ai_metrics as
select
  count(*) filter (where status not in ('invalid'))                       as leads_total,
  count(*) filter (where status in ('new','held','active','opted_in','missed_transfer')) as leads_active,
  count(*) filter (where status = 'held')                                  as leads_held,
  count(*) filter (where opted_in_at is not null)                          as opted_in,
  count(*) filter (where status = 'opted_out')                             as opted_out,
  count(*) filter (where status = 'unresponsive')                          as unresponsive,
  count(*) filter (where status = 'excluded')                              as excluded,
  count(*) filter (where transferred_at is not null)                       as transferred,
  (select count(*) from ai_transfers where status = 'missed')                 as missed_transfers,
  round(100.0 * count(*) filter (where transferred_at is not null)
        / nullif(count(*) filter (where status not in ('invalid','excluded')), 0), 1) as conversion_pct,
  round(avg(extract(epoch from (transferred_at - created_at))) filter (where transferred_at is not null))::int
                                                                            as avg_seconds_to_connect,
  count(*) filter (where attempt_count > 0 or transferred_at is not null)  as contacted
from ai_leads;

create or replace view v_ai_source_stats as
select coalesce(source, 'Unknown') as source,
       count(*)                                                 as ai_leads,
       count(*) filter (where transferred_at is not null)       as transferred,
       count(*) filter (where status = 'opted_out')             as opted_out,
       count(*) filter (where status = 'unresponsive')          as unresponsive,
       round(100.0 * count(*) filter (where transferred_at is not null)
             / nullif(count(*) filter (where status not in ('invalid','excluded')), 0), 1) as transfer_rate_pct
from ai_leads group by 1 order by ai_leads desc;

-- ---------------------------------------------------------------------
-- 15. SECURITY (Supabase RLS)
-- n8n uses the service_role key (bypasses RLS).
-- Dashboard users sign in with Supabase Auth (authenticated role):
--   read everything; edit only ai_settings, sources, hours, ai_holidays, templates.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ai_settings','ai_business_hours','ai_holidays','ai_lead_sources','ai_state_timezones',
                           'ai_message_templates','ai_sequence_steps','ai_leads','ai_opt_outs','ai_tasks',
                           'ai_messages','ai_calls','ai_transfers','ai_granot_events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists auth_read on %I', t);
    execute format('create policy auth_read on %I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['ai_settings','ai_business_hours','ai_holidays','ai_lead_sources','ai_message_templates'] loop
    execute format('drop policy if exists auth_write on %I', t);
    execute format('create policy auth_write on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter view v_ai_leads        set (security_invoker = on);
alter view v_ai_activity     set (security_invoker = on);
alter view v_ai_metrics      set (security_invoker = on);
alter view v_ai_source_stats set (security_invoker = on);

-- RPCs are for n8n (service_role) only
revoke execute on function ai_ingest_lead(text, jsonb)                         from public, anon, authenticated;
revoke execute on function ai_claim_due_tasks(int, uuid)                       from public, anon, authenticated;
revoke execute on function ai_log_sms_sent(uuid, text, text, boolean, text, text) from public, anon, authenticated;
revoke execute on function ai_update_sms_status(text, text, text)              from public, anon, authenticated;
revoke execute on function ai_log_sms_adhoc(uuid, text, text, boolean, text)   from public, anon, authenticated;
revoke execute on function ai_log_call_started(uuid, text, boolean, text)      from public, anon, authenticated;
revoke execute on function ai_update_call_status(text, text)                   from public, anon, authenticated;
revoke execute on function ai_handle_inbound_sms(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function ai_process_call_report(text, text, text, text, int, text, text, text, jsonb) from public, anon, authenticated;
-- admin can opt a number out from the dashboard
revoke execute on function ai_opt_out_phone(text, text, text, uuid)            from public, anon;
grant  execute on function ai_opt_out_phone(text, text, text, uuid)            to authenticated;

-- Make the new tables/views visible to the API right away
notify pgrst, 'reload schema';