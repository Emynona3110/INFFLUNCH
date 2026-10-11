import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiLock } from "react-icons/fi";
import { Dialog } from "@/components/ui/dialog";
import Avatar from "@/components/Avatar";
import AuthorButton from "@/components/AuthorButton";
import useAchievementHolders from "@/hooks/useAchievementHolders";
import { Achievement, RARE_PERCENT } from "@/data/achievements";
import useUserNames from "@/hooks/useUserNames";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  achievement: Achievement | null;
  /** Le visiteur l'a lui-même obtenu : icône en couleur, condition révélée. */
  unlocked: boolean;
  /** La personne dont on regarde le succès l'a (profil d'un collègue) : un
   *  succès rare y prend son or même si le visiteur ne l'a pas. Par défaut,
   *  celui du visiteur (`unlocked`). */
  owned?: boolean;
  /** Condition telle qu'on peut la montrer (celle du catalogue, ou celle d'un
   *  secret déjà débloqué). Absente = « Succès secret ». */
  condition?: string;
  /** Pourcentage d'obtention global, une fois les stats chargées. */
  percent?: number;
  /** Progression du visiteur vers le palier (succès à compteur révélés) ;
   *  ignorée une fois le succès obtenu. */
  progress?: { value: number; goal: number };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Texte sur UNE ligne, police réduite juste ce qu'il faut s'il déborde
 *  (« Leonardo, Raphael, Donatello et Michelangelo »). Remesuré au
 *  redimensionnement et une fois les polices chargées. */
const FitLine = ({ text, className }: { text: string; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      if (el.scrollWidth > el.clientWidth)
        el.style.fontSize = `${(el.clientWidth / el.scrollWidth) * 0.98}em`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [text]);
  return (
    <span ref={ref} className={cn("block whitespace-nowrap", className)}>
      {text}
    </span>
  );
};

/** Deux textes superposés dans la même case de grille, l'un en fondu à la
 *  place de l'autre (même durée que l'image d'origine). La case prend la
 *  taille du plus grand : la popup ne bouge pas. `fitAlt` : le texte de
 *  remplacement tient sur une ligne (police réduite au besoin). */
const Crossfade = ({
  showAlt,
  main,
  alt,
  fitAlt,
}: {
  showAlt: boolean;
  main: string;
  alt?: string;
  fitAlt?: boolean;
}) => (
  // Piste bornée (minmax(0, 1fr)) : une ligne insécable ne l'élargit pas,
  // c'est FitLine qui réduit la police.
  <span className="grid grid-cols-[minmax(0,1fr)]">
    <span
      aria-hidden={showAlt}
      className={cn(
        "[grid-area:1/1] transition-opacity duration-200",
        showAlt && "opacity-0",
      )}
    >
      {main}
    </span>
    {alt &&
      (fitAlt ? (
        <FitLine
          text={alt}
          className={cn(
            "[grid-area:1/1] self-center transition-opacity duration-200",
            !showAlt && "opacity-0",
          )}
        />
      ) : (
        <span
          aria-hidden={!showAlt}
          className={cn(
            "[grid-area:1/1] transition-opacity duration-200",
            !showAlt && "opacity-0",
          )}
        >
          {alt}
        </span>
      ))}
  </span>
);

/**
 * Fiche d'un succès : sa condition, sa rareté, où en est le visiteur (« 12 /
 * 20 ») et la liste des collègues qui l'ont décroché, le dernier en tête.
 * Ouverte d'un clic sur un succès — la galerie de Mon compte comme le profil
 * d'un collègue. Un secret non obtenu garde sa condition pour lui, mais on
 * voit quand même qui l'a trouvé.
 */
const AchievementDialog = ({
  isOpen,
  onClose,
  achievement,
  unlocked,
  owned = unlocked,
  condition,
  percent,
  progress,
}: Props) => {
  const { nameOf } = useUserNames();
  const holders = useAchievementHolders(
    isOpen && achievement ? achievement.id : null,
  );
  // Référence de l'illustration : montrée tant que la souris survole l'image,
  // ou basculée d'un toucher (mobile) / d'Entrée (clavier). Elle remplace le
  // titre et la condition, et l'image d'origine celle du succès. Repliée à
  // chaque nouvelle fiche.
  const [showRef, setShowRef] = useState(false);
  const pointerType = useRef("");
  useEffect(() => setShowRef(false), [achievement?.id, isOpen]);

  if (!achievement) return null;
  const a = achievement;
  const revealed = unlocked || !a.secret;
  const done = progress ? Math.min(progress.value, progress.goal) : 0;
  const refShown = showRef && unlocked && !!a.reference;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="max-w-sm"
      showClose
    >
      {/* L'illustration en grand, au-dessus du titre : c'est la récompense. */}
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl text-7xl",
            unlocked && !a.image && "bg-primary/10",
            !unlocked && "bg-muted/40 text-muted-foreground",
          )}
        >
          {unlocked ? (
            a.image && a.reference ? (
              /* Survol (souris) ou toucher (mobile) : d'où vient l'image. */
              <button
                type="button"
                onPointerEnter={(e) =>
                  e.pointerType === "mouse" && setShowRef(true)
                }
                onPointerLeave={(e) =>
                  e.pointerType === "mouse" && setShowRef(false)
                }
                onPointerDown={(e) => (pointerType.current = e.pointerType)}
                onClick={() => {
                  // À la souris, c'est le survol qui décide.
                  if (pointerType.current !== "mouse") setShowRef((v) => !v);
                  pointerType.current = "";
                }}
                aria-label="Voir la référence de l'illustration"
                aria-pressed={showRef}
                className="relative h-full w-full cursor-help rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {/* L'illustration s'efface quand l'image d'origine apparaît
                    (plus étroite, en portrait, elle laisserait voir l'autre). */}
                <img
                  src={a.image}
                  alt=""
                  className={cn(
                    "h-full w-full object-contain transition-opacity duration-200",
                    refShown && a.referenceImage && "opacity-0",
                  )}
                />
                {/* L'image d'origine, en fondu par-dessus l'illustration, NON
                    recadrée : le fichier fait 288 px de HAUT, lu en densité 2x
                    (srcSet) → 144 px, la hauteur de la case. Une image en
                    largeur déborde sur les côtés (en absolu : la popup ne
                    bouge pas) ; une image en hauteur reste dans la case. */}
                {a.referenceImage && (
                  <img
                    srcSet={`${a.referenceImage} 2x`}
                    alt=""
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-none -translate-x-1/2 -translate-y-1/2 rounded-2xl transition-opacity duration-200",
                      showRef ? "opacity-100" : "opacity-0",
                    )}
                  />
                )}
              </button>
            ) : a.image ? (
              <img src={a.image} alt="" className="h-full w-full object-contain" />
            ) : (
              a.icon
            )
          ) : (
            <FiLock className="h-14 w-14" />
          )}
        </div>
        <div
          role="heading"
          aria-level={2}
          className="mt-3 w-full font-display text-xl font-bold leading-tight text-card-foreground"
        >
          <Crossfade
            showAlt={refShown}
            main={a.title}
            alt={a.reference}
            fitAlt
          />
        </div>
        <p
          aria-live="polite"
          className="m-0 mt-0.5 w-full text-sm leading-snug text-foreground/55"
        >
          <Crossfade
            showAlt={refShown && !!a.referenceWork}
            main={revealed && condition ? condition : "Succès secret"}
            alt={a.referenceWork}
          />
        </p>
      </div>

      {/* Rareté façon Steam : la part de l'équipe qui l'a. */}
      {percent !== undefined && (
        <p className="m-0 mt-2 text-center text-xs text-foreground/45">
          {/* Rare et obtenu : le même or que le contour. */}
          <span
            className={cn(
              owned && percent < RARE_PERCENT && "rare-text font-semibold",
            )}
          >
            {percent.toFixed(1)} % des collègues l'ont débloqué
          </span>
        </p>
      )}

      {/* Progression : seulement tant que le palier n'est pas atteint, et
          pour ceux dont la condition est connue — un compteur trahirait la
          condition d'un secret. */}
      {!unlocked && revealed && progress && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-foreground/60">Progression</span>
            <span className="tabular-nums font-semibold text-foreground/70">
              {done} / {progress.goal}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
              style={{ width: `${(done / progress.goal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Débloqué par
          {holders.data && holders.data.length > 0 && (
            <span className="ml-1.5 font-medium normal-case tracking-normal">
              ({holders.data.length})
            </span>
          )}
        </p>
        {holders.isPending ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : holders.isError ? (
          <p className="m-0 mt-2 text-sm text-destructive">
            {holders.error.message}
          </p>
        ) : holders.data.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-foreground/50">
            Personne ne l'a encore décroché.
          </p>
        ) : (
          /* Longue liste : c'est elle qui défile, pas la popup. */
          <ul className="m-0 mt-2 max-h-[30dvh] list-none space-y-1.5 overflow-y-auto p-0">
            {holders.data.map((h) => (
              <li key={h.user_id} className="flex items-center gap-2.5">
                <Avatar email={h.email} avatarPath={h.avatar_path} size={28} />
                {/* Le nom mène au profil : on referme d'abord la popup. */}
                <AuthorButton
                  userId={h.user_id}
                  email={h.email}
                  onClick={onClose}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground"
                >
                  {nameOf(h.email)}
                </AuthorButton>
                <span className="shrink-0 text-xs tabular-nums text-foreground/45">
                  {formatDate(h.unlocked_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};

export default AchievementDialog;
