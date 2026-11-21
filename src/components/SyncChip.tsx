import { CircleCheck, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useSyncState } from '../lib/useSyncState';
import { cx } from '../lib/utils';

interface SyncChipProps {
  onClick: () => void;
}

export function SyncChip({ onClick }: SyncChipProps) {
  const sync = useSyncState();

  const label =
    sync.phase === 'synced'
      ? 'Synced'
      : sync.phase === 'syncing'
        ? 'Syncing'
        : sync.phase === 'error'
          ? 'Sync error'
          : sync.phase === 'offline'
            ? 'Offline'
            : sync.phase === 'disabled'
              ? 'On device'
              : 'Sync';

  const icon =
    sync.phase === 'syncing' ? (
      <Loader2 aria-hidden="true" size={12} strokeWidth={2.2} className="animate-spin" />
    ) : sync.phase === 'synced' ? (
      <CircleCheck aria-hidden="true" size={12} strokeWidth={2.2} />
    ) : sync.phase === 'idle' ? (
      <Cloud aria-hidden="true" size={12} strokeWidth={2.2} />
    ) : (
      <CloudOff aria-hidden="true" size={12} strokeWidth={2.2} />
    );

  const title =
    sync.phase === 'error'
      ? sync.message ?? 'Could not sync notes'
      : sync.phase === 'synced'
        ? 'All notes are synced'
        : sync.phase === 'disabled'
          ? 'Saved on this device'
          : 'Sync settings';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition active:scale-[0.98]',
        sync.phase === 'error'
          ? 'border-red-900/15 bg-red-50/80 text-red-600 hover:bg-red-50'
          : 'border-stone-900/10 bg-white/60 text-stone-500 hover:bg-white hover:text-stone-700',
      )}
    >
      {icon}
      <span className="hidden min-[380px]:inline">{label}</span>
    </button>
  );
}
