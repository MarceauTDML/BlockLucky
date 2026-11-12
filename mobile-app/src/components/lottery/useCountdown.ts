import { useEffect, useMemo, useState } from 'react';

export const useCountdown = (
  targetIso: string | null | undefined,
  fallbackSeconds?: number,
): number | null => {
  const target = useMemo(() => {
    if (targetIso) {
      const parsed = Date.parse(targetIso);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (typeof fallbackSeconds === 'number') return Date.now() + fallbackSeconds * 1000;
    return null;
  }, [targetIso, fallbackSeconds]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (target === null) return null;
  return Math.max(0, Math.floor((target - now) / 1000));
};

export default useCountdown;
