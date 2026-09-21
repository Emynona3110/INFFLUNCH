import { useLocation, useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import Layout from "../components/Layout";
import CookieWord from "@/components/CookieWord";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useSession from "../hooks/useSession";
import useSupabaseQuery from "../hooks/useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

/**
 * Pages publiques « Mentions légales » et « Politique de confidentialité ».
 *
 * Base légale des mentions : art. 1-1 LCEN (loi 2004-575, réécrite par la loi
 * SREN du 21/05/2024). Éditeur à titre NON professionnel → seul l'hébergeur
 * doit être identifié publiquement (nom, adresse, téléphone), l'éditeur ayant
 * communiqué son identité à l'hébergeur (compte Render).
 * Information RGPD : art. 12 à 14 du règlement (UE) 2016/679.
 */

const EDITOR_NAME = "LLS";
/**
 * Identité complète et e-mail de contact de l'éditeur : PAS dans le code.
 * Ils sont lus dans la table `site_config` (RLS : lecture réservée aux
 * sessions authentifiées, cf. sql/2026-09-18_site_config.sql) et affichés aux
 * seuls collègues connectés — les personnes concernées au sens du RGPD. Le
 * public (et le bundle JS) ne voit que le pseudonyme : anonymat LCEN préservé.
 */
const LAST_UPDATE = "19 septembre 2026";

const HOST = {
  name: "Render Services, Inc.",
  address: "525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis",
  url: "https://render.com",
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-2">
    <div
      role="heading"
      aria-level={2}
      className="font-display text-sm font-bold text-card-foreground sm:text-base"
    >
      {title}
    </div>
    {children}
  </section>
);

const Ext = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    {children}
  </a>
);

/** Nom complet + e-mail pour les collègues connectés, pseudonyme pour le public. */
const useLegalContact = () => {
  const { sessionData } = useSession();
  const connected = !!sessionData;
  const { data } = useSupabaseQuery<{ key: string; value: string }>(
    ["site_config"],
    () => supabaseClient.from("site_config").select("key, value"),
    { enabled: connected, staleTime: Infinity },
  );
  const get = (key: string) => data.find((row) => row.key === key)?.value;
  return {
    name: (connected && get("editor_full_name")) || EDITOR_NAME,
    email: connected ? get("contact_email") : undefined,
    connected,
  };
};

const Contact = () => {
  const { email } = useLegalContact();
  return (
    <>
      par Teams ou par e-mail
      {email && (
        <>
          {" "}
          à <Ext href={`mailto:${email}`}>{email}</Ext>
        </>
      )}
    </>
  );
};

const MentionsLegales = () => {
  const { name, connected } = useLegalContact();
  return (
    <>
      <Section title="Éditeur">
        <p>
          INFFLUNCH est un site édité à titre non professionnel et bénévole par{" "}
          <span className="font-semibold text-foreground">{name}</span>,
          collaborateur d'INFFLUX. Il s'agit d'une initiative personnelle,
          réservée aux collaborateurs, sans but lucratif et sans lien
          contractuel avec la société INFFLUX. L'éditeur a communiqué ses
          éléments d'identification à l'hébergeur ci-dessous
          {!connected &&
            " ; son identité complète est affichée aux utilisateurs connectés"}
          .
        </p>
        <p>
          Contact : <Contact />.
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Site : {HOST.name}, {HOST.address} —{" "}
          <Ext href={HOST.url}>{HOST.url}</Ext>. Le site est statique et
          distribué via un réseau mondial de diffusion de contenu (CDN) : tes
          données de compte et contributions n'y sont pas stockées ; Render peut
          traiter des données techniques (adresse IP, journaux) nécessaires à la
          fourniture et à la sécurité du service.
        </p>
        <p>
          Base de données, authentification et fichiers : Supabase Inc.,
          infrastructure hébergée dans l'Union européenne (région eu-west-1,
          Irlande) — <Ext href="https://supabase.com">supabase.com</Ext>.
        </p>
      </Section>

      <Section title="Crédits">
        <p>
          Les utilisateurs restent titulaires des droits dont ils disposent sur
          leurs contributions (avis, photos, menus) et déclarent disposer des
          droits ou autorisations nécessaires à leur publication. Les fonds de
          carte proviennent d'
          <Ext href="https://www.openstreetmap.org/copyright">
            OpenStreetMap
          </Ext>{" "}
          (© OpenStreetMap contributors, licence ODbL). Le nom et l'identité
          visuelle d'INFFLUX appartiennent à la société INFFLUX.
        </p>
      </Section>

      <Section title="Contenus publiés par les utilisateurs">
        <p>
          Chaque utilisateur est responsable des contenus qu'il publie (avis,
          photos, menus, réactions). Tout contenu illicite, diffamatoire ou
          portant atteinte aux droits d'un tiers peut être signalé à l'éditeur (
          <Contact />) et sera retiré dans les meilleurs délais.
        </p>
      </Section>

      <Section title="Utilisation du site">
        <p>
          Le site est fourni gratuitement, en l'état, sans garantie de
          disponibilité ni d'exactitude : les informations sur les restaurants
          (adresses, horaires, prix, menus) sont indicatives et peuvent être
          obsolètes ; les avis n'engagent que leurs auteurs. L'éditeur peut
          modifier ou retirer un contenu, suspendre un compte en cas d'abus, ou
          interrompre le service à tout moment.
        </p>
      </Section>
    </>
  );
};

const Confidentialite = () => {
  const { name, connected } = useLegalContact();
  return (
    <>
      <Section title="Responsable du traitement">
        <p>
          <span className="font-semibold text-foreground">{name}</span>, éditeur
          du site (voir les mentions légales). Contact : <Contact />.
          {!connected &&
            " L'identité complète du responsable est affichée aux utilisateurs connectés."}
        </p>
      </Section>

      <Section title="Données traitées et finalités">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Compte</span> :
            adresse e-mail professionnelle, mot de passe (haché par Supabase,
            jamais accessible en clair à l'éditeur), rôle, avatar facultatif —
            pour te connecter et t'identifier auprès des collègues.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Demandes d'accès
            </span>{" "}
            : e-mail et date — pour créer ton compte ou réinitialiser ton mot de
            passe.
          </li>
          <li>
            <span className="font-medium text-foreground">Contributions</span> :
            avis et notes, votes, réactions, photos, menus, favoris, choix « je
            déjeune où ? », succès débloqués — pour faire fonctionner le service
            et les afficher aux autres collaborateurs.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Demandes et suggestions
            </span>{" "}
            : textes et images que tu envoies via « Compte › Demandes », et les
            échanges qui s'ensuivent avec l'administrateur — pour améliorer le
            site.
          </li>
          <li>
            <span className="font-medium text-foreground">Notifications</span> :
            abonnement push du navigateur, proposé aux administrateurs seulement
            et uniquement s'ils l'activent — pour être prévenus des demandes
            d'accès.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Données techniques
            </span>{" "}
            : adresse IP, navigateur, horodatages et journaux de connexion,
            traités par les prestataires ci-dessous — pour servir le site, le
            sécuriser et bloquer les robots.
          </li>
        </ul>
        <p>
          Sur quelle base : ton compte, tes demandes d'accès, tes contributions
          et tes demandes sont traités parce que c'est le service que tu
          demandes en t'inscrivant ; les données techniques et la modération
          relèvent de l'intérêt légitime de l'éditeur à faire fonctionner et
          sécuriser le site ; les notifications push reposent sur le
          consentement de l'administrateur, retirable à tout moment dans les
          réglages (
          <FiSettings
            aria-label="Réglages"
            className="inline h-3.5 w-3.5 align-[-2px]"
          />
          ). Seul l'e-mail est indispensable : sans lui, pas de compte. Tout le
          reste (photo de profil, avis, photos, menus, demandes…) est
          facultatif.
        </p>
      </Section>

      <Section title="Destinataires et sous-traitants">
        <p>
          Tes contributions sont visibles des seuls collaborateurs connectés.
          Les données sont traitées par : Supabase (base, authentification,
          stockage — Union européenne), Render (hébergement du site), Cloudflare
          (Turnstile, anti-robots sur la page d'inscription : adresse IP et
          caractéristiques du navigateur), OpenStreetMap (chargement des fonds
          de carte : adresse IP). Aucune donnée n'est vendue ni utilisée à des
          fins publicitaires.
        </p>
      </Section>

      <Section title="Transferts hors Union européenne">
        <p>
          Tes données de compte et contributions restent dans l'Union européenne
          (Supabase, Irlande). Render et Cloudflare sont des sociétés
          américaines : les données techniques qu'ils traitent peuvent être
          transférées aux États-Unis, dans le cadre du Data Privacy Framework
          UE-États-Unis ou, à défaut, des clauses contractuelles types de la
          Commission européenne.
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Ton compte et tes contributions sont conservés tant que tu n'en
          demandes pas la suppression, y compris après ton départ de la
          société : tes avis et photos restent utiles aux collègues. Aucune
          suppression n'est faite sans ta demande explicite. Quand tu la
          demandes, ton compte est supprimé et tes données personnelles
          effacées ; tes contributions (avis, photos, menus) sont anonymisées
          — ou effacées aussi, si tu le précises. Les demandes d'accès refusées sont
          supprimées sous 12 mois.
        </p>
      </Section>

      <Section title="Cookies et stockage local">
        <p>
          Le site n'utilise ni <CookieWord /> publicitaire ni outil de mesure
          d'audience. Seuls des éléments strictement nécessaires sont
          enregistrés dans ton navigateur : jeton de session (connexion), thème
          clair/sombre, mode d'affichage, éléments déjà consultés (nouveautés,
          succès), dernier onglet ouvert. Ils ne nécessitent pas de
          consentement.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux accéder à tes données, les rectifier, demander leur effacement
          ou la limitation du traitement, et t'opposer à certains traitements.
          Tu modifies toi-même ton avatar et ton mot de passe dans « Compte ›
          Profil », tes avis dans « Compte › Avis », tes photos depuis la fiche
          du restaurant ; pour le reste (dont la suppression du compte),
          contacte l'éditeur (<Contact />
          ).
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Accès réservé aux comptes validés manuellement (adresses INFFLUX),
          connexion chiffrée (HTTPS), politiques de sécurité au niveau des
          lignes (Row Level Security) côté base de données, mots de passe
          hachés.
        </p>
      </Section>

      <Section title="Modifications">
        <p>
          Cette politique peut évoluer avec le site ; toute modification notable
          est annoncée dans l'onglet « Nouveautés » et la date de mise à jour
          ci-dessus est actualisée.
        </p>
      </Section>
    </>
  );
};

type Kind = "mentions" | "confidentialite";

const TITLES: Record<Kind, string> = {
  mentions: "Mentions légales",
  confidentialite: "Politique de confidentialité",
};

export default function LegalPage({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const location = useLocation();
  // « Retour » = écran d'origine (le footer navigue entre les deux pages
  // légales en `replace`, elles ne s'empilent donc pas). Arrivée directe (pas
  // d'historique) : retour à l'accueil.
  const goBack = () =>
    location.key === "default" ? navigate("/") : navigate(-1);

  return (
    <Layout scrollKey={location.pathname}>
      <div className="tw-scope flex w-full justify-center sm:px-4">
        <Card className="w-full max-w-2xl p-5 sm:p-8">
          <div
            role="heading"
            aria-level={1}
            className="font-display text-base font-extrabold text-card-foreground sm:text-xl"
          >
            {TITLES[kind]}
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Dernière mise à jour : {LAST_UPDATE}
          </p>

          <div className="mt-4 space-y-5 text-xs leading-relaxed text-foreground/80 sm:mt-6 sm:text-[13px]">
            {kind === "mentions" ? <MentionsLegales /> : <Confidentialite />}
          </div>

          <div className="mt-6 flex justify-end border-t border-border pt-4">
            <Button variant="outline" onClick={goBack}>
              Retour
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
