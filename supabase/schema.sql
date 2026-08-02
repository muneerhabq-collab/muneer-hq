-- =====================================================================
--  Life OS - قاعدة البيانات الكاملة
--  شغّل هذا الملف مرة واحدة في: Supabase > SQL Editor > New query
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- أنواع
do $$ begin
  create type node_kind   as enum ('goal','project','task','habit');
exception when duplicate_object then null; end $$;
do $$ begin
  create type node_status as enum ('todo','doing','done','blocked','dropped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type energy_lvl  as enum ('high','medium','low');
exception when duplicate_object then null; end $$;
do $$ begin
  create type branch_state as enum ('active','future','paused');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ledger_kind as enum ('income','expense');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- الملف الشخصي
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  logo_url     text,
  timezone     text default 'Asia/Riyadh',
  week_start   int  default 6,          -- 6 = السبت
  horizon_from date,
  horizon_to   date,
  settings     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------ جوانب الحياة
create table if not exists areas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  slug       text not null,
  name       text not null,
  color      text not null default '#B98CE6',
  icon       text default 'circle',
  target_pct int  default 100,           -- وزن الجانب في التوازن
  sort       int  default 0,
  created_at timestamptz default now(),
  unique (user_id, slug)
);

create table if not exists branches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  area_id    uuid not null references areas(id) on delete cascade,
  name       text not null,
  status     branch_state default 'active',
  sort       int default 0,
  created_at timestamptz default now()
);

-- ------------------------------------------- شجرة المهام (عمق لا نهائي)
create table if not exists nodes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  area_id      uuid references areas(id)    on delete cascade,
  branch_id    uuid references branches(id) on delete set null,
  parent_id    uuid references nodes(id)    on delete cascade,
  kind         node_kind   not null default 'task',
  status       node_status not null default 'todo',
  title        text not null,
  note         text,
  priority     int  default 2,             -- 1 عاجل .. 4 لاحقا
  energy       energy_lvl default 'medium',
  estimate_min int,
  weight       numeric default 1,          -- وزن المهمة في حساب النسبة
  start_date   date,
  due_date     date,
  done_at      timestamptz,
  sort         int default 0,
  tags         text[] default '{}',
  -- عادات
  recurrence   text,                       -- daily | weekly:6,1 | monthly:15
  target_per_week int,
  -- قوقل كالندر
  calendar_event_id text,
  calendar_synced_at timestamptz,
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  auto_scheduled  boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists nodes_user_idx   on nodes(user_id);
create index if not exists nodes_parent_idx on nodes(parent_id);
create index if not exists nodes_area_idx   on nodes(area_id);
create index if not exists nodes_due_idx    on nodes(user_id, due_date);
create index if not exists nodes_cal_idx    on nodes(calendar_event_id);

-- ------------------------------------------------------------ سجل العادات
create table if not exists habit_logs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  node_id  uuid not null references nodes(id) on delete cascade,
  log_date date not null,
  done     boolean default true,
  note     text,
  unique (node_id, log_date)
);

-- ------------------------------------------------------------ مقاييس صحية
create table if not exists metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  weight_kg   numeric,
  body_fat    numeric,
  sleep_hours numeric,
  energy      int,          -- 1..5
  exercised   boolean,
  steps       int,
  note        text,
  unique (user_id, metric_date)
);

-- -------------------------------------------------------------- دفتر مالي
create table if not exists ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  kind        ledger_kind not null,
  label       text not null,
  amount      numeric not null,
  category    text,
  expected    boolean default false,   -- متوقع (لسه ما تحصل)
  settled     boolean default false,   -- تم تحصيله/دفعه فعليا
  node_id     uuid references nodes(id) on delete set null,
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------ الإنجازات
create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  area_id     uuid references areas(id) on delete set null,
  node_id     uuid references nodes(id) on delete set null,
  title       text not null,
  note        text,
  happened_on date not null default current_date,
  source      text default 'manual',   -- manual | auto
  created_at  timestamptz default now()
);

-- --------------------------------------------------------- المراجعة الأسبوعية
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  week_start   date not null,
  constraints  jsonb default '{}'::jsonb,  -- {area_id: "القيد الواحد"}
  wins         text,
  blockers     text,
  notes        text,
  snapshot     jsonb default '{}'::jsonb,
  completed_at timestamptz,
  created_at   timestamptz default now(),
  unique (user_id, week_start)
);

-- ------------------------------------------------------ لقطات التقدم (تاريخ)
create table if not exists progress_snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  taken_on   date not null default current_date,
  overall    numeric,
  by_area    jsonb,
  unique (user_id, taken_on)
);

-- --------------------------------------------------------------- الأتمتة
create table if not exists automations (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  key      text not null,
  enabled  boolean default true,
  config   jsonb default '{}'::jsonb,
  last_run timestamptz,
  unique (user_id, key)
);

create table if not exists automation_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  status     text,
  detail     text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------- توكنات قوقل كالندر
create table if not exists google_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text,
  access_token  text,
  expires_at    timestamptz,
  calendar_id   text default 'primary',
  sync_token    text,
  last_sync     timestamptz,
  updated_at    timestamptz default now()
);

-- ---------------------------------------------------------------- تريقرات
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists nodes_touch on nodes;
create trigger nodes_touch before update on nodes
for each row execute function touch_updated_at();

-- عند اكتمال المهمة نسجل وقت الإنجاز، وعند فتحها نمسحه
create or replace function nodes_stamp_done() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.done_at = now();
  elsif new.status <> 'done' then
    new.done_at = null;
  end if;
  return new;
end $$;

drop trigger if exists nodes_done on nodes;
create trigger nodes_done before update on nodes
for each row execute function nodes_stamp_done();

-- أرشفة تلقائية: أي هدف أو مشروع يكتمل يضاف للإنجازات
create or replace function nodes_auto_achievement() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done')
     and new.kind in ('goal','project') then
    insert into achievements (user_id, area_id, node_id, title, note, happened_on, source)
    values (new.user_id, new.area_id, new.id, new.title, new.note, current_date, 'auto')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists nodes_achv on nodes;
create trigger nodes_achv after update on nodes
for each row execute function nodes_auto_achievement();

-- إنشاء ملف شخصي تلقائيا لأي مستخدم جديد
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ------------------------------------------------------------------ RLS
alter table profiles           enable row level security;
alter table areas              enable row level security;
alter table branches           enable row level security;
alter table nodes              enable row level security;
alter table habit_logs         enable row level security;
alter table metrics            enable row level security;
alter table ledger             enable row level security;
alter table achievements       enable row level security;
alter table reviews            enable row level security;
alter table progress_snapshots enable row level security;
alter table automations        enable row level security;
alter table automation_logs    enable row level security;
alter table google_tokens      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['areas','branches','nodes','habit_logs','metrics','ledger',
                           'achievements','reviews','progress_snapshots','automations',
                           'automation_logs','google_tokens']
  loop
    execute format('drop policy if exists own_%1$s on %1$s', t);
    execute format(
      'create policy own_%1$s on %1$s for all
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists own_profile on profiles;
create policy own_profile on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------ دالة: نسبة الإنجاز لكل جانب
-- تحسب النسبة من الأوراق (المهام في أدنى مستوى) لا من تقدير يدوي
create or replace function area_progress(p_user uuid)
returns table (area_id uuid, done_leaves int, total_leaves int, pct numeric)
language sql stable as $$
  with leaf as (
    select n.id, n.area_id, n.status
    from nodes n
    where n.user_id = p_user
      and n.status <> 'dropped'
      and not exists (select 1 from nodes c where c.parent_id = n.id and c.status <> 'dropped')
  )
  select a.id,
         count(*) filter (where l.status = 'done')::int,
         count(l.id)::int,
         case when count(l.id) = 0 then 0
              else round(100.0 * count(*) filter (where l.status='done') / count(l.id), 0) end
  from areas a left join leaf l on l.area_id = a.id
  where a.user_id = p_user
  group by a.id;
$$;
