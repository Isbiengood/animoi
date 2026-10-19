const {test}=require('node:test');
const assert=require('node:assert/strict');
const i18n=require('../v2-preview/i18n.js');
for(const code of ['fr','en','es','de','it'])require('../v2-preview/locales/'+code+'.js');
test('French default and five separate locale catalogs',()=>{assert.equal(i18n.locale,'fr');assert.deepEqual(i18n.languages,['fr','en','es','de','it']);assert.equal(i18n.t('nav.export'),'Exporter mes données')});
test('locale switching, French fallback and missing key are deterministic',()=>{i18n.setLocale('en');assert.equal(i18n.t('nav.export'),'Export my data');assert.equal(i18n.t('profile.species'),'Espèce');assert.equal(i18n.t('not.a.key'),'not.a.key');assert.equal(i18n.setLocale('unknown'),'fr')});
test('interpolation and adding a language without changing the engine',()=>{i18n.register('pt',{'nav.export':'Exportar dados'});i18n.setLocale('pt');assert.equal(i18n.t('nav.export'),'Exportar dados');assert.equal(i18n.t('error.languageSave',{error:'quota'}),'La langue n’a pas pu être enregistrée : quota');i18n.setLocale('fr')});
