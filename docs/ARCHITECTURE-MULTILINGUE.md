# Architecture multilingue V2

## Périmètre livré

`v2-preview/i18n.js` fournit enregistrement de catalogues, choix de langue, interpolation simple, liaison explicite de libellés (`data-i18n`), format de date via Intl et repli français. Les fichiers `locales/fr.js`, `en.js`, `es.js`, `de.js`, `it.js` sont chargés localement, sans API. Le français est la référence. La navigation, les nouveaux parcours de profils et d’histoires, les actions de partage et les hashtags proposés utilisent ces catalogues ; certains libellés historiques retombent encore en français. La livraison ne prétend pas terminer la localisation intégrale. `tFor(code, key, variables)` permet de lire un catalogue précis sans modifier la langue courante, le document, les préférences ou les publications.

Pour ajouter une langue : créer `locales/<code>.js`, appeler `AniMoiI18n.register(code, messages)`, charger le fichier avant l’application et ajouter son nom natif dans `languageNames` (à terme le registre de langues pourra contenir ces métadonnées). Une clé absente utilise le français ; une langue inconnue utilise le français. Les options métier gardent leurs valeurs historiques : traduire une étiquette d’espèce ne doit jamais changer les profils enregistrés.

`data-i18n` ne s’applique qu’aux éléments d’interface explicitement désignés. Ne pas rechercher/remplacer du texte dans les publications, prénoms ou caractères. Dans un nouveau brouillon uniquement, les deux hashtags communs générés et encore inchangés peuvent suivre la langue de l’interface ; leurs positions et provenance sont suivies en mémoire. Les marques, ajouts, suppressions et renommages de l’auteur restent personnels. Les traductions sont insérées par `textContent`, pas par HTML. Un futur ajout de pluriels ou de RTL devra compléter cette couche et ses tests.

## Données locales actuelles

- `animoi-settings-v1` : `{language: "fr", learningConsent: false}` ; préférence de ce navigateur, pas encore un compte. Un objet facultatif `account: {displayName: ""}` conserve un prénom ou pseudo local (80 caractères maximum), inclus dans les sauvegardes. Les anciens exports sans cet objet restent compatibles.
- `post.originalLanguage` : étiquette de langue (`fr`, `en`, `es`, `de`, `it`, `und`, ou autre code valide). Absence historique = inconnue, sans détection automatique.
- Le parcours ne montre plus de sélecteur technique de langue. La détection locale conservatrice identifie la langue de l’anecdote ou utilise l’interface en repli ; les gabarits existent dans les cinq langues et conservent l’anecdote citée sans la traduire. Les hashtags automatiques suivent la langue de l’interface, pas ce résultat de détection ni un pays. La modification d’un texte conserve sa langue connue si la nouvelle détection est ambiguë, y compris `und` ou un code BCP 47 historique.
- Profil, publications et préférences sont écrits avec le même journal de récupération. Sauvegarde JSON format 2 ; restauration des formats 1 et 2. Le format 1 sans préférences conserve la langue courante. La restauration impose `learningConsent: false` pour éviter de réactiver un accord dans un autre contexte.
- Le texte original reste `post.text`. Changer la langue de l’interface ne modifie ni ce texte ni sa langue.
- `settings.autoTranslate` est un booléen facultatif : absent signifie désactivé, sans ajout automatique dans les anciennes données. Une action explicite dans Compte le sauvegarde ; les exports/restaurations le conservent. Aucun moteur n’est installé pour le moment.

## Commandes de traduction préparées

`translation.js` ajoute une vue de lecture aux publications par animal et au réseau local. Une publication d’une autre langue, ou de langue inconnue, propose **Voir la traduction**. Tant qu’aucun fournisseur n’est disponible, une demande ou une préférence automatique conserve le texte original et affiche un message d’indisponibilité. **Voir l’original** devient disponible lorsqu’une traduction réelle est affichée ; il restaure le texte source immédiatement. Une publication déjà dans la langue de l’interface ne propose pas de traduction inutile.

`AniMoiTranslation.configureProvider(provider)` est une frontière de développement, configurée à `null` en production. Un futur fournisseur implémentera `translate({text, sourceLanguage, targetLanguage, postId, sourceRevision})` et retournera `{text, language}`. Aucun client réseau, endpoint, clé ou faux fournisseur n’est ajouté au site. Les fournisseurs artificiels des tests restent dans les seuls fichiers de tests.

Le texte fourni au futur moteur contient des marqueurs opaques à la place des hashtags, réinsérés littéralement après réponse. Une réponse perdant ces marqueurs, de langue incorrecte ou identique à la source ne devient pas une fausse traduction. Cache et requêtes en cours restent en mémoire, associés au texte exact, à l’identifiant, aux langues et à la configuration du fournisseur ; aucune traduction n’est écrite dans `post.text`, les profils ou les sauvegardes. Les vues détruites ou obsolètes ignorent les réponses tardives. Le partage et sa copie manuelle utilisent toujours l’original de l’auteur.

L’étude et les licences des candidats sont détaillées dans [COMPARATIF-TRADUCTION.md](COMPARATIF-TRADUCTION.md). Un choix de moteur, son installation et l’activation d’un service nécessitent une autorisation distincte.

La V1 est conservée et n’utilise pas cette infrastructure. Si elle modifie des données, la V2 continue à accepter les anciens champs sans langue. Ouvrir plusieurs onglets en écriture simultanée reste déconseillé ; la synchronisation concurrente sera traitée avec l’API distante.

## Contrats futurs — spécification uniquement

Les services serveur ci-dessous ne sont pas implémentés et n’ouvrent aucune connexion. La frontière de lecture locale décrite plus haut prépare leur future intégration.

### Reformulation

`Rewriter.rewrite({ anecdote, anecdoteLanguage, outputLanguage, pet: { species, traits }, tone, rubric, maxOutputLength })`

Réponse : `{ text, language, engineVersion, warnings }`. Séparer les codes de tons stables des libellés traduits. Le serveur contrôle le compte, les quotas et les entrées ; les informations de l’animal sont des données, jamais des instructions privilégiées. Sortie à la première personne, dans la langue demandée, avec validation humaine. Ne conserver dans les logs ni anecdote ni photo par défaut. Prévoir un jeu d’évaluation humain par langue et par ton avant le choix du modèle ouvert.

### Traduction à la demande

`Translator.translate({ postId, sourceRevision, sourceLanguage, targetLanguage })`

Réponse : `{ translatedText, sourceRevision, sourceLanguage, targetLanguage, engineVersion }`. Le serveur récupère lui-même la source autorisée. Stockage distinct proposé : `post_translations(post_id, source_revision, target_language, translated_text, engine_version, created_at)`, unique par source/version/langue cible. Cette proposition ne vaut pas migration. Rendre l’original toujours accessible ; une révision de la source invalide le cache. Ne jamais écraser `post.text` ou `post.originalLanguage`. Respecter les droits sur les posts privés.

Les hashtags d’origine restent dans la publication stockée ; une demande de traduction d’un lecteur ne doit pas appeler la génération de hashtags ni réécrire la source. Les hashtags de marque personnalisés ne sont pas traduits. Ce contrat est documenté pour le futur service : aucun moteur de traduction n’est activé par l’adaptation des hashtags.

### Dictionnaires libres

`Lexicon.lookup({ language, term, context })` retourne sens, expressions, exemples autorisés et provenance : ressource, licence, attribution, version. Isoler la ressource du moteur IA, afin de remplacer un dictionnaire ou d’ajouter une langue sans changer le stockage des publications. Prévoir normalisation Unicode et tokenisation adaptées ; ne pas supprimer systématiquement les accents ni traiter les expressions par simple substitution de mots.

### Corrections consenties

`Consent` futur : sujet authentifié, finalité, version du texte d’accord, langue, date, statut et retrait. `CorrectionExample` futur : identifiant du consentement, langue, proposition et correction minimisées, dates de rétention et provenance. Ces ensembles sont distincts des publications et exclus des exports de jeux d’entraînement par défaut.

Avant collecte : expliciter les finalités séparées (personnalisation privée / amélioration mutualisée), obtenir l’accord, filtrer les données personnelles et permettre la révocation. Ne pas inférer un accord d’un simple clic « enregistrer ». Pas de pipeline d’apprentissage ni d’API réseau dans cette étape.
