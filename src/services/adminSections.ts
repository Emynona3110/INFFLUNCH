export type AdminSection = {
  label: string;
  path: string;
  tableName: string;
  columns: string[];
};

export const adminSections: AdminSection[] = [
  {
    label: "Restaurants",
    path: "admin/restaurants",
    tableName: "restaurants",
    columns: [
      "id",
      "name",
      "address",
      "phone",
      "website",
      "badges",
      "tags",
      "image",
    ],
  },
  // {
  //   label: "Avis",
  //   path: "admin/avis",
  //   tableName: "rewiews",
  //   columns: ["id", "restaurantId", "userId", "rating", "comment", "date"],
  // },
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
  // {
  //   label: "Utilisateurs",
  //   path: "admin/utilisateurs",
  //   tableName: "users",
  //   columns: ["id", "username", "email", "role"],
  // },
];
