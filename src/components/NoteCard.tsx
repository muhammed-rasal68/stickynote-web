import { Check, ListTodo, Pin } from 'lucide-react';
import { COLOR_HEX, COLOR_LABEL } from '../lib/colors';
import { shortTitle, timeAgo } from '../lib/utils';
import type { Note } from '../types';

interface NoteCardProps {
  note: Note;
  index: number;
  onClick: () => void;
}

export function NoteCard({ note, index, onClick }: NoteCardProps) {
  const title = note.title.trim() || shortTitle(note.content) || 'Untitled note';
  const content = note.content.trim();
  const total = note.todos.length;
  const completed = note.todos.filter((todo) => todo.completed).length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open note: ${title}`}
      className="group relative flex min-h-[176px] animate-fade-up flex-col overflow-hidden rounded-[22px] p-4 text-left shadow-note ring-1 ring-stone-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-note-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40 active:scale-[0.985]"
      style={{
        backgroundColor: COLOR_HEX[note.color],
        animationDelay: `${Math.min(index, 8) * 35}ms`,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-stone-900/[0.04]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/20 blur-xl"
      />

      <span className="relative flex items-start gap-2">
        <span className="line-clamp-2 flex-1 text-[15px] font-bold leading-snug text-stone-800">
          {title}
        </span>
        {note.pinned ? (
          <Pin
            aria-label="Pinned"
            size={13}
            strokeWidth={2.2}
            className="mt-0.5 shrink-0 fill-stone-700/60 text-stone-700/60"
          />
        ) : null}
      </span>

      <span className="relative mt-2 flex-1">
        {content ? (
          <span className="line-clamp-4 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700/70">
            {content}
          </span>
        ) : total > 0 ? (
          <span className="block space-y-1">
            {note.todos.slice(0, 3).map((todo) => (
              <span key={todo.id} className="flex items-start gap-1.5">
                <span
                  className={
                    todo.completed
                      ? 'mt-[2px] flex h-3 w-3 shrink-0 items-center justify-center rounded-[4px] border border-stone-700/20 bg-stone-800/70 text-white'
                      : 'mt-[2px] h-3 w-3 shrink-0 rounded-[4px] border border-stone-700/25 bg-white/30'
                  }
                >
                  {todo.completed ? <Check size={8} strokeWidth={3.5} /> : null}
                </span>
                <span
                  className={
                    todo.completed
                      ? 'line-clamp-1 text-[12px] leading-snug text-stone-700/40 line-through'
                      : 'line-clamp-1 text-[12px] leading-snug text-stone-700/65'
                  }
                >
                  {todo.text}
                </span>
              </span>
            ))}
            {total > 3 ? (
              <span className="block pl-[18px] text-[10px] font-medium text-stone-700/40">
                +{total - 3} more
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[12.5px] italic text-stone-700/40">Empty note</span>
        )}
      </span>

      <span className="relative mt-3 flex items-center justify-between gap-2 text-[10.5px] font-semibold text-stone-700/50">
        {total > 0 ? (
          <span className="flex items-center gap-1">
            <ListTodo aria-hidden="true" size={12} strokeWidth={2.2} />
            {completed}/{total} done
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-stone-700/30" />
            {COLOR_LABEL[note.color]}
          </span>
        )}
        <span>{timeAgo(note.updatedAt)}</span>
      </span>
    </button>
  );
}
