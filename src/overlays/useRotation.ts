import { useEffect, useState } from 'react';

/** Index that moves to the next item every `ms` (stays at 0 when there is only one item). */
export const useRotation = (count: number, ms: number) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, ms]);
  return count ? index % count : 0;
};
