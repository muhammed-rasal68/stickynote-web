export const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green'] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  todos: Todo[];
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}
