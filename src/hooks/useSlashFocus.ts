import { useEffect, type RefObject } from 'react';

// Bonus: tekan "/" di mana saja -> kursor langsung pindah ke input yang dipegang ref
export function useSlashFocus(ref: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;

      // jangan ganggu kalau user sedang mengetik di input lain
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTyping) return;

      event.preventDefault(); // supaya karakter "/" tidak ikut terketik
      ref.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    // cleanup: listener dilepas saat komponen unmount (pindah tab)
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}