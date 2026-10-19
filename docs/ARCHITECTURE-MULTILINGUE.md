# Architecture multilingue V2

## Périmètre livré

`v2-preview/i18n.js` fournit enregistrement de catalogues, choix de langue, interpolation simple, liaison explicite de libellés (`data-i18n`), format de date via Intl et repli français. Les fichiers `locales/fr.js`, `en.js`, `es.js`, `de.js`, `it.js` sont chargés localement, sans API. Le français est la référence. La navigation et les principales actions existent dans les cinq catalogues ; les autres libellés externalisés retombent en français. Les messages secondaires (partage, hashtags, confirmations, erreurs et certains textes dynamiques) restent à extraire et traduire. La livraison pose le socle extensible et ne prétend pas terminer la localisation intégrale.

Pour ajouter une langue : créer `locales/<code>.js`, appeler `AniMoiI18n.register(code, messages)`, charger le fichier avant l’application et ajouter son nom natif dans `languageNames` (à terme le registre de langues pourra contenir ces métadonnées). Une clé absente utilise le français ; une langue inconnue utilise le français. Les options métier gardent leurs valeurs historiques : traduire une étiquette d’espèce ne doit jamais changer les profils enregistrés.

`data-i18n` ne s’applique qu’aux éléments d’interface explicitement désignés. Ne pas rechercher/remplacer du texte dans les publications, prénoms, caractères ou brouillons. Les traductions sont insérées par `textContent`, pas par HTML. Un futur ajout de pluriels ou de RTL devra compléter cette couche et ses tests.

## Données locales actuelles

- `animoi-settings-v1` : `{language: "fr", learningConsent: false}` ; préférence de ce navigateur, pas encore un compte.
- `post.originalLanguage` : étiquette de langue (`fr`, `en`, `es`, `de`, `it`, `und`, ou autre code valide). Absence historique = inconnue, sans détection automatique.
- L’interface contient un choix de langue originale pour un texte retouché manuellement. La génération locale produit toujours du français et remet donc ce choix à `fr`. La réutilisation d’un texte conserve sa langue connue ou `und`.
- Profil, publications et préférences sont écrits avec le même journal de récupération. Sauvegarde JSON format 2 ; restauration des formats 1 et 2. Le format 1 sans préférences conserve la langue courante. La restauration impose `learningConsent: false` pour éviter de réactiver un accord dans un autre contexte.
- Le texte original reste `post.text`. Changer la langue de l’interface ne modifie ni ce texte ni sa langue.

La V1 est conservée et n’utilise pas cette infrastructure. Si elle modifie des données, la V2 continue à accepter les anciens champs sans langue. Ouvrir plusieurs onglets en écriture simultanée reste déconseillé ; la synchronisation concurrente sera traitée avec l’API distante.

## Contrats futurs — spécification uniquement

Ces interfaces ne sont pas implémentées et n’ouvrent aucune connexion.

### Reformulation

`Rewriter.rewrite({ anecdote, anecdoteLanguage, outputLanguage, pet: { species, traits }, tone, rubric, maxOutputLength })`

Réponse : `{ text, language, engineVersion, warnings }`. Séparer les codes de tons stables des libellés traduits. Le serveur contrôle le compte, les quotas et les entrées ; les informations de l’animal sont des données, jamais des instructions privilégiées. Sortie à la première personne, dans la langue demandée, avec validation humaine. Ne conserver dans les logs ni anecdote ni photo par défaut. Prévoir un jeu d’évaluation humain par langue et par ton avant le choix du modèle ouvert.

### Traduction à la demande

`Translator.translate({ postId, sourceRevision, sourceLanguage, targetLanguage })`

Réponse : `{ translatedText, sourceRevision, sourceLanguage, targetLanguage, engineVersion }`. Le serveur récupère lui-même la source autorisée. Stockage distinct proposé : `post_translations(post_id, source_revision, target_language, translated_text, engine_version, created_at)`, unique par source/version/langue cible. Cette proposition ne vaut pas migration. Rendre l’original toujours accessible ; une révision de la source invalide le cache. Ne jamais écraser `post.text` ou `post.originalLanguage`. Respecter les droits sur les posts privés.

### Dictionnaires libres

`Lexicon.lookup({ language, term, context })` retourne sens, expressions, exemples autorisés et provenance : ressource, licence, attribution, version. Isoler la ressource du moteur IA, afin de remplacer un dictionnaire ou d’ajouter une langue sans changer le stockage des publications. Prévoir normalisation Unicode et tokenisation adaptées ; ne pas supprimer systématiquement les accents ni traiter les expressions par simple substitution de mots.

### Corrections consenties

`Consent` futur : sujet authentifié, finalité, version du texte d’accord, langue, date, statut et retrait. `CorrectionExample` futur : identifiant du consentement, langue, proposition et correction minimisées, dates de rétention et provenance. Ces ensembles sont distincts des publications et exclus des exports de jeux d’entraînement par défaut.

Avant collecte : expliciter les finalités séparées (personnalisation privée / amélioration mutualisée), obtenir l’accord, filtrer les données personnelles et permettre la révocation. Ne pas inférer un accord d’un simple clic « enregistrer ». Pas de pipeline d’apprentissage ni d’API réseau dans cette étape.
