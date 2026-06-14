# Changelog

Toutes les modifications notables de **Help Animator** sont documentées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]
- (rien pour l'instant)

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
[1.1.0]: https://github.com/Jhulliaint/Help-Animator/pull/2
[1.0.0]: https://github.com/Jhulliaint/Help-Animator/pull/1
