import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { feedbackType } from "@/services/feedbackTypes";
import { Feedback } from "@/hooks/useFeedback";
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
  /** Écrire dans le fil (admin comme auteur). Absent = lecture seule. */
  onReply?: (body: string) => Promise<void>;
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

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Fil de discussion sous la demande : les messages dans l'ordre, les miens à
 * droite, puis un champ pour en ajouter un. Immuable — c'est l'historique de
 * l'échange entre l'auteur et l'admin.
 */
const FeedbackThread = ({
  item,
  me,
  onReply,
}: {
  item: Feedback;
  me?: string;
  onReply?: (body: string) => Promise<void>;
}) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  // Le dernier message en vue à l'ouverture comme à chaque arrivée.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [item.messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || !onReply) return;
    setSending(true);
    try {
      await onReply(body);
      setDraft("");
    } catch {
      /* déjà signalé par l'appelant */
    } finally {
      setSending(false);
    }
  };

  if (item.messages.length === 0 && !onReply) return null;

  const who = (authorId: string, email?: string | null) =>
    authorId === me
      ? "Toi"
      : email
        ? formatAuthorName(email)
        : authorId === item.author_id
          ? "Auteur"
          : "Admin";

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/55">
        Échanges
        {item.messages.length > 0 && (
          <span className="ml-1.5 font-medium normal-case tracking-normal text-foreground/40">
            ({item.messages.length})
          </span>
        )}
      </p>
      {item.messages.length > 0 && (
        <ul
          ref={listRef}
          className="m-0 mb-3 max-h-56 list-none space-y-2 overflow-y-auto p-0"
        >
          {item.messages.map((m) => {
            const mine = m.author_id === me;
            return (
              <li
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    mine
                      ? "bg-primary/10 text-foreground"
                      : "bg-muted/60 text-foreground",
                  )}
                >
                  <p className="mb-0.5 text-[11px] text-foreground/45">
                    <span className="font-semibold text-foreground/60">
                      {who(m.author_id, m.email)}
                    </span>
                    {" · "}
                    {formatDateTime(m.created_at)}
                  </p>
                  <p className="mb-0 whitespace-pre-wrap break-words text-sm">
                    {m.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {onReply && (
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            maxLength={REPLY_MAX}
            rows={2}
            placeholder="Écrire une réponse…"
            onChange={(e) => setDraft(e.target.value.slice(0, REPLY_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            className="min-h-[2.5rem] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <Button
            variant="primarySoft"
            onClick={send}
            disabled={!draft.trim()}
            loading={sending}
            aria-label="Envoyer"
          >
            Envoyer
          </Button>
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
  onReply,
  currentUserId,
  busy = false,
}: Props) => {
  if (!item) return null;
  const type = feedbackType(item.type);

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
      <p className="mb-0 mt-1 text-sm text-foreground/45">
        {formatDate(item.updated_at ?? item.created_at)}
        {/* L'email n'est rapporté que pour l'admin : sur ses propres demandes,
            l'auteur n'a pas à se voir nommer. */}
        {item.email && ` · ${formatAuthorName(item.email)}`}
      </p>

      {/* Long texte : c'est lui qui défile, pas la popup. */}
      <p className="mb-0 mt-4 sm:mt-5 max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground/85">
        {item.message}
      </p>

      {/* Captures jointes, sous le texte : un clic les ouvre en grand. */}
      <FeedbackImages paths={item.images} className="mt-3" />

      <FeedbackVersions feedbackId={item.id} count={item.edits} />

      <FeedbackThread item={item} me={currentUserId} onReply={onReply} />

      <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2">
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
    </Dialog>
  );
};

export default FeedbackViewDialog;
