import { useState, useRef, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ message: '', icon: 'fa-circle-check', visible: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message, icon = 'fa-circle-check') => {
    clearTimeout(timerRef.current);
    setToast({ message, icon, visible: true });
    timerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 3000);
  }, []);

  return { toast, showToast };
}
