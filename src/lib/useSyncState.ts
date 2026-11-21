import { useSyncExternalStore } from 'react';
import { getSyncState, subscribeToSync } from './sync';

export function useSyncState() {
  return useSyncExternalStore(subscribeToSync, getSyncState);
}
