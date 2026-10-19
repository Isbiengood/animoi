# Plan de reprise Ani’Moi

## Contraintes conservées

Base fonctionnelle : `v2-preview/`. V1 conservée. Français principal ; langues prévues : français, anglais, espagnol, allemand, italien. Projet Neon existant conservé, administration séparée ; aucune connexion PostgreSQL, création de base ou migration dans cette étape. Toute publication exige l’accord du propriétaire.

## 1. Consolider la V2 locale et préparer le multilingue — étape actuelle

- Synchroniser les sélections et l’attribution des publications ; empêcher la sauvegarde d’un brouillon sous un autre animal.
- Sécuriser suppression, export, restauration et récupération après échec de stockage ; conserver les publications historiques sans profil.
- Harmoniser les espèces et prendre en compte le caractère dans les gabarits français.
- Séparer les catalogues de l’interface du code, introduire un choix de langue local persistant et un repli vers le français.
- Conserver la langue originale de chaque nouveau texte ; les anciens sans métadonnée restent de langue inconnue (`und`). Le choix de langue de l’interface ne change jamais les publications.
- Préparer les contrats de traduction, IA, dictionnaires et consentement, sans appeler ni implémenter ces services.
- Ajouter les tests et documenter les limites. Finir l’extraction des messages secondaires et la traduction/relecture complète des catalogues avant de présenter l’interface comme entièrement disponible dans cinq langues.

## 2. Définir puis connecter les comptes et la persistance distante

Après validation distincte : rapprocher le modèle applicatif du schéma Neon existant avec son administration. Définir API serveur, authentification, permissions par propriétaire, médias et import volontaire des données locales. La préférence `user.language` sera portée par le compte ; actuellement elle appartient seulement au navigateur, puisqu’il n’y a pas de comptes. Prévoir version des données et conflits entre appareils.

## 3. Construire le réseau social et la modération

Profils synchronisés, publications, fil partagé, réactions, commentaires et abonnements. Prévoir signalement, blocage, limites anti-abus, modération humaine et règles applicables aux différentes langues avant l’ouverture publique.

## 4. Ajouter une IA multilingue économique et ouverte

Évaluer des modèles multilingues à code et poids ouverts avec licences compatibles, couvrant FR/EN/ES/DE/IT. Comparer qualité, fidélité à l’anecdote, première personne de l’animal, respect du ton et du caractère, sécurité, latence et coût total d’hébergement. Le choix du modèle sera arrêté après benchmark ; « open source » ne signifie pas coût d’exploitation nul.

Utiliser un adaptateur serveur indépendant du fournisseur/modèle : entrée structurée, langue de sortie explicite, budgets, quotas, limite de longueur, version du modèle et validation humaine avant publication. Les gabarits locaux français restent un secours ; ne jamais étiqueter leur sortie comme anglaise parce que les menus sont anglais.

## 5. Traduire à la demande et enrichir les ressources linguistiques

Traduction déclenchée par le lecteur et affichée séparément, avec accès permanent à l’original et indication claire de traduction. Aucun changement automatique des textes sources. Invalidation d’une traduction si l’original change. Prévoir modération multilingue, cache et quotas.

Ajouter des adaptateurs de dictionnaires libres par langue : sens, variantes, expressions, contexte, vocabulaire animalier et expressions idiomatiques. Sélectionner les ressources après vérification des licences, attribution, redistribution et versions ; aucun dictionnaire n’est téléchargé dans cette étape.

## 6. Apprentissage facultatif et confidentiel

Aucune correction n’est collectée pour l’entraînement dans la V2 actuelle. Prévoir un consentement explicite, distinct de l’enregistrement d’une publication, désactivé par défaut. Présenter les données concernées, la finalité, la durée de conservation et les destinataires avant activation. Une restauration de sauvegarde ne réactive pas le consentement.

Préférer d’abord une personnalisation privée et révocable. Pour un éventuel entraînement mutualisé : sélectionner uniquement les corrections consenties, supprimer les données personnelles et photos non nécessaires, tracer la provenance et la version du consentement, permettre retrait et suppression des exemples avant export/entraînement. Documenter les limites du retrait d’un modèle déjà entraîné ; ne pas promettre un effacement rétroactif automatique des poids. Aucune ingestion implicite des publications privées, aucune transmission à un tiers sans accord correspondant.
