import { Check, X } from 'lucide-react';
import { cx } from '../lib/utils';
import type { Todo } from '../types';

interface TodoRowProps {
  todo: Todo;
  onToggle: () => void;
  onChange: (text: string) => void;
  onDelete: () => void;
}

export function TodoRow({ todo, onToggle, onChange, onDelete }: TodoRowProps) {
  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-1 py-1.5 transition hover:bg-black/[0.035]">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={todo.completed ? `Mark "${todo.text}" as not done` : `Mark "${todo.text}" as done`}
        onClick={onToggle}
        className={cx(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40 focus-visible:ring-offset-1',
          todo.completed
            ? 'border-transparent bg-stone-800/75 text-white'
            : 'border-stone-800/25 bg-white/30 text-transparent hover:border-stone-800/45',
        )}
      >
        <Check aria-hidden="true" size={11} strokeWidth={3.5} />
      </button>
      <input
        type="text"
        value={todo.text}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="To-do text"
        className={cx(
          'min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] leading-snug outline-none placeholder:text-stone-800/30',
          todo.completed ? 'text-stone-800/35 line-through' : 'text-stone-800/85',
        )}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete to-do "${todo.text}"`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-800/30 opacity-70 transition hover:bg-red-600/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <X aria-hidden="true" size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
