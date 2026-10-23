#!/usr/bin/env python3
"""Build the offline Ani'Moi breed catalogue from pinned, openly licensed VBO data.

No dependency, credential, API key or application/user data is required.
Usage: python scripts/import-breeds.py [--input /path/to/vbo-simple.json]
The checked-in Wikidata overlay records the structured names actually inspected.
"""
import argparse
import collections
import hashlib
import json
import pathlib
import re
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = '7c6f8721895b0843d45698e757e08a2a202c684e'
URL = ('https://raw.githubusercontent.com/monarch-initiative/'
       'vertebrate-breed-ontology/' + COMMIT + '/vbo-simple.json')
SHA256 = '7789aae2ea797a0e4a36e76015ab0c71dfe2026e9db3b09a3c23e1e45b180e18'
LANGUAGES = ('fr', 'en', 'es', 'de', 'it')
SPECIES = {
    'Chien': ('dog', 'Dog', 'VBO_0400024'),
    'Chat': ('cat', 'Cat', 'VBO_0400018'),
    'Lapin': ('rabbit', 'Rabbit', 'VBO_0400029'),
    'Cheval': ('horse', 'Horse', 'VBO_0000931'),
}
# Generic statuses belong in the UI's explicit choices, not the breed list.
EXCLUDED = {
    'VBO_0200233', 'VBO_0200393', 'VBO_0200902', 'VBO_0201110',
    'VBO_0100262', 'VBO_0100285', 'VBO_0100335', 'VBO_0100336',
    'VBO_0018054', 'VBO_0018148', 'VBO_0017446', 'VBO_0018150',
    # Additional generic concepts, a coat pattern and a working function.
    'VBO_0200986', 'VBO_0201489', 'VBO_0100309', 'VBO_0100097',
    'VBO_0018180', 'VBO_0018195', 'VBO_0001015', 'VBO_0100282', 'VBO_0200645',
    # Explicit wild taxa incorrectly grouped with domestic breeds by upstream.
    # Do not match words like wolf/lynx/fox globally: many legitimate breeds use them.
    'VBO_0200006', 'VBO_0200729', 'VBO_0201429',
    'VBO_0100029', 'VBO_0100043', 'VBO_0100062', 'VBO_0100098',
    'VBO_0100105', 'VBO_0100133', 'VBO_0100203', 'VBO_0100312', 'VBO_0100220',
    'VBO_0017163', 'VBO_0001055', 'VBO_0001080',
}
DISAMBIGUATORS = re.compile(
    r' \((?:dog breed|dog|cat|chien|chat|gato|perro|razza canina|razza felina|'
    r'raz[aá] de perro|Hunderasse|Katzenrasse|caballo|gatto)\)$', re.I)


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold())
                   if not unicodedata.combining(c) and c.isalnum())


def compact_id(uri):
    return uri.rsplit('/', 1)[-1]


def clean_title(value):
    return DISAMBIGUATORS.sub('', value).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=pathlib.Path, help='Local pinned VBO JSON')
    args = parser.parse_args()
    if args.input:
        raw = args.input.read_bytes()
    else:
        request = urllib.request.Request(URL, headers={'User-Agent': 'AniMoi-catalogue-import/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != SHA256:
        raise SystemExit('Source SHA-256 mismatch; review the new release before importing.')
    graph = json.loads(raw)['graphs'][0]
    nodes = {n['id']: n for n in graph['nodes']}
    children = collections.defaultdict(list)
    for edge in graph['edges']:
        if edge['pred'] == 'is_a':
            children[edge['obj']].append(edge['sub'])
    overlay = json.loads((ROOT / 'scripts/breed-labels-wikidata.json').read_text())
    sources = [{
        'id': 'vbo', 'name': 'Vertebrate Breed Ontology — Monarch Initiative and contributors',
        'url': 'https://github.com/monarch-initiative/vertebrate-breed-ontology',
        'download': URL, 'version': '2026-04-15', 'commit': COMMIT,
        'sha256': digest, 'retrieved': '2026-10-19', 'license': 'CC-BY-4.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
        'modifications': 'Species subset; geographic/general population concepts, generic statuses, a coat/function and explicit wild taxa excluded; same-name entries merged; aliases retained; language labels enriched.'
    }, {
        'id': 'wikidata', 'name': 'Wikidata contributors — structured sitelink names',
        'url': 'https://www.wikidata.org/', 'retrieved': overlay['retrieved'],
        'license': 'CC0-1.0', 'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'policyUrl': 'https://www.wikidata.org/wiki/Wikidata:Licensing',
        'modifications': str(len(overlay['entries'])) + ' inspected common-breed entries; Wikipedia page disambiguators removed. Missing languages use the VBO canonical name, explicitly listed in fallbackLocales.'
    }]
    catalogue = {'version': 1, 'sources': sources, 'species': {}}
    statistics = {}
    used_overlay = set()
    for species, (prefix, english_species, ancestor) in SPECIES.items():
        todo = list(children['http://purl.obolibrary.org/obo/' + ancestor])
        descendants = set()
        while todo:
            node_id = todo.pop()
            if node_id not in descendants:
                descendants.add(node_id)
                todo.extend(children[node_id])
        selected = []
        country_count = 0
        for node_id in sorted(descendants):
            node = nodes[node_id]
            meta = node.get('meta', {})
            if meta.get('deprecated') or compact_id(node_id) in EXCLUDED:
                continue
            if any('breed reported in geographic location' in text or
                   'does not represent individual breeds' in text for text in meta.get('comments', [])):
                country_count += 1
                continue
            suffix = ' (' + english_species + ')'
            default = node['lbl'].removesuffix(suffix)
            synonyms = [s['val'] for s in meta.get('synonyms', []) if s.get('pred') == 'hasExactSynonym']
            common = [s['val'] for s in meta.get('synonyms', [])
                      if s.get('synonymType', '').endswith('#most_common_name')]
            canonical = common[0] if common else default
            selected.append({
                'vboId': compact_id(node_id), 'canonical': canonical,
                'aliases': sorted(set([default, canonical] + synonyms), key=lambda s: (s.casefold(), s)),
            })
        # Merge only identical normalized canonical names within a species.
        # Do not infer synonym equivalences, country equivalences or pedigrees.
        groups = {}
        for entry in selected:
            groups.setdefault(normalize(entry['canonical']), []).append(entry)
        entries = []
        for key in sorted(groups):
            group = sorted(groups[key], key=lambda x: x['vboId'])
            first = group[0]
            ids = {g['vboId'] for g in group}
            aliases = set(a for g in group for a in g['aliases'])
            matches = []
            for row in overlay['entries']:
                if row['species'] != species:
                    continue
                if row.get('vboId'):
                    if row['vboId'] in ids:
                        matches.append(row)
                    continue
                possible = [clean_title(row['title']), clean_title(row['labels'].get('en', ''))]
                possible += [re.sub(r' (?:dog|cat)$', '', x, flags=re.I) for x in possible]
                if key in {normalize(x) for x in possible}:
                    matches.append(row)
            if len(matches) > 1:
                raise SystemExit('Ambiguous Wikidata mapping for ' + first['vboId'])
            row = matches[0] if matches else None
            labels = {}
            fallback = []
            for language in LANGUAGES:
                source_label = row['labels'].get(language) if row else None
                labels[language] = clean_title(source_label) if source_label else first['canonical']
                if not source_label and language != 'en':
                    fallback.append(language)
            aliases.update(labels.values())
            entry = {
                'id': prefix + ':' + first['vboId'], 'labels': labels,
                'aliases': sorted(aliases, key=lambda s: (s.casefold(), s)),
                'canonical': first['canonical'], 'sourceIds': sorted(ids),
                'fallbackLocales': fallback,
            }
            if row:
                entry['wikidataId'] = row['qid']
                used_overlay.add(row['qid'])
            entries.append(entry)
        catalogue['species'][species] = {'kind': 'breed', 'entries': entries}
        statistics[species] = {'descendants': len(descendants), 'geographicExcluded': country_count,
                               'selected': len(selected), 'entries': len(entries)}
    for species in ('Oiseau', 'Poisson', 'Hamster', 'Autre'):
        catalogue['species'][species] = {'kind': 'notApplicable', 'entries': []}
    unused = {r['qid'] for r in overlay['entries']} - used_overlay
    if unused:
        raise SystemExit('Unmapped inspected names: ' + ', '.join(sorted(unused)))
    out = ROOT / 'v2-preview/catalogs/breeds.js'
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        '/* Generated by scripts/import-breeds.py. Do not edit entries by hand.',
        ' * VBO 2026-04-15: Monarch Initiative and contributors, CC-BY-4.0.',
        ' * Common names enriched from Wikidata structured data (CC0-1.0).',
        ' * Attribution, modifications and limits: catalogs/SOURCES.txt. */',
        '(function(root, factory){',
        "  if (typeof module === 'object' && module.exports) module.exports = factory();",
        '  else root.AniMoiBreeds = factory();',
        "})(typeof globalThis !== 'undefined' ? globalThis : this, function(){",
        "  'use strict';",
        '  const catalogue = ' + json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')).replace('},{"id":', '},\n    {"id":') + ';',
        "  function normalize(value){ return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase().replace(/[œ]/g, 'oe').replace(/[æ]/g, 'ae').trim(); }",
        "  function label(entry, locale){ return entry && (entry.labels[locale] || entry.labels.fr || entry.canonical) || ''; }",
        '  function search(species, query, locale){',
        "    const group = catalogue.species[species]; if (!group) return [];",
        "    const terms = normalize(query).split(/\\s+/).filter(Boolean);",
        "    return group.entries.filter(entry => { const text = normalize([entry.canonical, ...Object.values(entry.labels), ...entry.aliases].join(' ')); return terms.every(term => text.includes(term)); }).slice().sort((a, b) => label(a, locale).localeCompare(label(b, locale), locale || 'fr'));",
        '  }',
        '  return Object.assign(catalogue, {normalize, label, search});',
        '});', ''
    ]
    out.write_text('\n'.join(lines))
    print(json.dumps({'sourceSha256': digest, 'species': statistics, 'wikidataEnriched': len(used_overlay),
                      'bytes': out.stat().st_size}, ensure_ascii=False))


if __name__ == '__main__':
    main()
