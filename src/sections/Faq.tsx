import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import { FAQ, FaqItem } from "@/data/faq";
import { cn } from "@/lib/utils";

/**
 * Une question qui se déplie en glissant. Bouton plutôt que <details> natif :
 * ce dernier s'ouvre d'un coup, sans transition de hauteur possible partout.
 * `aria-expanded` / `aria-controls` gardent le clavier et les lecteurs d'écran.
 */
const FaqQuestion = ({ item }: { item: FaqItem }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left text-sm font-medium text-card-foreground sm:text-[15px]"
      >
        {item.question}
        <FiChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            // La hauteur animée rogne le contenu pendant le glissement ; la
            // marge basse est dans le bloc intérieur, donc comprise dedans.
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pb-3 pr-7 text-sm leading-relaxed text-foreground/70 sm:text-[15px]">
              {/* Question regroupée : un sujet par paragraphe. */}
              {Array.isArray(item.answer) ? (
                item.answer.map((part, i) => (
                  <p key={i} className="m-0">
                    {part}
                  </p>
                ))
              ) : (
                <p className="m-0">{item.answer}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Questions fréquentes, rangées par thème. Contenu dans src/data/faq.tsx. */
const Faq = () => (
  <div className="tw-scope flex w-full justify-center sm:px-4">
    <Card className="w-full max-w-2xl p-5 sm:p-8">
      <div
        role="heading"
        aria-level={1}
        className="text-center font-display text-lg font-extrabold text-card-foreground sm:text-2xl"
      >
        Questions fréquentes
      </div>

      <div className="mt-4 space-y-6 sm:mt-6">
        {FAQ.map((section) => (
          <section key={section.title}>
            <h2 className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/45">
              {section.title}
            </h2>
            <div className="divide-y divide-border">
              {section.items.map((item) => (
                <FaqQuestion key={item.question} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  </div>
);

export default Faq;
