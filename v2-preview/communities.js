(()=>{'use strict';
const main=document.querySelector('main'),nav=document.querySelector('.v2-nav');
if(!main||!nav)return;
const allScreens=()=>[...main.querySelectorAll(':scope > section.panel')];
const localPets=()=>AniMoiData.read().pets;
const localPosts=()=>AniMoiData.read().posts;
const groups=[
{id:'all',title:'Tous',emoji:'🌍'},
{id:'chien',title:'Chiens',emoji:'🐶'},
{id:'chat',title:'Chats',emoji:'🐱'},
{id:'oiseau',title:'Oiseaux',emoji:'🐦'},
{id:'poisson',title:'Poissons',emoji:'🐠'},
{id:'cheval',title:'Chevaux',emoji:'🐴'},
{id:'hamster',title:'Hamsters',emoji:'🐹'},
{id:'lapin',title:'Lapins',emoji:'🐰'},
{id:'other',title:'Autres',emoji:'🐾'}];
function category(species){
const s=String(species||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
if(['chien','chat','hamster','lapin','poisson','oiseau','cheval'].includes(s))return s;
if(s==='poissons')return 'poisson';if(s==='oiseaux')return 'oiseau';
return 'other';
}
const style=document.createElement('style');
style.textContent='.community-tabs{display:flex;gap:8px;overflow-x:auto;padding:3px 0 12px;scrollbar-width:thin}.community-tabs button{flex:none;white-space:nowrap;padding:10px 13px;border-radius:100px;background:#eee7fa;color:#53328d}.community-tabs button[aria-pressed=true]{background:#6440b5;color:#fff}.community-entry{border:1px solid #e7d9f7;background:#fff;padding:15px;border-radius:16px;margin:12px 0}.community-author{display:flex;align-items:center;gap:11px}.community-author img,.community-author .community-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;background:#eee7fa;display:grid;place-items:center;font-size:27px}.community-story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;margin:13px 0}.community-tag{font-size:13px;color:#6742b8;font-weight:650}.community-empty{padding:22px;border:1px dashed #d7cce9;border-radius:14px;color:#766b84;text-align:center}';
document.head.append(style);
const board=document.createElement('section');
board.className='panel community-screen';
board.hidden=true;
main.insertBefore(board,main.querySelector('section.panel'));
const title=document.createElement('h2');title.textContent='💬 Les communautés Ani’Moi';
const intro=document.createElement('p');intro.className='muted';intro.textContent='Découvre les publications par espèce. Pour cette version de test, seules les histoires enregistrées sur cet appareil sont visibles : aucun réseau public n’est encore connecté.';
const tabs=document.createElement('div');tabs.className='community-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Filtrer les publications par animal');
const count=document.createElement('p');count.className='muted';count.setAttribute('aria-live','polite');
const feed=document.createElement('div');
board.append(title,intro,tabs,count,feed);
let selected='all';
function displayCommunity(){for(const p of allScreens())p.hidden=p!==board;render();window.scrollTo(0,0)}
const button=document.createElement('button');button.type='button';button.className='secondary';AniMoiI18n.bind(button,'nav.communities');button.onclick=displayCommunity;nav.append(button);
function render(){
tabs.replaceChildren();
for(const group of groups){
const b=document.createElement('button');b.type='button';b.textContent=group.emoji+' '+group.title;b.setAttribute('aria-pressed',String(selected===group.id));b.onclick=()=>{selected=group.id;render()};tabs.append(b);
}
const pets=localPets(),posts=localPosts();
const byId=new Map(pets.map(p=>[p.id,p]));
const visible=posts.filter(p=>byId.has(p.petId)).filter(p=>selected==='all'||category(byId.get(p.petId).species)===selected).sort((a,b)=>(Number(b.date)||0)-(Number(a.date)||0));
count.textContent=visible.length+' publication'+(visible.length>1?'s':'')+' enregistrée'+(visible.length>1?'s':'')+' dans ce fil';
feed.replaceChildren();
if(!visible.length){const empty=document.createElement('p');empty.className='community-empty';empty.textContent='Aucune publication ici pour le moment. Crée une histoire pour ton animal, puis valide et enregistre sa publication.';feed.append(empty);return}
for(const post of visible){
const pet=byId.get(post.petId),article=document.createElement('article');article.className='community-entry';
const who=document.createElement('div');who.className='community-author';
if(pet.photo){const img=document.createElement('img');img.src=pet.photo;img.alt='Photo de '+pet.name;who.append(img)}else{const avatar=document.createElement('span');avatar.className='community-avatar';avatar.textContent='🐾';who.append(avatar)}
const desc=document.createElement('div'),name=document.createElement('strong');name.textContent=pet.name||'Animal';const meta=document.createElement('div');meta.className='muted';meta.textContent=[pet.species,AniMoiI18n.date(post.date)].filter(Boolean).join(' · ');desc.append(name,meta);who.append(desc);
const story=document.createElement('p');story.className='community-story';story.textContent=post.text||'';story.lang=post.originalLanguage||'und';
const tags=document.createElement('div');tags.className='community-tag';tags.textContent='#AniMoi #'+(pet.species||'Animaux').replace(/[^a-zA-Z0-9]/g,'');
article.append(who,story,tags);feed.append(article);
}
}
nav.addEventListener('click',e=>{if(e.target!==button&&e.target.closest('button'))board.hidden=true});
document.addEventListener('click',e=>{if(e.target.closest('#savePet,#deletePet'))return;});
render();
})();