import { db } from './db';
import { getSupabase, isSyncConfigured } from './supabase';
import type { Note, NoteColor, Todo } from '../types';

const IDENTITY_KEY = 'sticky-notes-device';
const LAST_SYNC_KEY = 'sticky-notes-last-sync';
const PULL_KEY_PREFIX = 'sticky-notes-last-pull-';
const PUSH_KEY_PREFIX = 'sticky-notes-last-push-';

export type SyncPhase = 'disabled' | 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  message: string | null;
}

export interface DeviceIdentity {
  workspaceId: string;
  deviceId: string;
  deviceToken: string;
  name: string;
  createdAt: number;
}

export interface WorkspaceDevice {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

interface PairingCode {
  code: string;
  expiresAt: string;
}

interface RemoteNote {
  id: string;
  title: string;
  content: string;
  todos: Todo[];
  color: string;
  pinned: boolean;
  deleted: boolean;
  created_at: number | string;
  updated_at: number | string;
}

const listeners = new Set<() => void>();

let state: SyncState = {
  phase: isSyncConfigured ? 'idle' : 'disabled',
  lastSyncedAt: null,
  message: null,
};

const SYNC_POLL_INTERVAL_MS = 2_000;

let initialized = false;
let running = false;
let rerun = false;
let rerunSilent = false;
let timer: number | null = null;

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function readIdentity(): DeviceIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DeviceIdentity>;
    if (
      typeof parsed.workspaceId !== 'string' ||
      typeof parsed.deviceId !== 'string' ||
      typeof parsed.deviceToken !== 'string'
    ) {
      return null;
    }
    return {
      workspaceId: parsed.workspaceId,
      deviceId: parsed.deviceId,
      deviceToken: parsed.deviceToken,
      name: typeof parsed.name === 'string' ? parsed.name : 'device',
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeIdentity(identity: DeviceIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
  rerun = false;
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function getLastPull(workspaceId: string): number {
  return Number(localStorage.getItem(`${PULL_KEY_PREFIX}${workspaceId}`) ?? 0) || 0;
}

function setLastPull(workspaceId: string, value: number): void {
  localStorage.setItem(`${PULL_KEY_PREFIX}${workspaceId}`, String(value));
}

function getLastPush(workspaceId: string): number {
  return Number(localStorage.getItem(`${PUSH_KEY_PREFIX}${workspaceId}`) ?? 0) || 0;
}

function setLastPush(workspaceId: string, value: number): void {
  localStorage.setItem(`${PUSH_KEY_PREFIX}${workspaceId}`, String(value));
}

function getStoredLastSync(): number | null {
  const value = Number(localStorage.getItem(LAST_SYNC_KEY) ?? 0);
  return value > 0 ? value : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Could not sync notes';
}

function isInvalidDeviceTokenError(error: unknown): boolean {
  return errorMessage(error).toLowerCase().includes('invalid device token');
}

async function registerDevice(name: string): Promise<DeviceIdentity> {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc('register_device', { p_name: name });
  if (error) throw error;

  const result = data as {
    workspaceId: string;
    deviceId: string;
    deviceToken: string;
  };

  const identity: DeviceIdentity = {
    workspaceId: result.workspaceId,
    deviceId: result.deviceId,
    deviceToken: result.deviceToken,
    name,
    createdAt: Date.now(),
  };

  writeIdentity(identity);
  setLastPull(identity.workspaceId, 0);
  return identity;
}

export async function startSyncing(name: string): Promise<DeviceIdentity> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Device name is required');

  const identity = await registerDevice(cleanName);
  setState({ phase: 'idle', message: null });
  scheduleSync(0);
  return identity;
}

function mapRemoteNote(note: RemoteNote): Note {
  const color: NoteColor =
    note.color === 'pink' || note.color === 'blue' || note.color === 'green'
      ? note.color
      : 'yellow';

  return {
    id: note.id,
    title: note.title ?? '',
    content: note.content ?? '',
    todos: Array.isArray(note.todos) ? note.todos : [],
    color,
    pinned: Boolean(note.pinned),
    createdAt: Number(note.created_at),
    updatedAt: Number(note.updated_at),
    deleted: Boolean(note.deleted),
  };
}

function mapLocalNote(note: Note) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    todos: note.todos,
    color: note.color,
    pinned: note.pinned,
    deleted: note.deleted,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function pushNotes(identity: DeviceIdentity): Promise<number> {
  const supabase = await getSupabase();

  const since = Date.now();
  const lastPush = getLastPush(identity.workspaceId);
  const changedNotes = await db.notes.where('updatedAt').above(lastPush).toArray();

  if (changedNotes.length === 0) {
    setLastPush(identity.workspaceId, since - 1);
    return 0;
  }

  const { data, error } = await supabase.rpc('push_notes', {
    p_device_token: identity.deviceToken,
    p_notes: changedNotes.map(mapLocalNote),
  });

  if (error) throw error;

  setLastPush(identity.workspaceId, since - 1);
  return Number(data ?? 0);
}

async function pullNotes(identity: DeviceIdentity): Promise<number> {
  const supabase = await getSupabase();

  const since = getLastPull(identity.workspaceId);
  const { data, error } = await supabase.rpc('pull_notes', {
    p_device_token: identity.deviceToken,
    p_since: since,
  });

  if (error) throw error;

  const remoteNotes = (data ?? []) as RemoteNote[];
  if (remoteNotes.length === 0) return 0;

  let applied = 0;
  let newest = since;

  await db.transaction('rw', db.notes, async () => {
    const localNotes = await db.notes.bulkGet(remoteNotes.map((note) => note.id));
    const localById = new Map<string, Note>();
    for (const local of localNotes) {
      if (local) localById.set(local.id, local);
    }

    const toApply: Note[] = [];

    for (const remoteNote of remoteNotes) {
      const remote = mapRemoteNote(remoteNote);
      newest = Math.max(newest, remote.updatedAt);

      const local = localById.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        toApply.push(remote);
      }
    }

    if (toApply.length > 0) {
      await db.notes.bulkPut(toApply);
    }
    applied = toApply.length;
  });

  setLastPull(identity.workspaceId, newest);
  return applied;
}

async function runSync(silent = false): Promise<void> {
  if (!isSyncConfigured) {
    setState({ phase: 'disabled', message: null });
    return;
  }

  if (!navigator.onLine) {
    setState({ phase: 'offline', message: null });
    return;
  }

  if (!silent) {
    setState({ phase: 'syncing', message: null });
  }

  try {
    const identity = readIdentity();
    if (!identity) {
      setState({ phase: 'idle', message: null });
      return;
    }

    await pushNotes(identity);
    await pullNotes(identity);

    const now = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, String(now));
    setState({ phase: 'synced', lastSyncedAt: now, message: null });
  } catch (error) {
    if (isInvalidDeviceTokenError(error)) {
      clearIdentity();
      setState({
        phase: 'idle',
        lastSyncedAt: null,
        message: 'This device was removed from sync. Name it again to reconnect.',
      });
      return;
    }

    setState({
      phase: navigator.onLine ? 'error' : 'offline',
      message: errorMessage(error),
    });
  }
}

export function scheduleSync(delay = 300, silent = false): void {
  if (!isSyncConfigured) return;

  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    if (running) {
      rerun = true;
      rerunSilent = silent;
      return;
    }

    running = true;
    void runSync(silent).finally(() => {
      running = false;
      if (rerun) {
        rerun = false;
        const nextSilent = rerunSilent;
        rerunSilent = false;
        scheduleSync(250, nextSilent);
      }
    });
  }, delay);
}

export async function syncNow(): Promise<void> {
  if (!isSyncConfigured) return;

  if (running) {
    rerun = true;
    rerunSilent = false;
    return;
  }

  running = true;
  try {
    await runSync();
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      const nextSilent = rerunSilent;
      rerunSilent = false;
      scheduleSync(250, nextSilent);
    }
  }
}

export async function createPairingCode(): Promise<PairingCode> {
  const supabase = await getSupabase();

  const identity = readIdentity();
  if (!identity) throw new Error('Name this device before creating a pairing code');

  const { data, error } = await supabase.rpc('create_pairing_code', {
    p_device_token: identity.deviceToken,
  });

  if (error) throw error;
  return data as PairingCode;
}

export async function joinWithPairingCode(code: string, name: string): Promise<DeviceIdentity> {
  const supabase = await getSupabase();

  const cleanName = name.trim();
  if (!cleanName) throw new Error('Device name is required');

  const { data, error } = await supabase.rpc('redeem_pairing_code', {
    p_code: code.trim().toUpperCase(),
    p_name: cleanName,
  });

  if (error) throw error;

  const result = data as {
    workspaceId: string;
    deviceId: string;
    deviceToken: string;
  };

  const identity: DeviceIdentity = {
    workspaceId: result.workspaceId,
    deviceId: result.deviceId,
    deviceToken: result.deviceToken,
    name: cleanName,
    createdAt: Date.now(),
  };

  writeIdentity(identity);
  setLastPull(identity.workspaceId, 0);
  setState({ phase: 'idle', message: null });
  scheduleSync(0);
  return identity;
}

export async function listWorkspaceDevices(): Promise<WorkspaceDevice[]> {
  const supabase = await getSupabase();

  const identity = readIdentity();
  if (!identity) return [];

  const { data, error } = await supabase.rpc('list_devices', {
    p_device_token: identity.deviceToken,
  });

  if (error) {
    if (isInvalidDeviceTokenError(error)) {
      clearIdentity();
      setState({
        phase: 'idle',
        lastSyncedAt: null,
        message: 'This device was removed from sync. Name it again to reconnect.',
      });
    }
    throw error;
  }

  return (data ?? []) as WorkspaceDevice[];
}

export async function renameCurrentDevice(name: string): Promise<DeviceIdentity> {
  const supabase = await getSupabase();

  const identity = readIdentity();
  if (!identity) throw new Error('This device is not syncing');

  const cleanName = name.trim();
  if (!cleanName) throw new Error('Device name is required');

  const { data, error } = await supabase.rpc('rename_device', {
    p_device_token: identity.deviceToken,
    p_name: cleanName,
  });

  if (error) {
    if (isInvalidDeviceTokenError(error)) {
      clearIdentity();
      setState({
        phase: 'idle',
        lastSyncedAt: null,
        message: 'This device was removed from sync. Name it again to reconnect.',
      });
    }
    throw error;
  }

  const result = data as { name: string };
  const updated = { ...identity, name: result.name };
  writeIdentity(updated);
  return updated;
}

export async function removeWorkspaceDevice(
  deviceId: string,
): Promise<{ removedDeviceId: string; wasCurrent: boolean }> {
  const supabase = await getSupabase();

  const identity = readIdentity();
  if (!identity) throw new Error('This device is not syncing');

  const { data, error } = await supabase.rpc('remove_device', {
    p_device_token: identity.deviceToken,
    p_device_id: deviceId,
  });

  if (error) {
    if (isInvalidDeviceTokenError(error)) {
      clearIdentity();
      setState({
        phase: 'idle',
        lastSyncedAt: null,
        message: 'This device was removed from sync. Name it again to reconnect.',
      });
    }
    throw error;
  }

  const result = data as { removedDeviceId: string; wasCurrent: boolean };
  if (result.wasCurrent) {
    clearIdentity();
    setState({ phase: 'idle', lastSyncedAt: null, message: null });
  }

  return result;
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeToSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeviceIdentity(): DeviceIdentity | null {
  return readIdentity();
}

export function initSync(): void {
  if (initialized) return;
  initialized = true;

  const lastSyncedAt = getStoredLastSync();

  if (!isSyncConfigured) {
    state = { phase: 'disabled', lastSyncedAt, message: null };
    return;
  }

  state = {
    phase: navigator.onLine ? 'idle' : 'offline',
    lastSyncedAt,
    message: null,
  };
  listeners.forEach((listener) => listener());

  window.addEventListener('online', () => scheduleSync(0));
  window.addEventListener('offline', () => setState({ phase: 'offline', message: null }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleSync(0);
  });

  window.setInterval(() => {
    if (!document.hidden && navigator.onLine) scheduleSync(0, true);
  }, SYNC_POLL_INTERVAL_MS);

  scheduleSync(0);
}
