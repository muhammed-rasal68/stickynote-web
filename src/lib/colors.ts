import { NOTE_COLORS, type NoteColor } from '../types';

export const COLORS = NOTE_COLORS;

export const COLOR_HEX: Record<NoteColor, string> = {
  yellow: '#fde047',
  pink: '#fbcfe8',
  blue: '#bfdbfe',
  green: '#bbf7d0',
};

export const COLOR_DARK_HEX: Record<NoteColor, string> = {
  yellow: '#facc15',
  pink: '#f9a8d4',
  blue: '#93c5fd',
  green: '#86efac',
};

export const COLOR_LABEL: Record<NoteColor, string> = {
  yellow: 'Yellow',
  pink: 'Pink',
  blue: 'Blue',
  green: 'Green',
};

export function isNoteColor(value: string): value is NoteColor {
  return COLORS.includes(value as NoteColor);
}

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
