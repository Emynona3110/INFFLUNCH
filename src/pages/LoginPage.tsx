import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import supabaseClient from "../services/supabaseClient";
import { storeCredential } from "../utils/credentials";
import Layout from "../components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage("Email ou mot de passe incorrect.");
      setEmail("");
      setPassword("");
    } else {
      // Propose l'enregistrement du mdp (l'AJAX ne déclenche pas l'heuristique).
      await storeCredential(email, password);
      navigate("/restaurants");
    }
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
              Connexion à votre compte
            </div>
          </div>

          {message && (
            <div className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Adresse e-mail
              </span>
              <Input
                type="email"
                id="username"
                name="username"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Mot de passe
              </span>
              <div
                className="relative"
                onMouseLeave={() => setShowPassword(false)}
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  id="current-password"
                  name="current-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute inset-y-0 right-0 grid w-10 cursor-pointer place-items-center text-foreground/50 transition hover:text-foreground"
                >
                  {showPassword ? <VscEye /> : <VscEyeClosed />}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/password-oublie")}
                className="cursor-pointer text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              {isLoading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <div className="my-6 h-px bg-border" />

          <p className="text-center text-sm text-foreground/60">
            Nouveau sur Infflunch ?{" "}
            <button
              type="button"
              onClick={() => navigate("/inscription")}
              className="cursor-pointer text-primary hover:underline"
            >
              Inscrivez-vous ici
            </button>
          </p>
        </Card>
      </div>
    </Layout>
  );
};

export default LoginPage;
