(()=>{'use strict';
const $=id=>document.getElementById(id);
const i18n=AniMoiI18n;
const labels=new Map(Object.entries({
'nav.home':'🏠 Mes animaux','nav.manage':'✏️ Gérer les profils','home.title':'Quel animal prend la parole ? 🐾','home.local':'Les données restent sur ton appareil.','pet.add':'+ Ajouter un animal','pet.back':'← Mes animaux','pet.newStory':'✍️ Nouvelle histoire','pet.edit':'Modifier le profil','pet.posts':'Ses publications','composer.back':'← Retour au profil','preview.back':'← Corriger mon histoire','post.save':'✅ Valider et enregistrer','post.empty':'Pas encore de publication.','post.reuse':'Réutiliser','nav.export':'Exporter mes données','nav.restore':'Restaurer une sauvegarde'
}).map(([key,value])=>[value,key]));
const main=document.querySelector('main');
const sections=[...main.querySelectorAll(':scope > section.panel')];
if(sections.length<3)return;
const [profile,composer,preview]=sections;
const style=document.createElement('style');style.textContent='.v2-screen[hidden]{display:none!important}.v2-nav{display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap}.v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v2-card{border:1px solid #e5d9f4;background:#faf7ff;padding:12px;border-radius:16px;color:#252037;text-align:left;cursor:pointer}.v2-card img,.v2-emoji{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#eee7fa;display:grid;place-items:center;font-size:50px}.v2-card strong{display:block;margin-top:8px}.v2-post{border:1px solid #e8ddf6;padding:13px;border-radius:12px;margin:10px 0;white-space:pre-wrap;overflow-wrap:anywhere}.v2-muted{font-size:13px;color:#766b84}@media(min-width:600px){.v2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';document.head.append(style);
function el(tag,txt,cls){const n=document.createElement(tag);if(txt!==null)n.textContent=txt;if(cls)n.className=cls;return n}
function ui(tag,key,cls){return i18n.bind(el(tag,null,cls),key)}
function button(text,cb,secondary=false){const b=el('button',text,secondary?'secondary':'');if(labels.has(text))i18n.bind(b,labels.get(text));b.type='button';b.onclick=cb;return b}
function section(){const n=el('section',null,'panel v2-screen');main.insertBefore(n,profile);return n}
const home=section(),animal=section();
for(const s of [profile,composer,preview])s.classList.add('v2-screen');
const nav=el('nav',null,'v2-nav');nav.setAttribute('aria-label','Navigation Ani’Moi');main.insertBefore(nav,home);
nav.append(button('🏠 Mes animaux',()=>show(home),true),button('✏️ Gérer les profils',()=>openEditProfile(),true));
home.append(ui('h2','home.title'));
const cards=el('div',null,'v2-grid');home.append(cards,ui('p','home.local','v2-muted'),button('+ Ajouter un animal',()=>{$('newPet').click();show(profile)}));
animal.append(button('← Mes animaux',()=>show(home),true));
const summary=el('div');summary.style.marginTop='18px';animal.append(summary);
animal.append(button('✍️ Nouvelle histoire',()=>{draftPetId=activeId();postLanguage.value='fr';$('story').value='';$('editPost').value='';$('output').textContent='Raconte une anecdote, choisis son ton et génère ta première publication.';$('cardCanvas').style.display='none';$('downloadArea').style.display='none';show(composer)}),button('Modifier le profil',()=>openEditProfile(),true),ui('h2','pet.posts'));
const history=el('div');animal.append(history);
composer.insertBefore(button('← Retour au profil',()=>show(animal),true),composer.firstChild);
preview.insertBefore(button('← Corriger mon histoire',()=>show(composer),true),preview.firstChild);
const saveBtn=button('✅ Valider et enregistrer',savePost);saveBtn.id='savePost';$('copy').parentNode.insertBefore(saveBtn,$('copy'));
let draftPetId=null;
const languageLabel=el('label');languageLabel.htmlFor='interfaceLanguage';i18n.bind(languageLabel,'language.label');
const languageSelect=el('select');languageSelect.id='interfaceLanguage';
const languageNames={fr:'Français',en:'English',es:'Español',de:'Deutsch',it:'Italiano'};
for(const code of i18n.languages){const option=el('option',languageNames[code]||code);option.value=code;languageSelect.append(option)}
languageSelect.value=i18n.locale;nav.prepend(languageLabel,languageSelect);
languageSelect.onchange=()=>{try{const state=AniMoiData.read();AniMoiData.write({...state,settings:{...state.settings,language:languageSelect.value}});i18n.setLocale(languageSelect.value)}catch(error){languageSelect.value=i18n.locale;alert(i18n.t('error.languageSave',{error:error.message}))}};
const postLanguageLabel=el('label');postLanguageLabel.htmlFor='postLanguage';i18n.bind(postLanguageLabel,'language.post');
const postLanguage=el('select');postLanguage.id='postLanguage';
for(const code of ['und',...i18n.languages]){const option=el('option',languageNames[code]||code);option.value=code;if(code==='und')i18n.bind(option,'language.unknown');postLanguage.append(option)}
postLanguage.value='fr';postLanguage.onchange=()=>{$('output').lang=postLanguage.value;$('editPost').lang=postLanguage.value};const languageNotice=el('p',null,'muted');i18n.bind(languageNotice,'language.localNotice');$('editPost').after(postLanguageLabel,postLanguage,languageNotice);
function pets(){return AniMoiData.read().pets}
function activeId(){return $('animalSelect').value}
const profileTitle=profile.querySelector('h2');
const animalSelectLabel=profile.querySelector('label[for="animalSelect"]');
function setProfileMode(mode){
 const creating=mode==='new';
 i18n.bind(profileTitle,creating?'profile.new':'profile.edit');
 i18n.bind(animalSelectLabel,'profile.choose');
 animalSelectLabel.hidden=creating;animalSelectLabel.style.display=creating?'none':'';
 $('animalSelect').hidden=creating;
 $('newPet').hidden=creating;
 $('deletePet').hidden=creating;
 i18n.bind($('savePet'),creating?'profile.create':'profile.save');
}
function openEditProfile(){
 const existing=pets().find(p=>p.id===activeId())||pets()[0];
 if(!existing){$('newPet').click();show(profile);return}
 $('animalSelect').value=existing.id;
 $('animalSelect').dispatchEvent(new Event('change'));
 setProfileMode('edit');
 show(profile);
}
function show(screen){for(const s of [home,animal,profile,composer,preview,...document.querySelectorAll('.community-screen')])s.hidden=s!==screen;window.scrollTo(0,0)}
function renderHome(){cards.replaceChildren();const state=AniMoiData.read();const orphans=state.posts.filter(post=>!state.pets.some(p=>p.id===post.petId));if(orphans.length)cards.append(el('p',`${orphans.length} publication(s) sans profil conservée(s). Exporte tes données pour les sauvegarder.`,'v2-muted'));for(const p of pets()){const card=el('button',null,'v2-card');if(p.photo){const img=el('img');img.src=p.photo;img.alt='Photo de '+p.name;card.append(img)}else card.append(el('div','🐾','v2-emoji'));card.append(el('strong',p.name),el('small',[p.species,p.breed].filter(Boolean).join(' · ')));card.onclick=()=>choose(p);cards.append(card)}}
function choose(p){$('animalSelect').value=p.id;$('animalSelect').dispatchEvent(new Event('change'));renderAnimal();show(animal)}
function renderAnimal(){const p=pets().find(p=>p.id===activeId());if(!p){renderHome();show(home);return}summary.replaceChildren();const head=el('div',null,'animal');if(p.photo){const img=el('img',null,'avatar');img.src=p.photo;img.alt=p.name;head.append(img)}else head.append(el('div','🐾','avatar'));const details=el('div');details.append(el('h2',p.name),el('p',[p.species,p.breed,p.traits].filter(Boolean).join(' · '),'v2-muted'));head.append(details);summary.append(head);history.replaceChildren();const mine=AniMoiData.read().posts.filter(x=>x.petId===activeId()).sort((a,b)=>b.date-a.date);if(!mine.length)history.append(ui('p','post.empty','v2-muted'));for(const post of mine){const item=el('article',null,'v2-post');item.append(el('small',i18n.date(post.date),'v2-muted'),Object.assign(el('p',post.text),{lang:post.originalLanguage||'und'}),button('Réutiliser',()=>{draftPetId=activeId();postLanguage.value=post.originalLanguage||'und';if(!postLanguage.value){const option=el('option',post.originalLanguage);option.value=post.originalLanguage;postLanguage.append(option);postLanguage.value=post.originalLanguage}$('editPost').value=post.text;$('output').textContent=post.text;$('editPost').dispatchEvent(new Event('input'));postLanguage.onchange();updateByline();show(preview)},true));history.append(item)}}
function savePost(){const text=$('editPost').value.trim();if(!text)return alert(i18n.t('error.emptyPost'));if(draftPetId!==activeId())return alert(i18n.t('error.draftAnimal'));if(!pets().some(p=>p.id===activeId()))return alert(i18n.t('error.selectPet'));const next=[...AniMoiData.read().posts,{id:'post-'+crypto.randomUUID(),petId:activeId(),text,originalLanguage:postLanguage.value||'und',date:Date.now()}];try{AniMoiData.write({...AniMoiData.read(),posts:next})}catch(error){return alert('Enregistrement annulé : '+error.message)}renderAnimal();show(animal)}
$('generate').addEventListener('click',()=>{if($('story').value.trim() && $('editPost').value.trim()){draftPetId=activeId();postLanguage.value='fr';postLanguage.onchange();show(preview)}});
$('animalSelect').addEventListener('change',()=>{renderAnimal()});
document.addEventListener('animoi:pet-saved',()=>{renderHome();const p=pets().find(x=>x.id===$('animalSelect').value);if(p)choose(p);else show(home)});
$('deletePet').onclick=()=>{
 const id=activeId(), p=pets().find(p=>p.id===id);if(!p)return;
 const count=AniMoiData.read().posts.filter(post=>post.petId===id).length;
 if(!confirm(`Supprimer ${p.name} et ses ${count} publication(s) ? Une sauvegarde complète sera téléchargée avant suppression. Conserve ce fichier pour pouvoir les restaurer.`))return;
 try {downloadBackup();AniMoiData.deletePet(id);}catch(error){alert('Suppression annulée : '+error.message);return}
 location.reload();
};
$('newPet').addEventListener('click',()=>{setProfileMode('new');show(profile)});
function downloadBackup(){
 const blob=new Blob([AniMoiData.exportData()],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='animoi-sauvegarde-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const restoreInput=el('input');restoreInput.type='file';restoreInput.accept='.json,application/json';restoreInput.hidden=true;nav.append(restoreInput);
nav.append(button('Exporter mes données',()=>{try{downloadBackup()}catch(error){alert(error.message)}},true),button('Restaurer une sauvegarde',()=>restoreInput.click(),true));
restoreInput.onchange=async()=>{
 const file=restoreInput.files[0];if(!file)return;
 try {
 const text=await file.text(), data=JSON.parse(text);
 if(data.app!=='AniMoi'||![1,2].includes(data.version))throw new Error('Format de sauvegarde non reconnu.');
 // Validate the entire file before confirmation or any write.
 AniMoiData.validate(data);
 if(!confirm(`Restaurer ${data.pets.length} profil(s) et ${data.posts.length} publication(s) ? Cela remplace les données locales. Une sauvegarde de l’état actuel sera téléchargée avant remplacement.`))return;
 downloadBackup();AniMoiData.restore(text);location.reload();
 }catch(error){alert('Restauration annulée : '+error.message)}finally{restoreInput.value=''}
};
document.addEventListener('animoi:locale-changed',()=>{renderHome();renderAnimal()});
show(home);renderHome();
})();