-- Textes libres plafonnés à 1000 caractères (même valeur que MAX_TEXT côté
-- front, `src/services/textLimits.ts`). Les compteurs des popups empêchent
-- d'aller au-delà ; la base verrouille pour de bon.
-- Longueurs max constatées avant ce script : notes 584, demandes 143, avis 513.

alter table public.reviews drop constraint if exists reviews_comment_len;
alter table public.reviews add constraint reviews_comment_len
  check (comment is null or length(comment) <= 1000);

alter table public.feedback drop constraint if exists feedback_message_len;
alter table public.feedback add constraint feedback_message_len
  check (length(message) <= 1000);

alter table public.admin_notes drop constraint if exists admin_notes_description_len;
alter table public.admin_notes add constraint admin_notes_description_len
  check (length(description) <= 1000);
