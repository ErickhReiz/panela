import { useCallback, useEffect, useState } from "react";

export type ShowToast = (message: string) => void;

export function useToast(duration = 2800) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(id);
  }, [message, duration]);
  const show = useCallback<ShowToast>(m => setMessage(m), []);
  return [message, show] as const;
}
