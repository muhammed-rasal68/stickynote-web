import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CircleCheck,
  Cloud,
  CloudOff,
  Copy,
  KeyRound,
  Laptop,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  createPairingCode,
  getDeviceIdentity,
  joinWithPairingCode,
  listWorkspaceDevices,
  removeWorkspaceDevice,
  renameCurrentDevice,
  startSyncing,
  syncNow,
  type DeviceIdentity,
  type WorkspaceDevice,
} from '../lib/sync';
import { useSyncState } from '../lib/useSyncState';
import { cx, timeAgo } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface SyncDialogProps {
  onClose: () => void;
}

function lastSeenLabel(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 'Last seen unknown' : `Last seen ${timeAgo(timestamp)}`;
}

export function SyncDialog({ onClose }: SyncDialogProps) {
  const sync = useSyncState();
  const [identity, setIdentity] = useState<DeviceIdentity | null>(() => getDeviceIdentity());
  const [deviceName, setDeviceName] = useState(() => getDeviceIdentity()?.name ?? '');
  const [devices, setDevices] = useState<WorkspaceDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<WorkspaceDevice | null>(null);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<
    'start' | 'code' | 'join' | 'sync' | 'rename' | 'remove' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const refreshDevices = useCallback(async () => {
    if (!getDeviceIdentity()) {
      setDevices([]);
      setDevicesError(null);
      return;
    }

    setDevicesLoading(true);
    setDevicesError(null);
    try {
      setDevices(await listWorkspaceDevices());
    } catch (cause) {
      setDevicesError(cause instanceof Error ? cause.message : 'Could not load synced devices');
      if (!getDeviceIdentity()) {
        setIdentity(null);
        setDeviceName('');
        setPairing(null);
        setDevices([]);
      }
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!identity) {
      setDevices([]);
      setDevicesError(null);
      return;
    }
    void refreshDevices();
  }, [identity, refreshDevices]);

  useEffect(() => {
    if (!identity) return;
    if (!getDeviceIdentity()) {
      setIdentity(null);
      setDeviceName('');
      setPairing(null);
      setDevices([]);
    }
  }, [sync.phase, sync.message, identity]);

  async function handleStartSyncing() {
    const name = deviceName.trim();
    if (!name) {
      setError('Give this device a name.');
      return;
    }

    setBusy('start');
    setError(null);
    setNotice(null);
    try {
      const created = await startSyncing(name);
      setIdentity(created);
      setDeviceName(created.name);
      setPairing(null);
      setNotice('Connected. Syncing your notes now…');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start syncing');
    } finally {
      setBusy(null);
    }
  }

  async function handleShowCode() {
    setBusy('code');
    setError(null);
    setNotice(null);
    try {
      const result = await createPairingCode();
      setPairing(result);
      setIdentity(getDeviceIdentity());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a pairing code');
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return;

    const name = deviceName.trim();
    if (!name) {
      setError('Give this device a name first.');
      return;
    }

    setBusy('join');
    setError(null);
    setNotice(null);
    try {
      const joined = await joinWithPairingCode(code, name);
      setIdentity(joined);
      setDeviceName(joined.name);
      setCode('');
      setPairing(null);
      setNotice('Connected. Syncing your notes now…');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect with that code');
    } finally {
      setBusy(null);
    }
  }

  async function handleRename() {
    const name = deviceName.trim();
    if (!name) {
      setError('Give this device a name.');
      return;
    }

    setBusy('rename');
    setError(null);
    setNotice(null);
    try {
      const updated = await renameCurrentDevice(name);
      setIdentity(updated);
      setDeviceName(updated.name);
      setNotice('Device name updated.');
      await refreshDevices();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename this device');
      if (!getDeviceIdentity()) {
        setIdentity(null);
        setDeviceName('');
        setPairing(null);
        setDevices([]);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveDevice() {
    if (!deviceToRemove) return;

    const target = deviceToRemove;
    setDeviceToRemove(null);
    setBusy('remove');
    setError(null);
    setNotice(null);
    try {
      const result = await removeWorkspaceDevice(target.id);
      if (result.wasCurrent) {
        setIdentity(null);
        setDeviceName('');
        setPairing(null);
        setDevices([]);
        setNotice('This device is no longer syncing. Local notes stay on this device.');
      } else {
        setNotice(`${target.name} was removed from sync.`);
        await refreshDevices();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove that device');
      if (!getDeviceIdentity()) {
        setIdentity(null);
        setDeviceName('');
        setPairing(null);
        setDevices([]);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncNow() {
    setBusy('sync');
    setError(null);
    try {
      await syncNow();
    } finally {
      setBusy(null);
    }
  }

  async function copyCode() {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      setCopied(true);
    } catch {
      setError('Could not copy the code');
    }
  }

  const status = (() => {
    if (sync.phase === 'disabled') {
      return {
        icon: <CloudOff size={18} />,
        title: 'Sync is not configured',
        description: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable syncing.',
        tone: 'muted' as const,
      };
    }
    if (sync.phase === 'offline') {
      return {
        icon: <CloudOff size={18} />,
        title: 'Offline',
        description: 'Notes stay on this device and will sync when you are back online.',
        tone: 'muted' as const,
      };
    }
    if (sync.phase === 'syncing') {
      return {
        icon: <Loader2 size={18} className="animate-spin" />,
        title: 'Syncing…',
        description: 'Pushing local notes and pulling changes from your other devices.',
        tone: 'active' as const,
      };
    }
    if (sync.phase === 'error') {
      return {
        icon: <CloudOff size={18} />,
        title: 'Sync failed',
        description: sync.message ?? 'Check your connection and try again.',
        tone: 'error' as const,
      };
    }
    if (sync.phase === 'synced') {
      return {
        icon: <CircleCheck size={18} />,
        title: 'All notes synced',
        description: sync.lastSyncedAt
          ? `Last synced ${timeAgo(sync.lastSyncedAt)}.`
          : 'Everything is up to date.',
        tone: 'success' as const,
      };
    }
    return {
      icon: <Cloud size={18} />,
      title: identity ? 'Connected' : 'Ready to sync',
      description: identity
        ? 'This device is linked to your notes. Sync to pull the latest changes.'
        : 'Name this device to create a sync space, or join with a code from another device.',
      tone: 'muted' as const,
    };
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in items-end justify-center bg-stone-950/40 backdrop-blur-sm md:items-center md:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-title"
        className="max-h-[92dvh] w-full animate-sheet-in overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-3xl md:pb-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="sync-title" className="text-lg font-bold tracking-tight text-stone-900">
              Sync notes
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
              Your notes stay on this device and sync privately through Supabase.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sync settings"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-900/5 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={cx(
            'mt-4 flex gap-3 rounded-2xl border p-3.5',
            status.tone === 'error'
              ? 'border-red-900/10 bg-red-50'
              : status.tone === 'success'
                ? 'border-emerald-900/10 bg-emerald-50'
                : 'border-stone-900/10 bg-white/60',
          )}
        >
          <div
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              status.tone === 'error'
                ? 'bg-red-100 text-red-600'
                : status.tone === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : status.tone === 'active'
                    ? 'bg-stone-900/10 text-stone-700'
                    : 'bg-stone-900/5 text-stone-500',
            )}
          >
            {status.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-stone-800">{status.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">
              {status.description}
            </p>
            {identity ? (
              <p className="mt-1 flex items-center gap-1.5 truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Connected as {identity.name}
              </p>
            ) : null}
          </div>
        </div>

        {sync.phase !== 'disabled' ? (
          <>
            {identity ? (
              <button
                type="button"
                onClick={() => void handleSyncNow()}
                disabled={busy !== null || sync.phase === 'syncing'}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  aria-hidden="true"
                  size={14}
                  className={sync.phase === 'syncing' ? 'animate-spin' : undefined}
                />
                Sync now
              </button>
            ) : null}

            {!identity ? (
              <div className="mt-5 rounded-2xl border border-stone-900/10 bg-white/50 p-4">
                <div className="flex items-center gap-2">
                  <Laptop aria-hidden="true" size={15} className="text-stone-400" />
                  <h3 className="text-[12.5px] font-bold text-stone-800">Name this device</h3>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-stone-500">
                  Choose a name so you can recognize this device in the synced-device list.
                </p>
                <input
                  value={deviceName}
                  onChange={(event) => {
                    setDeviceName(event.target.value.slice(0, 60));
                    setError(null);
                  }}
                  placeholder="e.g. Sanura's phone"
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-3 w-full rounded-xl border border-stone-900/10 bg-white px-3 py-2 text-[13px] font-medium text-stone-800 placeholder:text-stone-400 focus:border-stone-900/30 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <button
                  type="button"
                  onClick={() => void handleStartSyncing()}
                  disabled={busy !== null || !deviceName.trim()}
                  className="mt-2 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === 'start' ? 'Starting…' : 'Start syncing'}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-stone-900/10 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Laptop aria-hidden="true" size={15} className="text-stone-400" />
                    <h3 className="text-[12.5px] font-bold text-stone-800">Synced devices</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshDevices()}
                    disabled={devicesLoading || busy !== null}
                    className="text-[10.5px] font-semibold text-stone-500 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {devicesLoading ? (
                  <p className="mt-3 flex items-center gap-2 text-[11.5px] text-stone-400">
                    <Loader2 size={13} className="animate-spin" />
                    Loading devices…
                  </p>
                ) : devices.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {devices.map((device) => (
                      <li
                        key={device.id}
                        className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold text-stone-800">
                            {device.name}
                            {device.isCurrent ? (
                              <span className="ml-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                                This device
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-stone-400">
                            {lastSeenLabel(device.lastSeenAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeviceToRemove(device)}
                          disabled={busy !== null}
                          className={cx(
                            'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                            device.isCurrent
                              ? 'bg-stone-900 text-white hover:bg-stone-800'
                              : 'bg-red-50 text-red-600 hover:bg-red-100',
                          )}
                        >
                          {device.isCurrent ? 'Unsync' : 'Remove'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[11.5px] text-stone-400">No devices found.</p>
                )}

                {devicesError ? (
                  <p role="alert" className="mt-2 text-[11.5px] font-medium text-red-600">
                    {devicesError}
                  </p>
                ) : null}

                <div className="mt-3 border-t border-stone-900/10 pt-3">
                  <label
                    htmlFor="device-name"
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400"
                  >
                    This device name
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="device-name"
                      value={deviceName}
                      onChange={(event) => {
                        setDeviceName(event.target.value.slice(0, 60));
                        setError(null);
                      }}
                      placeholder="Device name"
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-xl border border-stone-900/10 bg-white px-3 py-2 text-[12.5px] font-medium text-stone-800 placeholder:text-stone-400 focus:border-stone-900/30 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                    <button
                      type="button"
                      onClick={() => void handleRename()}
                      disabled={busy !== null || !deviceName.trim() || deviceName.trim() === identity.name}
                      className="shrink-0 rounded-xl bg-stone-100 px-3.5 py-2 text-[12px] font-semibold text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy === 'rename' ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-stone-900/10 bg-white/50 p-4">
              <div className="flex items-center gap-2">
                <KeyRound aria-hidden="true" size={15} className="text-stone-400" />
                <h3 className="text-[12.5px] font-bold text-stone-800">
                  {identity ? 'Connect another device' : 'Join with a code'}
                </h3>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-stone-500">
                {identity
                  ? 'Show this 6-character code on your other device, or enter a code shown there.'
                  : 'Enter the code shown on a device that is already syncing. Name this device above first.'}
              </p>

              {identity ? (
                pairing ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="flex-1 rounded-xl bg-stone-900 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.28em] text-sticky-yellow">
                      {pairing.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyCode()}
                      aria-label="Copy pairing code"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition hover:bg-stone-200"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleShowCode()}
                    disabled={busy !== null}
                    className="mt-3 w-full rounded-xl border border-stone-900/10 bg-white px-4 py-2 text-[12.5px] font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === 'code' ? 'Creating code…' : 'Show pairing code'}
                  </button>
                )
              ) : null}

              {identity && pairing ? (
                <p className="mt-1.5 text-center text-[10.5px] font-medium text-stone-400">
                  Expires at {new Date(pairing.expiresAt).toLocaleTimeString()}
                </p>
              ) : null}

              <form onSubmit={(event) => void handleJoin(event)} className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => {
                    setCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^0-9A-Z]/g, '')
                        .slice(0, 6),
                    );
                    setError(null);
                  }}
                  placeholder="Enter 6-character code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-xl border border-stone-900/10 bg-white px-3 py-2 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-stone-800 placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400 focus:border-stone-900/30 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <button
                  type="submit"
                  disabled={code.length !== 6 || busy !== null || !deviceName.trim()}
                  className="shrink-0 rounded-xl bg-stone-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === 'join' ? 'Connecting…' : 'Connect'}
                </button>
              </form>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-[11.5px] font-medium text-red-600">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="mt-3 text-[11.5px] font-medium text-emerald-700">{notice}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={deviceToRemove !== null}
        title={deviceToRemove?.isCurrent ? 'Unsync this device?' : 'Remove device?'}
        description={
          deviceToRemove?.isCurrent
            ? 'This device will stop syncing. Your notes stay on this device.'
            : `${deviceToRemove?.name ?? 'This device'} will stop syncing until it is paired again.`
        }
        confirmLabel={deviceToRemove?.isCurrent ? 'Unsync' : 'Remove'}
        onConfirm={() => void handleRemoveDevice()}
        onCancel={() => setDeviceToRemove(null)}
      />
    </div>
  );
}
