create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'device',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists devices_workspace_id_idx on public.devices (workspace_id);

create table if not exists public.pairing_codes (
  code_hash text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);

create index if not exists pairing_codes_workspace_id_idx on public.pairing_codes (workspace_id);

create table if not exists public.notes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  title text not null default '',
  content text not null default '',
  todos jsonb not null default '[]'::jsonb,
  color text not null default 'yellow',
  pinned boolean not null default false,
  deleted boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null,
  updated_by uuid references public.devices(id),
  primary key (workspace_id, id),
  constraint notes_color_check check (color in ('yellow', 'pink', 'blue', 'green'))
);

create index if not exists notes_sync_idx on public.notes (workspace_id, updated_at);

alter table public.workspaces enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.notes enable row level security;

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.devices from anon, authenticated;
revoke all on table public.pairing_codes from anon, authenticated;
revoke all on table public.notes from anon, authenticated;

create or replace function public.sticky_hash(p_value text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(p_value, 'sha256'), 'hex');
$$;

create or replace function public.sticky_random_string(p_length integer, p_alphabet text)
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select string_agg(substr(p_alphabet, (floor(random() * length(p_alphabet)) + 1)::integer, 1), '')
  from generate_series(1, p_length);
$$;

create or replace function public.sticky_require_device(p_device_token text)
returns public.devices
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
begin
  select *
    into v_device
    from public.devices
   where token_hash = public.sticky_hash(p_device_token)
     and revoked_at is null;

  if not found then
    raise exception 'invalid device token' using errcode = '28000';
  end if;

  return v_device;
end;
$$;

create or replace function public.register_device(p_name text default 'device')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_workspace_id uuid;
  v_device_id uuid;
  v_token text;
begin
  insert into public.workspaces default values returning id into v_workspace_id;

  v_token := public.sticky_random_string(12, '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz');

  insert into public.devices (workspace_id, name, token_hash)
  values (v_workspace_id, coalesce(nullif(trim(p_name), ''), 'device'), public.sticky_hash(v_token))
  returning id into v_device_id;

  return jsonb_build_object(
    'workspaceId', v_workspace_id,
    'deviceId', v_device_id,
    'deviceToken', v_token
  );
end;
$$;

create or replace function public.create_pairing_code(p_device_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_code text;
begin
  v_device := public.sticky_require_device(p_device_token);

  delete from public.pairing_codes
   where workspace_id = v_device.workspace_id;

  v_code := public.sticky_random_string(6, '23456789ABCDEFGHJKLMNPQRSTUVWXYZ');

  insert into public.pairing_codes (code_hash, workspace_id, expires_at)
  values (
    public.sticky_hash(upper(v_code)),
    v_device.workspace_id,
    now() + interval '10 minutes'
  );

  update public.devices
     set last_seen_at = now()
   where id = v_device.id;

  return jsonb_build_object(
    'code', v_code,
    'expiresAt', now() + interval '10 minutes'
  );
end;
$$;

create or replace function public.redeem_pairing_code(p_code text, p_name text default 'device')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pairing public.pairing_codes;
  v_device_id uuid;
  v_token text;
begin
  select *
    into v_pairing
    from public.pairing_codes
   where code_hash = public.sticky_hash(upper(trim(p_code)))
     and redeemed_at is null
     and expires_at > now()
   for update;

  if not found then
    raise exception 'invalid or expired pairing code' using errcode = '28000';
  end if;

  update public.pairing_codes
     set redeemed_at = now()
   where code_hash = v_pairing.code_hash;

  v_token := public.sticky_random_string(12, '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz');

  insert into public.devices (workspace_id, name, token_hash)
  values (v_pairing.workspace_id, coalesce(nullif(trim(p_name), ''), 'device'), public.sticky_hash(v_token))
  returning id into v_device_id;

  return jsonb_build_object(
    'workspaceId', v_pairing.workspace_id,
    'deviceId', v_device_id,
    'deviceToken', v_token
  );
end;
$$;

create or replace function public.pull_notes(p_device_token text, p_since bigint default 0)
returns setof public.notes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
begin
  v_device := public.sticky_require_device(p_device_token);

  update public.devices
     set last_seen_at = now()
   where id = v_device.id;

  return query
    select *
      from public.notes
     where workspace_id = v_device.workspace_id
       and updated_at > coalesce(p_since, 0)
     order by updated_at asc;
end;
$$;

create or replace function public.push_notes(p_device_token text, p_notes jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_note jsonb;
  v_count integer := 0;
begin
  v_device := public.sticky_require_device(p_device_token);

  for v_note in select * from jsonb_array_elements(coalesce(p_notes, '[]'::jsonb))
  loop
    insert into public.notes as target (
      workspace_id,
      id,
      title,
      content,
      todos,
      color,
      pinned,
      deleted,
      created_at,
      updated_at,
      updated_by
    )
    values (
      v_device.workspace_id,
      v_note->>'id',
      coalesce(v_note->>'title', ''),
      coalesce(v_note->>'content', ''),
      coalesce(v_note->'todos', '[]'::jsonb),
      case
        when v_note->>'color' in ('yellow', 'pink', 'blue', 'green') then v_note->>'color'
        else 'yellow'
      end,
      coalesce((v_note->>'pinned')::boolean, false),
      coalesce((v_note->>'deleted')::boolean, false),
      coalesce((v_note->>'createdAt')::bigint, (extract(epoch from now()) * 1000)::bigint),
      coalesce((v_note->>'updatedAt')::bigint, (extract(epoch from now()) * 1000)::bigint),
      v_device.id
    )
    on conflict (workspace_id, id) do update
       set title = excluded.title,
           content = excluded.content,
           todos = excluded.todos,
           color = excluded.color,
           pinned = excluded.pinned,
           deleted = excluded.deleted,
           created_at = least(target.created_at, excluded.created_at),
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by
     where excluded.updated_at > target.updated_at;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  update public.devices
     set last_seen_at = now()
   where id = v_device.id;

  return v_count;
end;
$$;

revoke all on function public.sticky_hash(text) from public, anon, authenticated;
revoke all on function public.sticky_random_string(integer, text) from public, anon, authenticated;
revoke all on function public.sticky_require_device(text) from public, anon, authenticated;
revoke all on function public.register_device(text) from public, anon, authenticated;
revoke all on function public.create_pairing_code(text) from public, anon, authenticated;
revoke all on function public.redeem_pairing_code(text, text) from public, anon, authenticated;
revoke all on function public.pull_notes(text, bigint) from public, anon, authenticated;
revoke all on function public.push_notes(text, jsonb) from public, anon, authenticated;

grant execute on function public.register_device(text) to anon;
grant execute on function public.create_pairing_code(text) to anon;
grant execute on function public.redeem_pairing_code(text, text) to anon;
grant execute on function public.pull_notes(text, bigint) to anon;
grant execute on function public.push_notes(text, jsonb) to anon;
