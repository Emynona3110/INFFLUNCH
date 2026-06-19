export type AdminSection = {
  label: string;
  path: string;
  tableName: string;
  columns: string[];
};

export const adminSections: AdminSection[] = [
  // Les restaurants se gèrent désormais directement dans le site (crayon sur
  // chaque card + bouton "+" navbar + suppression dans le dialog d'édition),
  // donc plus d'onglet "Restaurants" dans l'admin.
  {
    label: "Tags",
    path: "admin/tags",
    tableName: "tags",
    columns: ["id", "label"],
  },
  {
    label: "Badges",
    path: "admin/badges",
    tableName: "badges",
    columns: ["id", "label"],
  },
  {
    label: "Demandes",
    path: "admin/demandes",
    tableName: "waiting_list",
    columns: ["email", "created_at"],
  },
];
