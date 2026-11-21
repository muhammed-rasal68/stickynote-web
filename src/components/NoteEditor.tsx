import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { ArrowLeft, Check, Loader2, Pin, Plus, Trash2 } from 'lucide-react';
import { COLOR_DARK_HEX, COLOR_HEX, COLOR_LABEL } from '../lib/colors';
import { createTodo, updateNote } from '../lib/notes';
import { cx } from '../lib/utils';
import type { Note } from '../types';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { ColorSwatches } from './ColorSwatches';
import { ConfirmDialog } from './ConfirmDialog';
import { TodoRow } from './TodoRow';

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function savePatch(value: Note): Partial<Note> {
  return {
    title: value.title,
    content: value.content,
    todos: value.todos,
    color: value.color,
    pinned: value.pinned,
  };
}

export function NoteEditor({ note, onClose, onDelete }: NoteEditorProps) {
  const [draft, setDraft] = useState<Note>(note);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [newTodo, setNewTodo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<Note>(note);
  const timerRef = useRef<number | null>(null);

  const persist = useCallback(async (value: Note) => {
    dirtyRef.current = false;
    await updateNote(value.id, savePatch(value));
    if (!dirtyRef.current) setSaveState('saved');
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;

    const value = draftRef.current;
    dirtyRef.current = false;
    await updateNote(value.id, savePatch(value));
    if (!dirtyRef.current) setSaveState('saved');
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      void persist(draftRef.current);
    }, 400);
    timerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [draft, persist]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        const value = draftRef.current;
        dirtyRef.current = false;
        void updateNote(value.id, savePatch(value));
      }
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleClose = useCallback(async () => {
    await flush();
    onClose();
  }, [flush, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmDelete) {
        setConfirmDelete(false);
        return;
      }
      void handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDelete, handleClose]);

  function update(patch: Partial<Note>) {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setSaveState('saving');
  }

  function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = newTodo.trim();
    if (!text) return;
    update({ todos: [...draftRef.current.todos, createTodo(text)] });
    setNewTodo('');
  }

  function toggleTodo(id: string) {
    update({
      todos: draftRef.current.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  }

  function changeTodo(id: string, text: string) {
    update({
      todos: draftRef.current.todos.map((todo) =>
        todo.id === id ? { ...todo, text } : todo,
      ),
    });
  }

  function deleteTodo(id: string) {
    update({ todos: draftRef.current.todos.filter((todo) => todo.id !== id) });
  }

  async function handleDelete() {
    setConfirmDelete(false);
    await flush();
    onDelete(note.id);
  }

  const total = draft.todos.length;
  const completed = draft.todos.filter((todo) => todo.completed).length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const base = COLOR_HEX[draft.color];
  const dark = COLOR_DARK_HEX[draft.color];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in items-stretch justify-center bg-stone-950/35 backdrop-blur-[2px] md:items-center md:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) void handleClose();
        }}
      >
        <div
          className="flex h-[100dvh] w-full max-w-2xl animate-sheet-in flex-col overflow-hidden md:h-[min(88vh,820px)] md:rounded-[28px] md:shadow-2xl md:ring-1 md:ring-black/10"
          style={{ backgroundColor: base }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header
            className="safe-top flex shrink-0 items-center gap-1 px-2.5 pb-2"
            style={{ backgroundColor: dark }}
          >
            <button
              type="button"
              onClick={() => void handleClose()}
              aria-label="Back to notes"
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-800/70 transition hover:bg-stone-900/10 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40"
            >
              <ArrowLeft size={19} strokeWidth={2.2} />
            </button>

            <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium text-stone-800/55">
              {saveState === 'saving' ? (
                <>
                  <Loader2 aria-hidden="true" size={12} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check aria-hidden="true" size={12} strokeWidth={2.5} />
                  Saved
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => update({ pinned: !draft.pinned })}
              aria-label={draft.pinned ? 'Unpin note' : 'Pin note'}
              aria-pressed={draft.pinned}
              title={draft.pinned ? 'Unpin note' : 'Pin note'}
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40',
                draft.pinned
                  ? 'bg-stone-900/15 text-stone-900'
                  : 'text-stone-800/45 hover:bg-stone-900/10 hover:text-stone-900',
              )}
            >
              <Pin
                size={17}
                strokeWidth={2.1}
                className={draft.pinned ? 'fill-stone-900/50' : undefined}
              />
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete note"
              title="Delete note"
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-800/45 transition hover:bg-red-600/10 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
            >
              <Trash2 size={17} strokeWidth={2.1} />
            </button>
          </header>

          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3">
            <ColorSwatches value={draft.color} onChange={(color) => update({ color })} />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-800/35">
              {COLOR_LABEL[draft.color]}
            </span>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            <input
              type="text"
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Untitled note"
              maxLength={120}
              aria-label="Note title"
              className="mt-4 w-full border-0 bg-transparent p-0 text-[26px] font-bold leading-tight tracking-tight text-stone-800 outline-none placeholder:text-stone-800/25"
            />

            <AutoGrowTextarea
              value={draft.content}
              onChange={(event) => update({ content: event.target.value })}
              placeholder="Write something…"
              aria-label="Note content"
              spellCheck
              className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-800/30"
            />

            <section className="mt-5 border-t border-stone-900/10 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-800/50">
                  To-do
                </h2>
                {total > 0 ? (
                  <span className="text-[11px] font-semibold text-stone-800/45">
                    {completed}/{total}
                  </span>
                ) : null}
              </div>

              {total > 0 ? (
                <div
                  role="progressbar"
                  aria-label="To-do progress"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={completed}
                  className="mt-2 h-1 overflow-hidden rounded-full bg-stone-900/10"
                >
                  <div
                    className="h-full rounded-full bg-stone-800/50 transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}

              <div className="mt-2 space-y-0.5">
                {draft.todos.length > 0 ? (
                  draft.todos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      onToggle={() => toggleTodo(todo.id)}
                      onChange={(text) => changeTodo(todo.id, text)}
                      onDelete={() => deleteTodo(todo.id)}
                    />
                  ))
                ) : (
                  <p className="px-1 py-2 text-[12.5px] text-stone-800/35">
                    No to-dos yet.
                  </p>
                )}
              </div>
            </section>
          </main>

          <footer className="safe-bottom shrink-0 border-t border-stone-900/10 bg-white/20 px-4 pt-2.5">
            <form onSubmit={addTodo} className="flex items-center gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={(event) => setNewTodo(event.target.value)}
                placeholder="Add a to-do…"
                aria-label="New to-do"
                className="h-10 min-w-0 flex-1 rounded-xl border border-stone-900/15 bg-white/30 px-3 text-[13px] text-stone-800 outline-none transition placeholder:text-stone-800/35 focus:border-stone-900/30 focus:bg-white/50"
              />
              <button
                type="submit"
                disabled={!newTodo.trim()}
                aria-label="Add to-do"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900/80 text-white transition hover:bg-stone-900 active:scale-95 disabled:opacity-30"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </form>
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this note?"
        description="The note and its to-dos will be removed. You can undo right after."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
