import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import Layout from "../components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setIsLoading(true);

    // Crée une demande de réinitialisation. Les emails hors domaine sont
    // ignorés silencieusement en base ; succès affiché dans tous les cas.
    await supabaseClient
      .from("waiting_list")
      .insert({ email, type: "password_reset" });

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
              Mot de passe oublié
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              Saisis ton adresse e-mail pour demander une réinitialisation.
            </p>
          </div>

          {done ? (
            <div className="mt-6 rounded-lg bg-primary/10 px-4 py-5 text-center text-sm text-foreground">
              Demande envoyée ! Si un compte correspond, un administrateur te
              transmettra un nouveau mot de passe temporaire.
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

              <Button
                type="submit"
                loading={isLoading}
                disabled={!isValidEmail(email)}
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

export default ForgotPassword;
