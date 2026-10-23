# Catalogues d’origines et d’espèces : sources et maintenance

Le catalogue local version 1 contient **2 293 entrées** : **1 418 chiens**, **284 chats**, **194 lapins** et **397 chevaux**. Il sert à décrire les origines déclarées par l’utilisateur. Il inclut des variantes et des croisements nommés et ne certifie ni pedigree ni reconnaissance par un organisme.

## Sources et réutilisation

Le référentiel principal est la [Vertebrate Breed Ontology (VBO)](https://github.com/monarch-initiative/vertebrate-breed-ontology), développée par la Monarch Initiative et ses contributeurs avec la communauté OMIA. Le [projet expose la licence CC-BY 4.0](https://github.com/monarch-initiative/vertebrate-breed-ontology#license) ; cette licence figure aussi dans les métadonnées du fichier réellement téléchargé. La [documentation VBO](https://monarch-initiative.github.io/vertebrate-breed-ontology/) décrit la ressource. La publication scientifique [The Vertebrate Breed Ontology: Toward Effective Breed Data Standardization](https://pmc.ncbi.nlm.nih.gov/articles/PMC12103836/) présente sa construction et ses limites.

L’extraction utilise **VBO 2026-04-15**, fichier `vbo-simple.json` du commit **7c6f8721895b0843d45698e757e08a2a202c684e**, consulté le **2026-10-19** :

- [Fichier source immuable](https://raw.githubusercontent.com/monarch-initiative/vertebrate-breed-ontology/7c6f8721895b0843d45698e757e08a2a202c684e/vbo-simple.json).
- SHA-256 : `7789aae2ea797a0e4a36e76015ab0c71dfe2026e9db3b09a3c23e1e45b180e18`.
- Attribution conservée : **Monarch Initiative et contributeurs de la Vertebrate Breed Ontology**.
- Licence : [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
- Modifications : sélection par espèce, filtrage, fusion limitée des doublons, alias et enrichissement de certains noms multilingues.

**75 entrées courantes** sont enrichies à partir des titres de liens interlangues structurés des fiches Wikidata, effectivement consultées le **2026-10-19**. Le snapshot `scripts/breed-labels-wikidata.json` conserve chaque QID, son nom et les noms obtenus dans les langues cibles. Les [données structurées Wikidata sont CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Seuls les titres de liens de l’espace principal des entités sont réutilisés, pas les textes de pages de projet. Les précisions génériques d’homonymie, comme « (chien) », sont retirées ; les distinctions utiles, comme « (Malinois) », sont conservées.

Les standards, descriptions, images et logos de FCI, AKC, LOOF et autres organismes ne sont pas copiés. Leurs pages peuvent être référencées dans VBO, mais l’import Ani’Moi se limite aux noms et synonymes distribués par VBO sous sa licence.

Une attribution consultable hors ligne est livrée dans **`v2-preview/catalogs/SOURCES.txt`**. Elle doit accompagner toute copie du catalogue et reste accessible par un lien de la fiche. L’attribution dans `breeds.js` et dans `AniMoiBreeds.sources` permet aussi de retrouver la provenance sans ce document.

## Extraction reproductible

Le script n’utilise que Python 3 et sa bibliothèque standard :

```sh
python scripts/import-breeds.py
# Pour reproduire sans accès réseau, avec le même fichier déjà téléchargé :
python scripts/import-breeds.py --input /chemin/vers/vbo-simple.json
```

Il vérifie impérativement le SHA-256 épinglé, parcourt les relations `is_a`, puis génère uniquement `v2-preview/catalogs/breeds.js`. Il ne lit aucun profil ni sauvegarde et ne contacte aucune base de données. Le complément Wikidata est un snapshot relu et versionné, utilisé hors ligne par le script ; il ne prétend pas avoir exécuté une requête SPARQL globale.

| Espèce | Racine VBO | Descendants bruts | Populations géographiques écartées | Entrées finales |
| --- | --- | ---: | ---: | ---: |
| Chien | VBO_0400024 | 1 537 | 109 | 1 418 |
| Chat | VBO_0400018 | 303 | 0 | 284 |
| Lapin | VBO_0400029 | 914 | 713 | 194 |
| Cheval | VBO_0000931 | 2 026 | 1 621 | 397 |

Les termes obsolètes, 21 statuts ou concepts génériques (dont une fonction et un patron de robe) et 15 taxons sauvages mal classés en amont sont également écartés. La liste d’exclusion est explicite : elle préserve les races et croisements dont les noms contiennent « wolf », « lynx » ou « fox ». Les trois choix visibles sont « Race connue », « Race inconnue » et « Non pertinent pour cette espèce ». Les anciens statuts « Autre » et « Sans race définie » restent lisibles pour la compatibilité des profils et sauvegardes. Les populations géographiques portent dans VBO un commentaire spécifique à DAD-IS : elles sont exclues pour éviter de confondre une population nationale et une race générale. Le commentaire « does not represent individual breeds » sert aussi à écarter les concepts de population générale. Les entrées portant exactement le même nom canonique normalisé dans une espèce sont fusionnées ; les identifiants sources et leurs synonymes sont conservés. Aucun rapprochement sémantique de noms différents n’est effectué.

## Contrat technique et langues

`breeds.js` expose le même objet en UMD dans le navigateur (`AniMoiBreeds`) et en CommonJS. Aucun réseau n’est utilisé à l’exécution.

- `version: 1`, `sources` et `species` décrivent le snapshot.
- `species.Chien`, `.Chat`, `.Lapin` et `.Cheval` portent `kind: 'breed'` et leurs `entries`.
- Dans ce module de races, les anciennes rubriques `Oiseau`, `Poisson`, `Hamster` et `Autre` restent `kind: 'notApplicable'`. Les listes réelles d’espèces et de variétés d’oiseaux, poissons et hamsters sont livrées séparément dans `species.js`, décrit ci-dessous ; aucune race de mammifère domestique n’est imposée à ces groupes.
- Chaque entrée porte un identifiant stable préfixé par espèce, par exemple `dog:VBO_0200577`, ses `labels.fr/en/es/de/it`, `aliases`, `canonical`, `sourceIds`, `fallbackLocales`, et, s’il est disponible, `wikidataId`.
- Les noms canoniques et tous les synonymes exacts VBO restent recherchables, même lorsqu’un nom de présentation est traduit.
- `normalize`, `label` et `search` sont des aides sans état ; la recherche ignore la casse et les principaux accents.

**L’enrichissement des noms de races reste partiel.** Les cinq langues ont un libellé par entrée, mais un nom localisé absent de la source utilise explicitement le nom canonique VBO ; `fallbackLocales` l’indique. Beaucoup de noms sont internationaux ou propres à un pays. Ces replis ne sont pas des traductions validées. Aucune traduction automatique ni déduction d’une race à partir d’une photo n’est implémentée.

Les identifiants servent aux sélections structurées et à leur future exploitation par un moteur IA. Le catalogue ne doit jamais être utilisé pour attribuer automatiquement un caractère, une aptitude ou une santé à un animal.

## Limites et mises à jour

La couverture est large mais communautaire, **non exhaustive et non officielle**. Elle peut contenir des appellations historiques, variantes ou synonymes proches et des erreurs de source. Certaines races locales uniquement représentées par des populations nationales sont absentes. Les données personnelles existantes et les valeurs libres doivent rester conservées même si leur libellé ne figure pas au catalogue.

Pour actualiser : examiner une nouvelle version VBO et sa licence, épingler son commit et son hash, comparer les identifiants et les comptages, relire les enrichissements, régénérer, puis actualiser les notices d’attribution. Ne jamais réaffecter un ancien identifiant à une autre race ni faire disparaître automatiquement des origines sauvegardées. Les évolutions de libellés ne doivent pas réécrire les anciennes valeurs libres.

La préparation de ce catalogue n’autorise aucun déploiement. La même URL privée et son authentification doivent être conservées, avec accord explicite avant sa prochaine mise à jour.

## Espèces d’oiseaux, poissons et hamsters ; variétés de poissons rouges

Le module **`v2-preview/catalogs/species.js`** complète le référentiel de races sans modifier les 2 293 entrées VBO. Cette sélection pratique comprend **63 entrées** :

| Rubrique | Espèces | Variétés domestiques | Total |
| --- | ---: | ---: | ---: |
| Poisson | 31 | 3 | 34 |
| Oiseau | 24 | 0 | 24 |
| Hamster | 5 | 0 | 5 |

Il s’agit d’**espèces**, et, pour Shubunkin, Ranchu et Télescope, de **variétés de l’espèce Carassius auratus**. Une espèce de hamster n’est pas présentée comme une race de chien ou de chat. Les variétés de poissons portent explicitement `kind: 'variety'` et `varietyOf: 'fish:Q123141'` ; les autres entrées portent `kind: 'species'`.

### Source ouverte et vérification

Les identifiants de taxons, noms scientifiques et noms de présentation ont été relus le **19 octobre 2026** à partir des fiches Wikidata et des références nominales Commons conservées dans le snapshot. `sourceUrl` et `wikidataId` identifient chaque entité. Le noyau de données Wikidata comprend les noms de taxon P225, les libellés d’entités et les titres de liens interlangues. Les illustrations, descriptions et conseils d’entretien ne sont pas reproduits.

Source : [Wikidata et ses contributeurs](https://www.wikidata.org/). Licence des données structurées : [CC0 1.0](https://www.wikidata.org/wiki/Wikidata:Licensing), [texte de la licence](https://creativecommons.org/publicdomain/zero/1.0/).

**Distinction vérifiée le 20 octobre 2026 :** une page de catégorie Commons n’est pas globalement sous CC0. La [politique de réutilisation Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) distingue les données structurées et les textes non structurés, ces derniers relevant de CC BY-SA 4.0. Le [modèle VN](https://commons.wikimedia.org/wiki/Template:VN) peut afficher des noms issus des libellés et liens Wikidata, mais accepte aussi des noms saisis manuellement ; le seul lien vers une catégorie ne prouve donc pas une origine P1843. La provenance précédente a été précisée pour ne pas attribuer indûment CC0 à ce wikitexte.

Seuls des noms courts et des faits taxonomiques sont retenus dans le catalogue, pas le texte éditorial, le code des modèles ou les médias de Commons. Les catégories utilisées pour recouper ces noms sont citées individuellement dans la notice hors ligne. `AniMoiSpecies.sources` attribue séparément Wikidata (CC0) et les pages de référence Commons ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) ; `licenseScope` indique à quoi s’applique chaque mention. Cette attribution ne réattribue pas les droits des pages Commons au projet Ani’Moi.


Les noms sont recherchables dans les cinq langues et par nom scientifique ou alias. Lorsqu’aucun nom vernaculaire n’a été vérifié, le nom scientifique universel reste affichable : `scientificLabelLocales` indique les libellés scientifiques déjà présents dans les sources, et `fallbackLocales` indique les replis explicites dus à un nom localisé absent. Les noms propres de variétés peuvent aussi rester identiques d’une langue à l’autre. Le catalogue ne prétend pas fournir une traduction vernaculaire officielle de tous les taxons.

### Contrat et reproduction

Le même objet est disponible en navigateur sous **`AniMoiSpecies`** et avec CommonJS :

- `version: 1`, `sources`, `taxonomyNotes` et `species.Poisson/Oiseau/Hamster.entries`.
- Chaque entrée possède `id`, `kind`, `scientificName`, `labels.fr/en/es/de/it`, `aliases`, `wikidataId`, `sourceUrl` et `fallbackLocales`.
- Les identifiants préfixés restent indépendants des traductions : par exemple `fish:Q549` pour Betta splendens, `bird:Q121221` pour la perruche ondulée et `hamster:Q204175` pour le hamster doré.
- `normalize`, `label` et `search` fournissent les mêmes aides sans état que le catalogue de races.

Le snapshot relu **`scripts/species-catalogue-data.json`** conserve les noms, liens de provenance et notes taxonomiques. Le script suivant régénère le fichier JavaScript **sans réseau ni dépendance externe** :

```sh
python scripts/import-species.py
```

Le générateur vérifie l’unicité des identifiants, les cinq libellés, la correspondance QID/lien de source et les relations variété–espèce. Le SHA-256 du snapshot figure dans `AniMoiSpecies.sources`. Une modification de la source doit être relue avant régénération ; aucun téléchargement de taxonomie n’a lieu dans l’application.

### Distinctions et limites taxonomiques

Le mandarin australien de compagnie est ici **Taeniopygia castanotis**, distinct de **Taeniopygia guttata**, le mandarin de la Sonde. **Serinus canaria** désigne l’espèce du canari ; sa forme domestique n’est pas inventée comme espèce séparée. **Cricetulus griseus** est conservé selon le concept taxonomique vérifié ; certaines classifications utilisent **Cricetulus barabensis griseus**, conservable comme synonyme.

Ces listes sont une sélection non exhaustive et ne recommandent aucune acquisition. Elles servent à décrire des animaux existants ; ni un nom commercial ni une couleur ne suffisent à identifier automatiquement une espèce, un croisement ou une variété. Les hybridations et nouvelles classifications peuvent nécessiter une précision personnalisée. Le choix « Race inconnue », l’absence de race pertinente et les données libres historiques doivent rester possibles.

Les trois variétés de poisson rouge ne deviennent pas des espèces indépendantes. La sélection ne comprend pas de catalogue exhaustif des mutations de couleur ou de plumage ; ces informations peuvent rester des précisions personnalisées jusqu’à un enrichissement sourcé.
