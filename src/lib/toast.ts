import { toast as sonner } from "sonner";

interface ToastOpts {
  title?: string;
  description?: string;
  status?: "success" | "error" | "warning" | "info";
  duration?: number;
  isClosable?: boolean;
}

/**
 * Adaptateur conservant la signature de l'ancien `useToast` de Chakra,
 * pour minimiser les changements aux points d'appel (toast({ title, ... })).
 */
export function toast({ title = "", description, status = "info", duration }: ToastOpts) {
  const opts = { description, duration };
  switch (status) {
    case "success":
      sonner.success(title, opts);
      break;
    case "error":
      sonner.error(title, opts);
      break;
    case "warning":
      sonner.warning(title, opts);
      break;
    default:
      sonner.info(title, opts);
  }
}
