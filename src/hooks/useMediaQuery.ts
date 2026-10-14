import { useEffect, useState } from "react";

/** Seuil unique mobile ↔ desktop, le même que `sm:` (cf. tailwind.css). */
export const DESKTOP_QUERY = "(width >= 48rem)";

/** Suit une media query CSS (ex. DESKTOP_QUERY) ; SSR-safe (false). */
export default function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Vrai au-dessus du seuil desktop (même bascule que les classes `sm:`). */
export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
