(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const canvas = get('cardCanvas'), create = get('makeImage'), download = get('download'), downloadArea = get('downloadArea');
  if (!canvas || !create || !download) return;
  const i18n = AniMoiI18n;
  const preview = get('editPost').closest('section.panel');
  const status = get('feedback');
  const tools = document.createElement('details');
  tools.id = 'imageTools'; tools.className = 'optional-image-tools';
  const summary = document.createElement('summary');
  i18n.bind(summary, 'images.optional');
  const selectLabel = document.createElement('label');
  selectLabel.htmlFor = 'shareFormat';
  i18n.bind(selectLabel, 'images.format');
  const format = document.createElement('select');
  format.id = 'shareFormat';
  for (const value of ['feed', 'story', 'square']) {
    const option = document.createElement('option'); option.value = value;
    i18n.bind(option, 'images.' + value); format.append(option);
  }
  const createActions = document.createElement('div'); createActions.className = 'buttons';
  createActions.append(create);
  const shareImage = document.createElement('button');
  shareImage.id = 'shareImage';
  i18n.bind(shareImage, 'images.share');
  shareImage.className = 'secondary';
  shareImage.type = 'button';
  downloadArea.append(shareImage);
  const note = document.createElement('p');
  note.className = 'muted';
  i18n.bind(note, 'images.note');
  i18n.bind(download, 'preview.download');
  tools.append(summary, selectLabel, format, createActions, canvas, downloadArea, note);
  preview.append(tools);
  const sizes = {feed:[1080,1350],story:[1080,1920],square:[1080,1080]};
  let builtFor = null, generation = 0;
  function notify(key) { status.removeAttribute('data-i18n'); status.textContent = i18n.t(key); }
  const cleanName = value => (value || 'mon-animal').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,36);
  function currentPet(){
    try {
      const pets=AniMoiData.read().pets;
      return pets.find(p=>p.id===get('animalSelect').value) || {name:'Mon animal',species:'',breed:'',photo:''};
    } catch {return {name:'Mon animal',species:'',breed:'',photo:''};}
  }
  function rounded(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function cover(ctx,img,x,y,w,h){
    const ratio=Math.max(w/img.width,h/img.height);
    const cw=w/ratio,ch=h/ratio,sx=(img.width-cw)/2,sy=(img.height-ch)/2;
    ctx.drawImage(img,sx,sy,cw,ch,x,y,w,h);
  }
  async function getPhoto(url){
    if(!url)return null;
    return await new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src=url;
    });
  }
  function drawWrapped(ctx, text, width, maxRows, lineHeight, x, y){
    const paragraphs=text.replace(/\r/g,'').split('\n');
    const lines=[];
    for(const paragraph of paragraphs){
      if(paragraph.trim()===''){if(lines.length && lines[lines.length-1]!=='')lines.push('');continue;}
      let line='';
      for(const word of paragraph.split(/\s+/)){
        if(!word)continue;
        const proposed=line?line+' '+word:word;
        if(ctx.measureText(proposed).width>width && line){lines.push(line);line=word;} else line=proposed;
      }
      if(line)lines.push(line);
    }
    let displayed=lines.slice(0,maxRows);
    if(lines.length>maxRows && displayed.length){
      let end=displayed.length-1;
      while(end>0 && displayed[end]==='')end--;
      const suffix=i18n.t('images.continuation');
      let last=displayed[end].trim();
      while(last && ctx.measureText(last+suffix).width>width){last=last.slice(0,-1);}
      displayed=displayed.slice(0,end+1);
      displayed[end]=last+suffix;
    }
    displayed.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));
  }
  async function renderCard(){
    const text=AniMoiStoryFormatter.publicationText(get('editPost').value).trim();
    if(!text){alert(i18n.t('images.empty'));return false;}
    const pending = ++generation, snapshot = fingerprint();
    const [w,h]=sizes[format.value]||sizes.feed;
    const p=currentPet();
    const attached=get('postAttachmentPreview');
    const photo=attached && !attached.hidden ? attached.getAttribute('src') : p.photo;
    const [img, profileImg]=await Promise.all([getPhoto(photo),getPhoto(p.photo)]);
    // A delayed photo must not render a card for an animal or draft already changed.
    if (pending !== generation || snapshot !== fingerprint()) return false;
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f7f2ff';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#6944b5';ctx.fillRect(0,0,w,160);
    ctx.fillStyle='#fff';ctx.font='bold 65px system-ui';ctx.fillText('🐾 Ani’Moi',65,105);
    ctx.fillStyle='#352847';ctx.font='bold 52px system-ui';
    const name=(p.name||'Mon animal').slice(0,23);
    ctx.fillText(name,185,246);
    ctx.font='30px system-ui';ctx.fillStyle='#716587';
    ctx.fillText([p.species,p.breed].filter(Boolean).join(' · ').slice(0,42),185,294);
    const ax=66,ay=193,as=94;
    ctx.save();rounded(ctx,ax,ay,as,as,47);ctx.clip();
    if(profileImg)cover(ctx,profileImg,ax,ay,as,as);
    else{ctx.fillStyle='#e5daf7';ctx.fillRect(ax,ay,as,as);ctx.fillStyle='#6944b5';ctx.font='55px system-ui';ctx.fillText('🐾',ax+13,ay+67)}
    ctx.restore();
    const photoY=345;
    const photoH=format.value==='story'?960:format.value==='square'?345:515;
    ctx.save();rounded(ctx,65,photoY,950,photoH,28);ctx.clip();
    if(img)cover(ctx,img,65,photoY,950,photoH);
    else {
      const gradient=ctx.createLinearGradient(65,photoY,1015,photoY+photoH);
      gradient.addColorStop(0,'#dfcff7');gradient.addColorStop(1,'#f4d9e5');
      ctx.fillStyle=gradient;ctx.fillRect(65,photoY,950,photoH);
      ctx.fillStyle='#6944b5';ctx.font='bold 92px system-ui';
      ctx.textAlign='center';ctx.fillText('🐾',540,photoY+photoH/2+26);ctx.textAlign='left';
    }
    ctx.restore();
    const y=photoY+photoH+78;
    ctx.font=format.value==='square'?'32px system-ui':'35px system-ui';ctx.fillStyle='#2e2540';
    const lineH=format.value==='square'?42:49;
    const footerY=h-65;
    const maxRows=Math.max(1,Math.floor((footerY-y-28)/lineH));
    drawWrapped(ctx,text,928,maxRows,lineH,76,y);
    ctx.fillStyle='#6944b5';ctx.font='bold 28px system-ui';
    ctx.fillText(i18n.t('images.tagline') + '  #Animoi',70,h-38);
    canvas.style.display='block';downloadArea.style.display='flex';
    builtFor=snapshot;
    notify('images.ready');
    return true;
  }
  function fingerprint(){
    const p=currentPet(), attached=get('postAttachmentPreview');
    return JSON.stringify([format.value,get('editPost').value.trim(),p.id,p.photo,attached && !attached.hidden ? attached.getAttribute('src') : null,i18n.locale]);
  }
  async function ensureCurrent(){
    if(builtFor!==fingerprint())return await renderCard();
    return true;
  }
  function saveImage(){
    const p=currentPet(), a=document.createElement('a');
    a.download='animoi-'+cleanName(p.name)+'-'+format.value+'.png';
    a.href=canvas.toDataURL('image/png');a.click();
  }
  i18n.bind(create, 'images.create');
  create.onclick=()=>{renderCard().catch(()=>notify('images.failed'));};
  download.onclick=async()=>{try { if(await ensureCurrent())saveImage(); } catch { notify('images.failed'); }};
  shareImage.onclick=async()=>{
    try{
      if(!await ensureCurrent())return;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Image indisponible');
      const p=currentPet();
      const file=new File([blob],'animoi-'+cleanName(p.name)+'.png',{type:'image/png'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'Ani’Moi — '+p.name});
        notify('images.shared');
      } else {
        saveImage();
        notify('images.saved');
      }
    }catch(e){if(e.name!=='AbortError')notify('images.shareUnavailable');
    }
  };
  function invalidate() { generation++; builtFor=null; canvas.style.display='none'; downloadArea.style.display='none'; }
  format.addEventListener('change',invalidate);
  get('editPost').addEventListener('input', invalidate);
  get('animalSelect').addEventListener('change', invalidate);
  document.addEventListener('animoi:locale-changed', invalidate);
  document.addEventListener('animoi:post-photo-changed', invalidate);
  get('generate').addEventListener('click', () => { tools.open = false; invalidate(); });
})();
