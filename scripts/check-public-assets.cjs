'use strict';
// Additional publication check, not a proof against every arbitrary secret.
// Never print matched values. Run a specialised secret scanner as well.
const fs=require('node:fs'),path=require('node:path');
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['provider-token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/],
  ['credential-url',/postgres(?:ql)?:\/\/[^\s/@:]+:[^\s/@]+@/i],
  ['literal-secret',/\b(?:api[_-]?key|api[_-]?token|access[_-]?token|client[_-]?secret|database_url|password|cloudflare_api_token)["']?\s*[:=]\s*["'][^"'\s][^"']*["']/i],
  ['browser-secret-environment',/(?:process\.env\.|import\.meta\.env\.)(?:[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)|DATABASE_URL)\b/],
  ['embedded-bearer',/Bearer\s+[A-Za-z0-9_.-]{24,}/]
];
function scanFile(file,base=path.dirname(file)) {
  const text=fs.readFileSync(file,'utf8'),findings=[];
  for(const [rule,pattern] of rules){const match=pattern.exec(text);if(match)findings.push({file:path.relative(base,file),line:text.slice(0,match.index).split('\n').length,rule});}
  return findings;
}
function scanTree(root) {
  const findings=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name),rel=path.relative(root,file);
    if(entry.isSymbolicLink()){findings.push({file:rel,rule:'unexpected-symlink'});continue;}
    if(/^(?:\.env|\.dev\.vars)|\.(?:pem|key|p12|pfx)$/i.test(entry.name)||['server','server-private','animoi-server','node_modules','.git'].includes(entry.name)){
      findings.push({file:rel,rule:'private-or-server-file-in-public-artifact'});continue;
    }
    if(entry.isDirectory())walk(file);
    else if(/\.(?:js|mjs|cjs|html|json|map|css|txt)$/i.test(entry.name))findings.push(...scanFile(file,root));
  }}
  walk(root);return findings;
}
if(require.main===module){
  const app=path.resolve(__dirname,'..');
  const findings=process.argv[2]?scanTree(path.resolve(process.argv[2])):[...scanFile(path.join(app,'index.html'),app),...scanTree(path.join(app,'v2-preview'))];
  console.log(JSON.stringify({status:findings.length?'blocked':'passed',findings},null,2));process.exitCode=findings.length?1:0;
}
module.exports={scanFile,scanTree};
