# 🎞️ Help Animator — Sprite Animation Mapper

> Outil visuel pour **corriger les incohérences d'animation** d'un personnage à partir
> d'une spritesheet, et générer une map d'animations (`HERO_SPRITE_MAP`) prête à être
> consommée par un moteur de jeu.

**Statut :** ✅ v2.0.0 — **multi-planches** (banque de planches + atlas à l'export) ; aligné sur Jeux-Math-o (preset + validation), rognage, miroir, verrou/fusion, découpes enregistrées & surbrillance. Déployé sur Vercel.
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

1. **Importer** une ou plusieurs spritesheets (bouton ou glisser-déposer). Chaque import **ajoute
   une planche** à la banque ; le sélecteur *Planches* choisit la planche active (découpée dans la
   grille). Pas de fichier ? **🧪 Charger un exemple** génère une feuille 8×5 (sans fichier ni dépendance).
2. **Régler le découpage** : largeur/hauteur de sprite, colonnes, lignes, marges,
   espacements, **rognage** (rogne N px par bord pour éliminer les bords parasites).
   Boutons *Déduire la grille* / *Déduire la taille* pour s'aider de la taille de l'image.
   **Enregistrez la découpe** (💾) : associée au nom du fichier, elle est **réappliquée
   automatiquement** au prochain chargement de cette planche (renommable, exportable en JSON).
3. **Créer des animations** (panneau de gauche) — librement, ou via *Liste par défaut*.
4. **Affecter des sprites** à l'animation active :
   - glisser une vignette (ou une sélection multiple) depuis la grille centrale ;
   - double-cliquer une vignette ;
   - saisir `0, 1, 2, 3` · `00 01 02 03` · `[0,0], [1,3]` dans le champ de l'animation.
   Les sprites déjà affectés à l'animation sélectionnée sont **surlignés** dans la grille
   (badge ×N s'ils sont réutilisés plusieurs fois).
5. **Réordonner / retirer** les frames par glisser-déposer ou via le ✕ d'une frame
   (le sprite source reste intact). Nombre de frames par animation **illimité**.
6. **Prévisualiser** en bas : lecture/pause, FPS, boucle, frame courante, zoom, **miroir**
   (⇄, pour vérifier les directions droite/gauche).
7. **Exporter** (`Exporter` ou `Ctrl+E`) au format **Jeux-Math-o** / JS / JSON / TS. Un
   **panneau de validation** signale les frames hors grille et les animations attendues par le jeu
   mais manquantes ou vides. Si une animation **mélange plusieurs planches**, l'export Jeux-Math-o
   **assemble une feuille unique (atlas)** : téléchargez la **planche générée (PNG)** + la map. Copier
   ou télécharger.
8. **Sauvegarder / Ouvrir** un projet `.spritemap.json` (l'image est embarquée).
   Auto-sauvegarde permanente dans le navigateur.
9. **Figer & réutiliser** : verrouillez une animation (🔒) pour la protéger et la **conserver
   en changeant de planche** (« Importer une image » garde les animations) ; **Fusionner** (⮒)
   ajoute les animations d'un autre projet/JSON sans écraser. « ⇄ Droite miroir » génère les
   `*_right` en miroir des `*_left` (active `flipRightFromLeft`).

**Interface (depuis v1.1.0) :** animations à **gauche** (accordéon — seule l'animation
sélectionnée est dépliée), grille de sprites au **centre**, import + découpage à
**droite**, prévisualisation **en bas**, export en **modale**.

**Raccourcis :** `Ctrl+Z`/`Ctrl+Y` annuler/rétablir · `Ctrl+S` sauvegarder ·
`Ctrl+E` exporter · `Espace` lecture/pause · `←`/`→` frame précédente/suivante · `Échap` fermer la modale.

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

**Jeux-Math-o (preset)** — l'enveloppe JSON exacte chargée par le `SpriteAnimator` du jeu :
```json
{
  "sheet": "./assets/sprites/hero-sheet.png",
  "cell": 192,
  "cols": 8,
  "flipRightFromLeft": false,
  "fps": { "walk": 8, "idle": 3 },
  "animations": {
    "idle_down": [[4, 0], [4, 3], [4, 4]],
    "walk_down": [[0, 2], [0, 3], [1, 5], [0, 7]]
  }
}
```
Champs éditables : chemin de la feuille, `cell` (taille de cellule carrée — `auto` = largeur
de sprite), `fps.walk` / `fps.idle`, et la bascule `flipRightFromLeft`. Le téléchargement
nomme le fichier **`hero_sprite_map.json`** ; il se dépose tel quel dans `assets/sprites/`.

Options communes : nom de variable (JS/TS), mise en forme aérée, inclusion des animations
vides. Boutons **Copier** et **Télécharger** (`.js` / `.json` / `.ts`).

---

## 🔗 Lien avec Jeux-Math-o

Cet outil sert à produire les animations du **chevalier** utilisées dans le jeu
[`Jhulliaint/Jeux-Math-o`](https://github.com/Jhulliaint/Jeux-Math-o) (« Un jeu vidéo
pour Mathéo »).

**Source de vérité — comment le jeu consomme la map.** Le jeu charge un **fichier JSON**
`assets/sprites/hero_sprite_map.json` via `systems/SpriteAnimator.js` (`fetch().json()`) :

```json
{
  "sheet": "./assets/sprites/hero-sheet.png",
  "cell": 192,
  "cols": 8,
  "flipRightFromLeft": false,
  "fps": { "walk": 8, "idle": 3 },
  "animations": { "idle_down": [[4,0],[4,3],[4,4]], "…": [] }
}
```
- `cell` est **un seul nombre** : cellule **carrée** (`sx = col·cell`, `sy = row·cell`).
- `fps` est un objet **par catégorie** `{ walk, idle }` — *pas* un FPS par animation.
  L'attaque suit la durée de l'arme ; la garde retombe sur `idle`.
- `flipRightFromLeft: true` réutilise les `*_left` en miroir pour les `*_right` absents.
- Coordonnées `[ligne, colonne]`, base 0 — **identiques à la sortie de l'outil**.

**Clés réellement demandées** par `Hero._animKey()` : les **16** combinaisons
`{idle, walk, attack, guard} × {down, up, left, right}` (ce sont les noms d'animations par
défaut de l'outil). `idle_down` est le repli ultime ; les `guard_*` autres que `guard_down`
retombent proprement sur `idle_<dir>`.

**→ Le preset d'export « Jeux-Math-o » produit exactement ce JSON.** La sortie se dépose
telle quelle dans `assets/sprites/hero_sprite_map.json`, et le **panneau de validation**
vérifie en amont que ces clés sont présentes et que les frames tiennent dans la grille.

**Deux feuilles, une grille.** L'art brut (`Grill animation.png`, 411×258, cases 51×51, 8×5,
chevalier : plume orange, armure bleue, cape rouge) est nettoyé puis agrandi par le jeu en
`hero-sheet.png` (**1536×960**, cases **192×192**, même grille 8×5). Les coordonnées
`[ligne, colonne]` étant indépendantes de la taille de case, réglez `cell` sur la feuille
**réellement chargée par le jeu** (192).

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
7. **Export & validation** — `animations → { name: [[row,col]…] }`, rendu JS/JSON/TS plus
   un **preset « Jeux-Math-o »** qui émet l'enveloppe JSON exacte du `SpriteAnimator` du jeu
   (`{ sheet, cell, cols, flipRightFromLeft, fps, animations }`). Un validateur **pur**
   (`validate.js`) confronte le projet au contrat du jeu (frames hors grille, cellule non
   carrée, clés attendues absentes/vides) avant l'export. Copie presse-papiers (repli
   `execCommand`) et téléchargement.

---

## 📁 Structure du projet
```
Help-Animator/
├── index.html        # interface (structure)
├── styles.css        # thème pixel-art moderne
├── vercel.json       # déploiement statique Vercel
├── slicing-presets.json # découpes partagées (chargées au démarrage, committables)
├── README.md
├── CHANGELOG.md
├── HANDOFF.md        # prompt de reprise pour une nouvelle session
└── js/
    ├── state.js      # modèle de données, store observable, undo/redo
    ├── slicer.js     # géométrie de découpage (pure)
    ├── sheet.js      # image + cache de vignettes
    ├── parse.js      # parseur de saisie manuelle
    ├── atlas.js      # repack multi-planches -> 1 feuille (plan + rendu PNG)
    ├── exporter.js   # génération JS / JSON / TS / preset Jeux-Math-o (atlas si multi-planches)
    ├── validate.js   # contrôles pré-export (pure) : grille, clés attendues par le jeu
    ├── project.js    # sauvegarde / chargement + autosave
    ├── actions.js    # couche de commandes (toute mutation)
    ├── dnd.js        # payload de drag partagé
    ├── spriteGrid.js # grille centrale numérotée
    ├── animations.js # panneau d'animations (accordéon)
    ├── preview.js    # lecteur d'animation
    ├── example.js    # génère une feuille de démonstration (canvas → data URL)
    ├── presets.js    # découpes enregistrées (localStorage + slicing-presets.json)
    └── app.js        # amorçage & câblage de l'UI
```

---

## 🗃️ Modèle de données
```ts
type SpriteCell      = { id, row, col, x, y, width, height };
type AnimationFrame  = { sheetId, row, col };       // remembers its source sheet
type AnimationDef    = { id, name, frames: AnimationFrame[], fps, loop, locked };
type Sheet           = { id, name, imageDataUrl,
                         slicing: { spriteWidth, spriteHeight, columns, rows, marginX, marginY, spacingX, spacingY, inset } };
type ProjectData     = {
  version: 2,
  sheets: Sheet[], activeSheetId,                   // image bank (multi-sheet)
  animations: AnimationDef[],
  preview: { fps, loop, scale },
  export:  {
    format, varName, pretty, includeEmpty, padIds,
    // preset Jeux-Math-o (format = 'game') — atlas repack si multi-planches
    game: { sheet, cell, atlasCols, flipRightFromLeft, fpsWalk, fpsIdle, comment }
  }
};
// Projets v1 (image unique) migrés automatiquement au chargement.
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
