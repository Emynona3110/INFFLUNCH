import { toast } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useSession from "../hooks/useSession";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MyAccount = () => {
  const navigate = useNavigate();
  const { sessionData, signOut, loading, error } = useSession();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="tw-scope w-full max-w-md">
      <Card className="p-8">
        <div
          role="heading"
          aria-level={1}
          className="text-center font-display text-2xl font-extrabold text-card-foreground"
        >
          Mon compte
        </div>

        {loading ? (
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        ) : sessionData ? (
          <>
            <p className="mt-2 text-center text-foreground/70">
              {sessionData.user.email}
            </p>

            <div className="my-6 h-px bg-border" />

            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Changer le mot de passe
              </Button>

              <Button variant="destructiveSoft" onClick={handleLogout}>
                Se déconnecter
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-6 text-center text-foreground/70">
            Aucune session utilisateur.
          </p>
        )}
      </Card>

      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default MyAccount;
