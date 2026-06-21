/**
 * Demande explicitement au navigateur d'enregistrer/mettre à jour un identifiant
 * via l'API Credential Management. Indispensable en SPA : la connexion se fait
 * en AJAX (pas de POST classique suivi d'une navigation), donc l'heuristique
 * « formulaire soumis » des gestionnaires de mots de passe ne se déclenche pas
 * de façon fiable. Cet appel force la proposition « Enregistrer / Mettre à jour »
 * de Google Password Manager.
 *
 * Best effort : silencieux si l'API n'est pas dispo (Safari, contexte non
 * sécurisé) ou si une extension qui « hooke » l'API (ex. RoboForm) la fait
 * échouer — on n'interrompt jamais le flux d'authentification. Nécessite un
 * contexte sécurisé (HTTPS ou localhost). Les gestionnaires en extension
 * (RoboForm…) capturent de leur côté via le formulaire (autocomplete + email).
 */
type PwContainer = CredentialsContainer & {
  create?: (opts: {
    password: { id: string; password: string; name?: string };
  }) => Promise<Credential | null>;
};

export async function storeCredential(id: string, password: string): Promise<void> {
  if (!window.isSecureContext || !id || !password) return;

  const creds = navigator.credentials as PwContainer | undefined;
  if (!creds?.create || !creds.store) return;

  // On vise uniquement le gestionnaire du navigateur (Google Password Manager).
  // Best effort : si une extension (RoboForm…) a « hooké » l'API et la fait
  // échouer, on ignore — l'extension gère alors de son côté via le formulaire.
  try {
    const cred = await creds.create({ password: { id, password, name: id } });
    if (cred) await creds.store(cred);
  } catch {
    /* best effort : on n'interrompt jamais le flux d'authentification */
  }
}
