import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCamera, FiTrash2 } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useSession from "@/hooks/useSession";
import useProfile from "@/hooks/useProfile";
import useIsAdmin from "@/hooks/useIsAdmin";
import Avatar from "@/components/Avatar";
import ColorModeSwitch from "@/components/ColorModeSwitch";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import PushToggle from "@/components/PushToggle";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Réglages du compte (ex-sous-onglet « Compte » de Mon compte) : photo de
 * profil, thème, notifications (admin), mot de passe, déconnexion. Ouvert par
 * le rouage de la navbar, depuis n'importe quelle page.
 */
const AccountSettingsDialog = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { sessionData, signOut, error } = useSession();
  const { profile, uploadAvatar, removeAvatar } = useProfile();
  const isAdmin = useIsAdmin();

  const [isDialogOpen, setDialogOpen] = useState(false);
  // Easter egg « Jour ! Nuit ! » : le GIF de Jacquouille recouvre la popup
  // jusqu'à sa fermeture.
  const [jourNuit, setJourNuit] = useState(false);
  useEffect(() => {
    if (!open) setJourNuit(false);
  }, [open]);
  const fileRef = useRef<HTMLInputElement>(null);

  const email = sessionData?.user?.email;
  const hasAvatar = !!profile?.avatar_path;

  const handleLogout = async () => {
    await signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error,
        status: "error",
        duration: 3000,
      });
    } else {
      navigate("/login");
    }
  };

  const handlePick = async (file?: File) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast({
        title: "Photo de profil mise à jour",
        status: "success",
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: "Échec",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleRemove = async () => {
    try {
      await removeAvatar.mutateAsync();
      toast({
        title: "Photo de profil retirée",
        status: "success",
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        className="relative overflow-hidden"
      >
        {/* Easter egg : le GIF recouvre la carte en fondu, sans en changer la
taille, et absorbe les clics tant qu'on reste sur ce sous-onglet. */}
        {jourNuit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-10 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/easter/jour-nuit.gif"
              alt="Le jour, la nuit, le jour, la nuit…"
              className="h-full w-full object-cover"
            />
          </motion.div>
        )}
        {/* Thème clair/sombre : réglage personnel, il a sa place ici plutôt que
dans la navbar où il occupait une position permanente. */}
        <ColorModeSwitch
          className="absolute right-3 top-3"
          onJourNuit={() => setJourNuit(true)}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              email={email}
              avatarPath={profile?.avatar_path}
              size={96}
              className="ring-2 ring-border"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              aria-label="Changer la photo de profil"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-60"
            >
              <FiCamera className="h-4 w-4" />
            </button>

            {/* Retrait de la pp : pastille en haut à droite, appui maintenu. */}
            {hasAvatar && (
              <HoldToDeleteButton
                onConfirm={handleRemove}
                mobileConfirm="Retirer la photo de profil ?"
                title="Maintenir pour retirer la photo"
                className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white shadow-md"
                progressClassName="bg-white/40"
              >
                <FiTrash2 className="h-4 w-4" />
              </HoldToDeleteButton>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handlePick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="my-4 sm:my-6 h-px bg-border" />

        <div className="flex flex-col gap-3">
          {isAdmin && <PushToggle />}
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Changer le mot de passe
          </Button>
          <Button variant="destructiveSoft" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>
      </Dialog>

      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

export default AccountSettingsDialog;
