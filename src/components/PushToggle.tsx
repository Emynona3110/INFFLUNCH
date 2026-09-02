import { FiBell, FiBellOff } from "react-icons/fi";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import usePushNotifications from "@/hooks/usePushNotifications";

/**
 * Abonne (ou désabonne) CET appareil aux notifications de nouvelles demandes
 * d'accès. Affiché dans « Mon compte », l'appelant se charge de le réserver aux
 * admins — ce sont les seuls concernés par ces demandes.
 *
 * L'abonnement est propre au navigateur : le libellé le rappelle, sinon on
 * croit l'avoir activé partout depuis n'importe quel appareil.
 *
 * Sur iPhone, l'app doit avoir été ajoutée à l'écran d'accueil et ouverte
 * depuis cette icône — sinon iOS ne fournit pas le push, et on l'explique au
 * clic plutôt que de masquer le bouton.
 */
const PushToggle = () => {
  const { supported, blockedOnIOS, enabled, ready, busy, toggle } =
    usePushNotifications();

  // Navigateur sans push (et hors cas iOS rattrapable) : pas de bouton du tout.
  if (!supported && !blockedOnIOS) return null;

  const handleClick = async () => {
    const { error } = await toggle();
    if (error) {
      toast({
        title: "Notifications",
        description: error,
        status: "error",
        duration: 8000,
        isClosable: true,
      });
      return;
    }
    toast({
      title: enabled ? "Notifications désactivées" : "Notifications activées",
      description: enabled
        ? "Cet appareil ne sera plus prévenu des nouvelles demandes."
        : "Cet appareil sera prévenu à chaque nouvelle demande d'accès.",
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  return (
    <Button
      variant={enabled ? "primarySoft" : "outline"}
      onClick={handleClick}
      loading={busy || !ready}
      className="w-full"
    >
      {enabled ? <FiBell className="h-4 w-4" /> : <FiBellOff className="h-4 w-4" />}
      {enabled ? "Notifications activées" : "Activer les notifications"}
    </Button>
  );
};

export default PushToggle;
