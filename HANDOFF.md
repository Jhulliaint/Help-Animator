# 🤝 Prompt de reprise — à coller dans une nouvelle session

> **Mode d'emploi**
> 1. Ouvre une **nouvelle session Claude Code** sur le dépôt **`Jhulliaint/Jeux-Math-o`**
>    (sur claude.ai/code, choisis ce dépôt comme source ; s'il n'apparaît pas, autorise-le
>    pour l'app GitHub de Claude Code dans les réglages de connexion).
> 2. Colle **tout le bloc ci-dessous** comme premier message.
>
> Ce prompt contient l'intégralité du contexte du projet **Help-Animator** : la nouvelle
> instance n'a pas accès à ce dépôt, mais elle aura tout ce qu'il faut pour intégrer les
> sprites dans le jeu.

---

```
CONTEXTE — DEUX PROJETS LIÉS

J'ai deux dépôts GitHub (compte Jhulliaint) :

1. Help-Animator (Jhulliaint/Help-Animator) — TERMINÉ. C'est un OUTIL que j'ai construit
   pour découper une spritesheet, affecter les sprites à des animations nommées, et
   exporter une map d'animations « HERO_SPRITE_MAP ». Site statique HTML/CSS/JS vanilla,
   déployé sur Vercel. Tu n'as pas accès à ce dépôt, mais tu n'en as pas besoin : tout son
   contexte utile est dans ce message.

2. Jeux-Math-o (CE DÉPÔT) — « Un jeu vidéo pour Mathéo », un jeu de maths en JavaScript.
   C'est ici qu'on veut UTILISER les animations du personnage (un chevalier) produites par
   Help-Animator.

MISSION DE CETTE SESSION

A. Analyse d'abord ce dépôt (Jeux-Math-o) en profondeur et fais-moi une synthèse :
   - structure du projet, moteur/techno utilisée (Canvas brut, Phaser, Kaboom, autre ?),
     boucle de jeu, gestion des entrées ;
   - comment les sprites/animations du personnage sont gérés AUJOURD'HUI (s'il y en a) :
     où, sous quel format, à quelle taille de frame, à quel FPS ;
   - où et comment le rendu du personnage est dessiné.

B. Propose ensuite un plan d'intégration des animations du chevalier via la map
   HERO_SPRITE_MAP (format ci-dessous), puis implémente-le sur une branche dédiée avec une
   PR (draft). Ne casse pas le gameplay existant ; ajoute proprement.

C. Liste les ajouts / corrections / améliorations / fonctionnalités pertinents que tu
   repères pendant l'analyse (gameplay, structure, performance, ergonomie, sprites), et
   dis-moi lesquels tu recommandes en priorité avant de les coder.

CE QU'EST HELP-ANIMATOR ET CE QU'IL PRODUIT

- But : corriger les incohérences d'animation en choisissant manuellement les bons sprites,
  dans le bon ordre, pour chaque animation nommée.
- Convention de coordonnées : id = ligne × colonnes + colonne ; les frames sont exportées
  en [ligne, colonne] (row, col), indexées à partir de 0.
- Animations par défaut proposées : idle_down/up/left/right, walk_down/up/left/right,
  attack_down/up/left/right, guard_down, hurt, death, cast_spell, dash_left, dash_right.
  (La liste est libre : on peut en ajouter/retirer.)
- Nombre de frames par animation illimité (3, 4, ou plus).

SPRITESHEET DE RÉFÉRENCE (le chevalier)

- Fichier : « Grill animation.png », 411 × 258 px.
- Découpage : 51 × 51 px par sprite, 8 colonnes × 5 lignes = 40 cases (ids 00–39),
  marges et espacements à 0. (Quelques cases en fin de planche sont vides.)
- Personnage : chevalier, plume orange, armure bleue, cape rouge, épée/bouclier.
- IMPORTANT : côté jeu, le frame size (51 × 51) et le nombre de colonnes (8) doivent
  correspondre exactement à ce découpage, sinon les coordonnées [ligne, colonne] ne
  pointeront pas sur les bons sprites.

FORMAT DE LA MAP (exemple — je te fournirai la version finale exportée de l'outil)

const HERO_SPRITE_MAP = {
  idle_down:  [[4, 0], [4, 3], [4, 4]],
  idle_up:    [[1, 0], [3, 6], [3, 7]],
  idle_left:  [[4, 1], [3, 1], [2, 1]],
  idle_right: [[4, 2], [3, 2], [2, 7]],
  walk_down:  [[0, 2], [0, 3], [1, 5], [0, 7]],
  walk_up:    [[1, 0], [3, 5], [3, 6], [3, 7]],
  walk_left:  [[2, 1], [3, 0], [3, 1], [4, 1]],
  walk_right: [[2, 7], [3, 2], [4, 2], [0, 6]],
  attack_down:[[4, 0], [3, 3], [3, 4], [4, 3]],
  attack_up:  [[0, 0], [0, 1], [1, 2], [1, 3]],
  attack_left:[[2, 0], [2, 5], [1, 6]],
  attack_right:[[1, 7], [2, 6], [2, 4]],
  guard_down: [[0, 2], [0, 3], [4, 3]]
};
// (Ces valeurs sont l'EXEMPLE de référence. La map réelle/corrigée vient de l'outil
//  Help-Animator ; je te la collerai, ou exporte-la depuis l'app si besoin.)

CONSOMMER LA MAP DANS LE JEU (principe, Canvas 2D)

const FRAME_W = 51, FRAME_H = 51; // = découpage de l'outil
function drawFrame(ctx, sheet, [row, col], dx, dy, scale = 1) {
  ctx.imageSmoothingEnabled = false;            // pixel art net
  ctx.drawImage(sheet, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
                dx, dy, FRAME_W * scale, FRAME_H * scale);
}
// Lecture en boucle à N FPS :
const frames = HERO_SPRITE_MAP[animName];
const i = Math.floor(performance.now() / (1000 / fps)) % frames.length;
drawFrame(ctx, sheet, frames[i], x, y, scale);

DÉTAILS UTILES SUR L'OUTIL (si tu dois régénérer ou comprendre)

- Export possible en JS (const ... = {...}), JSON strict, ou TS (export const ... as const).
- L'outil sauvegarde un projet .spritemap.json auto-contenu (image embarquée en data URL).
- Modèle de données interne :
  Frame = { spriteId, row, col } ; Animation = { id, name, frames[], fps, loop }.
- L'outil est déployé : je peux te donner l'URL de prod Vercel, ou tu peux ouvrir
  index.html localement depuis le dépôt Help-Animator.

CONTRAINTES & ATTENTES

- Travaille sur une branche dédiée, fais des commits clairs, ouvre une PR draft.
- Avant de coder l'intégration, montre-moi : (1) ta synthèse de Jeux-Math-o, (2) le plan
  d'intégration, (3) la liste d'améliorations recommandées. Puis implémente.
- Conserve le mapping des noms d'animations cohérent avec HERO_SPRITE_MAP.

Commence par analyser le dépôt et donne-moi ta synthèse.
```

---

## Notes pour moi (hors prompt)
- Help-Animator est fusionné dans `main` (PR #1 et #2) et déployé sur Vercel.
- Si je veux la map réelle corrigée : l'exporter depuis l'app (bouton **Exporter**), puis
  la coller dans la nouvelle session à la place de l'exemple.
- Le dépôt `Jeux-Math-o` a au moins **1 issue ouverte** au moment de la rédaction.
