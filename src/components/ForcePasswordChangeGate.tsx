import { ReactNode, useState } from "react";
import supabaseClient from "../services/supabaseClient";
import useSession from "../hooks/useSession";
import Layout from "./Layout";
import PasswordField from "./PasswordField";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

/**
 * Bloque l'accès à l'app tant que l'utilisateur n'a pas changé le mot de passe
 * temporaire fourni par l'admin (flag user_metadata.must_change_password).
 */
const ForcePasswordChangeGate = ({ children }: Props) => {
  const { sessionData, loading } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mustChange =
    sessionData?.user?.user_metadata?.must_change_password === true;

  if (loading) {
    return (
      <div className="tw-scope flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!mustChange) return <>{children}</>;

  const canSubmit = password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError("");

    const { error: updateError } = await supabaseClient.auth.updateUser({
      password,
      data: { must_change_password: false },
    });

    setIsLoading(false);

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Réessaie.");
      return;
    }
    // La session est mise à jour (USER_UPDATED) → le gate laisse passer.
  };

  return (
    <Layout centerContent>
      <div className="tw-scope w-full max-w-md">
        <Card className="p-8">
          <div className="text-center">
            <div
              role="heading"
              aria-level={1}
              className="font-display text-2xl font-extrabold text-card-foreground"
            >
              Choisis ton mot de passe
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              Pour ta première connexion, remplace le mot de passe temporaire.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {/* Champ username (email) pour que le gestionnaire de mdp associe
                le nouveau mot de passe au bon compte. Masqué mais présent. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={sessionData?.user?.email ?? ""}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              name="new-password"
              autoFocus
            />
            <PasswordField
              label="Confirme le mot de passe"
              value={confirm}
              onChange={setConfirm}
              isInvalid={confirm !== "" && confirm !== password}
              autoComplete="new-password"
              name="confirm-password"
            />
            <Button type="submit" loading={isLoading} disabled={!canSubmit} className="w-full">
              Valider
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default ForcePasswordChangeGate;
