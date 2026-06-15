# Changelog

Toutes les modifications notables de **Help Animator** sont documentées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]
- (rien pour l'instant)

## [2.0.0] — 2026-06-15
### Added
- **Multi-planches (banque de planches) + atlas à l'export.** Un projet contient désormais
  PLUSIEURS planches (chacune avec sa propre image et son propre découpage). Chaque frame retient
  **sa planche source** (`{sheetId, row, col}`) → **une même animation peut mélanger des sprites de
  plusieurs planches**, ce qui lève la limite du verrouillage (les coordonnées ne « se perdaient »
  qu'en changeant de planche).
  - **Banque de planches** (panneau Spritesheet) : importer **ajoute** une planche ; sélecteur de
    planche active, renommer, retirer. Le découpage et la grille centrale portent sur la planche active.
  - **Repack à l'export « Jeux-Math-o »** (`atlas.js`) : si les frames utilisées couvrent plusieurs
    planches, l'outil **assemble toutes les frames utilisées en UNE seule feuille** (grille régulière,
    chaque frame **redimensionnée à la case cible**, rendu net), émet la map dans cette feuille et
    propose **⤓ Télécharger la planche générée (PNG)**. Le jeu reste **inchangé** (il charge toujours
    une seule feuille). Mono-planche : comportement identique à avant (coordonnées dans la feuille d'origine).
  - Case cible : `cell` explicite, sinon auto = plus grande source ; nombre de colonnes de l'atlas réglable.
- **Passe d'ergonomie** : indicateur « → animation active » près de la grille (cible de « Ajouter à
  l'animation ») ; **badge de planche coloré** sur les frames issues d'une autre planche que l'active
  + **compteur de frames par planche** dans le sélecteur ; l'aperçu affiche `[ligne,col]` et la planche
  de la frame courante ; raccourcis **← / →** pour défiler les frames ; états **focus visibles** (a11y).
  **Réordonnancement des frames par glisser** rendu découvrable (poignée ⠿ sur chaque vignette, indice
  « glissez pour réordonner », indicateur de dépôt renforcé) — la fonctionnalité existait mais n'était pas visible.

### Changed
- **Modèle de projet v2** : `{ sheets[], activeSheetId, animations:[{ frames:[{sheetId,row,col}] }] }`.
  Les projets v1 (image unique) sont **migrés automatiquement** au chargement (une planche, frames
  ré-attribuées). Les frames n'utilisent plus `spriteId` (identité = planche + ligne + colonne).
- La **surbrillance** des sprites affectés ne concerne que les frames **de la planche active**.
- La **validation** contrôle chaque frame contre la grille de **sa** planche et résume le plan d'atlas
  (N planches → 1 feuille) en cas de repack.

### Fixed
- **Réordonnancement des frames sur plusieurs rangées** : l'index d'insertion ne regardait que la
  position horizontale → déposer une vignette sur une **rangée inférieure** la replaçait en tête.
  Le calcul est désormais **2D** (rangée via `clientY`, puis colonne via `clientX`).

### Verification
- 21 tests logique (atlas : plan / dédoublonnage / case auto, repack vs passthrough, validation par
  planche, actions de banque, migration v1→v2) + 29 tests UI (banque, affectation croisée, surbrillance
  par planche active, repack + bouton PNG, presets / verrou) + 7 ergonomie + 5 réordonnancement 2D
  (dépôt sur rangées inférieures) — **0 erreur**.

## [1.4.0] — 2026-06-15
### Added
- **Découpes enregistrées** (`presets.js`) : enregistre la découpe courante **associée au nom
  du fichier image** → recharger la même planche **restaure automatiquement** sa découpe.
  Découpes **renommables**, applicables via une liste déroulante, supprimables. Persistées en
  `localStorage` ; **export/import `slicing-presets.json`** (committable dans le repo) et
  **chargement best-effort** de ce fichier depuis le repo au démarrage (http/Vercel ; ignoré en
  `file://`). Un exemple (`hero-sheet.png`) est fourni dans `slicing-presets.json`.
- **Surbrillance des sprites affectés** : sélectionner une animation **met en évidence dans la
  grille** les cases qui en font partie (liseré + halo), avec un badge **×N** sur les sprites
  réutilisés plusieurs fois. Correspondance par `[ligne, colonne]` (stable même si le nombre de
  colonnes change ensuite).

### Fixed
- **Cache des assets** : `vercel.json` passe `/js/` et `/styles.css` de `max-age=3600` à
  `max-age=0, must-revalidate`. Sans nom de fichier versionné (zéro build), l'ancien cache de
  3600 s pouvait servir un `app.js` **périmé** après un déploiement — un `index.html` neuf (avec
  de nouveaux boutons) face à un `app.js` ancien (sans leur câblage) donnait des boutons
  « inertes » sans erreur. Les fichiers se revalident désormais à chaque chargement (304 si
  inchangés), donc un déploiement prend effet immédiatement.

### Verification
- +15 tests logique (découpes : save / find / apply / overwrite / rename / remove / export-import /
  persistance) et +7 tests UI (surbrillance, badge ×N, bascule d'animation) — **0 erreur**.
  Régression v1.2/v1.3 re-vérifiée.

## [1.3.0] — 2026-06-14
### Added
- **Rognage (inset) à la découpe** : nouveau champ qui rogne N px sur chaque bord de chaque
  case. Élimine les **bords parasites** (dérive de grille sur une planche non divisible en
  pixels entiers — ex. 411 px ÷ 8 = 51,375 —, séparateurs entre sprites, débordement du
  dessin) dans les vignettes ET l'aperçu, **sans toucher** aux coordonnées `[ligne, colonne]`
  ni à l'export.
- **Aperçu en miroir** (bouton « ⇄ » du lecteur) : visualise une animation retournée
  horizontalement, pour vérifier qu'un `*_left` lu en miroir donne un bon `*_right`.
- **« ⇄ Droite miroir »** : crée les `*_right` manquantes (pour chaque `*_left` non vide) et
  active `flipRightFromLeft` → le jeu dessine les `*_left` en miroir pour la droite. C'est le
  seul miroir que le format du jeu sait porter (pas de flip par frame dans `[ligne,colonne]`).
- **Verrou / figer par animation** (🔒) : une animation figée est protégée (frames, nom,
  suppression) et **conservée quand on change de planche**. « Tout supprimer » épargne les
  animations figées.
- **Fusionner des animations** (⮒) : importe les animations d'un autre projet `.spritemap.json`,
  d'un export JSON ou d'un preset Jeux-Math-o **en les ajoutant** à l'existant (noms en
  collision suffixés), sans remplacer l'image ni les animations en cours.

### Notes
- Rappel : **« Importer une image » conserve déjà les animations** (seule l'image change) ;
  c'est **« Ouvrir un projet »** qui remplace tout. Verrou + fusion couvrent le flux « figer
  ce qui est validé puis charger d'autres planches sans rien perdre ».
- La vraie multi-planches (une feuille source par animation) reste volontairement non faite :
  le jeu ne charge qu'une seule feuille (à reconsidérer si le besoin se confirme).

### Verification
- 21 tests logique supplémentaires (rognage, garde-fous de verrou, fusion des 3 formats de
  fichier, miroir + validation) + 15 tests UI (champ rognage, bascule miroir, verrou via la
  carte, boutons fusion/miroir, export reflétant `flipRightFromLeft`) — **0 erreur**.
  Régression v1.2.0 re-vérifiée (22 + 20).

## [1.2.0] — 2026-06-14
### Added
- **Preset d'export « Jeux-Math-o »** (4ᵉ format, à côté de JS/JSON/TS) : produit
  exactement le JSON chargé par le `SpriteAnimator` du jeu —
  `{ sheet, cell, cols, flipRightFromLeft, fps:{walk,idle}, animations }`. Champs
  éditables : chemin de la feuille (défaut `./assets/sprites/hero-sheet.png`), taille de
  cellule `cell` (auto = largeur de sprite), `fps.walk` / `fps.idle` (8 / 3), bascule
  `flipRightFromLeft`. Le téléchargement nomme le fichier `hero_sprite_map.json`.
- **Validation pré-export** (`validate.js`, pure + panneau sous l'aperçu d'export) :
  frames hors grille (**erreur**), sprites non carrés (le jeu suppose une cellule carrée),
  grille dépassant l'image, et surtout **animations attendues par le jeu mais absentes ou
  vides** — `idle_down` manquante = erreur (repli ultime), `idle`/`walk`/`attack` =
  avertissement, `guard_up/left/right` = info (repli sur `idle`). Respecte
  `flipRightFromLeft` (un `*_right` vide miroir d'un `*_left` rempli n'est pas signalé).
- **Bouton « 🧪 Charger un exemple »** (`example.js`) : génère au vol une feuille de
  démonstration 8×5 (canvas → data URL, sans fichier ni dépendance, compatible `file://`),
  règle le découpage et ajoute les animations par défaut pour essayer l'outil tout de suite.

### Changed
- **Liste d'animations par défaut alignée sur le jeu** : les **16** clés réellement
  demandées par `Hero._animKey()` — `{idle,walk,attack,guard} × {down,up,left,right}` —
  remplacent l'ancienne liste de 18 (qui contenait `hurt`/`death`/`cast_spell`/`dash_*`
  inutilisés et omettait `guard_up/left/right`).
- Le champ « Nom de variable » est masqué pour les formats JSON et Jeux-Math-o
  (sans objet pour une sortie JSON).
- **README** : la section « Lien avec Jeux-Math-o » documente désormais le **vrai** contrat
  (loader `SpriteAnimator`, `cell` carré 192, `fps` par catégorie, 16 clés, miroir) au lieu
  de l'ancien exemple « de principe » à 51 px.

### Verification
- **22 tests logiques** (Node + shim `window`) : structure du preset, JSON valide en mode
  aéré et compact, `cell` auto/explicite, `_comment`, et toutes les règles de validation
  (hors-grille, non-carré, miroir flip, clés manquantes).
- **20 tests UI** (jsdom + shim Canvas, scripts inlinés) : 16 animations par défaut,
  bascule du panneau preset, sortie JSON enveloppée valide, rendu du panneau de validation,
  édition live des champs du preset, générateur d'exemple — **aucune erreur d'exécution**.

## [1.1.0] — 2026-06-14
### Changed
- **Échange des panneaux** : les animations passent à **gauche** et l'import +
  découpage de la spritesheet à **droite** (via `order` CSS, sans déplacer le balisage).
- **Liste d'animations en accordéon** : seule l'animation **active** est dépliée
  (éditeur complet) ; les autres affichent un en-tête compact + un aperçu miniature
  des frames. Bien plus lisible avec les 18 animations par défaut.
- Défilement automatique vers l'animation sélectionnée lors de son ouverture.

### Fixed
- **Cartes d'animation écrasées par flexbox** : les enfants flex héritaient de
  `flex-shrink: 1` et étaient compressés en fines barres, masquant les champs de nom
  (symptôme rapporté : « les noms d'animations par défaut ne se chargent pas »).
  Correctif : `flex-shrink: 0` sur `.anim-card` et `.card`, et `.animations-list`
  devient la zone défilante (`flex: 1 1 auto; min-height: 0; overflow-y: auto`).
- `scrollIntoView` protégé par une garde de compatibilité (no-op si indisponible).

### Verification
- Boot complet de l'application en DOM headless (jsdom) avec shim Canvas : 18 cartes
  rendues, 1 dépliée (éditeur + champ nom), 17 repliées (aperçu), noms présents
  (`idle_down`…`dash_right`), 48 vignettes, clic-pour-déplier OK, exactement une
  animation dépliée, **aucune erreur d'exécution**.

## [1.0.0] — 2026-06-14
### Added
- Application desktop locale (HTML/CSS/JS vanilla, sans build) d'aide à la cartographie
  d'animations à partir d'une spritesheet.
- **Import d'image** (bouton + glisser-déposer) et **découpage en grille** configurable :
  largeur/hauteur de sprite, colonnes, lignes, marges, espacements ; déduction
  automatique grille↔taille depuis l'image.
- **Grille de sprites numérotés** avec identifiant (`00`, `01`, …) et coordonnées
  `[ligne, colonne]` ; convention `id = ligne × colonnes + colonne`.
- **Création libre d'animations** + liste de 18 noms par défaut
  (`idle_*`, `walk_*`, `attack_*`, `guard_down`, `hurt`, `death`, `cast_spell`, `dash_*`).
- **Affectation des sprites** par glisser-déposer (sélection multiple), double-clic, ou
  saisie manuelle (`0, 1, 2` · `00 01 02` · `[0,0], [1,3]`).
- **Réordonnancement** des frames par drag & drop, **suppression** d'une frame sans
  toucher au sprite source, **nombre de frames illimité** par animation.
- **Prévisualisation animée** : lecture/pause, FPS réglable, boucle, frame courante,
  zoom, fond damier ; pas-à-pas frame précédente/suivante.
- **Export** `HERO_SPRITE_MAP` en **JavaScript / JSON / TypeScript** (nom de variable,
  mise en forme aérée, animations vides), **copie presse-papiers** et **téléchargement**.
- **Sauvegarde / chargement** de projet `.spritemap.json` (image embarquée) +
  **auto-sauvegarde** dans `localStorage`.
- **Undo / redo**, sélection multiple, **raccourcis clavier**, interface pixel-art moderne.
- **Compatibilité Vercel** (`vercel.json` : `cleanUrls`, en-têtes de sécurité, cache des
  assets) — déploiement statique sans build.

[Non publié]: https://github.com/Jhulliaint/Help-Animator/compare/main...HEAD
[2.0.0]: https://github.com/Jhulliaint/Help-Animator/compare/main...claude/peaceful-curie-t06vtb
[1.4.0]: https://github.com/Jhulliaint/Help-Animator/compare/main...claude/peaceful-curie-t06vtb
[1.3.0]: https://github.com/Jhulliaint/Help-Animator/compare/main...claude/peaceful-curie-t06vtb
[1.2.0]: https://github.com/Jhulliaint/Help-Animator/compare/main...claude/peaceful-curie-t06vtb
[1.1.0]: https://github.com/Jhulliaint/Help-Animator/pull/2
[1.0.0]: https://github.com/Jhulliaint/Help-Animator/pull/1
