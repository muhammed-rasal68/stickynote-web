import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
}

export function Fab({ onClick }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Create a new note"
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sticky-yellow-dark text-stone-900 shadow-float ring-1 ring-black/10 transition duration-200 hover:scale-105 hover:bg-sticky-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-95 sm:right-8"
    >
      <Plus aria-hidden="true" size={26} strokeWidth={2.6} />
    </button>
  );
}
