# Sticky Notes

A calm, offline-first sticky notes app for the web. Capture quick thoughts, checklists, and to-dos on your phone or desktop — everything is saved locally and can optionally sync across your devices.

## Features

- **Notes with checklists** — title, free-form content, and interactive to-dos
- **Color-coded notes** — yellow, pink, blue, and green
- **Pin, search, and filter** — keep important notes on top and find anything instantly
- **Offline first** — notes live in IndexedDB, so the app works without a connection
- **Undo delete** — deleted notes are soft-deleted and can be restored
- **Optional cross-device sync** — powered by Supabase, paired with a short code
- **Device management** — list, rename, and remove devices in a shared workspace
- **Installable, mobile-friendly UI** — responsive layout with safe-area support and PWA meta tags

## Tech Stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Dexie](https://dexie.org/) for IndexedDB persistence
- [Supabase](https://supabase.com/) (Postgres + RPC) for optional sync
- [Lucide](https://lucide.dev/) icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
git clone https://github.com/muhammed-rasal68/stickynote-web.git
cd stickynote-web
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Without Supabase credentials it works fully offline and sync is disabled.

### Available scripts

| Script              | Description                     |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the Vite dev server       |
| `npm run build`     | Type-check and build for production |
| `npm run preview`   | Preview the production build    |
| `npm run typecheck` | Run TypeScript type checking    |

## Optional: Enable Sync

Sync is disabled unless both Supabase environment variables are set.

1. Create a project at [supabase.com](https://supabase.com/).
2. Run the SQL migrations from [`supabase/migrations`](supabase/migrations) in order using the Supabase SQL Editor (or `supabase db push` with the CLI).
3. Copy the example env file and fill in your project values:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Restart the dev server.

### How pairing works

- On the first device, open the sync dialog and name the device. This creates a workspace.
- On another device, choose **Join with a code** and enter the 6-character pairing code generated on the first device. Codes expire after 10 minutes.
- Notes sync automatically in the background (push, then pull), with the latest update winning.

> The sync schema only exposes RPC functions to the `anon` role; tables have row-level security enabled and direct access revoked. Devices authenticate with a hashed token stored in `localStorage`.

## Project Structure

```text
src/
  components/    UI components (notes, editor, sync dialog, filters, ...)
  lib/
    db.ts        Dexie database definition
    notes.ts     Note CRUD helpers
    sync.ts      Sync engine, pairing, and device management
    supabase.ts  Lazy Supabase client
  types.ts       Shared types
supabase/
  migrations/    Database schema and RPC functions
  reset_database.sql
```

## Deployment

The app is ready for [Netlify](https://www.netlify.com/). The included [`netlify.toml`](netlify.toml) sets the build command to `npm run build` and publishes the `dist` folder.

Set the following environment variables in your hosting provider:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are public client-side values; never expose your Supabase service role key.
