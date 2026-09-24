/**
 * Message lisible à partir d'un retour d'Edge Function.
 *
 * Un 4xx a deux sources possibles, qui ne répondent pas pareil :
 *  - la fonction elle-même → `{ error: "…" }` ;
 *  - la passerelle Supabase, qui refuse AVANT d'appeler la fonction (JWT
 *    invalide ou expiré, clé d'API refusée) → `{ message: "…", code: … }`.
 * On lit les deux, sinon un « Invalid JWT » de passerelle se perd en
 * « Une erreur est survenue » et le diagnostic est impossible. Le code HTTP est
 * conservé pour distinguer 401 (authentification) de 403 (rôle admin manquant).
 */
type FnErrorLike = { context?: unknown; message?: string } | null;

type FnErrorBody = { error?: string; message?: string; msg?: string };

export async function fnError(
  error: FnErrorLike,
  data?: FnErrorBody | null
): Promise<string> {
  if (data?.error) return data.error;

  const ctx = error?.context;
  if (ctx instanceof Response) {
    try {
      const body = (await ctx.clone().json()) as FnErrorBody;
      const msg = body?.error ?? body?.message ?? body?.msg;
      if (msg) return `${msg} (HTTP ${ctx.status})`;
    } catch {
      /* corps vide ou non JSON : on retombe sur le code HTTP */
    }
    return `Erreur HTTP ${ctx.status}.`;
  }

  return error?.message ?? "Une erreur est survenue.";
}
