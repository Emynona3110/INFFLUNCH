import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { feedbackStatus, feedbackType } from "@/services/feedbackTypes";
import { FiCheck, FiEdit2, FiSend } from "react-icons/fi";
import { Feedback, FeedbackMessage } from "@/hooks/useFeedback";
import Avatar from "@/components/Avatar";
import FeedbackVersions from "@/components/FeedbackVersions";
import FeedbackImages from "@/components/FeedbackImages";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Feedback | null;
  /** Bascule vers la popup de correction (seul l'auteur y a droit). */
  onEdit?: () => void;
  /** Suppression de la demande, sous appui long. */
  onDelete?: () => void;
  /** Admin : accepter (→ backlog) / refuser. Fournis quand ça a un sens. */
  onAccept?: () => void;
  onRefuse?: () => void;
  /** Admin : clôturer la demande (sans suite, ou réglée par le fil), sous
   *  appui long. Fourni quand elle n'est pas encore classée. */
  onCloseRequest?: () => void;
  /** Admin : rouvrir une demande clôturée (le fil se déverrouille). */
  onReopenRequest?: () => void;
  /** Écrire dans le fil (admin comme auteur). Absent = lecture seule. */
  onReply?: (body: string) => Promise<void>;
  /** Corriger un de MES messages du fil (crayon à côté de la bulle). */
  onEditMessage?: (id: number, body: string) => Promise<void>;
  /** Pour distinguer « Toi » des autres dans le fil. */
  currentUserId?: string;
  /** Une action est en cours : on verrouille les boutons. */
  busy?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const REPLY_MAX = 2000;

/** Séparateur de jour : « dimanche 13 septembre ». */
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const dayKey = (iso: string) => new Date(iso).toDateString();

/** Pastille système dans le fil : l'auteur a retiré sa demande, à cette date. */
const WithdrawnNotice = ({ item }: { item: Feedback }) => (
  <div className="my-3 flex justify-center">
    <span className="rounded-full bg-destructive/10 px-3 py-0.5 text-[11px] text-destructive">
      {item.email ? formatAuthorName(item.email) : "L'auteur"} a retiré sa
      demande · {formatDay(item.cancelled_at as string)}
    </span>
  </div>
);

/**
 * Fil de discussion sous la demande, façon messagerie : pp et nom de qui parle
 * au-dessus de sa série de messages, bulles arrondies (les miennes à droite,
 * en couleur), pas d'heure, un séparateur à chaque changement de jour, et une
 * zone de saisie en pilule avec bouton d'envoi rond. Immuable — c'est l'historique de l'échange
 * entre l'auteur et l'admin.
 */
const FeedbackThread = ({
  item,
  me,
  onReply,
  onEditMessage,
}: {
  item: Feedback;
  me?: string;
  onReply?: (body: string) => Promise<void>;
  onEditMessage?: (id: number, body: string) => Promise<void>;
}) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  // Message en cours de correction : son texte est repris dans la zone de
  // saisie, dont le bouton d'envoi devient une coche. Échap, ou un nouveau
  // clic sur son crayon, abandonne.
  const [editing, setEditing] = useState<FeedbackMessage | null>(null);
  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };
  const startEdit = (m: FeedbackMessage) => {
    if (editing?.id === m.id) return cancelEdit();
    setEditing(m);
    setDraft(m.body);
    inputRef.current?.focus();
  };
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // La zone de saisie grandit avec le texte (jusqu'à sa hauteur max, puis elle
  // défile) et revient à une ligne une fois le message parti.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);
  // Le dernier message en vue à l'ouverture comme à chaque arrivée.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [item.messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      if (editing) {
        if (!onEditMessage) return;
        if (body !== editing.body.trim()) await onEditMessage(editing.id, body);
        setEditing(null);
      } else {
        if (!onReply) return;
        await onReply(body);
      }
      setDraft("");
    } catch {
      /* déjà signalé par l'appelant */
    } finally {
      setSending(false);
    }
  };

  if (item.messages.length === 0 && !onReply) return null;

  // Qui parle : chacun par son nom et sa pp, moi compris.
  const who = (m: FeedbackMessage) =>
    m.email ? formatAuthorName(m.email) : "?";

  return (
    <div className="mt-4 border-t border-border pt-3">
      {item.messages.length > 0 && (
        <div
          ref={listRef}
          className="-mt-3 mb-3 max-h-64 overflow-y-auto pr-1"
        >
          {item.messages.map((m, i) => {
            const mine = m.author_id === me;
            const prev = item.messages[i - 1];
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            // Même auteur qu'au message d'avant, même jour : la bulle suit la
            // précédente de près, sans répéter pp ni nom.
            const chained = !newDay && prev?.author_id === m.author_id;
            // L'auteur s'est retiré entre ce message et le précédent : on le
            // dit ici, à sa place dans le fil (l'admin seul voit une demande
            // retirée).
            const withdrawnHere =
              !!item.cancelled_at &&
              item.cancelled_at <= m.created_at &&
              (!prev || prev.created_at < item.cancelled_at);
            return (
              <div key={m.id} className={cn(chained ? "mt-0.5" : "mt-3")}>
                {withdrawnHere && <WithdrawnNotice item={item} />}
                {newDay && (
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-foreground/55">
                      {formatDay(m.created_at)}
                    </span>
                  </div>
                )}
                {/* Tête de série : pp + nom au-dessus du premier message. */}
                {!chained && (
                  <div
                    className={cn(
                      "mb-1 flex items-center gap-2",
                      mine ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar
                      email={m.email}
                      avatarPath={m.avatar_path}
                      size={24}
                    />
                    <span className="text-xs font-semibold text-foreground/80">
                      {who(m)}
                    </span>
                  </div>
                )}
                {/* Décalées de la largeur pp + espace (32px) : la bulle
                    s'aligne sur le nom, pas sur la pp. */}
                {/* Mes bulles : le crayon prend la place du décalage (à
                    droite, sous la pp) ; les autres : décalées sous le nom. */}
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    mine ? "justify-end pr-1" : "justify-start pl-8",
                  )}
                >
                  {/* Même radius que les boutons de la popup ; la première
                      bulle d'une série a un coin droit sous le nom, côté pp.
                      Celle en cours de correction est grisée. */}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-lg px-3.5 py-2 text-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      !chained && (mine ? "rounded-tr-none" : "rounded-tl-none"),
                      editing?.id === m.id && "opacity-50",
                    )}
                  >
                    <p className="m-0 whitespace-pre-wrap break-words">
                      {m.body}
                      {m.edited_at && (
                        <span className="ml-1.5 text-[10px] opacity-60">
                          (modifié)
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Crayon à droite de MON message, toujours visible (pas de
                      survol au tactile) : reprend le texte dans la saisie. */}
                  {mine && onEditMessage && (
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      aria-label={
                        editing?.id === m.id
                          ? "Annuler la modification"
                          : "Modifier le message"
                      }
                      className={cn(
                        "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:bg-muted hover:text-foreground",
                        editing?.id === m.id ? "text-primary" : "text-foreground/35",
                      )}
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {/* Retrait postérieur au dernier message : en fin de fil. */}
          {!!item.cancelled_at &&
            item.messages.every((m) => m.created_at < item.cancelled_at!) && (
              <WithdrawnNotice item={item} />
            )}
        </div>
      )}
      {/* Fil vide mais demande retirée : on le dit quand même. */}
      {item.messages.length === 0 && !!item.cancelled_at && (
        <div className="mb-3">
          <WithdrawnNotice item={item} />
        </div>
      )}
      {onReply && (
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            maxLength={REPLY_MAX}
            rows={1}
            placeholder="Écris un message…"
            onChange={(e) => setDraft(e.target.value.slice(0, REPLY_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              } else if (e.key === "Escape" && editing) {
                e.preventDefault();
                e.stopPropagation();
                cancelEdit();
              }
            }}
            className="max-h-40 min-h-[2.75rem] w-full resize-none rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-border bg-muted/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            aria-label={editing ? "Enregistrer la modification" : "Envoyer"}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
            ) : editing ? (
              <FiCheck className="h-5 w-5" />
            ) : (
              <FiSend className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Lecture d'une demande : la tuile n'en montre qu'une ligne tronquée, c'est ici
 * qu'on lit le message entier et qu'on voit de qui il vient.
 *
 * Une demande corrigée reste la même demande : le message affiché est toujours
 * le dernier, et les versions précédentes se déplient en dessous — repliées par
 * défaut, c'est la version courante qui compte.
 */
const FeedbackViewDialog = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  onAccept,
  onRefuse,
  onCloseRequest,
  onReopenRequest,
  onReply,
  onEditMessage,
  currentUserId,
  busy = false,
}: Props) => {
  if (!item) return null;
  const type = feedbackType(item.type);
  const status = feedbackStatus(item.status);

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>
        <span className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", type.dot)} />
          {type.label}
        </span>
      </DialogTitle>
      {/* La date est celle de la version affichée — la dernière. Les dates des
          versions d'avant sont dans l'historique, en dessous. */}
      <p className="mb-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/45">
        <span>
          {formatDate(item.updated_at ?? item.created_at)}
          {/* L'email n'est rapporté que pour l'admin : sur ses propres
              demandes, l'auteur n'a pas à se voir nommer. */}
          {item.email && ` · ${formatAuthorName(item.email)}`}
        </span>
        {/* Le sort de la demande, là où on décide (admin) ou où on le lit. */}
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            status.chip,
          )}
        >
          {status.label}
        </span>
      </p>

      {/* Long texte : c'est lui qui défile, pas la popup. */}
      <p className="mb-0 mt-4 sm:mt-5 max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground/85">
        {item.message}
      </p>

      {/* Captures jointes, sous le texte : un clic les ouvre en grand. */}
      <FeedbackImages paths={item.images} className="mt-3" />

      <FeedbackVersions feedbackId={item.id} count={item.edits} />

      <FeedbackThread
        item={item}
        me={currentUserId}
        onReply={onReply}
        onEditMessage={onEditMessage}
      />

      {/* Deux rangées : les DÉCISIONS (admin) d'abord — chacune son style
          pour qu'on ne les confonde pas —, puis les gestes de base (retirer /
          fermer / modifier). */}
      <div className="mt-4 sm:mt-6 space-y-3">
        {(onRefuse || onAccept || onCloseRequest || onReopenRequest) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            {onRefuse && (
              <HoldToDeleteButton
                onConfirm={onRefuse}
                mobileConfirm={false}
                disabled={busy}
                title="Maintenir pour refuser"
                className="inline-flex h-10 items-center rounded-lg bg-destructive/10 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/20"
                progressClassName="bg-destructive/20"
              >
                Refuser
              </HoldToDeleteButton>
            )}
            {onCloseRequest && (
              <HoldToDeleteButton
                onConfirm={onCloseRequest}
                mobileConfirm={false}
                disabled={busy}
                title="Maintenir pour clôturer"
                className="inline-flex h-10 items-center rounded-lg bg-muted px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted/70"
                progressClassName="bg-foreground/10"
              >
                Clôturer
              </HoldToDeleteButton>
            )}
            {onReopenRequest && (
              <Button variant="primarySoft" onClick={onReopenRequest} disabled={busy}>
                Rouvrir
              </Button>
            )}
            {onAccept && (
              <HoldToDeleteButton
                onConfirm={onAccept}
                mobileConfirm={false}
                disabled={busy}
                title="Maintenir pour accepter"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                progressClassName="bg-white/25"
              >
                Accepter
              </HoldToDeleteButton>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div>
            {onDelete && (
              <HoldToDeleteButton
                onConfirm={onDelete}
                mobileConfirm={false}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                progressClassName="bg-destructive/20"
              >
                Supprimer
              </HoldToDeleteButton>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Fermer
            </Button>
            {onEdit && (
              <Button onClick={onEdit} disabled={busy}>
                Modifier
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default FeedbackViewDialog;
