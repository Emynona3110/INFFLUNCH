import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import Layout from "../components/Layout";
import Turnstile from "../components/Turnstile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

const RequestAccessPage = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email) || !token) return;
    setIsLoading(true);

    // L'écriture passe par l'Edge Function request-access (valide le token
    // Turnstile, insère en service_role). Les emails hors @infflux.com et les
    // erreurs (doublon, throttle) sont gérés côté serveur : on affiche un succès
    // dans tous les cas (anti-énumération).
    await supabaseClient.functions.invoke("request-access", {
      body: { email, token },
    });

    setIsLoading(false);
    setDone(true);
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
              Demander un accès
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              Saisis ton adresse e-mail pour envoyer une demande.
            </p>
          </div>

          {done ? (
            <div className="mt-6 rounded-lg bg-primary/10 px-4 py-5 text-center text-sm text-foreground">
              Demande envoyée ! Si ton adresse est éligible, un administrateur
              créera ton compte et te transmettra tes identifiants.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Adresse e-mail
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {TURNSTILE_SITE_KEY ? (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setToken}
                  onExpire={() => setToken("")}
                />
              ) : (
                <p className="text-xs text-destructive">
                  Vérification anti-robot non configurée
                  (VITE_TURNSTILE_SITE_KEY manquante).
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !isValidEmail(email) || !token}
                className="w-full"
              >
                {isLoading ? "Envoi…" : "Envoyer ma demande"}
              </Button>
            </form>
          )}

          <div className="my-6 h-px bg-border" />

          <p className="text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="cursor-pointer text-sm text-primary hover:underline"
            >
              Retour à la connexion
            </button>
          </p>
        </Card>
      </div>
    </Layout>
  );
};

export default RequestAccessPage;
