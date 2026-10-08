import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { blocker } from './blocker';

const read = () => ({ blocker: blocker.isEnabled(), notify: blocker.notifyEnabled() });

/** The two system switches Socle needs, re-read each time the user comes back from Settings. */
export function usePermissions() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setState(read()));
    return () => sub.remove();
  }, []);
  return state;
}
