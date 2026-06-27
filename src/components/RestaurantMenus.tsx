import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiX,
  FiLink,
  FiFileText,
  FiImage,
  FiBookOpen,
  FiExternalLink,
} from "react-icons/fi";
import useRestaurantMenus, {
  RestaurantMenu,
} from "@/hooks/useRestaurantMenus";
import MenuAddDialog from "@/components/MenuAddDialog";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { toast } from "@/lib/toast";
import { formatAuthorName } from "@/utils/authorName";

interface Props {
  restaurantId: number;
  slug: string;
  userId?: string;
  isAdmin: boolean;
}

const KIND_LABEL: Record<RestaurantMenu["kind"], string> = {
  link: "Menu (lien)",
  pdf: "Menu (PDF)",
  image: "Menu (photo)",
};

const KindIcon = ({ kind }: { kind: RestaurantMenu["kind"] }) => {
  const cls = "h-5 w-5";
  if (kind === "link") return <FiLink className={cls} />;
  if (kind === "pdf") return <FiFileText className={cls} />;
  return <FiImage className={cls} />;
};

/**
 * Menus d'un restaurant (collaboratif), multi-formats. Les liens et PDF
 * s'ouvrent dans un nouvel onglet ; les images ouvrent une lightbox. Chacun peut
 * supprimer ses propres entrées ; un admin peut en supprimer n'importe laquelle.
 */
const RestaurantMenus = ({ restaurantId, slug, userId, isAdmin }: Props) => {
  const { data: menus = [], isPending, add, remove } = useRestaurantMenus(
    restaurantId,
    slug
  );
  const [addOpen, setAddOpen] = useState(false);
  const [lightbox, setLightbox] = useState<RestaurantMenu | null>(null);

  const handleAdd = async (args: Parameters<typeof add.mutateAsync>[0]) => {
    try {
      await add.mutateAsync(args);
      toast({ title: "Menu ajouté", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({
        title: "Échec de l'ajout",
        description: e?.message ?? "Erreur inconnue",
        status: "error",
        duration: 5000,
      });
      throw e; // garde le dialog ouvert
    }
  };

  const handleDelete = async (menu: RestaurantMenu) => {
    try {
      await remove.mutateAsync(menu);
      setLightbox((cur) => (cur?.id === menu.id ? null : cur));
      toast({ title: "Menu supprimé", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible",
        status: "error",
        duration: 5000,
      });
    }
  };

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="heading"
          aria-level={2}
          className="font-display text-lg font-bold text-card-foreground"
        >
          Menu
          {menus.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
              ({menus.length})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <FiPlus className="h-4 w-4" />
          Ajouter un menu
        </button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-foreground/50">
          <FiBookOpen className="h-8 w-8 text-foreground opacity-50" />
          <p className="text-sm">
            Aucun menu pour le moment. Partage-en un (lien, PDF ou photo) !
          </p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {menus.map((menu) => {
            const canDelete = isAdmin || menu.user_id === userId;
            const label = menu.title?.trim() || KIND_LABEL[menu.kind];
            const isImage = menu.kind === "image";

            // Visuel de tête : vignette pour une image, sinon pastille d'icône.
            const lead = isImage ? (
              <img
                src={menu.href}
                alt=""
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-primary ring-1 ring-border">
                <KindIcon kind={menu.kind} />
              </span>
            );

            // Corps identique pour tous les types (image incluse) : seule
            // l'icône « lien externe » est réservée aux liens/PDF (ouverture
            // dans un nouvel onglet ; l'image ouvre une lightbox).
            const body = (
              <>
                {lead}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-medium text-card-foreground">
                    {label}
                    {!isImage && (
                      <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-foreground opacity-40" />
                    )}
                  </span>
                  {menu.email && (
                    <span className="block truncate text-xs text-foreground/45">
                      {formatAuthorName(menu.email)}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              <li key={menu.id}>
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 pr-2 transition hover:border-primary/40">
                  {isImage ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(menu)}
                      className="flex min-w-0 flex-1 items-center gap-3 p-0 text-left"
                    >
                      {body}
                    </button>
                  ) : (
                    <a
                      href={menu.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left no-underline"
                    >
                      {body}
                    </a>
                  )}

                  {canDelete && (
                    <HoldToDeleteButton
                      onConfirm={() => handleDelete(menu)}
                      title="Maintenir pour supprimer"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      progressClassName="bg-destructive/70"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </HoldToDeleteButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Lightbox (images) */}
      {lightbox?.kind === "image" && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            onClick={() => setLightbox(null)}
          >
            <FiX className="h-5 w-5" />
          </button>
          <img
            src={lightbox.href}
            alt=""
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <MenuAddDialog
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        isAdmin={isAdmin}
        onSubmit={handleAdd}
      />
    </section>
  );
};

export default RestaurantMenus;
