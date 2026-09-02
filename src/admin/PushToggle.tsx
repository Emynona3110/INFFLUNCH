import { FiBell, FiBellOff } from "react-icons/fi";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import usePushNotifications from "@/hooks/usePushNotifications";

/**
 * Bouton cloche de la section Admin : abonne (ou désabonne) CET appareil aux
 * notifications de nouvelles demandes d'accès. Sur iPhone, l'app doit avoir été
 * ajoutée à l'écran d'accueil et ouverte depuis cette icône — sinon iOS ne
 * fournit pas le push et on l'explique au clic.
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

  const label = enabled
    ? "Notifications activées sur cet appareil"
    : "Être notifié des nouvelles demandes sur cet appareil";

  return (
    <Tooltip label={label}>
      <Button
        variant={enabled ? "primarySoft" : "outline"}
        onClick={handleClick}
        loading={busy || !ready}
        aria-label={label}
        className="px-3"
      >
        {enabled ? <FiBell size={18} /> : <FiBellOff size={18} />}
      </Button>
    </Tooltip>
  );
};

export default PushToggle;
