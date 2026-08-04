/** Textes éditables de la landing Macajou */
module.exports = [
  // Annonce
  {
    key: 'annonce.text',
    section: 'Annonce',
    label: 'Bandeau d’annonce',
    multiline: true,
    defaultValue: 'Une pause gourmande Macajou livrée en 2h sur Calavi et Cotonou',
  },

  // Hero
  {
    key: 'hero.over',
    section: 'Hero',
    label: 'Sur-titre',
    defaultValue: 'Pâtisserie de cajou ,  Bénin 🇧🇯',
  },
  { key: 'hero.hl1', section: 'Hero', label: 'Titre ,  ligne 1', defaultValue: 'La saison' },
  { key: 'hero.hl2', section: 'Hero', label: 'Titre ,  ligne 2', defaultValue: 'des Macajoux' },
  { key: 'hero.hl3', section: 'Hero', label: 'Titre ,  ligne 3', defaultValue: 'est ouverte' },
  { key: 'hero.cta', section: 'Hero', label: 'Bouton', defaultValue: 'Je choisis mon coffret' },
  { key: 'hero.scroll', section: 'Hero', label: 'Indication défilement', defaultValue: 'Défiler' },

  // Collection / Coffrets
  {
    key: 'collection.sur',
    section: 'Collection',
    label: 'Sur-titre',
    defaultValue: 'E-shop',
  },
  {
    key: 'collection.title',
    section: 'Collection',
    label: 'Titre',
    defaultValue: 'Coffrets Macajou',
  },
  {
    key: 'collection.intro',
    section: 'Collection',
    label: 'Introduction',
    multiline: true,
    defaultValue:
      'Faites confiance à la créatrice pour la sélection du jour, ou composez vous-même votre coffret.',
  },
  { key: 'collection.cta', section: 'Collection', label: 'Bouton panier', defaultValue: 'Voir le panier' },

  // Instant Macajou
  {
    key: 'instant.sur',
    section: 'Instant Macajou',
    label: 'Sur-titre',
    defaultValue: "Dans l'atelier",
  },
  {
    key: 'instant.title',
    section: 'Instant Macajou',
    label: 'Titre',
    defaultValue: "L'instant Macajou",
  },
  { key: 'instant.label.1', section: 'Instant Macajou', label: 'Photo 1 ,  légende', defaultValue: 'La Tour' },
  {
    key: 'instant.label.2',
    section: 'Instant Macajou',
    label: 'Photo 2 ,  légende',
    defaultValue: 'Rouge Passion',
  },
  { key: 'instant.label.3', section: 'Instant Macajou', label: 'Photo 3 ,  légende', defaultValue: 'Le Trio' },
  { key: 'instant.label.4', section: 'Instant Macajou', label: 'Photo 4 ,  légende', defaultValue: 'Signature' },
  {
    key: 'instant.label.5',
    section: 'Instant Macajou',
    label: "Photo 5 ,  légende",
    defaultValue: "L'Original",
  },
  {
    key: 'instant.label.6',
    section: 'Instant Macajou',
    label: 'Photo 6 ,  légende',
    defaultValue: 'La Collection',
  },

  // Maison
  {
    key: 'maison.sur',
    section: 'La Maison',
    label: 'Sur-titre (script)',
    defaultValue: 'Architecture gourmande',
  },
  {
    key: 'maison.heading',
    section: 'La Maison',
    label: 'Titre script (comme Instant Macajou)',
    defaultValue: 'Les pyramides Macajou',
  },
  {
    key: 'maison.title',
    section: 'La Maison',
    label: 'Titre panneau',
    multiline: true,
    defaultValue: 'Pyramides\nMacajou',
  },
  {
    key: 'maison.body',
    section: 'La Maison',
    label: 'Paragraphe',
    multiline: true,
    defaultValue:
      'Les pyramides Macajou élèvent nos macajoux en une architecture gourmande : composez-les à votre goût, ou confiez la sélection à la créatrice, pour une parenthèse résolument béninoise.',
  },
  {
    key: 'maison.cta',
    section: 'La Maison',
    label: 'Bouton',
    defaultValue: 'Je compose ma pyramide',
  },


  // La Maison, l'histoire
  { key: 'histoire.eyebrow', section: 'La Maison, Histoire', label: 'Sur-titre', defaultValue: 'La Maison Macajou' },
  { key: 'histoire.title', section: 'La Maison, Histoire', label: 'Titre', multiline: true, defaultValue: 'Une histoire gourmande\nqui traverse les cultures' },
  { key: 'histoire.stamp', section: 'La Maison, Histoire', label: 'Cartouche photo', multiline: true, defaultValue: 'Depuis 10 ans\nau Bénin' },
  { key: 'histoire.p1', section: 'La Maison, Histoire', label: 'Paragraphe 1', multiline: true, defaultValue: "Le macaron est le fruit d'un long voyage culinaire. Son origine remonte aux anciennes pâtisseries à base d'amandes du monde arabo-persan, c'est-à-dire au Moyen-Orient et dans certaines régions de l'Afrique du nord. Ces recettes auraient circulé dans le bassin méditerranéen grâce aux échanges commerciaux et culturels où l'Italie, notamment la Sicile, a développé des biscuits très proches du macaron actuel. Puis arrivé en France, il devient le macaron parisien, composé de deux coques réunies par une garniture, une référence mondiale." },
  { key: 'histoire.accent', section: 'La Maison, Histoire', label: 'Phrase accent', multiline: true, defaultValue: "Depuis 10 ans, Macajou a écrit un nouveau chapitre de cette histoire au Bénin." },
  { key: 'histoire.p2', section: 'La Maison, Histoire', label: 'Paragraphe 2', multiline: true, defaultValue: "L'histoire du macaron était celle d'une évolution de formes et de savoir-faire. Celle du Macajou marque une nouvelle étape : pour la première fois, son ingrédient fondateur, l'amande, cède la place à la noix de cajou, offrant à cette gourmandise une identité gustative entièrement nouvelle, agricole et culturelle enracinée au Bénin." },
  { key: 'histoire.etape1.lieu', section: 'La Maison, Histoire', label: 'Étape 1, lieu', defaultValue: 'Monde arabo-persan' },
  { key: 'histoire.etape1.note', section: 'La Maison, Histoire', label: 'Étape 1, note', defaultValue: "Les premières pâtisseries d'amandes" },
  { key: 'histoire.etape2.lieu', section: 'La Maison, Histoire', label: 'Étape 2, lieu', defaultValue: 'Sicile · Italie' },
  { key: 'histoire.etape2.note', section: 'La Maison, Histoire', label: 'Étape 2, note', defaultValue: 'Le biscuit tout proche du macaron' },
  { key: 'histoire.etape3.lieu', section: 'La Maison, Histoire', label: 'Étape 3, lieu', defaultValue: 'Paris · France' },
  { key: 'histoire.etape3.note', section: 'La Maison, Histoire', label: 'Étape 3, note', defaultValue: 'Deux coques et une garniture' },
  { key: 'histoire.etape4.lieu', section: 'La Maison, Histoire', label: 'Étape 4, lieu', defaultValue: 'Cotonou · Bénin' },
  { key: 'histoire.etape4.note', section: 'La Maison, Histoire', label: 'Étape 4, note', defaultValue: "La cajou remplace l'amande" },
  { key: 'histoire.quote', section: 'La Maison, Histoire', label: 'Citation', defaultValue: 'Le macaron est une histoire universelle.' },
  { key: 'histoire.signature', section: 'La Maison, Histoire', label: 'Signature', defaultValue: 'Le Macajou en est la signature béninoise.' },
  { key: 'histoire.cta', section: 'La Maison, Histoire', label: 'Bouton', defaultValue: 'Goûter cette histoire' },

  // Entreprise
  { key: 'entreprise.eyebrow', section: 'Entreprise', label: 'Sur-titre', defaultValue: "L'entreprise" },
  { key: 'entreprise.title', section: 'Entreprise', label: 'Titre', multiline: true, defaultValue: "Une maison béninoise\nd'innovation culinaire" },
  { key: 'entreprise.p1', section: 'Entreprise', label: 'Paragraphe 1', multiline: true, defaultValue: "MACAJOU est une maison béninoise d'innovation culinaire qui crée et fabrique des gourmandises locales à partir de matières premières africaines, principalement béninoises." },
  { key: 'entreprise.p2', section: 'Entreprise', label: 'Paragraphe 2', multiline: true, defaultValue: "Sa spécialité, le Macajou (du même nom que l'entreprise), est une gourmandise unique composée de deux biscuits légers et fondants à base de poudre de noix de cajou (0% de blé), assemblés par une délicieuse crème fondante aux saveurs locales." },
  { key: 'entreprise.p3', section: 'Entreprise', label: 'Phrase accent', multiline: true, defaultValue: "Contrairement à la recette traditionnelle à base d'amande, le Macajou met à l'honneur la noix de cajou du Bénin, offrant une identité et un goût uniques." },
  { key: 'entreprise.point1.valeur', section: 'Entreprise', label: 'Point 1, titre', defaultValue: '0% de blé' },
  { key: 'entreprise.point1.label', section: 'Entreprise', label: 'Point 1, légende', defaultValue: 'Sans farine de blé' },
  { key: 'entreprise.point2.valeur', section: 'Entreprise', label: 'Point 2, titre', defaultValue: 'Poudre de cajou' },
  { key: 'entreprise.point2.label', section: 'Entreprise', label: 'Point 2, légende', defaultValue: 'Deux biscuits fondants' },
  { key: 'entreprise.point3.valeur', section: 'Entreprise', label: 'Point 3, titre', defaultValue: 'Saveurs locales' },
  { key: 'entreprise.point3.label', section: 'Entreprise', label: 'Point 3, légende', defaultValue: 'Matières premières africaines' },
  { key: 'entreprise.badge', section: 'Entreprise', label: 'Étiquette vidéo', defaultValue: 'Fabriqué au Bénin' },
  { key: 'entreprise.legende', section: 'Entreprise', label: 'Légende vidéo', defaultValue: 'La maison Macajou' },
  { key: 'entreprise.cta', section: 'Entreprise', label: 'Bouton', defaultValue: 'Découvrir nos gourmandises' },

  // Coffret
  {
    key: 'coffret.eyebrow',
    section: 'Coffret',
    label: 'Sur-titre',
    defaultValue: 'Coffret sur mesure',
  },
  {
    key: 'coffret.title',
    section: 'Coffret',
    label: 'Titre',
    multiline: true,
    defaultValue: 'Composez votre\ncoffret',
  },
  { key: 'coffret.cta', section: 'Coffret', label: 'Bouton', defaultValue: 'Je choisis' },

  // Cadeaux
  {
    key: 'cadeaux.title',
    section: 'Cadeaux',
    label: 'Titre',
    multiline: true,
    defaultValue: 'Idées cadeaux\nà personnaliser',
  },
  {
    key: 'cadeaux.body1',
    section: 'Cadeaux',
    label: 'Paragraphe 1',
    multiline: true,
    defaultValue:
      "Un anniversaire ? Un remerciement ? Des félicitations à transmettre ? Ou simplement l'envie de faire plaisir ?",
  },
  {
    key: 'cadeaux.body2',
    section: 'Cadeaux',
    label: 'Paragraphe 2',
    multiline: true,
    defaultValue:
      'Composez votre coffret gourmand Macajou, garni de nos créations emblématiques et rubané à votre nom. Facile à personnaliser, sur simple message WhatsApp.',
  },
  { key: 'cadeaux.cta', section: 'Cadeaux', label: 'Bouton', defaultValue: 'Je personnalise' },

  // Adresses
  {
    key: 'adresses.title',
    section: 'Adresses',
    label: 'Titre',
    multiline: true,
    defaultValue: 'Nos points de vente',
  },
  { key: 'adresses.cta', section: 'Adresses', label: 'Bouton', defaultValue: 'Localiser la boutique' },

  // Newsletter
  {
    key: 'newsletter.title',
    section: 'Newsletter',
    label: 'Titre',
    defaultValue: 'Rejoignez le cercle des gourmets',
  },
  {
    key: 'newsletter.body',
    section: 'Newsletter',
    label: 'Paragraphe',
    multiline: true,
    defaultValue:
      'Nouveautés, éditions limitées et douceurs en avant-première. Et pour commander dès maintenant : un message, et vos Macajoux arrivent frais à votre porte.',
  },
  {
    key: 'newsletter.placeholder',
    section: 'Newsletter',
    label: 'Placeholder e-mail',
    defaultValue: 'Votre adresse e-mail',
  },
  {
    key: 'newsletter.submit',
    section: 'Newsletter',
    label: 'Bouton inscription',
    defaultValue: "S'inscrire",
  },
  {
    key: 'newsletter.cta',
    section: 'Newsletter',
    label: 'Bouton commander',
    defaultValue: 'Commander en ligne',
  },

  // Footer
  {
    key: 'footer.blurb',
    section: 'Pied de page',
    label: 'Présentation',
    multiline: true,
    defaultValue:
      'Gourmandises à base de noix de cajou, de produits frais et locaux. Fièrement fabriquées au Bénin. 🇧🇯',
  },
  {
    key: 'footer.col1',
    section: 'Pied de page',
    label: 'Colonne 1 ,  titre',
    defaultValue: 'La Maison',
  },
  {
    key: 'footer.col2',
    section: 'Pied de page',
    label: 'Colonne 2 ,  titre',
    defaultValue: 'Aide & Services',
  },
  {
    key: 'footer.col3',
    section: 'Pied de page',
    label: 'Colonne 3 ,  titre',
    defaultValue: 'Suivez-nous',
  },
  {
    key: 'footer.copy',
    section: 'Pied de page',
    label: 'Copyright',
    defaultValue: '© 2026 ETS MACAJOU ,  Macajou Gourmandises. Tous droits réservés.',
  },
  {
    key: 'footer.tagline',
    section: 'Pied de page',
    label: 'Signature',
    defaultValue: 'Fabriqué avec amour & cajou au Bénin 🇧🇯',
  },
];
