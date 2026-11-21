create or replace function public.list_devices(p_device_token text)
returns jsonb
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

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'createdAt', d.created_at,
        'lastSeenAt', d.last_seen_at,
        'isCurrent', d.id = v_device.id
      )
      order by d.created_at asc, d.name asc
    )
    from public.devices d
    where d.workspace_id = v_device.workspace_id
      and d.revoked_at is null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.rename_device(p_device_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_name text;
begin
  v_device := public.sticky_require_device(p_device_token);
  v_name := coalesce(nullif(trim(p_name), ''), 'device');

  update public.devices
     set name = v_name,
         last_seen_at = now()
   where id = v_device.id;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'name', v_name
  );
end;
$$;

create or replace function public.remove_device(p_device_token text, p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_removed public.devices;
begin
  v_device := public.sticky_require_device(p_device_token);

  update public.devices
     set revoked_at = now()
   where id = p_device_id
     and workspace_id = v_device.workspace_id
     and revoked_at is null
  returning * into v_removed;

  if not found then
    raise exception 'device not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'removedDeviceId', v_removed.id,
    'wasCurrent', v_removed.id = v_device.id
  );
end;
$$;

revoke all on function public.list_devices(text) from public, anon, authenticated;
revoke all on function public.rename_device(text, text) from public, anon, authenticated;
revoke all on function public.remove_device(text, uuid) from public, anon, authenticated;

grant execute on function public.list_devices(text) to anon;
grant execute on function public.rename_device(text, text) to anon;
grant execute on function public.remove_device(text, uuid) to anon;
