import { db } from './db';
import { COLORS } from './colors';
import { scheduleSync } from './sync';
import type { Note, NoteColor, Todo } from '../types';

export function uuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createTodo(text: string): Todo {
  return { id: uuid(), text, completed: false };
}

export async function createNote(color?: NoteColor): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: `sticky-note-${uuid()}`,
    title: '',
    content: '',
    todos: [],
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };

  await db.notes.add(note);
  scheduleSync();
  return note;
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() });
  scheduleSync();
}

export async function softDeleteNote(id: string): Promise<void> {
  await db.notes.update(id, { deleted: true, updatedAt: Date.now() });
  scheduleSync();
}

export async function restoreNote(id: string): Promise<void> {
  await db.notes.update(id, { deleted: false, updatedAt: Date.now() });
  scheduleSync();
}

export async function seedDemoNotes(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (localStorage.getItem('sticky-notes-demo-seeded')) return;

  localStorage.setItem('sticky-notes-demo-seeded', '1');
  if ((await db.notes.count()) > 0) return;

  const now = Date.now();
  const demoNotes: Note[] = [
    {
      id: `sticky-note-${uuid()}`,
      title: 'Welcome to Sticky Notes',
      content:
        'A calm little home for your thoughts, lists, and half-formed ideas.\n\nTap any note to edit it. Everything is saved on this device.',
      todos: [
        { id: uuid(), text: 'Create your first note', completed: true },
        { id: uuid(), text: 'Pin the ones that matter', completed: false },
      ],
      color: 'yellow',
      pinned: true,
      createdAt: now - 1000 * 60 * 60 * 26,
      updatedAt: now - 1000 * 60 * 2,
      deleted: false,
    },
    {
      id: `sticky-note-${uuid()}`,
      title: 'Weekend plans',
      content: 'Farmers market, coffee with Sam, and finally finish that book.',
      todos: [
        { id: uuid(), text: 'Farmers market', completed: false },
        { id: uuid(), text: 'Coffee with Sam', completed: false },
        { id: uuid(), text: 'Finish chapter 7', completed: false },
      ],
      color: 'pink',
      pinned: false,
      createdAt: now - 1000 * 60 * 60 * 50,
      updatedAt: now - 1000 * 60 * 60,
      deleted: false,
    },
    {
      id: `sticky-note-${uuid()}`,
      title: 'App idea',
      content: 'A tiny notes app that syncs between phone and desktop — offline first.',
      todos: [],
      color: 'blue',
      pinned: false,
      createdAt: now - 1000 * 60 * 60 * 80,
      updatedAt: now - 1000 * 60 * 60 * 3,
      deleted: false,
    },
    {
      id: `sticky-note-${uuid()}`,
      title: 'Groceries',
      content: '',
      todos: [
        { id: uuid(), text: 'Oat milk', completed: false },
        { id: uuid(), text: 'Eggs', completed: true },
        { id: uuid(), text: 'Avocados', completed: false },
        { id: uuid(), text: 'Coffee beans', completed: false },
      ],
      color: 'green',
      pinned: false,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      updatedAt: now - 1000 * 60 * 60 * 24,
      deleted: false,
    },
  ];

  await db.notes.bulkAdd(demoNotes);
  scheduleSync();
}
