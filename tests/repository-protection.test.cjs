'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {scanTree}=require('../scripts/check-public-assets.cjs');
const root=path.resolve(__dirname,'..');
test('ignore policy blocks secret variants at every depth while keeping harmless examples and project fixtures',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'animoi-ignore-'));
  try{
    cp.execFileSync('git',['init','--quiet',dir]);fs.copyFileSync(path.join(root,'.gitignore'),path.join(dir,'.gitignore'));
    const ignored=['.env','.env.production','.env.example.local','nested/.env.staging','.dev.vars','.dev.vars.production','nested/.dev.vars.secret','.npmrc','credentials.json','nested/client-credentials.json','keys/private.pem','keys/signing.key','node_modules/x.js','.wrangler/state.json','work/report.json','animoi-backup-2026.json','config.local.json','animoi-server/src/worker.mjs'];
    const allowed=['.env.example','.env.production.example','.dev.vars.example','README.md','tests/fixtures/historical.json','v2-preview/index.html','package-lock.json','wrangler.example.jsonc'];
    for(const file of [...ignored,...allowed]){
      const result=cp.spawnSync('git',['check-ignore','--no-index','--quiet',file],{cwd:dir});
      assert.equal(result.status,ignored.includes(file)?0:1,file);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('public artifact check blocks secret literals, environment references and private files without printing their values',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'animoi-assets-'));
  try{
    const examples=["const apiKey = '"+'synthetic-only'+"';",'const a=import.meta.env.VITE_API_KEY;',"const p='postgres"+'ql://user:example@host/db'+"';"];
    for(const text of examples){fs.writeFileSync(path.join(dir,'app.js'),text);const result=scanTree(dir);assert(result.length);assert(!JSON.stringify(result).includes('synthetic-only'));}
    fs.writeFileSync(path.join(dir,'app.js'),"const KEY='animoi-pets-v1';");assert.deepEqual(scanTree(dir),[]);
    fs.writeFileSync(path.join(dir,'.env.example'),'');assert(scanTree(dir).some(x=>x.rule==='private-or-server-file-in-public-artifact'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('existing public application passes the supplementary artifact check',()=>{
  const r=cp.spawnSync(process.execPath,[path.join(root,'scripts/check-public-assets.cjs')],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout);assert.equal(JSON.parse(r.stdout).status,'passed');
});
