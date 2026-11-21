import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { createNote, restoreNote, softDeleteNote } from './lib/notes';
import type { NoteColor } from './types';
import { ColorFilters } from './components/ColorFilters';
import { EmptyState } from './components/EmptyState';
import { Fab } from './components/Fab';
import { Logo } from './components/Logo';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { NotesSkeleton } from './components/NotesSkeleton';
import { SearchBar } from './components/SearchBar';
import { SyncChip } from './components/SyncChip';
import { Toast, type ToastData } from './components/Toast';

const SyncDialog = lazy(() =>
  import('./components/SyncDialog').then((module) => ({ default: module.SyncDialog })),
);

export default function App() {
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NoteColor | 'all'>('all');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const activeNotes = useMemo(() => (notes ?? []).filter((note) => !note.deleted), [notes]);
  const selectedNote = activeNotes.find((note) => note.id === selectedId);
  const isFiltering = Boolean(query.trim()) || filter !== 'all';
  const deferredQuery = useDeferredValue(query);

  const visibleNotes = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return activeNotes
      .filter((note) => filter === 'all' || note.color === filter)
      .filter((note) => {
        if (!term) return true;
        return (
          note.title.toLowerCase().includes(term) ||
          note.content.toLowerCase().includes(term) ||
          note.todos.some((todo) => todo.text.toLowerCase().includes(term))
        );
      })
      .sort(
        (first, second) =>
          Number(second.pinned) - Number(first.pinned) || second.updatedAt - first.updatedAt,
      );
  }, [activeNotes, deferredQuery, filter]);

  useEffect(() => {
    if (selectedId && notes && !selectedNote) setSelectedId(null);
  }, [selectedId, notes, selectedNote]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleCreate() {
    const note = await createNote(filter === 'all' ? undefined : filter);
    setSelectedId(note.id);
  }

  async function handleDelete(id: string) {
    await softDeleteNote(id);
    setSelectedId(null);
    setToast({
      id: Date.now(),
      message: 'Note deleted',
      actionLabel: 'Undo',
      onAction: () => {
        void (async () => {
          await restoreNote(id);
          setSelectedId(id);
        })();
      },
    });
  }

  function clearFilters() {
    setQuery('');
    setFilter('all');
  }

  const noteCount = activeNotes.length;
  const noteCountLabel =
    noteCount === 0
      ? 'No notes yet'
      : `${noteCount} ${noteCount === 1 ? 'note' : 'notes'} · on this device`;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-stone-900/5 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-bold tracking-tight text-stone-900">
                Sticky Notes
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-stone-500">
                {noteCountLabel}
              </p>
            </div>
            <SyncChip onClick={() => setSyncOpen(true)} />
          </div>
          <SearchBar value={query} onChange={setQuery} />
          <ColorFilters value={filter} onChange={setFilter} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-4">
        {notes === undefined ? (
          <NotesSkeleton />
        ) : visibleNotes.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between px-0.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-stone-400">
                {isFiltering
                  ? `${visibleNotes.length} ${visibleNotes.length === 1 ? 'result' : 'results'}`
                  : 'All notes'}
              </p>
              {isFiltering ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-semibold text-stone-500 underline-offset-2 transition hover:text-stone-800 hover:underline"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visibleNotes.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={index}
                  onClick={() => setSelectedId(note.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            hasFilters={isFiltering}
            onCreate={() => void handleCreate()}
            onClear={clearFilters}
          />
        )}
      </main>

      <Fab onClick={() => void handleCreate()} />

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}

      {syncOpen ? (
        <Suspense fallback={null}>
          <SyncDialog onClose={() => setSyncOpen(false)} />
        </Suspense>
      ) : null}

      {selectedNote ? (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          onClose={() => setSelectedId(null)}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}
