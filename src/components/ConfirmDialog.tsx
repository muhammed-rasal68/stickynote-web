import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-stone-950/40 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="w-full max-w-sm animate-sheet-in rounded-3xl bg-white p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 aria-hidden="true" size={20} strokeWidth={2} />
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-bold tracking-tight text-stone-900">
          {title}
        </h2>
        <p id="confirm-description" className="mt-1.5 text-[13px] leading-relaxed text-stone-500">
          {description}
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-[13px] font-semibold text-stone-700 transition hover:bg-stone-200 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
