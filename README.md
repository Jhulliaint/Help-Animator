# 🎞️ Help Animator — Sprite Animation Mapper

> Outil visuel pour **corriger les incohérences d'animation** d'un personnage à partir
> d'une spritesheet, et générer une map d'animations (`HERO_SPRITE_MAP`) prête à être
> consommée par un moteur de jeu.

**Statut :** ✅ v1.1.0 — fusionné dans `main`, déployé automatiquement sur Vercel.
**Stack :** HTML + CSS + JavaScript vanilla, **zéro dépendance, zéro build**.
**Usage :** ouvrir `index.html` dans un navigateur — aucune installation, aucune ligne de commande.

Ce dépôt est l'**outil** ; le jeu qui consomme les sprites est un projet séparé
([`Jhulliaint/Jeux-Math-o`](https://github.com/Jhulliaint/Jeux-Math-o)). Voir la section
[Lien avec Jeux-Math-o](#-lien-avec-jeux-math-o).

---

## 📑 Sommaire
- [Démarrer](#-démarrer)
- [Utilisation](#-utilisation)
- [Format de sortie `HERO_SPRITE_MAP`](#-format-de-sortie-hero_sprite_map)
- [Lien avec Jeux-Math-o](#-lien-avec-jeux-math-o)
- [Décisions de conception (7 points)](#-décisions-de-conception)
- [Structure du projet](#-structure-du-projet)
- [Modèle de données](#-modèle-de-données)
- [Déploiement Vercel](#-déploiement-vercel)
- [Voir aussi](#-voir-aussi)

---

## 🚀 Démarrer

### En local (le plus simple)
Double-cliquez sur **`index.html`** — l'application s'ouvre dans votre navigateur.
Aucune dépendance, aucun build, aucun terminal. Tout fonctionne depuis `file://`
(scripts `<script>` classiques, pas de modules ES, chemins relatifs).

### Sur Vercel
Site statique prêt à l'emploi (`index.html` à la racine + `vercel.json`). Voir
[Déploiement Vercel](#-déploiement-vercel).

---

## 🕹️ Utilisation

1. **Importer** une spritesheet (bouton ou glisser-déposer dans le panneau de droite).
2. **Régler le découpage** : largeur/hauteur de sprite, colonnes, lignes, marges,
   espacements. Boutons *Déduire la grille* / *Déduire la taille* pour s'aider de la
   taille de l'image.
3. **Créer des animations** (panneau de gauche) — librement, ou via *Liste par défaut*.
4. **Affecter des sprites** à l'animation active :
   - glisser une vignette (ou une sélection multiple) depuis la grille centrale ;
   - double-cliquer une vignette ;
   - saisir `0, 1, 2, 3` · `00 01 02 03` · `[0,0], [1,3]` dans le champ de l'animation.
5. **Réordonner / retirer** les frames par glisser-déposer ou via le ✕ d'une frame
   (le sprite source reste intact). Nombre de frames par animation **illimité**.
6. **Prévisualiser** en bas : lecture/pause, FPS, boucle, frame courante, zoom.
7. **Exporter** (`Exporter` ou `Ctrl+E`) en JS / JSON / TS, copier ou télécharger.
8. **Sauvegarder / Ouvrir** un projet `.spritemap.json` (l'image est embarquée).
   Auto-sauvegarde permanente dans le navigateur.

**Interface (depuis v1.1.0) :** animations à **gauche** (accordéon — seule l'animation
sélectionnée est dépliée), grille de sprites au **centre**, import + découpage à
**droite**, prévisualisation **en bas**, export en **modale**.

**Raccourcis :** `Ctrl+Z`/`Ctrl+Y` annuler/rétablir · `Ctrl+S` sauvegarder ·
`Ctrl+E` exporter · `Espace` lecture/pause · `Échap` fermer la modale.

**Convention de coordonnées :** `id = ligne × colonnes + colonne`, export en `[ligne, colonne]`.
Exemple sur 8 colonnes : `00 = [0,0]`, `07 = [0,7]`, `08 = [1,0]`.

---

## 📦 Format de sortie `HERO_SPRITE_MAP`

Chaque animation devient une liste ordonnée de coordonnées `[ligne, colonne]`.

**JavaScript :**
```js
const HERO_SPRITE_MAP = {
  idle_down: [
    [4, 0],
    [4, 3],
    [4, 4]
  ],

  walk_down: [
    [0, 2],
    [0, 3],
    [1, 5],
    [0, 7]
  ]
};
```

**JSON :**
```json
{
  "idle_down": [[4, 0], [4, 3], [4, 4]],
  "walk_down": [[0, 2], [0, 3], [1, 5], [0, 7]]
}
```

**TypeScript :**
```ts
export const HERO_SPRITE_MAP = {
  idle_down: [[4, 0], [4, 3], [4, 4]]
} as const;
```

Options d'export : nom de variable, mise en forme aérée, inclusion des animations vides.
Boutons **Copier** et **Télécharger** (`.js` / `.json` / `.ts`).

---

## 🔗 Lien avec Jeux-Math-o

Cet outil sert à produire les animations du **chevalier** utilisées dans le jeu
[`Jhulliaint/Jeux-Math-o`](https://github.com/Jhulliaint/Jeux-Math-o) (« Un jeu vidéo
pour Mathéo »).

**Spritesheet de référence** (telle que configurée pendant l'usage réel) :
- Fichier : `Grill animation.png` — **411 × 258 px**
- Découpage : **51 × 51 px**, **8 colonnes × 5 lignes** (40 cases, ids `00`–`39`),
  marges/espacements à 0.
- Personnage : chevalier (plume orange, armure bleue, cape rouge, épée/bouclier).

**Consommer la map dans le jeu** (exemple de principe, moteur 2D Canvas) :
```js
const FRAME_W = 51, FRAME_H = 51, COLS = 8; // doivent correspondre au découpage
function drawFrame(ctx, sheet, [row, col], dx, dy, scale = 1) {
  ctx.imageSmoothingEnabled = false; // pixel art net
  ctx.drawImage(sheet, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
                dx, dy, FRAME_W * scale, FRAME_H * scale);
}
// Lecture en boucle d'une animation à N FPS :
const frames = HERO_SPRITE_MAP.walk_left;
const i = Math.floor(performance.now() / (1000 / fps)) % frames.length;
drawFrame(ctx, sheet, frames[i], x, y, 2);
```

> ⚠️ Le **frame size** et le **nombre de colonnes** côté jeu doivent être identiques à
> ceux du découpage de l'outil, sinon les coordonnées `[ligne, colonne]` ne pointeront
> pas sur les bons sprites.

---

## 🧱 Décisions de conception

1. **Stack** — JS vanilla (ES2020), Canvas 2D, **sans framework ni build**. Choix le
   plus robuste pour « utilisable localement sans ligne de commande » *et* déployable en
   statique. Une coquille Electron pourrait l'empaqueter mais n'est pas nécessaire.
2. **Architecture** — modules à responsabilité unique sous le namespace global `HA`
   (scripts classiques, compatibles `file://`). Flux unidirectionnel
   `UI → actions → store → emit → render`.
3. **Modèle de données** — voir [ci-dessous](#-modèle-de-données). Chaque frame stocke
   `spriteId` **et** `[row, col]` : l'export se base sur les coordonnées et la frame
   reste affichable même si la grille change.
4. **Format projet** — fichier `*.spritemap.json` auto-contenu (image embarquée en
   *data URL*) + auto-save `localStorage`.
5. **Slicer** — `x = marginX + col·(spriteW + spacingX)`, `y = marginY + row·(spriteH + spacingY)`,
   `id = row·columns + col`. Déduction grille↔taille depuis l'image.
6. **Drag & drop** — payload conservé dans `HA.dnd` (fiable en `file://`). Sprite →
   `{kind:'sprite', spriteIds}` ; frame → `{kind:'frame', animId, index}`. Index
   d'insertion calculé d'après la frame survolée.
7. **Export** — `animations → { name: [[row,col]…] }`, rendu JS/JSON/TS, copie
   presse-papiers (avec repli `execCommand`) et téléchargement.

---

## 📁 Structure du projet
```
Help-Animator/
├── index.html        # interface (structure)
├── styles.css        # thème pixel-art moderne
├── vercel.json       # déploiement statique Vercel
├── README.md
├── CHANGELOG.md
├── HANDOFF.md        # prompt de reprise pour une nouvelle session
└── js/
    ├── state.js      # modèle de données, store observable, undo/redo
    ├── slicer.js     # géométrie de découpage (pure)
    ├── sheet.js      # image + cache de vignettes
    ├── parse.js      # parseur de saisie manuelle
    ├── exporter.js   # génération JS / JSON / TS
    ├── project.js    # sauvegarde / chargement + autosave
    ├── actions.js    # couche de commandes (toute mutation)
    ├── dnd.js        # payload de drag partagé
    ├── spriteGrid.js # grille centrale numérotée
    ├── animations.js # panneau d'animations (accordéon)
    ├── preview.js    # lecteur d'animation
    └── app.js        # amorçage & câblage de l'UI
```

---

## 🗃️ Modèle de données
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

---

## ☁️ Déploiement Vercel
Le dépôt est un site statique (`index.html` à la racine + `vercel.json` :
`cleanUrls`, en-têtes de sécurité, cache `js/` & `styles.css`).

- **Drag-and-drop** : déposez le dossier sur [vercel.com/new](https://vercel.com/new).
- **Git** : importez le repo — preset *Other*, aucun *Build Command*, *Output Directory* `./`.
- **CLI** : `npx vercel` (preview) puis `npx vercel --prod`. Test local : `npx vercel dev`.

---

## 📚 Voir aussi
- [`CHANGELOG.md`](CHANGELOG.md) — historique des versions.
- [`HANDOFF.md`](HANDOFF.md) — prompt prêt à coller pour **reprendre le développement de
  Help-Animator** dans une nouvelle session, en s'appuyant **en lecture seule** sur le dépôt
  du jeu `Jeux-Math-o` pour perfectionner l'outil (sans perdre de contexte).
