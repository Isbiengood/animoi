# Ani’Moi — consolidation locale V2

Ani’Moi est un prototype de réseau social animalier : l’humain raconte une anecdote et son animal prend la parole. `v2-preview/` est la base fonctionnelle retenue. La V1 à la racine reste disponible ; aucune fonctionnalité n’a été retirée.

## Démarrer

Aucun build ni serveur applicatif nécessaire. Depuis ce dossier :

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8000/v2-preview/index.html` (V2) ou `http://127.0.0.1:8000/index.html` (V1). Pour le partage natif hors localhost, utiliser HTTPS. Les capacités de partage dépendent du navigateur et des applications installées.

## Fonctionnalités

- Plusieurs animaux : prénom, espèce, race facultative, caractère et photo compressée.
- Espèces harmonisées : chien, chat, lapin, oiseau, cheval, poisson, hamster et autre.
- Sept tons, quatre rubriques, retouche et publications à la première personne.
- Génération gratuite par gabarits locaux, sans API IA. Le caractère est inclus dans la voix de l’animal ; les traits joueur/énergique, têtu, timide/craintif, calme/doux et curieux ajoutent des réactions dédiées. Les autres traits sont conservés explicitement dans le texte.
- Historique par animal, réutilisation, communautés locales par espèce, hashtags, copie et partage.
- Cartes PNG aux formats 4:5, 9:16 et 1:1 ; texte long poursuivi dans la légende.
- Export JSON et restauration complète des profils, photos et publications.

## Sauvegarde et suppression

Dans la navigation V2, **Exporter mes données** télécharge une sauvegarde JSON versionnée. Ce fichier contient les textes et photos : le conserver dans un endroit privé. Un changement de navigateur, d’origine ou l’effacement des données du site peut rendre les données locales indisponibles.

**Restaurer une sauvegarde** contrôle le format et les données avant écriture, puis demande confirmation du remplacement complet (pas de fusion). L’état actuel est exporté avant remplacement. Une sauvegarde invalide est refusée sans modifier les données. Les publications historiques sans profil sont conservées dans l’export et leur nombre est signalé sur l’accueil.

La suppression d’un animal annonce le nombre de publications associées, demande confirmation, lance un export complet, puis supprime ensemble le profil et ses publications. Vérifier que le navigateur a bien conservé le fichier téléchargé. Pour annuler après coup, restaurer ce fichier : cela remplace l’ensemble des données, y compris les publications créées depuis.

Les écritures des profils, publications et préférences passent par `v2-preview/data.js`. Un journal permet de revenir à l’état précédent si une écriture échoue ; après interruption, il est récupéré au prochain accès. En cas d’échec de récupération, les données et le journal restent disponibles et une erreur est affichée. Les données illisibles ne sont pas remplacées automatiquement par la démonstration. Un ensemble volontairement vide reste vide après rechargement.

Les clés historiques `animoi-pets-v1` et `animoi-posts-v2` sont conservées : pas de migration destructive. V1 et V2 partagent les profils lorsqu’elles sont servies depuis la même origine. La V1 conserve son ancien comportement de suppression ; privilégier la gestion des données dans la V2. Éviter les modifications simultanées dans plusieurs onglets : il n’y a pas encore de gestion des conflits entre onglets.

## Vérifications

Node.js 22+ : tests du stockage, restauration, données invalides, publications orphelines et récupération après échec.

```sh
node tests/data.test.cjs
node tests/i18n.test.cjs
```

Tests des parcours dans Chromium, avec Playwright installé dans l’environnement de développement :

```sh
npm install --no-save --package-lock=false playwright
node tests/browser.cjs
```

Le script lance un serveur sur `127.0.0.1` et utilise `/usr/bin/chromium` par défaut. Définir `CHROMIUM_PATH` pour un autre emplacement. Les tests utilisent un profil de navigateur temporaire et n’accèdent à aucune base. Ils vérifient notamment la sélection, l’attribution des publications, le caractère, les communautés, la sauvegarde, la suppression, la restauration et les cartes PNG.

## Multilingue dès la V2

Le français reste la langue principale. `locales/fr.js`, `en.js`, `es.js`, `de.js` et `it.js` séparent les catalogues de l’interface ; `i18n.js` gère le choix de langue, la liaison des libellés, les dates et le repli vers le français. La navigation et les principales actions sont traduites ; les autres libellés et messages restent français à cette étape. Il ne s’agit pas encore de cinq interfaces intégralement traduites.

La préférence est conservée pour ce navigateur et exportée dans le format de sauvegarde 2. Les sauvegardes de format 1 restent acceptées. La V2 n’a pas encore de comptes : la préférence sera portée par chaque utilisateur après l’introduction de l’authentification.

Les nouvelles publications conservent `originalLanguage` ; les anciennes sans métadonnée restent de langue inconnue. L’interface et le contenu sont indépendants : le générateur local reste français et indique `fr`, même avec des menus anglais. Un texte retouché peut recevoir une langue originale déclarée avant sauvegarde. La restauration ne réactive jamais un consentement d’apprentissage.

Le [plan de reprise](docs/PLAN-REPRISE.md) et l’[architecture multilingue](docs/ARCHITECTURE-MULTILINGUE.md) détaillent l’IA multilingue ouverte, la traduction à la demande, les dictionnaires libres et l’apprentissage facultatif à partir de corrections consenties. Ce sont des contrats futurs : aucun moteur IA, traduction automatique, dictionnaire distant ou collecte de corrections n’est activé.

## Architecture et suite

`data.js` expose le dépôt local (`read`, `write`, `deletePet`, `exportData`, `restore`) et la validation des données. Cette frontière devra être adaptée à une API serveur pour la future synchronisation ; ce n’est pas encore une intégration distante. Les identifiants existants sont conservés pour faciliter une reprise ultérieure.

Le projet Neon existant est conservé et administré séparément. Cette étape ne contient aucun client PostgreSQL, aucune connexion, migration ou création de base. Les comptes, autorisations côté serveur, médias distants, interactions, modération et IA économique restent à développer. Les secrets devront rester dans la configuration du serveur, jamais dans le HTML ou JavaScript public.

Le nom Ani’Moi reste provisoire jusqu’à vérification des marques et domaines. Aucune publication ou mise en ligne automatique n’est prévue par ces scripts.
