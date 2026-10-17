(() => {
'use strict';
const $=id=>document.getElementById(id);
const editor=$('editPost'), feedback=$('feedback'), copy=$('copy'), share=$('share');
if(!editor||!copy||!share)return;
const aliases={'chien':'Chien','chat':'Chat','poisson':'Poisson','poissons':'Poisson','oiseau':'Oiseau','oiseaux':'Oiseau','hamster':'Hamster','lapin':'Lapin','cheval':'Cheval','reptile':'Reptile','tortue':'Reptile','serpent':'Reptile','lézard':'Reptile'};
const speciesTag=species=>{
  const norm=String(species||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return aliases[norm]||'Animaux';
};
window.AniMoiCategories=Object.freeze(['Tous','Chien','Chat','Poisson','Oiseau','Hamster','Lapin','Cheval','Reptile','Animaux']);
function pet(){
  try {
    const animals=JSON.parse(localStorage.getItem('animoi-pets-v1')||'[]');
    const id=$('animalSelect').value;
    return Array.isArray(animals)?animals.find(x=>x.id===id):null;
  }catch{return null}
}
const panel=editor.closest('section.panel');
const controls=document.createElement('div');
controls.className='notice';
controls.style.marginTop='14px';
const head=document.createElement('strong');
head.textContent='Légende complète et hashtags';
const help=document.createElement('p');
help.textContent='1. Copie la légende complète (avec #AniMoi et #Espèce). 2. Partage l’image. 3. Colle la légende dans Instagram ou TikTok : ces applications ne récupèrent pas toujours les hashtags avec la photo.';
const tagLine=document.createElement('p');tagLine.style.fontWeight='700';
const optional=document.createElement('input');
optional.id='optionalTags';
optional.placeholder='Autres hashtags facultatifs : #Promenade #Humour';
optional.setAttribute('aria-label','Autres hashtags facultatifs');
const caption=document.createElement('textarea');
caption.id='animoiCaption';
caption.rows=6;caption.readOnly=true;
caption.setAttribute('aria-label','Légende complète à copier');
const instruction=document.createElement('p');instruction.style.fontWeight='700';instruction.textContent='Avant Instagram / TikTok : copie d’abord cette légende complète 👇';
const button=document.createElement('button');
button.type='button';button.textContent='📋 Copier texte + tous les hashtags';
controls.append(head,help,tagLine,optional,instruction,caption,button);
const after=panel.querySelector('#editPost');
after.insertAdjacentElement('afterend',controls);
const normalizeTag=tag=>tag.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_]/g,'');
function build(){
 const animal=pet();
 const mandatory=['AniMoi',speciesTag(animal&&animal.species)];
 const stripped=editor.value.replace(/(?:^|\s)#AniMoi\b/gi,'').replace(new RegExp('(?:^|\\s)#'+mandatory[1]+'\\b','gi'),'').trim();
 const extra=(optional.value.match(/#[\p{L}\p{N}_]+/gu)||[]).map(x=>normalizeTag(x.slice(1))).filter(Boolean);
 const dedup=[...new Set([...mandatory,...extra].map(x=>x.toLowerCase()))];
 const tagStrings=dedup.map(x=>'#'+([...mandatory,...extra].find(t=>t.toLowerCase()===x)));
 tagLine.textContent=tagStrings.slice(0,2).join(' ');
 caption.value=(stripped?stripped+'\n\n':'')+tagStrings.join(' ');
 return caption.value;
}
button.onclick=async()=>{try{await navigator.clipboard.writeText(build());feedback.textContent='Légende complète et hashtags copiés.'}catch{caption.focus();caption.select();feedback.textContent='Sélectionne puis copie la légende.'}};
editor.addEventListener('input',build);
optional.addEventListener('input',build);
$('animalSelect').addEventListener('change',build);
$('generate').addEventListener('click',()=>setTimeout(build,0));
const copyOriginal=copy.onclick;
copy.onclick=()=>button.click();
const shareOriginal=share.onclick;
share.onclick=async()=>{
 const text=build();
 if(!text)return;
 try{if(navigator.share)await navigator.share({title:'Ani’Moi',text});else button.click();}
 catch(e){if(e.name!=='AbortError')button.click()}
};
const imageShare=$('shareImage');
if(imageShare){
 imageShare.addEventListener('click',async()=>{
   // The caption is copied separately: social apps may discard text accompanying image files.
   build();
 });
}
const styles=document.createElement('style');
styles.textContent='#animoiCaption{background:#fbf9ff;font-size:14px;min-height:125px}#optionalTags{margin:8px 0}';
document.head.append(styles);
build();
})();