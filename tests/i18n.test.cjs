const {test}=require('node:test');
const assert=require('node:assert/strict');
const i18n=require('../v2-preview/i18n.js');
for(const code of ['fr','en','es','de','it'])require('../v2-preview/locales/'+code+'.js');
test('French default and five separate locale catalogs',()=>{assert.equal(i18n.locale,'fr');assert.deepEqual(i18n.languages,['fr','en','es','de','it']);assert.equal(i18n.t('nav.export'),'Exporter mes données')});
test('locale switching, French fallback and missing key are deterministic',()=>{i18n.setLocale('en');assert.equal(i18n.t('nav.export'),'Export my data');assert.equal(i18n.t('profile.species'),'Espèce');assert.equal(i18n.t('not.a.key'),'not.a.key');assert.equal(i18n.setLocale('unknown'),'fr')});
test('interpolation and adding a language without changing the engine',()=>{i18n.register('pt',{'nav.export':'Exportar dados'});i18n.setLocale('pt');assert.equal(i18n.t('nav.export'),'Exportar dados');assert.equal(i18n.t('error.languageSave',{error:'quota'}),'La langue n’a pas pu être enregistrée : quota');i18n.setLocale('fr')});
test('navigation and explicit deletion wording are translated in all five languages',()=>{const original='Voulez-vous vraiment supprimer Animal test ? Ses publications associées seront également supprimées. Cette action est irréversible sans sauvegarde.';for(const code of ['fr','en','es','de','it']){i18n.setLocale(code);for(const key of ['nav.animals','nav.network','nav.profile','account.preferences','account.data','account.privacy','delete.label','delete.cancel','delete.confirm','delete.backup','network.title'])assert.notEqual(i18n.t(key),key);const message=i18n.t('delete.message',{name:'Animal test'});assert(message.includes('Animal test'));if(code==='fr')assert.equal(message,original);else assert.notEqual(message,original)}i18n.setLocale('fr')});
test('catalogue search, optional origins, custom traits and count labels exist in five languages',()=>{for(const locale of ['fr','en','es','de','it']){i18n.setLocale(locale);for(const key of ['profile.breed','profile.traits','characteristics.breedSearch','characteristics.traitsSearch','characteristics.status.selected','characteristics.status.other','characteristics.status.unknown','characteristics.status.none','characteristics.status.notApplicable','characteristics.addCustomBreed','characteristics.addCustomTrait','characteristics.noPrimary','characteristics.sourcesLink','characteristics.selectionLimit']){assert.notEqual(i18n.t(key),key);assert(i18n.t(key).trim())}for(const key of ['characteristics.moreResults','characteristics.resultCount']){assert(i18n.t(key,{count:23}).includes('23'));assert(!i18n.t(key,{count:23}).includes('{count}'))}}i18n.setLocale('fr')});
test('conditional breed fields and dominant trait choices have their own translations in all five catalogs',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const keys=['characteristics.status.selected','characteristics.status.unknown','characteristics.status.notApplicable','characteristics.knownBreedHint','characteristics.unknownBreedHint','characteristics.noBreedCatalogue','characteristics.speciesDetail','characteristics.speciesDetailHint','characteristics.speciesDetailFishPlaceholder','characteristics.speciesDetailHamsterPlaceholder','characteristics.speciesDetailBirdPlaceholder','characteristics.dominantTitle','characteristics.dominantHint','characteristics.dominantCount','characteristics.dominantLimit','characteristics.dominantEmpty','characteristics.dominantLabel','characteristics.retainedBreedHint','characteristics.speciesSearch','characteristics.speciesSearchPlaceholder','characteristics.speciesCatalogHint','characteristics.speciesCatalogSelected','characteristics.speciesCatalogClear','characteristics.speciesKind','characteristics.varietyKind','characteristics.dominantStarHint','characteristics.dominantAdd','characteristics.dominantRemove'];
 for(const locale of ['fr','en','es','de','it']){
  let messages;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2-preview/locales/'+locale+'.js'),'utf8'),{AniMoiI18n:{register:(code,catalog)=>{assert.equal(code,locale);messages=catalog}}});
  for(const key of keys)assert.equal(typeof messages[key],'string',locale+' must translate '+key);
  assert(messages['characteristics.dominantCount'].includes('{count}'));assert(messages['characteristics.dominantLabel'].includes('{trait}'));for(const key of ['characteristics.dominantAdd','characteristics.dominantRemove'])assert(messages[key].includes('{trait}'));
  i18n.setLocale(locale);assert(i18n.t('characteristics.dominantCount',{count:3}).includes('3'));assert(i18n.t('characteristics.dominantLabel',{trait:'Animal test'}).includes('Animal test'));
  if(locale==='fr')assert.deepEqual(['selected','unknown','notApplicable'].map(status=>messages['characteristics.status.'+status]),['Race connue','Race inconnue','Non pertinent pour cette espèce']);
 }
 i18n.setLocale('fr');
});
test('birthdays, editable stories and optional image tools have explicit five-language catalogs',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const keys=['age.title','age.optional','age.mode','age.unknown','age.birthDate','age.estimatedAge','age.years','age.months','age.calculated','age.estimated','age.invalidDate','age.futureDate','age.invalidEstimate','age.birthday','sharing.shared','sharing.copied','sharing.manual','sharing.empty','composer.selectedAnimal','composer.ready','post.edit','post.update','error.postMissing','error.postChanged','preview.editing','images.optional','images.format','images.feed','images.story','images.square','images.create','images.share','images.note','images.empty','images.continuation','images.ready','images.failed','images.shared','images.saved','images.shareUnavailable','images.tagline'];
 for(const locale of ['fr','en','es','de','it']){
  let catalog;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2-preview/locales/'+locale+'.js'),'utf8'),{AniMoiI18n:{register:(code,messages)=>{assert.equal(code,locale);catalog=messages}}});
  for(const key of keys){assert.equal(typeof catalog[key],'string',locale+' must explicitly translate '+key);assert(catalog[key].trim(),locale+' empty translation '+key)}
  assert(catalog['age.birthday'].includes('{name}'));assert(catalog['composer.selectedAnimal'].includes('{name}'));
  for(const key of ['age.calculated','age.estimated'])assert(catalog[key].includes('{age}'));
 }
});

test('individual post deletion and truthful translation controls are translated without fallback',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const keys=['post.delete','postDelete.title','postDelete.message','postDelete.cancel','postDelete.confirm','postDelete.failed','postDelete.missing','postDelete.changed','postDelete.saved','postDelete.backup','translation.preference','translation.preferenceHint','translation.preferenceError','translation.show','translation.original','translation.unavailable','translation.loading','translation.failed','translation.unchanged','translation.originalVisible','translation.translated'];
 for(const locale of ['fr','en','es','de','it']){
  let catalog;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2-preview/locales/'+locale+'.js'),'utf8'),{AniMoiI18n:{register:(code,messages)=>{assert.equal(code,locale);catalog=messages}}});
  for(const key of keys){assert(Object.hasOwn(catalog,key),locale+' must explicitly translate '+key);assert.equal(typeof catalog[key],'string');assert(catalog[key].trim())}
  assert(catalog['postDelete.message'].includes('{name}'));assert(catalog['postDelete.failed'].includes('{error}'));assert(catalog['translation.preferenceError'].includes('{error}'));assert(catalog['translation.translated'].includes('{language}'));
 }
});

test('international hashtag defaults explicitly translate eight species in all five catalogs',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const species=['dog','cat','bird','rabbit','horse','fish','hamster','other'];
 const expected={fr:['VieDAnimal','Chien','Chat','Oiseau','Lapin','Cheval','Poisson','Hamster','Autre'],en:['AnimalLife','Dog','Cat','Bird','Rabbit','Horse','Fish','Hamster','Other'],es:['VidaAnimal','Perro','Gato','Pajaro','Conejo','Caballo','Pez','Hamster','Otro'],de:['Tierleben','Hund','Katze','Vogel','Kaninchen','Pferd','Fisch','Hamster','Andere'],it:['VitaAnimale','Cane','Gatto','Uccello','Coniglio','Cavallo','Pesce','Criceto','Altro']};
 for(const locale of Object.keys(expected)){
  let catalog;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2-preview/locales/'+locale+'.js'),'utf8'),{AniMoiI18n:{register:(code,messages)=>{assert.equal(code,locale);catalog=messages}}});
  const actual=['hashtags.life',...species.map(key=>'hashtags.species.'+key)].map(key=>{assert(Object.hasOwn(catalog,key),locale+' must explicitly translate '+key);assert.match(catalog[key],/^[A-Za-z][A-Za-z0-9_]*$/,locale+' hashtag must be a bare token without accents, spaces or hash');return catalog[key]});
  assert.deepEqual(actual,expected[locale]);
 }
});
