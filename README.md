# Ani’Moi — consolidation locale V2

Ani’Moi est un prototype de réseau social animalier : l’humain raconte une anecdote et son animal prend la parole. `v2-preview/` est la base fonctionnelle retenue. La V1 à la racine reste disponible ; aucune fonctionnalité n’a été retirée.

## Démarrer

Aucun build ni serveur applicatif nécessaire. Depuis ce dossier :

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8000/v2-preview/index.html` (V2) ou `http://127.0.0.1:8000/index.html` (V1). Pour le partage natif hors localhost, utiliser HTTPS. Les capacités de partage dépendent du navigateur et des applications installées.

## Fonctionnalités

- Plusieurs animaux : prénom, espèce, naissance ou âge estimé facultatifs, races/origines facultatives, traits de caractère multiples et photo compressée. La création passe uniquement par **Mes animaux → + Ajouter**.
- Espèces harmonisées : chien, chat, lapin, oiseau, cheval, poisson, hamster et autre.
- Sept tons, quatre rubriques, retouche et publications à la première personne.
- Génération gratuite par gabarits locaux, sans API IA. En français, les traits reconnus (joueur/énergique/actif/espiègle, têtu, timide/craintif, calme/doux et curieux) guident des réactions narratives ; ceux marqués dominants passent en priorité, sans afficher leurs noms ni une liste de caractères. Les quatre autres cadres linguistiques restent génériques et n’exploitent pas encore la personnalité. Les 52 traits et dominants demeurent disponibles dans le profil et le contexte du futur moteur IA ; leur exploitation complète ne constitue pas une fonctionnalité IA active.
- Historique par animal, modification sans duplication et suppression confirmée d’une publication, communautés locales par espèce, hashtags modifiables, copie et partage natif lorsque disponible.
- Photo facultative propre à chaque publication, distincte de la photo du profil : aperçu, remplacement et retrait avant enregistrement ou lors d’une modification.
- Cartes PNG facultatives aux formats 4:5, 9:16 et 1:1, dans un panneau replié hors du parcours principal ; texte long poursuivi dans la légende.
- Export JSON et restauration complète des profils, photos et publications.

## Navigation Animaux, Réseau et Compte

La navigation V2 comporte trois onglets compacts, chacun avec son icône au-dessus du texte : **Animaux**, **Réseau**, **Compte**. Ils tiennent sur une ligne sur les formats iPhone testés. Animaux est l’accueil par défaut et reste l’onglet actif pendant les parcours de profil et de rédaction.

L’accueil conserve les cartes photo/nom/race et leurs accès à la modification et aux publications. **+ Ajouter** est placé à droite de **Mes animaux** ; **Raconter une aventure** reste sous les cartes. Avec plusieurs animaux, le parcours demande lequel prend la parole.

**Réseau** donne accès aux quatre univers Pawbook, SAV des animaux, LinkedPaw et Potins de Gamelle, ainsi qu’au filtre **À classer**. **Toutes les publications** réunit les histoires locales accessibles au propriétaire, y compris ses propositions de Gazette clairement identifiées comme privées. Cette liste ne constitue pas une édition publiée. Les communautés et filtres par espèce restent disponibles. Les données consultées restent celles de ce navigateur : aucun partage entre utilisateurs ni raccordement à Neon n’est simulé.

**Compte** présente quatre groupes sur une seule page : Mes informations ; Langue et préférences ; Mes données ; Confidentialité et paramètres. Il contient un prénom ou pseudo facultatif enregistré sur cet appareil, les cinq drapeaux, et les actions d’export/restauration. Ce formulaire ne crée pas de compte connecté ni de mot de passe. Le pseudo est inclus dans les exports ; les anciennes sauvegardes sans cette information restent acceptées.

Les drapeaux ont un nom de langue accessible et un état sélectionné. Le parcours ne demande plus de remplir un sélecteur technique de langue de publication. Les boutons tactiles mesurent au moins 44 px, les noms longs reviennent à la ligne et les marges tiennent compte des encoches. Un navigateur neuf commence sans profil préchargé ; aucun profil existant n’est retiré automatiquement.

## Quatre rubriques et histoires à classer

Les publications utilisent un composant commun, décliné selon les identités validées : **Pawbook — carnet violet**, **SAV des animaux — dossier de réclamation**, **LinkedPaw — dossier professionnel imaginaire**, **Potins de Gamelle — journal satirique**. L’historique de l’animal et le Réseau réutilisent ce même rendu, les photos et les actions existantes, sans créer quatre applications indépendantes.

Les nouvelles histoires conservent leur rubrique et leur ton, avec un titre et des champs spécifiques facultatifs. Les identifiants restent `pawbook`, `sav`, `linkedin` et `potins` ; `linkedin` est la valeur historique de LinkedPaw, indépendamment de son nom affiché et de la langue. Le SAV propose un objet, une référence de dossier stable, un statut explicitement fictif et une réponse humoristique facultative. LinkedPaw propose un type de publication et une fonction imaginaire ; les CV et annonces restent des textes fictifs.

Une ancienne histoire sans rubrique enregistrée apparaît dans **À classer**. Le bouton **Classer** ouvre le même éditeur, avec le choix volontaire de Pawbook, du SAV ou de LinkedPaw. L’enregistrement retire immédiatement l’histoire de ce filtre ; elle reste dans Toutes les publications et sa rubrique. **Changer de rubrique** permet de reclasser la même histoire sans duplication. Le filtre vide affiche « Toutes vos histoires sont classées ! ». Une rubrique future non reconnue reste conservée et visible dans Toutes les publications, avec un libellé distinct ; elle n’est pas considérée comme absente. Aucune rubrique ni aucun ton ne sont déduits du texte. Le classement seul ne réécrit pas le texte, les hashtags, la langue, la photo ou la date de création. Ouvrir une publication, changer la langue ou annuler une modification ne lance aucune migration automatique. Une ancienne histoire « Potins » ne devient pas automatiquement un article approuvé.

**Potins de Gamelle** distingue les propositions locales de la future Gazette publiée. Dans le prototype, un brouillon peut être placé explicitement dans la file locale, ramené au brouillon ou archivé selon son état. Ces actions n’envoient rien à une rédaction et ne publient aucun article. Les contrats de validation, révision, refus, approbation et publication sont préparés, mais les comptes, les droits vérifiés côté serveur et la publication éditoriale centralisée restent à développer. Un statut `approved` ou `published` importé dans une sauvegarde ne prouve pas qu’un article a été validé par une rédaction authentifiée.

Les illustrations importées restent facultatives ; les caricatures générées par IA sont prévues pour une étape ultérieure. Aucun moteur, abonnement, entraînement ni service supplémentaire n’est activé. Le détail des données, des rôles et des limites est décrit dans [RUBRIQUES-V2.md](docs/RUBRIQUES-V2.md).

Les quatre présentations n’ajoutent ni traits de personnalité ni étoiles de dominants à leurs cartes ou en-têtes de lecture. Les nouveaux communiqués n’énumèrent plus les caractéristiques du profil. Pour les anciens textes générés, une projection de lecture reconnaît strictement les cinq anciens gabarits et masque uniquement l’énumération automatique ; elle conserve les réactions narratives, les mots de l’auteur, la photo, le nom, l’espèce/race et les hashtags. Le retour « Voir l’original », le partage, la copie et les cartes image utilisent la même présentation. Aucune écriture ni migration n’est déclenchée. Le texte source complet reste dans les sauvegardes et dans l’éditeur privé du propriétaire : une modification ou un classement sans changement de texte ne supprime aucun passage historique. Les textes librement réécrits qui ne correspondent plus à un gabarit reconnu ne sont pas censurés automatiquement.

## Date de naissance et âge

Juste après Prénom et Espèce, la rubrique facultative **Date de naissance ou âge** permet de renseigner une date complète, un âge estimé en années/mois, ou de ne rien indiquer. L’absence de ces informations ne bloque pas la création du profil. L’âge estimé ne sert jamais à inventer une date de naissance.

Une date complète est conservée au format calendrier `YYYY-MM-DD`, sans conversion UTC. L’âge est recalculé à partir de la date locale du jour et affiche les mois lorsque cela aide à décrire un jeune animal. Les dates futures ou impossibles sont refusées lors de la saisie ou de l’import. L’âge estimé conserve la valeur renseignée et sa date de déclaration ; il n’est pas présenté comme une naissance certaine.

Le jour anniversaire, la carte affiche **🎂 Bon anniversaire [prénom] !**. Le message disparaît à la date suivante. **Règle du 29 février : l’anniversaire est affiché le 29 février les années bissextiles, et le 28 février les autres années.** Un âge seul ne déclenche aucun anniversaire. Le calcul dépend de la date locale de l’appareil et n’effectue aucune écriture automatique dans le stockage.

Les nouveaux champs facultatifs `birthDate` et `estimatedAge` restent inclus dans les sauvegardes JSON version 2. Les anciens profils sans ces champs restent valides et ne sont pas migrés à l’ouverture. Leur schéma est détaillé dans [CARACTERISTIQUES-PROFILS.md](docs/CARACTERISTIQUES-PROFILS.md).

## Histoires, publications et partage

Le parcours reste dans l’onglet **Animaux** et comporte deux écrans : **L’humain raconte**, avec l’animal sélectionné, son anecdote, le ton et la rubrique ; puis **Communiqué officiel**, avec un seul texte directement modifiable, une indication discrète et les actions d’enregistrement et de partage. Le propriétaire peut corriger librement son communiqué avant de l’enregistrer.

Dans **Communiqué officiel**, **Ajouter une photo (facultatif)** permet de joindre une image à l’histoire, avec aperçu et retrait possible avant l’enregistrement. La photo apparaît dans les publications de l’animal et dans le Réseau local. **Modifier** permet ensuite de l’ajouter, de la remplacer ou de la retirer sans créer un doublon ni changer la photo du profil. Les anciennes publications sans image restent inchangées.

Les photos de publication sont préparées uniquement dans le navigateur : fichier d’origine de **20 Mio maximum**, redimensionnement à **1 280 px maximum** sur le plus grand côté et compression JPEG. Les formats disponibles dépendent du décodage du navigateur ; si une photo HEIC/HEIF de l’iPhone n’est pas lisible, utiliser une version JPEG ou PNG. Aucun fichier n’est envoyé à un serveur. Le champ facultatif `post.photo` et les sauvegardes JSON existantes conservent l’image ; aucun changement des clés de stockage ou de version de sauvegarde n’est nécessaire. Les sauvegardes contenant des photos sont plus volumineuses, et le stockage local reste limité : un échec d’enregistrement conserve les données précédentes.

La première génération propose directement sous le texte **#Animoi**, un hashtag de vie animale et un hashtag d’espèce, selon la **langue de l’interface**. Cette langue est indépendante de la langue détectée de l’histoire et du pays : une interface anglaise peut accompagner une anecdote française avec `#Animoi #AnimalLife #Dog`. La marque `#Animoi` reste identique dans les cinq langues. Les libellés proposés proviennent uniquement des fichiers de langues, au moyen de `hashtags.life` et `hashtags.species.*`.

Les cinq langues couvrent les huit espèces générales :

| Interface | Vie animale | Chien | Chat | Oiseau | Lapin | Cheval | Poisson | Hamster | Autre |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Français | `#VieDAnimal` | `#Chien` | `#Chat` | `#Oiseau` | `#Lapin` | `#Cheval` | `#Poisson` | `#Hamster` | `#Autre` |
| Anglais | `#AnimalLife` | `#Dog` | `#Cat` | `#Bird` | `#Rabbit` | `#Horse` | `#Fish` | `#Hamster` | `#Other` |
| Allemand | `#Tierleben` | `#Hund` | `#Katze` | `#Vogel` | `#Kaninchen` | `#Pferd` | `#Fisch` | `#Hamster` | `#Andere` |
| Espagnol | `#VidaAnimal` | `#Perro` | `#Gato` | `#Pajaro` | `#Conejo` | `#Caballo` | `#Pez` | `#Hamster` | `#Otro` |
| Italien | `#VitaAnimale` | `#Cane` | `#Gatto` | `#Uccello` | `#Coniglio` | `#Cavallo` | `#Pesce` | `#Criceto` | `#Altro` |

Les formes proposées sont stables et sans accents, notamment `#Pajaro`. Ces hashtags font partie du texte éditable : le propriétaire peut en ajouter ou en retirer. Les doublons sont éliminés sans réimposer les hashtags retirés lors de l’enregistrement ou du partage. Les hashtags personnalisés ne sont pas traduits automatiquement.

Lors de la génération seulement, un hashtag proposé déjà présent dans le récit est regroupé sous le communiqué plutôt que supprimé du bloc final par la déduplication globale. Son mot reste dans la phrase sans le signe `#` pour conserver le sens du récit ; le hashtag complet et sa graphie personnelle sont conservés au pied. Son origine dans le récit empêche de le traduire automatiquement avec un changement de langue du brouillon. Les autres hashtags personnalisés et les fragments d’URL restent intacts. Cette mise en forme ne s’applique jamais aux histoires déjà enregistrées.

Dans l’éditeur, **Rétablir les hashtags proposés** ajoute volontairement les suggestions manquantes selon l’espèce et la langue de l’interface. L’action conserve les hashtags existants, ne traduit aucune marque personnelle et n’ajoute pas de doublon. Elle ne modifie que le brouillon : il faut enregistrer pour confirmer, et revenir en arrière permet d’abandonner le changement. Aucun rétablissement n’est déclenché par une lecture, un classement, une bascule de langue, un rechargement ou une restauration JSON.

Une publication déjà enregistrée garde son texte et ses hashtags lorsqu’on change la langue de l’interface. Une future traduction à la demande pour un lecteur devra conserver l’original enregistré ; elle ne réécrira pas les hashtags de l’auteur.

Dans un nouveau brouillon, seuls les hashtags de vie animale et d’espèce proposés automatiquement suivent une bascule de langue. Un hashtag retiré, renommé ou déplacé devient un choix personnel et n’est pas réimposé. Les marques personnalisées, même si elles ressemblent à une espèce (`#DOG` par exemple), restent intactes. Cette information de provenance reste en mémoire pendant la rédaction ; aucun champ de profil ou de sauvegarde n’est ajouté.

Dans **Ses publications**, **Nouvelle histoire** et **Modifier le profil** restent accessibles. Chaque publication comporte **Modifier**, **Partager** et **Supprimer**, à la place de Réutiliser. Modifier réouvre l’objet existant et conserve son identifiant, son animal et sa date de création ; enregistrer la correction ne crée pas un second objet. Une modification effective ajoute seulement un horodatage `editedAt` en complément des métadonnées conservées. L’attribution est contrôlée avant l’enregistrement et une publication supprimée ou modifiée entre-temps ne doit pas être écrasée silencieusement.

**Supprimer** ouvre une confirmation dédiée à la publication, avec **Annuler**, **Supprimer définitivement** et une sauvegarde JSON facultative. Aucune suppression n’a lieu à l’ouverture, après annulation ou après un export seul. La cible est figée avec son animal ; une publication absente ou modifiée entre-temps doit être relue avant toute confirmation. Seule cette publication est supprimée : son profil, ses photos et ses autres histoires sont conservés. Les compteurs et les fils sont rafraîchis après une suppression réussie. En cas d’échec d’écriture, le journal transactionnel restaure l’état précédent et le message d’erreur reste visible. Une sauvegarde permet de retrouver la publication selon le fonctionnement de restauration complète décrit plus bas.

**Partager** utilise la Web Share API du téléphone, avec le texte et les hashtags. Le site ne choisit aucune application et ne publie pas automatiquement sur un réseau externe. Lorsque le partage natif est indisponible ou échoue, une copie du texte est proposée ; l’annulation volontaire du menu natif reste silencieuse. Si la copie automatique est refusée, le texte peut être sélectionné pour une copie manuelle.

Pour une publication avec photo, le partage joint également le fichier lorsque le navigateur annonce la prise en charge via `navigator.canShare({files})`. Sinon, il propose le texte et les hashtags en précisant que la photo n’a pas pu être jointe ; le fichier enregistré dans la publication reste intact. Le comportement des applications de destination doit être vérifié sur Safari iPhone.

La création d’image est conservée dans **Créer une image (facultatif)**, replié au départ. Elle ne constitue plus une étape imposée, et son format n’encombre pas le parcours principal.

## Consultation multilingue préparée

Les publications conservent leur texte, leur langue originale et les hashtags de l’auteur. L’interface de consultation prépare les actions **Voir la traduction** et **Voir l’original**, ainsi qu’une préférence **Traduire automatiquement les publications dans ma langue** dans Compte. **Aucun moteur de traduction n’est installé ou appelé actuellement** : l’interface annonce cette indisponibilité et garde l’original affiché, sans présenter une copie identique comme une traduction. Aucune traduction automatique du texte enregistré n’est simulée.

Le champ facultatif `settings.autoTranslate` peut mémoriser la préférence dans la clé de paramètres existante, sans migrer les anciennes données ni ajouter une valeur à l’ouverture. Il est inclus dans les sauvegardes lorsqu’il a été renseigné ; les profils et sauvegardes qui en sont dépourvus restent valides. Choisir une préférence ne modifie ni les publications ni leurs hashtags.

Un futur moteur devra fournir une traduction de consultation dans la langue du lecteur, avec retour possible à l’original. Une erreur, une indisponibilité ou un résultat inchangé conserve l’original. Changer la langue de l’interface ne réécrit jamais la publication enregistrée. L’implémentation de cette frontière n’active aucun service tiers, aucune collecte ni connexion Neon.

## Races, origines et caractère

La précision sur la race propose exactement trois choix : **Race connue**, **Race inconnue**, **Non pertinent pour cette espèce**. Avec Race connue, la fiche affiche le catalogue correspondant à l’espèce (chiens, chats, lapins, chevaux), une recherche insensible aux accents, des cases à cocher et une origine principale facultative. Plusieurs origines peuvent être sélectionnées pour un croisement. Les espèces dépourvues de catalogue conservent une saisie libre pour les origines connues. Race inconnue masque toute demande de race. Non pertinent masque les choix de race et propose une **espèce précise ou variété facultative**, avec des exemples adaptés aux poissons, hamsters et oiseaux. Une précision reste liée à son espèce générale et conserve la langue saisie par le propriétaire.

Pour les poissons, oiseaux et hamsters, le mode Non pertinent propose également un **catalogue filtrable d’espèces et de variétés**. Chaque proposition indique son type et, lorsqu’il est pertinent, son nom scientifique. Une sélection conserve un identifiant stable et un libellé de secours ; elle peut être remplacée par une précision libre. Changer la langue adapte les noms du catalogue sans réécrire le texte de secours enregistré.

Le catalogue est dérivé de la **Vertebrate Breed Ontology (VBO)**, sous licence **CC BY 4.0**, avec des appellations multilingues complémentaires issues de Wikidata (**CC0**). Les sources, versions, transformations, attributions et limites sont documentées dans [CATALOGUE-SOURCES.md](docs/CATALOGUE-SOURCES.md) et accessibles depuis la fiche. Il ne s’agit pas d’un registre officiel exhaustif : certaines variantes et origines locales restent sous leur nom source faute de libellé traduit vérifié. Les noms et synonymes disponibles restent recherchables dans les cinq langues, sans appel réseau à l’utilisation.

**52 traits** de caractère, traduits dans les cinq langues, peuvent être cochés et complétés par des mots personnalisés. Le propriétaire peut désigner **jusqu’à trois traits dominants parmi ses sélections**, y compris ses libellés personnalisés, en touchant les **étoiles ☆ / ★**. Une quatrième dominante est empêchée ; retirer un trait retire aussi sa priorité. Ces dominantes, leurs libellés et un ordre de priorité sont disponibles dans le contexte du futur moteur IA ; le générateur local existant reste fondé sur ses gabarits. Les listes affichent au plus 20 résultats à la fois dans une zone de hauteur limitée ; les sélections restent visibles même après filtrage. Les cases et leurs libellés disposent de surfaces tactiles d’au moins 44 px. Les valeurs personnalisées conservent leur langue d’origine.

Les anciens textes de race et caractère ne sont pas convertis automatiquement et restent conservés à l’identique lors d’une modification d’un autre champ. Les anciens statuts Autre et Sans race définie restent lisibles sans migration : ils correspondent respectivement aux choix Race connue et Race inconnue dans l’interface. Passer d’une race connue à un autre choix conserve les origines dans une archive réversible, retrouvée en sélectionnant de nouveau Race connue, y compris après sauvegarde et restauration. Les données structurées facultatives utilisent des identifiants stables, accompagnés des champs texte historiques pour la compatibilité. Même les textes hérités longs ou multilignes restent conservés lors d’un enrichissement. Les sauvegardes version 1 et 2 restent acceptées et exportent toutes ces caractéristiques. [Le contrat des profils](docs/CARACTERISTIQUES-PROFILS.md) décrit aussi le contexte local prêt pour un futur moteur IA ; aucun moteur IA distant ni apprentissage n’est activé.

## Sauvegarde, suppression et restauration

Dans **Compte → Mes données**, **Exporter mes données** télécharge une sauvegarde JSON versionnée. Elle contient les profils, textes, photos et le pseudo éventuellement enregistré : conserver ce fichier dans un endroit privé. Un changement de navigateur ou d’origine et l’effacement des données du site peuvent rendre le stockage local indisponible.

La suppression d’un **animal** est disponible uniquement dans la fiche **Modifier le profil**, sans pictogramme sur les cartes. Elle reste distincte de la suppression individuelle d’une publication décrite plus haut. Elle ouvre une fenêtre modale accessible. Son libellé est **Supprimer cet animal**. La confirmation française indique : « Voulez-vous vraiment supprimer [nom] ? Ses publications associées seront également supprimées. Cette action est irréversible sans sauvegarde. »

Deux choix terminent ce parcours : **Annuler** et **Supprimer définitivement**. Aucune suppression n’est exécutée à l’ouverture, après Annuler, après Échap ou après une sauvegarde seule. La fenêtre garde son propre animal cible, même si un autre profil était sélectionné. Seul le bouton de confirmation dans la fenêtre ouverte supprime le profil et ses publications associées.

Une action facultative **Télécharger une sauvegarde JSON** exporte toutes les données sans fermer la confirmation ni supprimer quoi que ce soit. Vérifier dans Fichiers/Téléchargements que le navigateur a bien conservé ce fichier avant de confirmer. Sans sauvegarde disponible, la suppression est définitive. Un échec d’écriture affiche une erreur et laisse les données en place grâce au journal de récupération.

**Restaurer une sauvegarde** contrôle le format et demande confirmation du remplacement complet (pas de fusion). L’état courant est exporté avant remplacement. Annuler ou choisir un fichier invalide ne modifie pas les données. Une restauration permet de retrouver un animal supprimé et ses publications présents dans ce fichier, mais remplace aussi les autres changements réalisés depuis l’export. Les publications historiques sans profil restent conservées dans les exports.

Les écritures des profils, publications et préférences passent par `v2-preview/data.js`. Un journal permet de revenir à l’état précédent si une écriture échoue ; après interruption, il est récupéré au prochain accès. En cas d’échec de récupération, les données et le journal sont conservés et une erreur est affichée. Les données illisibles ne sont pas remplacées automatiquement et un ensemble volontairement vide reste vide après rechargement.

Les clés historiques `animoi-pets-v1` et `animoi-posts-v2` sont conservées, sans migration destructive. V1 et V2 partagent les profils si elles sont servies depuis la même origine. La V1 conserve son ancien comportement de suppression et ne gère pas les nouveaux champs structurés ; gérer les profils et leurs caractéristiques dans la V2. Les modifications simultanées dans plusieurs onglets ne sont pas fusionnées.

## Vérifications

Node.js 22+ : tests du stockage, restauration, données invalides, publications orphelines et récupération après échec.

```sh
node tests/data.test.cjs
node tests/i18n.test.cjs
node tests/characteristics.test.cjs
node tests/catalogues.test.cjs
node tests/species.test.cjs
node tests/pet-age.test.cjs
node tests/publications.test.cjs
node tests/international-hashtags.test.cjs
node tests/translation.test.cjs
node tests/story-formatter.test.cjs
node tests/humor.test.cjs
node tests/post-photo.test.cjs
node tests/post-photo-sharing.test.cjs
node tests/rubrics.test.cjs
node tests/editorial.test.cjs
node tests/rubrics-data.test.cjs
node tests/hashtag-recovery.test.cjs
node tests/classification-corrections.test.cjs
node tests/publication-personality.test.cjs
```

Tests des parcours dans Chromium, avec Playwright installé dans l’environnement de développement :

```sh
npm install --no-save --package-lock=false playwright
node tests/browser.cjs
node tests/mobile-layout.cjs
node tests/stories-age-browser.cjs
node tests/hashtags-browser.cjs
node tests/posts-translation-browser.cjs
node tests/post-photos-browser.cjs
node tests/rubrics-browser.cjs
node tests/classification-corrections-browser.cjs
node tests/hashtags-persistence-browser.cjs
node tests/publication-personality-browser.cjs
node tests/humor-browser.cjs
```

Chaque script lance un serveur sur `127.0.0.1` et utilise `/usr/bin/chromium` par défaut. Définir `CHROMIUM_PATH` pour un autre emplacement. Les tests utilisent un profil de navigateur temporaire et n’accèdent à aucune base. Ils vérifient notamment la sélection, l’attribution et la modification des publications, les âges et anniversaires, les hashtags, le caractère, les communautés, la sauvegarde, la suppression, la restauration, le partage et les cartes PNG facultatives. Les parcours des rubriques couvrent également le classement volontaire, l’historique, le Réseau et les quatre identités visuelles dans les cinq langues, notamment à 320 et 390 px. La matrice supplémentaire des hashtags couvre les huit espèces et les cinq langues à ces deux largeurs, la persistance et les sauvegardes. Les contrôles Chromium simulent des formats iPhone ; ils ne remplacent pas un essai sur Safari réel.

## Multilingue dès la V2

Le français reste la langue principale. `locales/fr.js`, `en.js`, `es.js`, `de.js` et `it.js` séparent les catalogues de l’interface ; `i18n.js` gère le choix de langue, la liaison des libellés, les dates et le repli vers le français. La navigation et les principales actions sont traduites ; les autres libellés et messages restent français à cette étape. Il ne s’agit pas encore de cinq interfaces intégralement traduites.

La préférence est conservée pour ce navigateur et exportée dans le format de sauvegarde 2. Les sauvegardes de format 1 restent acceptées. La V2 n’a pas encore de comptes : la préférence sera portée par chaque utilisateur après l’introduction de l’authentification.

Les nouvelles publications conservent `originalLanguage` sans afficher de sélecteur technique. Une détection locale conservatrice examine l’anecdote parmi le français, l’anglais, l’espagnol, l’allemand et l’italien ; si les indices sont insuffisants, la langue de l’interface sert de repli. Le cadre de la reformulation utilise des gabarits déterministes dans cette langue et conserve les mots de l’anecdote ; seuls les hashtags correspondant aux suggestions sont regroupés au pied du nouveau communiqué pour éviter les doublons. Aucun service de traduction automatique ni moteur IA distant n’est activé. Les anciennes publications sans métadonnée ne sont pas migrées à l’ouverture. Lors d’une modification, la langue est conservée tant que le texte ne change pas ; une correction du texte relance la détection avec la langue précédente comme repli. Ce repli préserve aussi les métadonnées historiques BCP 47, comme `pt-BR`, ainsi que `und` lorsque la nouvelle détection reste ambiguë ; elles ne sont pas forcées vers une des cinq langues de l’interface. La restauration ne réactive jamais un consentement d’apprentissage.

Le [plan de reprise](docs/PLAN-REPRISE.md) et l’[architecture multilingue](docs/ARCHITECTURE-MULTILINGUE.md) détaillent l’IA multilingue ouverte, la traduction à la demande, les dictionnaires libres et l’apprentissage facultatif à partir de corrections consenties. Ce sont des contrats futurs : aucun moteur IA, traduction automatique, dictionnaire distant ou collecte de corrections n’est activé.

## Architecture et suite

`data.js` expose le dépôt local (`read`, `write`, `deletePet`, `deletePost`, `exportData`, `restore`) et la validation des données. Cette frontière devra être adaptée à une API serveur pour la future synchronisation ; ce n’est pas encore une intégration distante. Les identifiants existants sont conservés pour faciliter une reprise ultérieure. Les publications actuelles appartiennent au stockage local de ce navigateur ; une future API devra vérifier l’identité et les droits du propriétaire côté serveur.

Le [comparatif des solutions de traduction](docs/COMPARATIF-TRADUCTION.md) étudie qualité, coût, hébergement, licences et compatibilité mobile. Aucun moteur, modèle, abonnement ou nouvel hébergement n’est activé.

Le projet Neon existant est conservé et administré séparément. Cette étape ne contient aucun client PostgreSQL, aucune connexion, migration ou création de base. Les comptes, autorisations côté serveur, médias distants, interactions, modération et IA économique restent à développer. Les secrets devront rester dans la configuration du serveur, jamais dans le HTML ou JavaScript public.

Le nom Ani’Moi reste provisoire jusqu’à vérification des marques et domaines. Aucune publication ou mise en ligne automatique n’est prévue par ces scripts.

## Prévisualisation privée

Ces modifications sont préparées localement et ne déclenchent aucun nouveau déploiement. Après accord explicite, la prévisualisation devra réutiliser exclusivement le site privé existant : **https://animoi-v2-iphone-prive.gladvale11.chatgpt.site**, avec la même authentification et les mêmes clés de stockage local. Aucune nouvelle URL ne doit être créée.


## Ton Amusant et variantes (préparation locale)

Le ton principal « Amusant » propose trois variantes exclusives : Drôle, Impertinent et Déjanté. Drôle est sélectionné au début d’une nouvelle histoire et lorsque l’on revient à Amusant. Les six autres tons sont conservés ; leurs variantes sont masquées. Les libellés et descriptions existent dans les cinq catalogues.

Pour préserver les données, la valeur interne historique `tone: "drôle"` reste inchangée. Les nouvelles histoires humoristiques enregistrent aussi `humorVariant: "funny" | "cheeky" | "wacky"`. Un ancien récit sans ce champ reste intact ; le choix par défaut n’est pas écrit lors d’une simple ouverture ou d’un enregistrement sans modification. L’éditeur conserve la variante et permet de la changer explicitement, sans réécrire le texte ni créer une autre publication. Les clés de stockage et la version des sauvegardes JSON restent inchangées.

`v2-preview/humor.js` prépare un contexte indépendant du fournisseur avec le ton sémantique `amusing`, la variante, l’anecdote originale, la rubrique, l’espèce, les origines et les caractères prioritaires issus de `AniMoiCharacteristics.toAIContext`. Ses consignes imposent la première personne, le respect des faits et la priorité aux dominants, sans liste de caractères. Déjanté autorise uniquement une présentation comique exagérée des faits fournis.

Ce contexte est construit dans le parcours local mais **n’est envoyé à aucun serveur**. Le générateur actuel reste un gabarit de démonstration : seule sa conclusion varie selon la variante et la langue du récit. Il ne produit pas encore une véritable reformulation personnalisée selon les dominants. Le propriétaire peut toujours retoucher le texte. Aucun moteur, binding, secret ou appel IA n’est ajouté par ce travail ; la prévisualisation hébergée reste inchangée.


### Adaptateur de profils pour la reformulation serveur — préparation uniquement

`v2-preview/reformulation-input.js` expose `fromProfile(profile, options)` : projection explicite du prénom, de l’espèce, de la race/variété pertinente, de l’âge et des caractères/dominants dans les cinq langues, avec ton et variante. Il ne transmet ni photo, ni date de naissance, ni identifiant de propriétaire. Aucun accès réseau ou stockage : le module n’est pas chargé dans le parcours de la V10. Les profils dépassant les limites du contrat sont refusés sans modification ni troncature silencieuse.

Tests : `node --test tests/reformulation-input.test.cjs`. La qualité réelle de Qwen et le raccordement réseau nécessiteront des étapes ultérieures autorisées ; ce travail ne débloque pas l’essai unique déjà consommé.
