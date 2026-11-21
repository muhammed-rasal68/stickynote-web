import { Check } from 'lucide-react';
import { COLORS, COLOR_HEX, COLOR_LABEL } from '../lib/colors';
import { cx } from '../lib/utils';
import type { NoteColor } from '../types';

interface ColorSwatchesProps {
  value: NoteColor;
  onChange: (color: NoteColor) => void;
}

export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  return (
    <div role="group" aria-label="Note color" className="flex items-center gap-2.5">
      {COLORS.map((color) => {
        const active = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={COLOR_LABEL[color]}
            aria-pressed={active}
            className={cx(
              'flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-black/10 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:ring-offset-2',
              active ? 'ring-2 ring-stone-900/50 ring-offset-2 ring-offset-transparent' : '',
            )}
            style={{ backgroundColor: COLOR_HEX[color] }}
          >
            {active ? <Check aria-hidden="true" size={12} strokeWidth={3} className="text-stone-800/70" /> : null}
          </button>
        );
      })}
    </div>
  );
}
