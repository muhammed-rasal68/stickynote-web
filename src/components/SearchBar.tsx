import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="relative mt-3 block">
      <span className="sr-only">Search notes</span>
      <Search
        aria-hidden="true"
        size={17}
        strokeWidth={2.2}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search notes and to-dos…"
        autoComplete="off"
        spellCheck={false}
        className="h-11 w-full appearance-none rounded-2xl border border-stone-900/10 bg-white/75 pl-10 pr-10 text-[13.5px] text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-900/25 focus:bg-white focus:ring-4 focus:ring-stone-900/5 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-900/5 hover:text-stone-700"
        >
          <X size={15} />
        </button>
      ) : null}
    </label>
  );
}
