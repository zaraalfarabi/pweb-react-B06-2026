import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  // lazy initializer: baca localStorage sekali saja saat mount
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue; // data rusak / bukan JSON -> pakai default
    }
  });

  // setiap value berubah -> simpan ulang ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage penuh / diblokir browser: abaikan
    }
  }, [key, value]);

  return [value, setValue];
}