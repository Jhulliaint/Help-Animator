# 🤝 Prompt de reprise — à coller dans une nouvelle session

> **Objectif de la nouvelle session :** *continuer le développement de **Help-Animator***
> (ce dépôt) en s'appuyant **en lecture seule** sur le dépôt du jeu **Jeux-Math-o** pour
> perfectionner l'outil. Cette nouvelle session **remplace** la session actuelle.
>
> **Mode d'emploi**
> 1. Ouvre une **nouvelle session Claude Code sur `Jhulliaint/Help-Animator`** (dépôt de travail principal).
> 2. **Ajoute `Jhulliaint/Jeux-Math-o` au périmètre de la session en LECTURE SEULE** (source
>    de vérité sur ce dont le jeu a besoin). ⚠️ Une **autre instance développe déjà le jeu** :
>    Help-Animator ne doit **que lire** Jeux-Math-o, jamais le modifier.
> 3. Colle **tout le bloc ci-dessous** comme premier message.

---

```
RÔLE & ÉTAT

Tu reprends et continues le développement de Help-Animator (CE DÉPÔT, Jhulliaint/Help-Animator).
Tu remplaces une session précédente : ce message contient l'état complet pour ne rien perdre.

Help-Animator est un OUTIL web local (HTML/CSS/JS vanilla, zéro build, zéro dépendance) qui
découpe une spritesheet, affecte les sprites à des animations nommées (drag & drop ou saisie),
prévisualise le mouvement, et exporte une map « HERO_SPRITE_MAP ». Version actuelle : v1.3.0
(PR #1→#3 fusionnées dans main ; PR #5 — alignement Jeux-Math-o + rognage/miroir/verrou/fusion —
en draft), déployée en statique sur Vercel. S'ouvre en double-cliquant index.html (aucune CLI).

PROJET COMPLÉMENTAIRE (LECTURE SEULE)

Jeux-Math-o (Jhulliaint/Jeux-Math-o) est le JEU de maths (« Un jeu vidéo pour Mathéo », JS) qui
CONSOMME la sortie de Help-Animator (animations du chevalier). Une AUTRE instance développe déjà
ce jeu en parallèle. ⚠️ Tu ne dois PAS modifier Jeux-Math-o : tu le LIS uniquement, comme source
de vérité sur ce dont le jeu a réellement besoin.

MISSION — perfectionner Help-Animator en t'appuyant sur le contenu réel de Jeux-Math-o

1. Lis Jeux-Math-o et identifie précisément comment il consomme les sprites/animations :
   - le format de données attendu (structure JS/JSON, noms des clés, ordre des frames),
   - la taille de frame, le nombre de colonnes, le découpage attendu,
   - la convention de nommage des animations (idle_down, walk_left, … ?) et des directions,
   - le code du loader/rendu (comment il lit la map, à quel FPS, boucle ou non),
   - les états/animations que le jeu utilise réellement (et ceux qui manquent).

2. Aligne et étends Help-Animator pour que sa sortie s'intègre SANS FRICTION dans le jeu :
   - ajoute si besoin un PRESET d'export calé exactement sur le loader du jeu
     (même structure, mêmes noms de clés, même taille de frame),
   - propose des noms d'animations par défaut alignés sur ceux du jeu,
   - ajoute des validations (frames hors grille, animations attendues par le jeu mais
     absentes ou vides, incohérence de taille/colonnes…),
   - tout ce qui réduit l'écart entre « ce que l'outil produit » et « ce que le jeu attend ».

3. Améliore l'outil de façon générale (ergonomie, fonctionnalités, robustesse) selon ce que
   l'usage réel révèle. Montre-moi tes propositions priorisées AVANT de coder les gros morceaux ;
   les petits correctifs sûrs, fais-les directement.

CONTRAINTES
- LECTURE SEULE sur Jeux-Math-o (une autre instance y travaille — ne crée aucun conflit, n'y pousse rien).
- Développe sur la branche dédiée de ta session ; commits clairs ; PR en draft vers main.
- Garde l'esprit du projet : local, sans build, sans dépendance ; compatible file:// ET Vercel.

────────────────────────────────────────────────────────────
CONTEXTE TECHNIQUE COMPLET DE HELP-ANIMATOR (reprise sans perte)
────────────────────────────────────────────────────────────

Architecture : modules à responsabilité unique sous le namespace global HA, chargés comme
<script> classiques (compatibles file://). Flux unidirectionnel UI → actions → store → emit → render.
  js/state.js      modèle + store observable + undo/redo
  js/slicer.js     géométrie de découpage (pure, sans DOM)
  js/sheet.js      image + cache de vignettes par cellule
  js/parse.js      parseur de saisie manuelle (ids "0,1,2" / "00 01" / "[0,0],[1,3]")
  js/exporter.js   génération JS / JSON / TS / preset « Jeux-Math-o » (enveloppe SpriteAnimator)
  js/validate.js   contrôles pré-export (pur) : hors-grille, cellule non carrée, clés du jeu
  js/project.js    sauvegarde/chargement .spritemap.json + autosave localStorage
  js/actions.js    couche de commandes (TOUTE mutation passe par là : historique + autosave)
  js/dnd.js        payload de drag partagé (fiable en file://)
  js/spriteGrid.js grille centrale numérotée + sélection multiple
  js/animations.js panneau d'animations (accordéon : seule l'animation active est dépliée)
  js/preview.js    lecteur d'animation (play/pause, FPS, boucle, frame courante, zoom)
  js/example.js    génère une feuille de démonstration 8×5 (canvas → data URL, file://-safe)
  js/app.js        amorçage & câblage de l'UI (import, slicing, export modale, raccourcis)
  index.html, styles.css, vercel.json, README.md, CHANGELOG.md, HANDOFF.md

Convention : id = ligne × colonnes + colonne ; frames exportées en [ligne, colonne], base 0.

Modèle de données :
  Frame      = { spriteId, row, col }
  Animation  = { id, name, frames[], fps, loop, locked }
  Project    = { version, spriteSheetName, imageDataUrl,
                 slicing:{spriteWidth,spriteHeight,columns,rows,marginX,marginY,spacingX,spacingY,inset},
                 animations[], preview:{fps,loop,scale},
                 export:{format,varName,pretty,includeEmpty,padIds,
                         game:{sheet,cell,flipRightFromLeft,fpsWalk,fpsIdle,comment}} }

Sortie HERO_SPRITE_MAP (JS / JSON / TS), ex. :
  const HERO_SPRITE_MAP = { idle_down: [[4,0],[4,3],[4,4]], walk_down: [[0,2],[0,3],[1,5],[0,7]] };

CONTRAT RÉEL DU JEU (déjà découvert en lisant Jeux-Math-o — ne pas re-dériver) :
  - Le jeu charge un FICHIER JSON assets/sprites/hero_sprite_map.json via systems/SpriteAnimator.js
    (fetch().json()), de forme :
      { sheet, cell, cols, flipRightFromLeft, fps:{walk,idle}, animations:{ "idle_down":[[r,c]…] } }
  - cell = UN SEUL nombre (cellule carrée ; sx=col*cell, sy=row*cell). Le jeu réel : cell=192.
  - fps = objet PAR CATÉGORIE {walk,idle} (PAS un fps par animation). Attaque = durée d'arme ;
    garde retombe sur idle. cols est dans le JSON mais NON lu par le loader (documentaire).
  - flipRightFromLeft:true → réutilise *_left en miroir pour les *_right absents.
  - Coordonnées [ligne,colonne] base 0 — IDENTIQUES à l'outil.
  - Clés demandées par Hero._animKey() = 16 : {idle,walk,attack,guard}×{down,up,left,right}.
    idle_down = repli ultime ; guard_{up,left,right} retombent sur idle (optionnelles).
  → C'est exactement ce que produit le preset « Jeux-Math-o » (exporter.js) ; validate.js le vérifie.

Deux feuilles, une grille : l'art brut « Grill animation.png » (411×258, cases 51×51, 8×5,
chevalier : plume orange, armure bleue, cape rouge) est nettoyé/agrandi par le jeu en
hero-sheet.png (1536×960, cases 192×192, même grille 8×5). [ligne,colonne] indépendant de cell.

Lancer & tester :
  - Usage : ouvrir index.html (ou la prod Vercel).
  - Test logique : Node sur slicer/parse/exporter avec un shim { window:{} }.
  - Test UI headless : jsdom (runScripts:'dangerously', pretendToBeVisual) + shim Canvas
    (getContext/toDataURL), js/*.js inlinés, puis vérifier le rendu sans erreur.
    (v1.2.0 validée ainsi : 22 tests logique + 20 tests UI, 0 erreur.)

État Git : main = v1.1.0 (Initial → PR#1 outil → PR#2 UI/accordéon → PR#3 docs). Branche de
session claude/peaceful-curie-t06vtb = v1.3.0 (PR #5 draft : v1.2.0 alignement Jeux-Math-o
[preset + validation + exemple + 16 noms] PUIS v1.3.0 [rognage, aperçu miroir, « droite miroir »,
verrou par animation, fusion d'animations]). Déploiement Vercel automatique sur main.

PISTES D'AMÉLIORATION
  FAIT (PR #5) :
  - ✅ Preset d'export « Jeux-Math-o » (SpriteAnimator JSON) + validation + exemple généré + 16 noms.
  - ✅ Rognage (inset) à la découpe : enlève les bords parasites (dérive de grille / séparateurs).
  - ✅ Miroir : aperçu en miroir + « ⇄ Droite miroir » (crée les *_right vides + flipRightFromLeft).
  - ✅ Verrou par animation (figée = protégée, conservée au changement de planche) + Fusion d'animations.
  RESTE À FAIRE :
  - Vraie MULTI-PLANCHES (une feuille source par animation) — demandé, mis en attente : le jeu ne
    charge qu'UNE feuille, donc un export multi-feuilles n'est pas directement consommable tel quel.
  - Workflow GitHub Actions (lint + tests Node/jsdom) ; projet de démarrage pré-rempli.
  - Éventuellement embarquer/réduire la vraie feuille du chevalier (pas d'outil image dans l'env.).

Commence par : (1) lire Jeux-Math-o et me résumer comment il consomme les animations,
(2) me proposer le plan d'alignement + les améliorations priorisées. Puis implémente.
```

---

## Notes pour moi (hors prompt)
- La nouvelle session se fait **sur Help-Animator**, avec **Jeux-Math-o ajouté en lecture seule**.
- Une autre instance code déjà le jeu → Help-Animator **lit** seulement Jeux-Math-o.
- État actuel : Help-Animator v1.3.0 — `main` à v1.1.0 (PR #1–#3) ; PR #5 (draft) ajoute le
  preset Jeux-Math-o, la validation, l'exemple généré, les 16 noms alignés, puis le rognage
  anti-bords-parasites, l'aperçu miroir + « droite miroir », le verrou et la fusion d'animations.
- Si besoin de la map réelle/corrigée : l'exporter depuis l'app (format **🎮 Jeux-Math-o** →
  fichier `hero_sprite_map.json`, à déposer dans `Jeux-Math-o/assets/sprites/`).
