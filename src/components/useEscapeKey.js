import { useEffect, useRef } from 'react';

// Calls `onEscape` when the Escape key is pressed while the calling dialog is open
export function useEscapeKey(onEscape) {
  const handler = useRef(onEscape);
  useEffect(() => { handler.current = onEscape; });
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') handler.current?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
