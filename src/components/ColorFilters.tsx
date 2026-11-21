import { COLORS, COLOR_HEX, COLOR_LABEL } from '../lib/colors';
import { cx } from '../lib/utils';
import type { NoteColor } from '../types';

interface ColorFiltersProps {
  value: NoteColor | 'all';
  onChange: (value: NoteColor | 'all') => void;
}

export function ColorFilters({ value, onChange }: ColorFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filter notes by color"
      className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5"
    >
      <button
        type="button"
        onClick={() => onChange('all')}
        aria-pressed={value === 'all'}
        className={cx(
          'shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition',
          value === 'all'
            ? 'border-stone-900 bg-stone-900 text-white'
            : 'border-stone-900/10 bg-white/60 text-stone-600 hover:bg-white',
        )}
      >
        All
      </button>
      {COLORS.map((color) => {
        const active = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-pressed={active}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition',
              active
                ? 'border-stone-900/15 text-stone-800 shadow-sm'
                : 'border-stone-900/10 bg-white/60 text-stone-500 hover:bg-white',
            )}
            style={active ? { backgroundColor: COLOR_HEX[color] } : undefined}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: COLOR_HEX[color] }}
            />
            {COLOR_LABEL[color]}
          </button>
        );
      })}
    </div>
  );
}
