/**
 * Vidéo YouTube intégrée (domaine nocookie), lancée d'office. Le son passe si
 * le navigateur l'autorise — c'est le cas après un clic sur le site (arrivée
 * depuis le classement) ; sinon le lecteur affiche son bouton lecture.
 * Charger YouTube transmet l'IP à Google : cf. « Destinataires » des textes
 * légaux et docs/registre-traitements.md.
 */
const YoutubeEmbed = ({ videoId, title }: { videoId: string; title: string }) => (
  <div className="relative aspect-video w-full bg-black">
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  </div>
);

export default YoutubeEmbed;
