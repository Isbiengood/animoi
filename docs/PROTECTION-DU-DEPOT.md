# Protection du dépôt public et préparation du serveur privé

Le dépôt `Isbiengood/animoi` reste public pour l’interface et GitHub Pages. La préparation se fait sur `feature/animoi-v2-stable`, sans commit/push, fusion, changement de visibilité ou modification de V10. Le futur serveur est dans **`/workspace/animoi-server`**, hors de l’arborescence publique. Ce dossier n’est pas un dépôt Git initialisé et n’a pas de dépôt GitHub distant.

## Protections préparées

Le `.gitignore` exclut `.env*`, `.dev.vars*`, credentials et clés, configurations locales, dépendances, caches, sorties de build, rapports locaux, sauvegardes et dossiers serveur privés placés accidentellement à la racine. `.env.example`, `.env.production.example` et `.dev.vars.example` restent versionnables et doivent être vides de secrets. Les fixtures JSON et catalogues existants restent versionnables. Les fichiers déjà suivis ne sont pas désindexés ou supprimés.

L’exemple `.env.example` du dépôt public ne propose qu’une future adresse API publique vide. Il n’est pas utilisé par V10. Un secret ne doit jamais être placé dans une variable navigateur, y compris avec un préfixe `VITE_`, `NEXT_PUBLIC_` ou équivalent. Un fichier ignoré peut encore être chargé par un outil de build et injecté dans du JavaScript : **Git ignore et sécurité des bundles sont deux contrôles distincts**.

Contrôle supplémentaire disponible :

```sh
node scripts/check-public-assets.cjs
# Pour un futur répertoire d’artefacts prêt à publier :
node scripts/check-public-assets.cjs /chemin/vers/les/artefacts
node tests/repository-protection.test.cjs
```

Il bloque des formats de tokens, secrets littéraux, URL de connexion contenant des identifiants, références de variables secrètes navigateur, fichiers privés, dossiers serveur et liens symboliques dans les artefacts. Il ne journalise jamais la valeur détectée. Il faut également un scanner spécialisé (par exemple Gitleaks), une revue des fichiers à commettre et une revue de l’artefact final. Le contrôle est fourni, **pas encore ajouté à un pipeline de publication** : aucun workflow ni déploiement existant n’est modifié.

Aucun motif ne peut prouver l’absence de toute clé arbitraire ou volontairement dissimulée. `git add -f` peut contourner `.gitignore` ; un secret dans un fichier d’exemple ou renommé reste un secret. Ne pas considérer un dépôt privé comme un coffre. La garantie recherchée repose surtout sur le fait de **ne jamais donner les secrets au code client**, d’utiliser les bindings serveur, et de contrôler les sources puis le résultat du build avant publication.

## Historique

L’audit précédent a examiné 56 commits accessibles, 61 blobs historiques distincts et les fichiers locaux. Aucun secret confirmé ; les alertes concernaient le nom de stockage `animoi-pets-v1`, qui reste inchangé. Une actualisation en lecture seule du miroir GitHub est effectuée pour cette livraison et le scan est relancé sur l’historique et les nouveaux fichiers.

Le `.gitignore` ne nettoie pas un historique et ne révoque pas un identifiant déjà exposé. En cas de fuite : révoquer/faire tourner d’abord le secret chez le fournisseur, puis évaluer séparément la suppression et une éventuelle réécriture d’historique. Ne pas réécrire main ou affecter PR #3 sans accord. Copies externes, références supprimées côté GitHub et journaux d’hébergement restent hors de portée d’un simple scan local.

## Création GitHub — instructions, non exécutées

À exécuter **après l’accord explicite de création** :

1. Sur GitHub, connecté à `Isbiengood`, choisir **+ → New repository**.
2. Nommer le dépôt **`animoi-server`**, choisir **Private** et vérifier le propriétaire. Ne pas utiliser le dépôt public comme template ni en recopier tout l’historique.
3. Garder le dépôt initialement vide : pas de README, licence ou `.gitignore` générés, puisque les fichiers locaux sont déjà préparés. Ne pas choisir GitHub Pro : les dépôts privés sont disponibles avec GitHub Free.
4. Après création, vérifier l’étiquette **Private**. Ne pas activer Pages, Actions de déploiement ou publication automatique.
5. Dans l’installation GitHub utilisée par Codex, autoriser seulement ce nouveau dépôt en plus des dépôts nécessaires. L’autorisation du dépôt n’est pas une autorisation de lire des secrets ou de déployer.
6. Faire contrôler le contenu local puis initialiser/pousser ce **seul dossier serveur** vers ce **seul dépôt privé**, dans une intervention autorisée. Ne pas téléverser tout `/workspace`, le dépôt public, des sauvegardes ou les dossiers d’audit. Le champ `private:true` de `package.json` protège d’une publication npm accidentelle, **pas** de la visibilité GitHub : sélectionner Private reste indispensable.

Source : [création d’un dépôt GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository), [GitHub Free et dépôts privés](https://docs.github.com/en/get-started/learning-about-github/githubs-plans).

## Cloudflare — préparer un compte Free sans activer l’essai

Le choix **Workers AI / `@cf/qwen/qwen3-30b-a3b-fp8`** est retenu. Aucun appel, compte, Worker ou secret n’est créé par ces instructions.

Lors de la préparation manuelle autorisée :

1. Se connecter ou créer le compte gratuit Cloudflare, vérifier son adresse et activer une authentification forte. Le domaine du site V10 n’a pas à être transféré et ses DNS ne doivent pas être changés.
2. Vérifier que **Workers & Pages est sur Free** et qu’aucune facturation Workers Paid, recharge automatique ou crédit Gateway payant n’est activé. Si le compte est déjà payant ou si l’interface exige un moyen de paiement pour l’essai choisi, s’arrêter pour examiner la situation ; ne pas se fier uniquement à un plafond applicatif.
3. Consulter **Workers AI**, le catalogue du modèle et la consommation quotidienne. Ne pas lancer le Playground : cela transmettrait déjà une requête d’inférence. La documentation annonce 10 000 neurones gratuits/jour, partagés et réinitialisés à 00:00 UTC ; sur Free le dépassement doit bloquer, sans passage automatique au payant.
4. Ne pas utiliser **Create and deploy**, un template ou un « Hello World » maintenant : ces parcours peuvent publier immédiatement une nouvelle adresse. Ne pas connecter GitHub à un build automatique. Aucun Worker de test ni nouveau domaine n’est nécessaire à cette préparation.
5. Après autorisation distincte de l’essai : déterminer l’authentification serveur, les compteurs partagés et le mécanisme d’accès privé avant publication d’un endpoint. Ajouter le binding **Workers AI → `AI`** au Worker autorisé, plutôt qu’une clé IA dans le navigateur. Le dossier contient seulement `wrangler.example.jsonc`, désactivé, pas une configuration active.
6. Pour les éventuels secrets serveur : utiliser la section Secrets de l’hébergeur (ou l’outil autorisé), permissions minimales ; ne jamais les coller dans le chat, Git, les exemples, une URL, les variables navigateur ou les logs. Le token de déploiement est distinct du binding IA et n’est pas nécessaire aux tests locaux actuels.
7. Démarrer ensuite seulement quelques anecdotes fictives, sans photo ni donnée personnelle, dans un environnement isolé. Mesurer les tokens/neurones, erreurs et qualité avant la matrice complète. L’intégration et le déploiement de V10 nécessitent encore un accord séparé.

Sources vérifiées le 21 octobre 2026 : [Workers AI : démarrage](https://developers.cloudflare.com/workers-ai/get-started/), [quota gratuit et facturation](https://developers.cloudflare.com/workers-ai/platform/pricing/), [binding serveur](https://developers.cloudflare.com/workers-ai/configuration/bindings/), [secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Ce qui reste à développer avant un appel réel

- Authentification serveur cryptographique avec vérification des sessions, émetteur, audience, expiration et droits ; aucun identifiant du JSON client n’est une preuve d’identité.
- Compteurs **atomiques, persistants et partagés** pour les quotas individuels et globaux, concurrence, doubles touchers et idempotence. Le plafond préparé de 9 000 neurones/jour réserve une marge sur le gratuit ; il doit tenir compte des autres usages du compte et des consommations réellement mesurées. Le quota fournisseur est le dernier garde-fou.
- Validation des tailles, estimation comptable prudente, délai d’appel, modèle autorisé, aucune relance ni bascule payante automatique. Consommation inconnue : bloquer/reconcilier, ne pas recréditer arbitrairement.
- Connexion du fournisseur remplaçable, validation des sorties et brouillons modifiables. Traduction et illustration séparées, original/hashtags conservés et Gazette jamais publiée automatiquement.

Le squelette local renvoie **503, service non activé**, même avec un drapeau d’activation : il ne peut pas appeler Cloudflare. Les tests vérifient les contrats, pas une authentification réelle ou un quota de production. Les 240 cas fictifs et les préparations de comparaison existantes sont inchangés.
