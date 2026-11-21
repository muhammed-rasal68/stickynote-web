import { Plus, SearchX, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreate: () => void;
  onClear: () => void;
}

export function EmptyState({ hasFilters, onCreate, onClear }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-up flex-col items-center px-6 py-16 text-center">
      {hasFilters ? (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/70 text-stone-400 shadow-note ring-1 ring-stone-900/5">
          <SearchX aria-hidden="true" size={32} strokeWidth={1.8} />
        </div>
      ) : (
        <div aria-hidden="true" className="relative mb-6 h-28 w-28">
          <div className="absolute left-2 top-5 h-20 w-20 -rotate-12 rounded-2xl bg-sticky-pink shadow-note ring-1 ring-black/5" />
          <div className="absolute right-2 top-3 h-20 w-20 rotate-6 rounded-2xl bg-sticky-blue shadow-note ring-1 ring-black/5" />
          <div className="absolute left-1/2 top-6 flex h-20 w-20 -translate-x-1/2 -rotate-2 flex-col justify-center gap-1.5 rounded-2xl bg-sticky-yellow p-3 shadow-note ring-1 ring-black/5">
            <span className="h-1.5 w-11 rounded-full bg-stone-800/20" />
            <span className="h-1.5 w-8 rounded-full bg-stone-800/15" />
            <span className="h-1.5 w-10 rounded-full bg-stone-800/10" />
          </div>
          <Sparkles
            className="absolute -right-1 top-0 text-stone-400/70"
            size={18}
            strokeWidth={1.8}
          />
        </div>
      )}

      <h2 className="text-xl font-bold tracking-tight text-stone-800">
        {hasFilters ? 'No notes match' : 'No notes yet'}
      </h2>
      <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-stone-500">
        {hasFilters
          ? 'Try a different word, or clear the color filter.'
          : 'Tap + to capture your first thought, list, or little reminder.'}
      </p>

      <button
        type="button"
        onClick={hasFilters ? onClear : onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-[13px] font-semibold text-white shadow-float transition hover:bg-stone-800 active:scale-95"
      >
        {hasFilters ? null : <Plus aria-hidden="true" size={16} strokeWidth={2.5} />}
        {hasFilters ? 'Clear filters' : 'Create a note'}
      </button>
    </div>
  );
}
