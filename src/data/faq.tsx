// Questions fréquentes (page /faq). Contenu EN DUR, comme le changelog :
// ajouter une question = une entrée ici. Les réponses décrivent le
// fonctionnement réel du site — à revoir quand il change (relance de prix,
// paliers de flammes, seuil doré…).
import { ReactNode } from "react";
import { IconType } from "react-icons";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import {
  FiGrid,
  FiHelpCircle,
  FiList,
  FiMap,
  FiPlus,
} from "react-icons/fi";
import {
  LuDices,
  LuListFilter,
  LuMegaphone,
  LuSmilePlus,
} from "react-icons/lu";
import ChefHatPlus from "@/components/icons/ChefHatPlus";
import { cn } from "@/lib/utils";
import { RARE_PERCENT } from "@/data/achievements";

export interface FaqItem {
  question: string;
  /** Une réponse, ou plusieurs paragraphes quand la question en regroupe
   *  plusieurs (un sujet par paragraphe). */
  answer: ReactNode | ReactNode[];
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

/** Icône d'un bouton du site, en ligne dans le texte : quand une réponse
 *  cite un bouton, on le MONTRE (cœur, +, filtres…) plutôt que de le décrire. */
const Ico = ({ icon: Icon, className }: { icon: IconType; className?: string }) => (
  <Icon className={cn("inline h-4 w-4 align-text-bottom text-primary", className)} />
);

const HelpIcon = () => <Ico icon={FiHelpCircle} />;

export const FAQ: FaqSection[] = [
  // Chaque question part d'une fonctionnalité (nommée comme dans le site) et
  // dit où la trouver. Questions regroupées par fonctionnalité proche.
  // Sections dans l'ordre d'usage : ce qu'on fait chaque jour d'abord
  // (restaurants, midi, avis), le compte et l'installation en dernier.
  {
    title: "Restaurants",
    items: [
      {
        question: "Comment trouver un restaurant ?",
        answer: [
          "Sur la page Restaurants, la barre de recherche cherche par nom.",
          <>
            Le bouton Filtres <Ico icon={LuListFilter} /> affine par note
            minimum, prix du midi, tags et badges (à emporter, sur place, click
            & collect, option végétarienne), et permet de trier : pertinence,
            notes, proximité, prix, nombre d'avis, ajout récent.
          </>,
          <>
            Les boutons d'affichage passent en grille <Ico icon={FiGrid} />, en
            liste <Ico icon={FiList} /> ou sur la carte <Ico icon={FiMap} />.
          </>,
        ],
      },
      {
        question: "Comment fonctionnent les favoris ?",
        answer: [
          <>
            Le cœur <Ico icon={FaRegHeart} /> d'une carte ou d'une fiche
            restaurant l'ajoute à tes favoris <Ico icon={FaHeart} />.
          </>,
          <>
            Le bouton cœur <Ico icon={FaRegHeart} /> de la page Restaurants
            n'affiche ensuite qu'eux, y compris pour la Surprise du midi.
          </>,
        ],
      },
      {
        question: "Que trouve-t-on sur la fiche d'un restaurant ?",
        answer: [
          "Les photos et les avis des collègues, la note moyenne, les infos pratiques (contact, prix du midi), les menus, la carte avec l'itinéraire, et les collègues qui y déjeunent aujourd'hui.",
          "Les trois mieux notés portent une médaille Top 1, 2 ou 3 ; un restaurant fermé reste consultable, en noir et blanc.",
        ],
      },
      {
        question: "Comment fonctionne le prix du midi ?",
        answer: [
          <>
            Chacun déclare ce qu'il a payé, depuis la fiche du restaurant
            (bouton <Ico icon={FiPlus} /> Mon prix, dans les infos pratiques)
            ou la relance de la page Déjeuner.
          </>,
          "Une seule déclaration par personne et par restaurant, que tu peux corriger ou retirer.",
          "La fourchette affichée vient de l'ensemble des déclarations : personne ne voit le montant d'une personne en particulier.",
        ],
      },
      {
        question: "Comment fonctionne la Surprise du midi ?",
        answer: (
          <>
            C'est la vue Roulette <Ico icon={LuDices} /> de la page
            Restaurants : la roue tire un restaurant au hasard parmi ceux
            affichés, filtres et favoris compris. Tu peux en retirer avant de
            lancer.
          </>
        ),
      },
      {
        question: "Comment proposer d'ajouter un restaurant ?",
        answer: [
          <>
            Avec le bouton <Ico icon={ChefHatPlus} /> en haut de l'écran :
            cherche le lieu ou saisis-le à la main.
          </>,
          "Tu peux suivre tes propositions dans Mon compte, onglet Restos, et les corriger tant qu'elles sont en attente.",
        ],
      },
      {
        question: "Une fiche contient une erreur, comment la signaler ?",
        answer: (
          <>
            Tu peux envoyer une demande avec « Demande » dans le menu d'aide{" "}
            <HelpIcon />, en précisant le restaurant.
          </>
        ),
      },
    ],
  },
  {
    title: "Déjeuner",
    items: [
      {
        question: "Comment fonctionne la page Déjeuner ?",
        answer: [
          "Elle montre où chacun déjeune aujourd'hui. Choisis ton restaurant, ou indique « Pas de restaurant » (tu manges sur site autrement) ou « Pas sur site ».",
          "« Rejoindre » t'ajoute à la tablée d'un collègue, et « Retirer » annule ton choix.",
          "En créant ou en rejoignant une tablée, tu peux indiquer ton heure de départ approximative (entre 11h30 et 14h). « Heure » permet de la changer ensuite.",
          "Tous les collègues connectés voient ces choix.",
          "Une pastille te le rappelle tant que ton midi n'est pas déclaré, les jours de semaine.",
        ],
      },
      {
        question: "Que signifient les flammes autour des photos de profil ?",
        answer:
          "C'est la série de jours ouvrés d'affilée avec un midi déclaré dans Déjeuner : un contour dès 2 jours, des flammes à partir de 5, bleues à partir de 15 et violettes à partir de 30.",
      },
      {
        question: "Comment évolue ma série de midis ?",
        answer: [
          "Chaque jour de semaine où tu déclares ton midi compte : un restaurant, « Pas de restaurant » ou « Pas sur site ».",
          "Le midi du jour s'ajoute à minuit, une fois la journée passée. Le week-end est ignoré : vendredi puis lundi s'enchaînent.",
          "Un jour de semaine sans déclaration remet la série à zéro, jours fériés et congés compris : ces jours-là, déclare « Pas sur site » pour la garder.",
        ],
      },
    ],
  },
  {
    title: "Avis, photos et menus",
    items: [
      {
        question: "Comment laisser, modifier ou supprimer un avis ?",
        answer: [
          "Sur la fiche du restaurant : une note de 1 à 5 étoiles (obligatoire) et un commentaire (facultatif).",
          "Un seul avis par personne et par restaurant : rouvre-le pour le modifier, et supprime-le par un appui long.",
        ],
      },
      {
        question: "Comment ajouter ou supprimer une photo ?",
        answer: [
          "Sur la fiche du restaurant : glisse-dépose, colle (Ctrl+V) ou choisis tes images, avec une légende si tu veux.",
          "Tu peux supprimer tes propres photos depuis leur affichage en grand.",
          "Ne publie que des photos que tu as le droit de partager (plats, lieu…).",
        ],
      },
      {
        question: "Comment ajouter un menu ?",
        answer:
          "Sur la fiche du restaurant, section Menu : un lien vers le site, un PDF ou une photo du menu.",
      },
      {
        question: "Comment réagir à une photo ou à un avis ?",
        answer: (
          <>
            Avec le bouton <Ico icon={LuSmilePlus} /> Réagir, qui ouvre la
            palette d'emojis. Les emojis déjà posés s'affichent à côté : clique
            dessus pour ajouter ou retirer le tien.
          </>
        ),
      },
    ],
  },
  {
    title: "Succès",
    items: [
      {
        question: "Comment fonctionnent les succès ?",
        answer: [
          "Ils se débloquent en utilisant le site : avis, photos, prix, midis déclarés…",
          "Retrouve-les dans Mon compte, onglet Succès. Clique sur un succès pour voir ta progression et qui l'a déjà obtenu.",
          "Certains sont secrets : leur condition reste cachée jusqu'à ce que tu les trouves.",
          `Les plus rares, obtenus par moins de ${RARE_PERCENT} % des collègues, sont dorés.`,
        ],
      },
    ],
  },
  {
    title: "Classement",
    items: [
      {
        question: "Comment fonctionne le classement ?",
        answer:
          "Il compte, pour chaque collègue, les succès, les avis, les photos et les midis déclarés. Choisis un mois, ou « Depuis toujours » pour le total.",
      },
    ],
  },
  {
    title: "Profils",
    items: [
      {
        question: "Que montre un profil ?",
        answer:
          "La date d'arrivée sur le site (« Membre depuis »), le nombre d'avis, de photos et de midis déclarés, la série en cours, les succès et les photos publiées.",
      },
      {
        question: "Comment voir le profil d'un collègue ?",
        answer:
          "Clique sur son nom ou sa photo : sous un avis, dans une tablée de Déjeuner ou dans le classement.",
      },
    ],
  },
  {
    title: "Nouveautés",
    items: [
      {
        question: "Où voir les nouveautés du site ?",
        answer: (
          <>
            Avec l'icône <Ico icon={LuMegaphone} className="-rotate-[30deg]" />{" "}
            en haut à droite, ou le lien Nouveautés en bas de page. Une
            pastille l'indique quand il y a du nouveau.
          </>
        ),
      },
      {
        question: "Que signifient les pastilles orange ?",
        answer: [
          "Quelque chose t'attend : sur Déjeuner, un midi à déclarer ou un prix à donner ; sur le mégaphone, des nouveautés ; sur ta photo de profil, un succès pas encore vu ou une réponse à une demande ou à une proposition.",
          "Une pastille s'affiche aussi sur l'icône du site, dans l'onglet du navigateur.",
        ],
      },
    ],
  },
  {
    title: "Boîte à demandes",
    items: [
      {
        question: "Comment signaler un bug ou proposer une idée ?",
        answer: [
          <>
            Avec « Demande » dans le menu d'aide <HelpIcon /> : choisis Bug,
            Amélioration ou Fonctionnalité.
          </>,
          "Tu suis la réponse dans Mon compte, onglet Demandes, où tu peux continuer l'échange et corriger tes messages.",
        ],
      },
    ],
  },
  {
    title: "Compte",
    items: [
      {
        question: "Qui a accès à INFFLUNCH ?",
        answer: [
          "Seulement les collègues d'INFFLUX, chacun avec un compte validé manuellement.",
          "Pour rejoindre le site, un collègue peut faire sa demande depuis l'écran de connexion, avec « Demander un accès ».",
        ],
      },
      {
        question: "Comment accéder aux réglages ?",
        answer:
          "Clique sur ta photo de profil en haut à droite, puis Réglages : tu peux y changer ta photo de profil (et la recadrer), le thème et ton mot de passe.",
      },
      {
        question: "J'ai oublié mon mot de passe, comment faire ?",
        answer:
          "Depuis l'écran de connexion, « Demander un accès » permet aussi d'en demander un nouveau.",
      },
      {
        question: "Comment me déconnecter ?",
        answer:
          "Clique sur ta photo de profil en haut à droite, puis « Se déconnecter ».",
      },
      {
        question: "Comment installer INFFLUNCH comme une application ?",
        answer: [
          "Le site s'utilise dans n'importe quel navigateur, mais tu peux aussi l'installer : il s'ouvre alors dans sa propre fenêtre, avec son icône.",
          <>
            <strong>iPhone / iPad</strong> : dans Safari, bouton Partager, puis
            « Sur l'écran d'accueil ».
          </>,
          <>
            <strong>Android</strong> : dans Chrome, menu ⋮, puis « Installer
            l'application » (ou « Ajouter à l'écran d'accueil »).
          </>,
          <>
            <strong>Ordinateur</strong> : dans Chrome ou Edge, clique sur
            l'icône d'installation à droite de la barre d'adresse (ou menu,
            puis « Installer INFFLUNCH »). Sur Mac avec Safari : menu Fichier,
            puis « Ajouter au Dock ». Firefox ne permet pas l'installation.
          </>,
        ],
      },
    ],
  },
];
