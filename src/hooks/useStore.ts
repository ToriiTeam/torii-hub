import { useState, useEffect, useCallback } from 'react';

export function useStore<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(`torii:${key}`);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const newValue = value instanceof Function ? value(prev) : value;
      try {
        localStorage.setItem(`torii:${key}`, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
      }
      return newValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
