# Rubriques et présentations Ani’Moi V2

## Périmètre local

La consolidation conserve la navigation **Animaux / Réseau / Compte**, avec les animaux du propriétaire comme accueil. Les quatre univers se trouvent dans Réseau. Ils partagent les profils, les publications, les langues, les médias, les sauvegardes et les commandes de modification, partage et suppression.

Le prototype utilise les données du navigateur. L’accès privé de l’hébergement ne constitue pas un compte applicatif et ne détermine pas l’identité du propriétaire d’une publication.

| Rubrique | Identifiant conservé | Présentation | Champs complémentaires facultatifs |
| --- | --- | --- | --- |
| Pawbook | `pawbook` | Style A, carnet violet : carte arrondie, récit et grande photo facultative. | Titre. |
| SAV des animaux | `sav` | Style B, dossier de réclamation : référence stable et statut humoristique explicitement fictifs. | Objet, statut, réponse humoristique de l’humain. |
| LinkedPaw | `linkedin` | Style B, dossier professionnel imaginaire : promotion, annonce, CV ou offre fictive. | Type de publication, fonction imaginaire. |
| Potins de Gamelle | `potins` | Style C, journal satirique : manchette, grands titres et illustration facultative. | Titre et état d’une proposition éditoriale. |

L’identifiant `linkedin` reste inchangé pour préserver la compatibilité ; traduire un libellé ne renomme pas les valeurs stockées. Les champs d’un univers ne sont pas imposés aux autres. Les textes de CV et d’annonces n’activent aucun service réel de recrutement.

## Composants communs

- `rubrics.js` contient le registre des rubriques, leurs styles, les libellés, la référence SAV et la validation des métadonnées facultatives.
- `publication-card.js` et `publication-card.css` portent le rendu commun et ses quatre variantes. L’historique de l’animal et le Réseau utilisent les mêmes cartes. Les actions disponibles sont fournies par l’écran et réutilisent les protections de la publication ciblée.
- `publication-fields.js` fournit les champs de rubrique, de titre et les champs propres au SAV ou à LinkedPaw, sans modifier le texte de l’histoire.
- `permissions.js` prépare les contrats de droits pour un futur serveur. Il ne fournit ni connexion, ni session, ni sécurité multiutilisateur dans le navigateur.
- `gazette.js` prépare les transitions éditoriales explicites, sans réseau ni publication automatique.
- `data.js` reste la frontière de lecture, écriture, suppression, export et restauration locale. Les photos, le partage et la traduction préparée réutilisent leurs modules existants.

Le composant de lecture conserve l’intégralité de `post.text` dans les données, sans en extraire destructivement un titre ou des hashtags. Il garde le contrôleur de traduction associé à chaque carte ; détruire la carte détruit aussi ce contrôleur pour ignorer les réponses devenues obsolètes.

### Caractères dans les profils, présentation sans énumération

Les cartes des quatre rubriques et l’en-tête de l’historique affichent le nom, l’espèce et éventuellement la race, sans ajouter les traits ou les dominants. La génération n’insère plus les listes « Mon caractère », « My personality », « Mi carácter », « Mein Charakter » ou « Il mio carattere ». Le modèle de profils reste intact : 52 traits, sélections personnalisées, trois dominants, contexte IA et priorités demeurent disponibles.

`AniMoiStoryFormatter.publicationText` est une projection pure de lecture pour les anciens communiqués. Elle exige le cadre connu du gabarit : introduction, rubrique, citation de l’anecdote, identité, liste avec fin reconnue et conclusion. Elle masque seulement l’énumération automatique, conserve la réaction narrative et préserve les séparateurs et hashtags du reste du texte, y compris les fins de ligne CRLF. Elle ne recherche pas des adjectifs à supprimer et n’utilise pas le profil actuel pour deviner le contenu d’une ancienne liste. Un texte libre ou un cadre édité non reconnu est conservé tel quel, pour ne pas censurer une anecdote personnelle.

La lecture, le retour à l’original dans les commandes de traduction, le partage/copie et les cartes image utilisent la même projection. `post.text` n’est jamais réécrit à l’ouverture. L’éditeur privé du propriétaire conserve la source historique complète, ainsi que les exports/restaurations JSON ; un enregistrement sans correction de texte reste strictement identique. Cette limite volontaire évite de perdre silencieusement les passages masqués lors d’une édition. Aucun champ, clé de stockage ou format de sauvegarde n’est modifié ; aucun moteur IA, service ou collecte n’est ajouté.

## Données et compatibilité

Les clés historiques restent :

| Clé | Contenu |
| --- | --- |
| `animoi-pets-v1` | Profils animaux, photos et caractéristiques. |
| `animoi-posts-v2` | Publications et métadonnées complémentaires. |
| `animoi-settings-v1` | Langue et préférences locales. |
| `animoi-transaction-v1` | Journal de récupération d’une écriture interrompue. |

Les exports restent au format JSON version 2 ; les restaurations des versions 1 et 2 restent acceptées. Aucun changement d’origine HTTPS, aucune réinitialisation et aucune migration silencieuse ne sont nécessaires.

Les métadonnées facultatives comprennent `rubric`, `tone`, `title` et `rubricData`. Les détails SAV sont placés dans `rubricData.sav` (`subject`, `status`, `reply`) et les détails professionnels dans `rubricData.linkedin` (`kind`, `role`). Les propriétés supplémentaires compatibles restent conservées. Les données des propositions peuvent porter un objet `editorial` distinct ; il ne constitue pas une preuve d’approbation par un serveur.

La rubrique et le ton des nouvelles histoires viennent du choix explicite à la création. Ils ne sont jamais déduits d’une ancienne histoire. L’absence de ces champs reste valide. Une modification conserve l’identifiant de la publication, son animal et sa date de création ; elle ne crée pas un doublon. Modifier seulement la rubrique, un titre ou une photo ne justifie pas une réécriture du texte, de ses hashtags ou de sa langue d’origine.

Les profils, les photos et les histoires existantes restent conservés, ainsi que les 52 traits de caractère, les trois dominants, les âges et les catalogues. Les quotas du navigateur restent applicables : les médias sont compressés localement et un échec d’écriture doit conserver l’état précédent grâce au journal transactionnel.

## Histoires à classer

Le filtre **À classer** contient uniquement les histoires sans rubrique enregistrée (`rubric` absent ou vide). Une éventuelle rubrique future non comprise par cette version reste conservée et apparaît comme **Rubrique non reconnue** dans Toutes les publications ; elle ne figure pas dans À classer. L’ancien prédicat de compatibilité `isHistorical` reconnaît toujours les formats inconnus pour l’éditeur, tandis que `isUnclassified` définit strictement le filtre.

Le propriétaire peut :

1. Consulter l’histoire ou ouvrir sa modification sans en modifier les données.
2. La laisser à classer, sans lui attribuer automatiquement une rubrique.
3. Choisir volontairement Pawbook, le SAV des animaux ou LinkedPaw.

Potins de Gamelle n’est pas proposé comme classement d’une histoire historique. Aucun mot-clé, hashtag ou formule du récit n’est utilisé pour deviner une rubrique ou un ton. Le texte, les photos, les hashtags, la langue, les dates et les propriétés supplémentaires restent conservés. Annuler le classement n’enregistre aucune modification.

Les actions **Classer** et **Changer de rubrique** ouvrent les champs du même éditeur, en ciblant la publication et son animal. Un classement enregistré conserve l’identifiant et retire immédiatement l’histoire de À classer ; elle reste visible dans Toutes les publications et dans la rubrique choisie. Une erreur d’écriture laisse le stockage précédent intact et le brouillon disponible. Lorsque le filtre ne contient aucune histoire, il affiche **Toutes vos histoires sont classées !**. Ces libellés sont traduits dans les cinq catalogues.

**Toutes les publications** inclut les histoires locales accessibles au propriétaire, même ses propositions de Gazette. Les cartes Potins y gardent leurs mentions de proposition privée et leur état local. Le journal approuvé reste un espace séparé : aucun contenu n’est injecté dans une édition publique, même depuis une sauvegarde qui porte un statut `published`.

Une ancienne publication déjà marquée `potins`, sans état éditorial, reste une publication de son propriétaire. Sa lecture ne la transforme ni en proposition soumise, ni en article approuvé, ni en édition de Gazette.

## Hashtags : génération et rétablissement volontaire

La déduplication précédente gardait la première occurrence d’un hashtag dans tout le texte. Une anecdote contenant déjà `#Chien` gardait cette occurrence, mais faisait disparaître le `#Chien` du bloc final généré. Ce cas est reproduit pour les huit espèces et les cinq langues. L’audit ne prouve pas une suppression totale dans les données réelles : les tests ne lisent jamais le stockage des utilisateurs.

`withDefaultHashtags` ne sert qu’à la génération. Il regroupe au pied du nouveau communiqué les trois suggestions sans doublon et conserve la graphie des hashtags provenant du récit. Le mot d’un hashtag regroupé reste dans la phrase sans son signe `#`, pour ne retirer aucun mot du récit. `createHashtagDraft` reçoit aussi le récit source : regrouper un hashtag ne lui retire pas son caractère personnel, et une bascule de langue ne le traduit pas automatiquement. Les autres hashtags personnels, les mots du récit et les fragments d’URL sont conservés. Cette consolidation ne réécrit aucune publication déjà enregistrée.

Dans un éditeur, **Rétablir les hashtags proposés** appelle `restoreSuggestedHashtags`, qui ajoute uniquement les suggestions absentes pour l’espèce et la langue de l’interface. Le helper conserve chaque caractère du préfixe reçu et ne remplace pas les hashtags existants, même s’ils ont une graphie personnelle ou des doublons historiques. L’action n’écrit que dans le brouillon ; l’enregistrement explicite reste nécessaire. Annuler, classer une histoire, changer la langue ou restaurer une sauvegarde ne déclenche aucun rétablissement automatique. Les hashtags finaux restent dans `post.text`, sans nouvelle clé de stockage ni migration de sauvegarde.

## Rôles préparés et protections locales

| Rôle futur | Responsabilité |
| --- | --- |
| Propriétaire (`owner`) | Gérer ses animaux et ses publications, avec contrôle de leur appartenance. |
| Abonné (`subscriber`) | Consulter les contenus autorisés et proposer volontairement un potin. Les interactions multiutilisateurs viendront avec le serveur. |
| Rédacteur en chef (`editor`) | Examiner, demander une révision, refuser, archiver, approuver et publier dans la Gazette selon le circuit éditorial. |

Les garde-fous actuels vérifient l’existence de la publication, son animal et, pour les opérations sensibles, son état attendu. Ils protègent le prototype contre les erreurs d’attribution et les opérations périmées ; ils ne prouvent pas l’identité réelle d’un utilisateur et ne remplacent pas les autorisations côté serveur.

Un futur serveur devra déterminer lui-même le rôle, le compte et le propriétaire depuis des données faisant autorité avant d’appeler la politique de droits. Un rôle, un identifiant ou un indicateur tel que `authorizationVerified` fourni par du JavaScript ou par une sauvegarde JSON n’est pas une authentification. Aucun sélecteur local de rôle ne permet d’activer une véritable rédaction.

Avant toute ouverture publique, les contrôles d’accès et la validation des opérations devront être appliqués côté serveur. Cette étape ne modifie pas Neon et n’installe aucun mécanisme d’authentification.

## Circuit de Potins de Gamelle

Le circuit complet prévu reste séparé du fil ordinaire :

**Proposition volontaire → attente de validation → révision éventuelle → approbation par le rédacteur en chef → publication dans une édition.**

Le refus et l’archivage constituent des issues distinctes. L’approbation et la publication sont deux actions explicites, jamais une transition automatique après un enregistrement.

Le module utilise les états `draft`, `pending`, `revision`, `approved`, `published`, `rejected` et `archived`. Dans le prototype local, le propriétaire peut enregistrer un brouillon, le placer dans une file locale, retirer sa demande pour revenir au brouillon ou l’archiver lorsque l’état l’autorise. Ces commandes ne transmettent rien à une rédaction externe.

La validation et la publication centralisées attendent de vrais comptes et des autorisations serveur. Le prototype ne fabrique pas une édition approuvée à partir des propositions locales ou d’un statut importé. Une sauvegarde indiquant `approved` ou `published` reste une donnée locale ; elle ne prouve aucune validation éditoriale et n’ouvre pas une publication publique.

Les articles d’une future édition seront sélectionnés et approuvés par la rédaction. Les illustrations importées sont facultatives. Les caricatures générées par IA, les votes et les outils complets de préparation des éditions restent des évolutions ultérieures, à valider séparément. Aucun moteur, modèle, abonnement, entraînement ou collecte automatique n’est activé.

## Langues et vérifications

Les libellés des rubriques, les champs spécialisés, les états humoristiques et les messages éditoriaux utilisent les catalogues français, anglais, espagnol, allemand et italien. Les identifiants métier ne sont pas traduits dans le stockage. Changer de langue ne réécrit ni l’histoire ni ses hashtags ; les règles existantes de hashtags proposés pour les nouveaux brouillons restent valables.

Les commandes de test sont recensées dans le README. Les tests unitaires des rubriques et du circuit éditorial vérifient les métadonnées, les états autorisés et le refus des transitions indues. Les tests de données couvrent les restaurations JSON, les publications historiques et la conservation des propriétés. Les parcours Chromium couvrent l’historique de l’animal, Réseau, les quatre rendus, les cinq langues, le classement volontaire et les petits écrans, notamment 320 et 390 px.

Ces vérifications utilisent des profils temporaires et des contenus synthétiques, sans base distante. Une émulation mobile Chromium ne remplace pas un essai sur Safari iPhone réel, notamment pour les photos HEIC et les applications de partage.

Les changements restent locaux jusqu’à une autorisation explicite de mise à jour du site privé habituel. Ils ne modifient ni Neon, ni la V1, ni la branche principale ni la PR #3, et ne créent aucune nouvelle URL.
