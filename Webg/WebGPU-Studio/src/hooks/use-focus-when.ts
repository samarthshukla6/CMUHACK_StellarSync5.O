import { useEffect, useRef } from "react";

/** Returns a ref to attach to an input; focuses it when `when` is true (e.g. when not loading). */
export function useFocusWhen(when: boolean) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!when) return;
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [when]);
  return ref;
}
