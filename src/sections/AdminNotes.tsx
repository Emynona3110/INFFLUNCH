import { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronRight,
  FiPlus,
  FiX,
  FiPaperclip,
} from "react-icons/fi";
import { toast } from "@/lib/toast";
import useAdminNotes, { AdminNote } from "@/hooks/useAdminNotes";
import { NoteCategory, noteCategory } from "@/services/noteCategories";
import AdminNoteDialog from "@/components/AdminNoteDialog";
import AdminNoteViewDialog from "@/components/AdminNoteViewDialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Glisser en cours. Pointer events et non glisser-déposer natif : ce dernier
 *  impose son image fantôme et son curseur « interdit », qu'on n'éteint jamais
 *  vraiment. Ici les tuiles s'écartent pour ouvrir la place visée. */
interface Drag {
  id: number;
  /** Index de la tuile saisie dans la liste des notes en cours. */
  from: number;
  /** Hauteur d'une tuile + gouttière : le cran dont tout le monde se décale. */
  step: number;
  /** Place visée, exprimée dans la liste privée de la tuile saisie. */
  insert: number;
  /** Pointeur relâché : on garde les décalages le temps que la liste
   *  réordonnée arrive, sinon la tuile ferait un aller-retour. */
  released?: boolean;
}

/** Appui long avant qu'une tuile ne se détache pour être déplacée : assez
 *  long pour ne pas confondre avec un clic ou le début d'un défilement. */
const HOLD_MS = 350;

/** Souplesse de l'animation, la même que le carrousel de la galerie. */
const EASE = "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)";

/** Retient le défilement tactile pendant un glisser. Déclaré ici, et non dans
 *  le composant : c'est la même fonction d'un rendu à l'autre, donc on peut
 *  l'ajouter et l'ôter sans se tromper de référence. */
const blockScroll = (e: TouchEvent) => e.preventDefault();

/**
 * Carnet de backlog des admins : les idées et bugs notés à la volée, sous forme
 * de tuiles réordonnables à la souris. Cocher une note ne la supprime pas — elle
 * passe en bas de liste, grisée.
 */
const AdminNotes = () => {
  const {
    data: notes = [],
    isPending,
    add,
    update,
    toggleDone,
    move,
    reorder,
    remove,
  } = useAdminNotes();

  // Deux popups : lire (clic sur la tuile) et modifier (bouton de la première,
  // ou ajout depuis l'en-tête).
  const [viewing, setViewing] = useState<AdminNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNote | null>(null);

  // Les notes terminées s'empilent avec le temps : elles restent consultables,
  // mais repliées, pour que le carnet montre d'abord ce qui reste à faire.
  const [showDone, setShowDone] = useState(false);

  // `drag` sert au rendu, `dragRef` aux gestes. React traite `pointermove` en
  // priorité basse : sur un mobile occupé, le dernier mouvement pouvait n'être
  // rendu qu'APRÈS le `pointerup`, et le relâchement lisait alors une place
  // visée périmée — la tuile revenait doucement à sa place d'origine, comme si
  // le déplacement était refusé. Le ref, lui, est à jour dès l'événement.
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const applyDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };
  const tileRefs = useRef(new Map<number, HTMLLIElement>());
  /** Milieux des autres tuiles, relevés AVANT que rien ne bouge : elles
   *  s'écartent ensuite par transformation, la mise en page ne change pas. */
  const midpoints = useRef<number[]>([]);

  const todo = notes.filter((n) => !n.done);
  const done = notes.filter((n) => n.done);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };

  const openEdit = (note: AdminNote) => {
    setViewing(null);
    setEditing(note);
    setEditOpen(true);
  };

  const fail = (e: any) =>
    toast({
      title: "Erreur",
      description: e?.message ?? "Réessaie.",
      status: "error",
      duration: 5000,
    });

  // Écriture optimiste : la popup se referme tout de suite, la liste est déjà
  // à jour. Si le serveur refuse, le hook rembobine et le toast le dit.
  const submit = async (values: {
    description: string;
    category: NoteCategory;
    images: string[];
  }) => {
    if (editing)
      await update.mutateAsync({ id: editing.id, note: editing, ...values });
    else await add.mutateAsync(values);
  };

  const startDrag = (
    note: AdminNote,
    target: HTMLElement,
    pointerId: number,
  ) => {
    const from = todo.findIndex((n) => n.id === note.id);
    const rects = todo.map((n) =>
      tileRefs.current.get(n.id)?.getBoundingClientRect(),
    );
    const mine = rects[from];
    if (from < 0 || !mine) return;

    // La tuile garde le pointeur : les mouvements continuent d'arriver même
    // si le curseur en sort.
    target.setPointerCapture(pointerId);
    // Posé ici, et pas seulement par l'effet plus bas : entre les deux il
    // s'écoule un rendu, de quoi laisser le navigateur emporter le geste en
    // défilement — il annule alors le pointeur et le glisser tombe à l'eau.
    document.addEventListener("touchmove", blockScroll, { passive: false });
    midpoints.current = rects
      .filter((_, i) => i !== from)
      .map((r) => (r ? r.top + r.height / 2 : Infinity));

    applyDrag({
      id: note.id,
      from,
      // Tuiles de hauteur identique : l'écart entre deux origines donne la
      // hauteur d'un cran, gouttière comprise.
      step:
        rects[0] && rects[1] ? rects[1].top - rects[0].top : mine.height + 8,
      insert: from,
    });
  };

  /** Appui long en attente : minuteur, point de départ (pour annuler si le
   *  doigt part défiler) et tuile visée. */
  const hold = useRef<{
    timer: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
  } | null>(null);
  /** Un appui long vient de déclencher un glisser : le clic qui suit le
   *  relâchement ne doit pas ouvrir la note. */
  const swallowClick = useRef(false);

  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  };

  /** Doigt ou souris posé sur une tuile en cours : au bout de HOLD_MS sans
   *  bouger, la tuile se détache. Un mouvement avant (défilement, clic
   *  imprécis) annule. */
  const pressTile = (note: AdminNote, event: React.PointerEvent) => {
    if (note.done || event.button !== 0) return;
    cancelHold();
    const target = event.currentTarget as HTMLElement;
    const { pointerId, clientX, clientY } = event;
    hold.current = {
      x: clientX,
      y: clientY,
      timer: setTimeout(() => {
        hold.current = null;
        swallowClick.current = true;
        navigator.vibrate?.(15);
        startDrag(note, target, pointerId);
      }, HOLD_MS),
    };
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (hold.current) {
      const dx = event.clientX - hold.current.x;
      const dy = event.clientY - hold.current.y;
      if (dx * dx + dy * dy > 36) cancelHold();
      return;
    }
    const d = dragRef.current;
    if (!d || d.released) return;
    const at = midpoints.current.findIndex((mid) => event.clientY < mid);
    const insert = at < 0 ? midpoints.current.length : at;
    if (insert !== d.insert) applyDrag({ ...d, insert });
  };

  /** Position d'arrivée = entre les deux voisines de la place visée. Une seule
   *  ligne est écrite, la liste n'est pas renumérotée. */
  const endDrag = () => {
    cancelHold();
    // Le clic consécutif au relâchement (s'il y en a un) part avant ce
    // délai ; au-delà, on ne doit plus avaler le clic suivant.
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
    const d = dragRef.current;
    document.removeEventListener("touchmove", blockScroll);
    if (!d || d.released) return;
    if (d.insert === d.from) {
      applyDrag(null);
      return;
    }

    const others = todo.filter((n) => n.id !== d.id);
    const before = others[d.insert - 1];
    const after = others[d.insert];
    const position = before
      ? after
        ? (before.position + after.position) / 2
        : before.position + 1
      : after
        ? after.position - 1
        : 0;

    // Les décalages restent en place jusqu'à ce que la liste arrive réordonnée
    // (`settled` ci-dessous) : c'est ce qui supprime le saut au relâchement.
    applyDrag({ ...d, released: true });

    // La moyenne ne sépare pas toujours : deux voisines à la même position
    // (vieux ajouts calculés depuis le cache) la rendent égale à toutes deux,
    // l'ordre retombe alors sur l'id et la tuile revient à sa place au premier
    // rechargement. Dans ce cas seulement, on renumérote la liste en cours.
    const separates =
      (!before || before.position < position) &&
      (!after || position < after.position);
    if (separates) {
      move.mutate({ id: d.id, position }, { onError: fail });
      return;
    }
    const ids = others.map((n) => n.id);
    ids.splice(d.insert, 0, d.id);
    reorder.mutate({ ids }, { onError: fail });
  };

  /** La liste est arrivée dans son nouvel ordre : chaque tuile est déjà à sa
   *  place à l'écran, on retire les décalages sans les animer. */
  const settled = !!drag?.released && todo[drag.insert]?.id === drag.id;
  const active = drag && !settled;

  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(() => applyDrag(null), 80);
    return () => clearTimeout(t);
  }, [settled]);

  // Tactile : une fois la tuile détachée, le doigt qui bouge ne doit pas faire
  // défiler la liste. `touch-action` ne se change pas en cours de geste ; un
  // `touchmove` non passif annulé, lui, retient le défilement.
  useEffect(() => {
    if (!active) return;
    document.addEventListener("touchmove", blockScroll, { passive: false });
    return () => document.removeEventListener("touchmove", blockScroll);
  }, [active]);

  useEffect(() => {
    if (!drag?.released) return;
    // Garde-fou : si la liste réordonnée n'arrive jamais (refus du serveur), on
    // ne reste pas figé avec des tuiles décalées.
    const t = setTimeout(() => applyDrag(null), 600);
    return () => clearTimeout(t);
  }, [drag?.released]);

  /** De combien une tuile s'écarte pour ouvrir la place visée : celles situées
   *  entre l'origine et la destination reculent d'un cran, ce qui referme le
   *  trou de départ et creuse celui d'arrivée. */
  const shiftOf = (index: number) => {
    if (!drag || !active || index === drag.from) return 0;
    const j = index < drag.from ? index : index - 1;
    if (index > drag.from && j < drag.insert) return -drag.step;
    if (index < drag.from && j >= drag.insert) return drag.step;
    return 0;
  };

  // Fonction de rendu et non sous-composant : un composant redéclaré à chaque
  // rendu serait remonté à chaque frappe, et la tuile sauterait en plein
  // déplacement.
  const renderTile = (note: AdminNote, index: number) => {
    const category = noteCategory(note.category);
    const dragged = !!active && drag.id === note.id;
    const shift = note.done ? 0 : shiftOf(index);

    return (
      <li
        key={note.id}
        ref={(el) => {
          if (el) tileRefs.current.set(note.id, el);
          else tileRefs.current.delete(note.id);
        }}
        style={{
          // La tuile saisie ne suit pas le pointeur au pixel : elle se pose de
          // cran en cran, sur les seules places où elle peut s'insérer. Elle ne
          // sort donc jamais du cadre de la liste.
          transform: dragged
            ? `translateY(${(drag!.insert - drag!.from) * drag!.step}px)`
            : shift
              ? `translateY(${shift}px)`
              : undefined,
          transition: settled ? "none" : EASE,
        }}
        className={cn("group relative flex items-center", dragged && "z-10")}
      >
        {/* Appui long = saisir la tuile (plus de poignée) ; clic = ouvrir. */}
        <div
          onPointerDown={(e) => pressTile(note, e)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => {
            cancelHold();
            // Le navigateur reprend parfois le pointeur en plein geste
            // (défilement, notification). Un glisser déjà commencé se conclut
            // alors sur la place visée plutôt que de s'annuler.
            if (dragRef.current) endDrag();
            else applyDrag(null);
          }}
          onClickCapture={(e) => {
            if (!swallowClick.current) return;
            swallowClick.current = false;
            e.stopPropagation();
            e.preventDefault();
          }}
          onContextMenu={(e) => e.preventDefault()}
          // iOS : pas de bulle « copier / partager » pendant l'appui long.
          style={{ WebkitTouchCallout: "none" }}
          className={cn(
            "relative flex min-w-0 flex-1 select-none items-center gap-2 overflow-hidden rounded-xl border border-border bg-background py-1.5 pl-3.5 pr-2 transition hover:border-primary/40",
            dragged && "cursor-grabbing",
            dragged && "shadow-lg",
            note.done && "opacity-55",
          )}
        >
          {/* Catégorie : une bande de couleur qui comble le bord gauche de la
              tuile (l'arrondi la rogne grâce à overflow-hidden), plutôt qu'une
              pastille qui alourdirait la ligne. Le libellé reste dans la popup. */}
          <span
            aria-label={category.label}
            className={cn("absolute inset-y-0 left-0 w-1", category.dot)}
          />
          <span className="sr-only">{category.label}</span>

          {/* Le bouton reste le texte, mais sa zone cliquable est étirée à
              toute la tuile par un pseudo-élément : le clic ouvre la note où
              qu'il tombe, sans imbriquer de boutons les uns dans les autres. */}
          <button
            type="button"
            onClick={() => setViewing(note)}
            aria-label="Voir la note"
            className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']"
          >
            {/* Une seule ligne : au-delà de la largeur, on coupe aux « … » et le
                descriptif complet se lit dans la popup. */}
            {/* Pas de texte barré : le grisé de la tuile dit déjà que la note
                est terminée, et le barré rendait le libellé pénible à relire. */}
            <p className="my-0 flex items-center gap-2 text-sm text-foreground/85">
              <span className="min-w-0 flex-1 truncate">
                {note.description}
              </span>
              {/* Trombone : des captures sont jointes, à voir dans la popup. */}
              {note.images.length > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-foreground/45">
                  <FiPaperclip className="h-3.5 w-3.5" />
                  {note.images.length}
                </span>
              )}
            </p>
          </button>

          {/* Actions toujours visibles (pas au survol), au-dessus de la zone
              cliquable de la tuile. */}
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() =>
                toggleDone.mutate(
                  { id: note.id, done: !note.done },
                  { onError: fail },
                )
              }
              aria-label={
                note.done ? "Rouvrir la note" : "Marquer comme terminé"
              }
              aria-pressed={note.done}
              className={cn(
                // Fond au survol seulement : la pastille permanente alourdissait
                // les tuiles terminées.
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition",
                note.done
                  ? "text-primary hover:bg-primary/10"
                  : "text-foreground/35 hover:bg-muted hover:text-primary",
              )}
            >
              {note.done ? (
                <FiX className="h-4 w-4" />
              ) : (
                <FiCheck className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="heading"
          aria-level={2}
          className="font-display text-lg font-bold text-card-foreground"
        >
          Backlog
          {todo.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
              ({todo.length})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <FiPlus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/55">
          Rien à traiter. Note ici ce que tu repères en naviguant.
        </p>
      ) : (
        <ul
          className={cn("m-0 list-none space-y-2 p-0", drag && "select-none")}
        >
          {todo.map(renderTile)}

          {done.length > 0 && (
            <>
              <li className="pt-4">
                <button
                  type="button"
                  onClick={() => setShowDone((v) => !v)}
                  aria-expanded={showDone}
                  className="flex w-full cursor-pointer items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/40 transition hover:text-foreground/60"
                >
                  <FiChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showDone && "rotate-90",
                    )}
                  />
                  Terminé ({done.length})
                  <span className="h-px flex-1 bg-border" />
                </button>
              </li>
              {showDone && done.map(renderTile)}
            </>
          )}
        </ul>
      )}

      <AdminNoteViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        note={viewing}
        onEdit={() => viewing && openEdit(viewing)}
        busy={remove.isPending}
        onDelete={async () => {
          if (!viewing) return;
          try {
            await remove.mutateAsync(viewing);
            setViewing(null);
          } catch (e) {
            fail(e);
          }
        }}
      />

      <AdminNoteDialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        note={editing}
        onSubmit={submit}
        onDelete={async () => {
          if (!editing) return;
          // Suppression depuis la popup (appui long) : la modale se ferme après.
          await remove.mutateAsync(editing).catch(fail);
        }}
      />
    </Card>
  );
};

export default AdminNotes;
