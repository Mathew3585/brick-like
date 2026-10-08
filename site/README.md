# Site Socle

Page produit et liste d'attente. Astro 7, Tailwind v4, GSAP (ScrollTrigger) et Lenis.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie statique dans dist/
```

## Liste d'attente

Le formulaire envoie `{ "email": "..." }` en JSON (POST) à `PUBLIC_WAITLIST_ENDPOINT`.
Copie `.env.example` en `.env` et renseigne l'adresse, par exemple un formulaire Formspree.
Sans adresse : en dev l'inscription est simulée, en prod le formulaire affiche une erreur.

## Où est quoi

| Fichier | Rôle |
|---|---|
| `src/pages/index.astro` | L'ordre des sections |
| `src/components/LockStory.astro` | La séquence épinglée : le téléphone se pose sur le Socle, la page passe à l'encre |
| `src/components/screens/` | Les écrans de l'app recodés en HTML (accueil, session, écran de blocage) |
| `src/scripts/motion.ts` | Toutes les animations et le changement de ton papier / encre |
| `src/scripts/waitlist.ts` | L'envoi du formulaire |
| `src/styles/global.css` | Les couleurs de l'app (papier, encre, graphite) |

Avec `prefers-reduced-motion`, pas de défilement fluide ni d'épinglage : les étapes s'affichent à la suite.

## Vidéos

`public/videos/` : trois vidéos Pixabay (licence Pixabay : usage commercial autorisé, sans attribution obligatoire), en 960 px, chacune avec son poster `.jpg`. Elles tournent dans la section « Ce que tu récupères » (`src/scripts/benefits.ts`).

| Fichier | Source |
|---|---|
| `travail.mp4` | https://pixabay.com/fr/videos/portable-travailler-linternet-92480/ |
| `famille.mp4` | https://pixabay.com/videos/breakfast-family-happiness-joy-172667/ (9 premières secondes) |
| `lecture.mp4` | https://pixabay.com/fr/videos/rester-%C3%A0-la-maison-en-train-de-lire-34473/ (9 premières secondes) |
