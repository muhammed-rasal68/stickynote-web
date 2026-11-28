import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { seedDemoNotes } from './lib/notes';
import { initSync } from './lib/sync';
import './index.css';

registerSW({ immediate: true });

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void seedDemoNotes()
  .catch(() => undefined)
  .finally(() => initSync());
