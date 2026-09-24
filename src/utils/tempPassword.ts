import { toast } from "@/lib/toast";

/** Message prêt à coller (Teams) pour transmettre un mot de passe temporaire. */
export const tempPasswordMessage = (tempPassword: string) =>
  `Salut, voici ton mot de passe temporaire INFFLUNCH : ${tempPassword}`;

/**
 * Copie ce message dans le presse-papier et le signale par un toast — seule
 * restitution du mot de passe temporaire (plus de fenêtre après l'acceptation
 * d'une demande ou une réinitialisation).
 *
 * D'où le toast d'échec : le presse-papier peut être refusé (contexte non
 * sécurisé, permission) et le mot de passe serait alors définitivement perdu —
 * il faudrait refaire une réinitialisation. On le donne donc en clair, dans un
 * toast qui ne disparaît pas tout seul.
 */
export async function copyTempPassword(
  email: string,
  tempPassword: string
): Promise<void> {
  try {
    await navigator.clipboard.writeText(tempPasswordMessage(tempPassword));
    toast({
      title: "Message copié",
      description: `Mot de passe temporaire de ${email} : plus qu'à coller dans Teams.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  } catch {
    toast({
      title: "Copie impossible",
      description: `Mot de passe temporaire de ${email} : ${tempPassword} — à transmettre via Teams.`,
      status: "error",
      duration: Infinity,
      isClosable: true,
    });
  }
}
