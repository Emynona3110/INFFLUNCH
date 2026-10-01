// Relances de prix écartées à la main (la croix du bloc « combien as-tu
// payé ? »). Stockées par compte : le localStorage nu confondait les comptes
// d'un même navigateur, défaut corrigé ailleurs en passant en base (cf.
// useFeedbackSeen) — le préfixe suffit ici, refuser une relance ne mérite pas
// une colonne. Conséquence assumée : le refus ne suit pas d'un appareil à
// l'autre.
//
// Le refus n'est PAS définitif : redéclarer un déjeuner dans ce restaurant le
// lève (cf. useLunchToday). Fermer la relance veut dire « pas celle-là », pas
// « plus jamais pour ce restaurant ».

const key = (userId: string) => `infflunch:lunch-price-skip:${userId}`;

export const readLunchPriceSkips = (userId: string | undefined): number[] => {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is number => typeof v === "number")
      : [];
  } catch {
    return []; /* localStorage indisponible */
  }
};

const write = (userId: string, ids: number[]) => {
  try {
    localStorage.setItem(key(userId), JSON.stringify(ids));
  } catch {
    /* localStorage indisponible : le refus ne tiendra que cette visite */
  }
};

/** « Ne me demande pas celle-là. » */
export const addLunchPriceSkip = (
  userId: string | undefined,
  restaurantId: number
) => {
  if (!userId) return;
  write(userId, [...new Set([...readLunchPriceSkips(userId), restaurantId])]);
};

/** Le refus est levé : on redéclare un déjeuner dans ce restaurant, donc on
 *  accepte de nouveau qu'on en demande le prix. */
export const clearLunchPriceSkip = (
  userId: string | undefined,
  restaurantId: number
) => {
  if (!userId) return;
  const kept = readLunchPriceSkips(userId).filter((id) => id !== restaurantId);
  write(userId, kept);
};
