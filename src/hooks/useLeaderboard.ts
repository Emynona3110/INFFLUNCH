import { queryOptions, useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { ACHIEVEMENTS_BY_ID, canonicalId } from "@/data/achievements";

/** Période d'un classement : un mois « AAAA-MM » (calendaire, heure de
 *  Paris, cf. SQL) ou "all" (depuis toujours). */
export type LeaderboardPeriod = string;

/** Mois en cours, heure de Paris, au format « AAAA-MM ». */
export const parisMonthKey = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
    .slice(0, 7);

/** Décale un mois « AAAA-MM » de `delta` mois. */
export const addMonths = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export interface LeaderboardRow {
  user_id: string;
  email: string | null;
  avatar_path: string | null;
  /** Succès obtenus sur la période (catalogue en service, anciens ids fusionnés). */
  achievements: number;
  reviews: number;
  photos: number;
  /** Midis déclarés (jours de semaine, « pas au resto » compris). */
  lunches: number;
  /** Série en cours, quelle que soit la période. */
  streak: number;
}

/**
 * Classement (/classement) : une ligne par collègue, compteurs de la période
 * agrégés côté serveur (sql/2026-10-07_classements.sql). Les ids de succès
 * reviennent bruts : on écarte ici ceux retirés du catalogue et l'on compte
 * une seule fois un succès stocké sous un ancien id (cf. canonicalId).
 */
export const leaderboardQueryOptions = (period: LeaderboardPeriod) =>
  queryOptions<LeaderboardRow[], Error>({
    queryKey: ["leaderboard", period],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("leaderboard", {
        period,
      });
      if (error) throw new Error(error.message);
      return (
        (data ?? []) as (Omit<LeaderboardRow, "achievements"> & {
          achievements: string[];
        })[]
      ).map((r) => ({
        ...r,
        achievements: new Set(
          r.achievements.map(canonicalId).filter((id) => ACHIEVEMENTS_BY_ID[id])
        ).size,
      }));
    },
  });

// Changement de période (flèches, liste) : la table précédente reste affichée
// le temps du chargement, plutôt qu'un spinner à chaque mois parcouru.
const useLeaderboard = (period: LeaderboardPeriod) =>
  useQuery({
    ...leaderboardQueryOptions(period),
    placeholderData: (previous) => previous,
    // Filet pour ce que le temps réel ne voit pas : les succès des autres
    // (RLS de user_achievements). Seulement tant que la page est affichée.
    refetchInterval: 60 * 1000,
  });

/** Premier mois « AAAA-MM » ayant du contenu (borne du sélecteur de mois),
 *  null si rien encore. */
export const useLeaderboardFirstMonth = (enabled = true) =>
  useQuery<string | null, Error>({
    queryKey: ["leaderboard-first-month"],
    enabled,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc(
        "leaderboard_first_month"
      );
      if (error) throw new Error(error.message);
      return data ? String(data).slice(0, 7) : null;
    },
  });

export default useLeaderboard;
