import { useState } from "react";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
}

/** Champ mot de passe avec bouton œil (masqué par défaut → œil barré). */
const PasswordField = ({ label, value, onChange, isInvalid }: PasswordFieldProps) => {
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative" onMouseLeave={() => setShow(false)}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-10 w-full rounded-lg border bg-background pl-3 pr-10 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary/25",
            isInvalid
              ? "border-destructive focus-visible:border-destructive"
              : "border-border focus-visible:border-primary"
          )}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-0 top-0 grid h-10 w-10 cursor-pointer place-items-center text-foreground/50 transition hover:text-foreground"
        >
          {show ? <VscEye /> : <VscEyeClosed />}
        </button>
      </div>
    </label>
  );
};

export default PasswordField;
