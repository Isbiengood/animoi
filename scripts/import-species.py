#!/usr/bin/env python3
"""Rebuild the offline species/variety catalogue from its reviewed nominal data.

This command is deliberately offline: no account, token or user data is read.
Source verification and translation review precede edits to the JSON snapshot.
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
LANGUAGES = ('fr', 'en', 'es', 'de', 'it')


def main():
    snapshot_path = ROOT / 'scripts/species-catalogue-data.json'
    raw = snapshot_path.read_bytes()
    snapshot = json.loads(raw)
    entries = snapshot['entries']
    ids = {entry['id'] for entry in entries}
    by_id = {entry['id']: entry for entry in entries}
    if len(ids) != len(entries):
        raise SystemExit('Duplicate catalogue identifier')
    groups = {name: {'kind': 'species', 'entries': []} for name in ('Poisson', 'Oiseau', 'Hamster')}
    for original in entries:
        entry = dict(original)
        group = entry.pop('group')
        if group not in groups or entry['kind'] not in ('species', 'variety'):
            raise SystemExit('Unsupported group or entry kind')
        if not re.fullmatch(r'Q[1-9][0-9]*', entry['wikidataId']):
            raise SystemExit('Invalid Wikidata identifier')
        if entry['sourceUrl'] != 'https://www.wikidata.org/wiki/' + entry['wikidataId']:
            raise SystemExit('Source and entity identifier mismatch')
        prefix = {'Poisson': 'fish-variety' if entry['kind'] == 'variety' else 'fish',
                  'Oiseau': 'bird', 'Hamster': 'hamster'}[group]
        if entry['id'] != prefix + ':' + entry['wikidataId'] or len(entry['id']) > 120:
            raise SystemExit('Invalid stable identifier or species prefix')
        if not all(isinstance(entry['labels'].get(language), str) and entry['labels'][language].strip()
                   and len(entry['labels'][language]) <= 200
                   and not re.search(r'[\x00-\x1f\x7f]', entry['labels'][language]) for language in LANGUAGES):
            raise SystemExit('Every entry needs all five language labels')
        if not isinstance(entry.get('scientificName'), str) or not entry['scientificName'].strip():
            raise SystemExit('Species and varieties require a verified taxon name')
        if entry['kind'] == 'variety':
            parent = by_id.get(entry.get('varietyOf'))
            if not parent or parent['kind'] != 'species' or parent['group'] != group or parent['scientificName'] != entry['scientificName']:
                raise SystemExit('A variety must reference its included parent species in the same group')
        for name in ['fallbackLocales', 'scientificLabelLocales']:
            if any(language not in LANGUAGES for language in entry.get(name, [])):
                raise SystemExit('Invalid language metadata')
        entry.setdefault('fallbackLocales', [])
        entry['aliases'] = sorted(set(entry.get('aliases', []) + list(entry['labels'].values())
                                      + [entry['scientificName']]), key=lambda text: (text.casefold(), text))
        groups[group]['entries'].append(entry)
    catalogue = {
        'version': 1,
        'sources': [{
            'id': 'wikidata-species', 'name': 'Wikidata contributors — reviewed taxon facts, entity labels and sitelinks',
            'url': 'https://www.wikidata.org/', 'license': 'CC0-1.0',
            'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/',
            'policyUrl': 'https://www.wikidata.org/wiki/Wikidata:Licensing',
            'retrieved': snapshot['consultedAt'], 'snapshotSha256': hashlib.sha256(raw).hexdigest(),
            'licenseScope': 'Wikidata structured data only; this is not a CC0 claim for Commons category wikitext.',
            'modifications': 'Curated companion-animal taxa; species distinguished from domestic varieties; disambiguators removed; verified scientific names retained where a localized vernacular name was unavailable.',
        }, {
            'id': 'commons-vernacular-reference',
            'name': 'Wikimedia Commons contributors — linked vernacular-name displays used for nominal cross-checks',
            'url': 'https://commons.wikimedia.org/wiki/Template:VN',
            'license': 'CC-BY-SA-4.0',
            'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
            'policyUrl': 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
            'role': 'Reference pages for isolated taxonomic and vernacular names; no prose, templates or media reproduced.',
            'licenseScope': 'Commons unstructured text; Wikidata-backed facts in those displays retain their own CC0 provenance.',
            'retrieved': snapshot['consultedAt'],
            'provenanceReviewedAt': snapshot['provenanceReviewedAt'],
        }],
        'taxonomyNotes': snapshot['taxonomyNotes'],
        'species': groups,
    }
    body = json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')).replace('},{"id":', '},\n    {"id":')
    output = '''/* Generated by scripts/import-species.py from reviewed nominal data.
 * Wikidata structured facts are CC0; Commons reference text is separately attributed.
 * Species and varieties are distinct kinds; they are not domestic breeds.
 * Source details, attribution, changes and limits: catalogs/SOURCES.txt. */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AniMoiSpecies = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  const catalogue = ''' + body + ''';
  function normalize(value){ return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').trim(); }
  function label(entry, locale){ return entry && (entry.labels[locale] || entry.labels.fr || entry.scientificName) || ''; }
  function search(species, query, locale){
    const group = catalogue.species[species]; if (!group) return [];
    const terms = normalize(query).split(/\\s+/).filter(Boolean);
    return group.entries.filter(entry => {
      const text = normalize([entry.scientificName, ...Object.values(entry.labels), ...entry.aliases].join(' '));
      return terms.every(term => text.includes(term));
    }).slice().sort((a,b) => label(a,locale).localeCompare(label(b,locale), locale || 'fr'));
  }
  return Object.assign(catalogue, {normalize, label, search});
});
'''
    target = ROOT / 'v2-preview/catalogs/species.js'
    target.write_text(output)
    print(json.dumps({'counts': {name: len(value['entries']) for name, value in groups.items()},
                      'total': len(entries), 'snapshotSha256': hashlib.sha256(raw).hexdigest(),
                      'bytes': target.stat().st_size}))


if __name__ == '__main__':
    main()
