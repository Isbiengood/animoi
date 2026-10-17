(()=>{'use strict';
const $=id=>document.getElementById(id);
const main=document.querySelector('main');
const sections=[...main.querySelectorAll(':scope > section.panel')];
if(sections.length<3)return;
const [profile,composer,preview]=sections;
const style=document.createElement('style');style.textContent='.v2-screen[hidden]{display:none!important}.v2-nav{display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap}.v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v2-card{border:1px solid #e5d9f4;background:#faf7ff;padding:12px;border-radius:16px;color:#252037;text-align:left;cursor:pointer}.v2-card img,.v2-emoji{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#eee7fa;display:grid;place-items:center;font-size:50px}.v2-card strong{display:block;margin-top:8px}.v2-post{border:1px solid #e8ddf6;padding:13px;border-radius:12px;margin:10px 0;white-space:pre-wrap;overflow-wrap:anywhere}.v2-muted{font-size:13px;color:#766b84}@media(min-width:600px){.v2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';document.head.append(style);
function el(tag,txt,cls){const n=document.createElement(tag);if(txt!==null)n.textContent=txt;if(cls)n.className=cls;return n}
function button(text,cb,secondary=false){const b=el('button',text,secondary?'secondary':'');b.type='button';b.onclick=cb;return b}
function section(){const n=el('section',null,'panel v2-screen');main.insertBefore(n,profile);return n}
const home=section(),animal=section();
for(const s of [profile,composer,preview])s.classList.add('v2-screen');
const nav=el('nav',null,'v2-nav');nav.setAttribute('aria-label','Navigation Ani’Moi');main.insertBefore(nav,home);
nav.append(button('🏠 Mes animaux',()=>show(home),true),button('✏️ Gérer les profils',()=>openEditProfile(),true));
home.append(el('h2','Quel animal prend la parole ? 🐾'));
const cards=el('div',null,'v2-grid');home.append(cards,el('p','Les données restent sur ton appareil.','v2-muted'),button('+ Ajouter un animal',()=>{$('newPet').click();show(profile)}));
animal.append(button('← Mes animaux',()=>show(home),true));
const summary=el('div');summary.style.marginTop='18px';animal.append(summary);
animal.append(button('✍️ Nouvelle histoire',()=>{$('story').value='';$('editPost').value='';$('output').textContent='Raconte une anecdote, choisis son ton et génère ta première publication.';$('cardCanvas').style.display='none';$('downloadArea').style.display='none';show(composer)}),button('Modifier le profil',()=>openEditProfile(),true),el('h2','Ses publications'));
const history=el('div');animal.append(history);
composer.insertBefore(button('← Retour au profil',()=>show(animal),true),composer.firstChild);
preview.insertBefore(button('← Corriger mon histoire',()=>show(composer),true),preview.firstChild);
const saveBtn=button('✅ Valider et enregistrer',savePost);$('copy').parentNode.insertBefore(saveBtn,$('copy'));
const POST_KEY='animoi-posts-v2';let posts=[];try{const a=JSON.parse(localStorage.getItem(POST_KEY)||'[]');if(Array.isArray(a))posts=a}catch{}
function pets(){try{const a=JSON.parse(localStorage.getItem('animoi-pets-v1')||'[]');return Array.isArray(a)?a:[]}catch{return []}}
let active=null;
const profileTitle=profile.querySelector('h2');
const animalSelectLabel=profile.querySelector('label[for="animalSelect"]');
function setProfileMode(mode){
 const creating=mode==='new';
 profileTitle.textContent=creating?'Ajouter un nouvel animal 🐾':'Modifier le profil de ton animal';
 animalSelectLabel.textContent='Choisir un profil existant';
 animalSelectLabel.hidden=creating;
 $('animalSelect').hidden=creating;
 $('newPet').hidden=creating;
 $('deletePet').hidden=creating;
 $('savePet').textContent=creating?'Ajouter cet animal':'Enregistrer les modifications';
}
function openEditProfile(){
 const existing=pets().find(p=>p.id===active)||pets().find(p=>p.id===$('animalSelect').value)||pets()[0];
 if(!existing){$('newPet').click();show(profile);return}
 $('animalSelect').value=existing.id;
 $('animalSelect').dispatchEvent(new Event('change'));
 setProfileMode('edit');
 show(profile);
}
function show(screen){for(const s of [home,animal,profile,composer,preview])s.hidden=s!==screen;window.scrollTo(0,0)}
function renderHome(){cards.replaceChildren();for(const p of pets()){const card=el('button',null,'v2-card');if(p.photo){const img=el('img');img.src=p.photo;img.alt='Photo de '+p.name;card.append(img)}else card.append(el('div','🐾','v2-emoji'));card.append(el('strong',p.name),el('small',[p.species,p.breed].filter(Boolean).join(' · ')));card.onclick=()=>choose(p);cards.append(card)}}
function choose(p){active=p.id;$('animalSelect').value=p.id;$('animalSelect').dispatchEvent(new Event('change'));renderAnimal();show(animal)}
function renderAnimal(){const p=pets().find(p=>p.id===active);if(!p){renderHome();show(home);return}summary.replaceChildren();const head=el('div',null,'animal');if(p.photo){const img=el('img',null,'avatar');img.src=p.photo;img.alt=p.name;head.append(img)}else head.append(el('div','🐾','avatar'));const details=el('div');details.append(el('h2',p.name),el('p',[p.species,p.breed,p.traits].filter(Boolean).join(' · '),'v2-muted'));head.append(details);summary.append(head);history.replaceChildren();const mine=posts.filter(x=>x.petId===active).sort((a,b)=>b.date-a.date);if(!mine.length)history.append(el('p','Pas encore de publication.','v2-muted'));for(const post of mine){const item=el('article',null,'v2-post');item.append(el('small',new Date(post.date).toLocaleDateString('fr-FR'),'v2-muted'),el('p',post.text),button('Réutiliser',()=>{$('editPost').value=post.text;$('output').textContent=post.text;show(preview)},true));history.append(item)}}
function savePost(){const text=$('editPost').value.trim();if(!text)return alert('Le texte est vide.');if(!active)return alert('Sélectionne un animal.');const next=[...posts,{id:'post-'+Date.now(),petId:active,text,date:Date.now()}];try{localStorage.setItem(POST_KEY,JSON.stringify(next))}catch{return alert('Stockage local insuffisant.')}posts=next;renderAnimal();show(animal)}
$('generate').addEventListener('click',()=>{if($('story').value.trim() && $('editPost').value.trim())show(preview)});
$('savePet').addEventListener('click',()=>{renderHome();const p=pets().find(x=>x.id===$('animalSelect').value);if(p)choose(p);else show(home)});
$('deletePet').addEventListener('click',()=>{renderHome();show(home)});
$('newPet').addEventListener('click',()=>{setProfileMode('new');show(profile)});
show(home);renderHome();
})();