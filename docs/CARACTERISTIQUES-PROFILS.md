# Caractéristiques des profils V2

## Compatibilité et stockage

Les clés locales `animoi-pets-v1`, `animoi-posts-v2`, `animoi-settings-v1` et le journal transactionnel restent inchangés. Aucun effacement, réensemencement ni migration n’est déclenché à l’ouverture. La V1 n’est pas modifiée ; utiliser la V2 pour modifier les nouveaux profils structurés.

Les champs historiques `breed` et `traits` restent des chaînes. Modifier uniquement le nom, la photo ou un autre champ conserve ces textes exactement, sans les découper ni inventer des correspondances de catalogue. Les propriétés supplémentaires d’un profil sont conservées lors de son édition. Lorsqu’un utilisateur change explicitement une sélection, son champ texte de compatibilité est recalculé en français ; les valeurs personnalisées et les textes hérités restent dans leur langue originale.

Le champ facultatif `characteristics` est versionné séparément du format de sauvegarde :

```json
{
  "version": 1,
  "breed": {
    "status": "selected",
    "ids": ["dog:VBO_0200001", "dog:VBO_0200002"],
    "primaryId": "dog:VBO_0200001",
    "custom": ["Origine familiale"]
  },
  "temperament": {
    "ids": ["playful", "affectionate"],
    "custom": ["Adore observer les feuilles"],
    "dominant": ["id:playful", "custom:Adore observer les feuilles"]
  }
}
```

Les identifiants de cet exemple illustrent le format ; sélectionner les identifiants réels dans le catalogue. Les trois choix visibles correspondent à `breed.status` = `selected`, `unknown` ou `not-applicable`. Les anciens statuts `other` et `none` restent acceptés dans les profils et sauvegardes, avec un affichage respectivement Race connue et Race inconnue, sans réécriture automatique. La race principale est facultative et doit appartenir aux origines sélectionnées. Les statuts exclusifs n’acceptent pas d’origines contradictoires. Une sélection vide est valide : race et caractère restent facultatifs.

Les nouveaux libellés personnalisés sont limités à 200 caractères par valeur. Pour conserver un texte historique plus long ou contenant des retours à la ligne, `breed.legacyText` ou `temperament.legacyText` peut porter la chaîne originale, sans troncature. L’interface l’affiche parmi les valeurs conservées et permet de la retirer explicitement. Les limites de sélection sont de 20 origines du catalogue et 20 origines personnalisées ; 80 traits du catalogue et 40 traits personnalisés. Les identifiants inconnus d’une future extension restent valides et conservés.

Changer d’espèce renouvelle les propositions du catalogue mais n’efface pas les origines existantes : elles restent visibles et peuvent être décochées explicitement. Pour une espèce sans catalogue de races, les champs restent facultatifs, avec « Non pertinent pour cette espèce » par défaut sur les nouveaux profils.

## Champs conditionnels et traits dominants

Les champs de race ne sont affichés que pour Race connue. Race inconnue ne demande aucune race. Pour Non pertinent pour cette espèce, le champ facultatif `characteristics.speciesDetail = {species, text}` conserve une espèce précise ou une variété (200 caractères maximum), liée à la valeur d’espèce générale du profil. Les exemples de saisie sont adaptés et traduits pour poissons, hamsters et oiseaux. La valeur libre n’est pas traduite automatiquement.

Pour les trois groupes Poisson, Oiseau et Hamster, un catalogue local permet aussi la sélection d’une espèce ou variété. Le champ facultatif `speciesDetail.catalogueId` porte l’identifiant stable, et `speciesDetail.text` garde le libellé de secours dans sa langue d’origine. La recherche porte sur les noms communs, traductions, alias et noms scientifiques. Le modèle localise la présentation d’un identifiant connu, puis utilise le texte enregistré si le catalogue ou l’identifiant n’est pas disponible. Aucun rapprochement approximatif n’est imposé lors de la lecture d’anciens profils.

Saisir une précision libre retire explicitement la référence de catalogue. Le bouton de conversion conserve le texte actuellement visible, notamment après un changement de langue. Le contexte futur `speciesDetailSelection` conserve le type, le nom scientifique et la référence lorsqu’ils sont connus, en plus du champ texte de compatibilité.

`speciesDetail` reste conservé lorsque son champ est masqué, et n’est affiché ni utilisé dans le contexte IA si le statut n’est pas Non pertinent ou si l’espèce générale a changé. Cette liaison évite d’appliquer une variété de poisson à un oiseau. Elle ne remplace pas un catalogue taxonomique.

`AniMoiCharacteristics.setBreedChoice` change le choix sur une copie du modèle. En quittant Race connue, les origines, la race principale, les textes hérités et leurs extensions sont conservés dans `breed.retainedSelection`. Les champs actifs sont vidés, et ce snapshot est réactivé lorsqu’on revient à Race connue. L’archive est conservée dans les exports JSON ; les archives imbriquées et les ensembles actifs contradictoires sont refusés lors de la validation. L’interface ne perd pas non plus une origine encore en cours de saisie lors d’un changement de choix ou d’espèce.

Le tableau facultatif `temperament.dominant` contient au plus trois références uniques vers des traits sélectionnés : `id:<identifiant>` pour un trait du catalogue, `custom:<texte exact>` pour une valeur personnalisée, ou `legacy` pour un ancien texte historique. Les 52 traits restent disponibles. Une référence absente des sélections ou une quatrième dominante invalide l’import avant écriture. L’interface retire la dominante lorsqu’on décoche le trait correspondant. Les sélections prioritaires apparaissent avec une étoile pleine ★ ; les autres avec une étoile vide ☆. Les contrôles conservent un état natif accessible et une cible tactile d’au moins 44 px.

`traitChoices`, `dominantLabels` et `prioritizedLabels` exposent les sélections et leurs priorités sans modifier les textes originaux. Les profils et sauvegardes sans dominantes restent valides ; aucune priorité n’est devinée à leur place.

## Date de naissance et âge estimé

Deux champs de premier niveau sont facultatifs dans chaque profil :

```json
{
  "birthDate": "2022-04-18",
  "estimatedAge": null
}
```

Ou, lorsque seule une estimation est connue :

```json
{
  "birthDate": null,
  "estimatedAge": {
    "years": 1,
    "months": 6,
    "recordedOn": "2026-10-20"
  }
}
```

`birthDate` est une date complète de calendrier `YYYY-MM-DD`, sans heure ni fuseau. `estimatedAge` conserve des années entières non négatives, de 0 à 11 mois, et une date locale de déclaration `recordedOn`. Les deux informations représentent des alternatives : l’éditeur conserve la date complète ou l’âge estimé, sans calculer de date de naissance à partir d’une estimation. Les propriétés peuvent être absentes ou nulles ; laisser les champs de saisie vides ne bloque pas l’enregistrement. Aucun âge minimal ni naissance par défaut n’est inventé.

`AniMoiPetAge` valide les valeurs et calcule la présentation sans modifier le profil. L’âge d’une naissance complète évolue avec la date locale actuelle, sans mutation de données. Les années sont affichées, avec les mois pour les jeunes animaux et les jours pour les tout jeunes si cela est pertinent ; les unités sont localisées avec `Intl`. Une estimation conserve la valeur déclarée et ne génère pas de jour anniversaire.

L’éditeur et les écritures/imports refusent les dates futures ou impossibles. La lecture de profils déjà présents reste tolérante à une date devenue future à cause d’un changement d’horloge ou de fuseau de l’appareil : elle ne remplace pas les données, et une correction explicite reste nécessaire pour une nouvelle date invalide.

Le message anniversaire dépend du jour et du mois locaux, uniquement pour une naissance complète. **Les animaux nés le 29 février sont célébrés le 29 février en année bissextile et le 28 février les autres années.** Le message n’est pas une donnée persistée ; il est recalculé et disparaît le lendemain. Aucune écriture de stockage n’est nécessaire pour faire évoluer l’âge ou l’affichage anniversaire.

Les profils historiques dépourvus de ces propriétés restent inchangés. Modifier un autre champ ne crée pas implicitement de date, d’estimation ou de migration. Les propriétés complètes du profil, y compris les extensions compatibles, les caractéristiques, photos et données d’âge, sont exportées/restaurées dans le format JSON existant. Ces champs pourront être transportés par une future API de synchronisation ; aucune connexion ni modification Neon n’est introduite.

## Histoires et publications

La rédaction comporte deux écrans dans l’onglet Animaux : l’anecdote de l’humain avec le ton et la rubrique, puis un communiqué directement éditable. Les hashtags font partie du texte enregistré. La première génération propose toujours `#Animoi`, puis les libellés `hashtags.life` et `hashtags.species.*` issus du catalogue de la langue de l’interface, indépendamment de la langue du récit et du pays. Par exemple : `#Animoi #VieDAnimal #Chien` en français, `#Animoi #AnimalLife #Dog` en anglais. Les huit espèces sont couvertes dans les cinq catalogues.

Seuls les libellés automatiquement proposés d’un nouveau brouillon peuvent suivre un changement de langue. La provenance de ces deux propositions reste temporairement en mémoire et n’est jamais exportée. Une suppression, un renommage ou un déplacement volontaire retire cette provenance : les hashtags personnels ne sont ni traduits ni réimposés. La déduplication préserve le choix de l’auteur. Changer de langue, ouvrir une publication existante ou préparer une traduction pour un lecteur ne réécrit jamais les hashtags enregistrés. Le format des profils, publications et sauvegardes reste inchangé.

L’action Modifier d’une publication réouvre son objet d’origine : elle conserve `id`, `petId`, la date de création et les propriétés compatibles existantes. L’enregistrement corrige l’objet au lieu d’ajouter une copie. Le champ `editedAt` n’est ajouté qu’après une modification effective ; aucune réécriture n’est nécessaire à l’ouverture de l’éditeur ou lorsque le texte reste inchangé. Le profil actif et l’identifiant de la publication sont vérifiés avant l’écriture ; une publication manquante, attribuée à un autre animal ou modifiée entre-temps ne doit pas être écrasée silencieusement.

La suppression individuelle dispose de sa propre confirmation et d’une sauvegarde JSON facultative. `deletePost(id, petId, expectedPost?)` relit l’objet courant, exige la même publication et le même animal et contrôle le snapshot JSON facultatif avant de supprimer un seul objet. Une erreur `post.missing` ou `post.changed` impose de relire la publication ; une erreur d’écriture récupère l’état précédent via le journal. Aucun profil ni autre histoire n’est supprimé. Les listes et compteurs sont actualisés sans rechargement de la page. La vérification d’identité serveur reste une responsabilité de la future API ; le périmètre actuel est le stockage local privé.

La préférence facultative `settings.autoTranslate` et les commandes de lecture sont décrites dans [ARCHITECTURE-MULTILINGUE.md](ARCHITECTURE-MULTILINGUE.md). Aucun moteur n’est configuré. Les éventuelles traductions restent des vues temporaires ; l’original, ses hashtags et les sauvegardes ne sont jamais remplacés par une traduction.

`originalLanguage` reste une métadonnée interne, sans sélecteur technique dans le parcours. La détection conservatrice hors ligne reconnaît les cinq langues prises en charge à partir de l’anecdote, et utilise la langue de l’interface en cas d’incertitude. Les gabarits locaux rédigent le cadre à la première personne dans cette langue, en conservant la citation de l’anecdote originale sans traduction. Aucun `sourceLanguage` ni `sourceStory` supplémentaire n’est enregistré. En modification, une publication conserve sa langue tant que son texte ne change pas ; un texte corrigé est redétecté avec la langue précédente comme repli. Ce repli conserve également les valeurs historiques BCP 47 telles que `pt-BR` ou la langue indéterminée `und` si les nouveaux indices restent insuffisants ; ouvrir l’éditeur ne réécrit aucune de ces métadonnées. La détection reste heuristique : elle ne fournit pas une reconnaissance linguistique universelle.

Le partage utilise exactement le texte et les hashtags validés par le propriétaire, sans imposer d’image ni de réseau social. La Web Share API ouvre les applications proposées par le téléphone ; une solution de copie est disponible si elle n’est pas prise en charge. Une annulation native ne déclenche pas de copie automatique. Les outils d’image existants sont regroupés dans un panneau facultatif replié.

## Sauvegardes

Les exports JSON restent au format AniMoi version 2 et contiennent les objets complets. Les restaurations version 1 et 2 acceptent aussi les anciens profils dépourvus de caractéristiques. Un objet structuré invalide fait refuser l’ensemble du fichier avant écriture ; le journal existant protège les opérations contre un échec d’écriture. La restauration nécessite confirmation dans l’interface et ne réactive aucun consentement d’apprentissage.

## Contexte de reformulation

`AniMoiCharacteristics.toAIContext(pet, locale)` fournit un objet local comportant l’espèce, les identifiants stables, l’origine principale, les libellés disponibles, l’espèce précise active, les traits personnalisés, jusqu’à trois dominantes et les anciens textes. `temperament.dominantLabels` expose les priorités choisies ; `temperament.prioritizedLabels` place ces traits avant les autres sans supprimer de sélection. Les libellés peuvent changer de langue sans changer les choix enregistrés. Les reformulations locales utilisent des gabarits dans les cinq langues prises en charge et les traits sélectionnés, sans traduire automatiquement les textes libres ou l’anecdote originale.

Le contexte harmonise les anciens statuts vers les trois choix actuels et exclut l’archive des origines inactives. Celle-ci reste conservée dans le stockage et les sauvegardes, mais ne représente pas une race actuellement déclarée pour une future reformulation.

Ce contrat peut ensuite être transmis par une API sécurisée à un modèle multilingue. Il n’effectue actuellement aucun appel réseau, entraînement, traduction ou collecte de corrections. L’introduction d’un serveur ne devra pas supprimer les champs historiques ni les extensions compatibles.

## Livraison

Ces modifications sont préparées sur `feature/animoi-v2-stable`. Aucun déploiement n’est autorisé par leur seule validation. Une mise à jour ultérieure devra réutiliser exclusivement le site privé existant, son URL HTTPS et ses restrictions d’accès, après accord explicite pour ce déploiement. Voir `AGENTS.md`.
