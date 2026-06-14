# 🎞️ Help Animator — Sprite Animation Mapper

Outil visuel pour **corriger les incohérences d'animation** d'un personnage à partir
d'une spritesheet : on découpe la planche en sprites numérotés, on les affecte à des
animations nommées (`idle_down`, `walk_left`, `attack_up`, …) par **glisser-déposer**
ou **saisie manuelle**, on **prévisualise** le mouvement en boucle, puis on **exporte**
une map `HERO_SPRITE_MAP` en JS / JSON / TS.

L'application est **100 % locale, sans installation et sans ligne de commande** :
il suffit d'ouvrir `index.html` dans un navigateur. Elle est aussi **déployable sur
Vercel** telle quelle (site statique, zéro build).

---

## 🚀 Démarrer

### En local (le plus simple)
Double-cliquez sur **`index.html`** — l'application s'ouvre dans votre navigateur.
Aucune dépendance, aucun build, aucun terminal.

> Astuce : tout fonctionne depuis `file://` car les scripts sont des `<script>`
> classiques (pas de modules ES) et tous les chemins sont relatifs.

### Sur Vercel
Le dépôt est un site statique prêt à l'emploi (`index.html` à la racine + `vercel.json`).

- **Glisser-déposer** : déposez le dossier sur [vercel.com/new](https://vercel.com/new).
- **Git** : importez le repo dans Vercel — preset *Other*, aucun *Build Command*,
  *Output Directory* = `./`. Le `vercel.json` fournit `cleanUrls` et des en-têtes
  de sécurité / cache.
- **CLI** : `npx vercel` (preview) puis `npx vercel --prod`. Pour tester l'hébergement
  statique localement : `npx vercel dev`.

---

## 🕹️ Utilisation

1. **Importer** une spritesheet (bouton ou glisser-déposer dans le panneau de gauche).
2. **Régler le découpage** : largeur/hauteur de sprite, colonnes, lignes, marges,
   espacements. Boutons *Déduire la grille* / *Déduire la taille* pour s'aider de
   la taille de l'image.
3. **Créer des animations** (panneau de droite) — librement, ou via *Liste par défaut*.
4. **Affecter des sprites** :
   - glisser une vignette (ou une sélection multiple) vers une animation ;
   - double-cliquer une vignette pour l'ajouter à l'animation active ;
   - ou saisir `0, 1, 2, 3` / `00 01 02` / `[0,0], [1,3]` dans le champ de l'animation.
5. **Réordonner / retirer** les frames par glisser-déposer ou via le ✕ d'une frame
   (le sprite source reste intact).
6. **Prévisualiser** en bas : lecture/pause, FPS, boucle, zoom, frame courante.
7. **Exporter** (bouton *Exporter* ou `Ctrl+E`) en JS / JSON / TS, copier ou télécharger.
8. **Sauvegarder / Ouvrir** un projet `.spritemap.json` (l'image est embarquée).
   Le projet est aussi **auto-sauvegardé** dans le navigateur.

Raccourcis : `Ctrl+Z` / `Ctrl+Y` annuler/rétablir · `Ctrl+S` sauvegarder ·
`Ctrl+E` exporter · `Espace` lecture/pause · `Échap` fermer la modale.

Convention de coordonnées : **`id = ligne × colonnes + colonne`**, export en **`[ligne, colonne]`**.

---

## 🧱 Décisions de conception

### 1. Stack technique
HTML5 + CSS3 + **JavaScript vanilla (ES2020)**, **sans framework, sans build, sans
dépendance**. Canvas 2D pour le découpage et la prévisualisation. C'est le choix le
plus robuste pour « utilisable localement sans ligne de commande » **et** déployable
en statique (GitHub Pages, Vercel, Netlify…). Une coquille Electron pourrait
l'empaqueter en exécutable, mais elle n'est pas nécessaire ici.

### 2. Architecture des composants
Modules à responsabilité unique, chargés comme scripts classiques sous le namespace
global `HA` (fonctionne en `file://`, sans CORS) :

| Fichier            | Rôle |
|--------------------|------|
| `js/state.js`      | Modèle de données central, store observable, historique undo/redo |
| `js/slicer.js`     | Géométrie de découpage pure (aucun DOM) |
| `js/sheet.js`      | Chargement image + cache de vignettes par cellule |
| `js/parse.js`      | Parseur de saisie manuelle (ids / coordonnées) |
| `js/exporter.js`   | Génération JS / JSON / TS |
| `js/project.js`    | Sauvegarde/chargement projet + autosave localStorage |
| `js/actions.js`    | Couche de commandes (toute mutation passe par là) |
| `js/spriteGrid.js` | Panneau central : vignettes numérotées + sélection |
| `js/animations.js` | Panneau droit : cartes d'animation, frames, DnD, saisie |
| `js/dnd.js`        | Payload de drag partagé |
| `js/preview.js`    | Lecteur d'animation (FPS, boucle, frame) |
| `js/app.js`        | Amorçage et câblage de l'UI |

Flux unidirectionnel : `UI → actions → store → emit → re-render`.

### 3. Modèle de données
```ts
type SpriteCell      = { id, row, col, x, y, width, height };
type AnimationFrame  = { spriteId, row, col };
type AnimationDef    = { id, name, frames: AnimationFrame[], fps, loop };
type ProjectData     = {
  version, spriteSheetName, imageDataUrl,
  slicing: { spriteWidth, spriteHeight, columns, rows, marginX, marginY, spacingX, spacingY },
  animations: AnimationDef[],
  preview: { fps, loop, scale },
  export:  { format, varName, pretty, includeEmpty, padIds }
};
```
Chaque frame stocke à la fois `spriteId` **et** `[row, col]` : l'export se base sur
les coordonnées, et la frame reste affichable même si la grille change.

### 4. Format de sauvegarde projet
Un fichier **`*.spritemap.json`** = sérialisation directe de `ProjectData`,
**auto-contenu** (l'image est embarquée en *data URL*, donc indépendante de tout
chemin de fichier). Un **autosave** dans `localStorage` restaure la dernière session.

### 5. Fonctionnement du slicer
Pour chaque `(row, col)` : `x = marginX + col·(spriteWidth + spacingX)`,
`y = marginY + row·(spriteHeight + spacingY)`, `id = row·columns + col`.
Outils de déduction : *colonnes/lignes ← taille de sprite + image*, et
*taille de sprite ← colonnes/lignes + image*.

### 6. Logique du drag & drop
Le payload est conservé dans `HA.dnd` (fiable en `file://`, là où `dataTransfer`
est capricieux). Une vignette porte `{ kind:'sprite', spriteIds }` (toute la
sélection si multiple) ; une frame porte `{ kind:'frame', animId, index }`.
À la dépose, l'index d'insertion est calculé d'après la frame survolée
(insertion *avant*), ce qui gère ajout, réordonnancement et déplacement entre
animations.

### 7. Logique d'export
`animations → { name: [[row,col], …] }`, puis rendu selon le format :
`const HERO_SPRITE_MAP = { … };` (JS), JSON strict, ou
`export const … = { … } as const;` (TS). Options : nom de variable, mise en forme
aérée, inclusion des animations vides. Copie presse-papiers (avec repli
`execCommand`) et téléchargement `.js` / `.json` / `.ts`.

---

## 📁 Structure du projet
```
Help-Animator/
├── index.html        # interface (structure)
├── styles.css        # thème pixel-art moderne
├── vercel.json       # déploiement statique Vercel
├── README.md
└── js/
    ├── state.js  slicer.js  sheet.js  parse.js  exporter.js
    ├── project.js  actions.js  dnd.js
    └── spriteGrid.js  animations.js  preview.js  app.js
```
