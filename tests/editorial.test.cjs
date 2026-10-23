const {test} = require('node:test');
const assert = require('node:assert/strict');
const permissions = require('../v2-preview/permissions.js');
const gazette = require('../v2-preview/gazette.js');
const owner = {role:'owner', actorId:'owner-a', ownerId:'owner-a', source:'local-prototype'};
const subscriber = {role:'subscriber', actorId:'owner-a', ownerId:'owner-a'};
const editor = {role:'editor', actorId:'editor-a', ownerId:'owner-a', authorizationVerified:true};
const fixture = () => ({id:'post-a', petId:'pet-a', rubric:'potins', text:'Je protège mon coussin.\n\n#Animoi #VieDAnimal #Chien #MaMarque', date:123, originalLanguage:'fr', photo:'data:image/jpeg;base64,YWJj', extension:{keep:['yes',1]}});
const at = status => ({...fixture(), editorial:{status, futureEditorial:{keep:true}}});
const expectedCode = code => error => error?.code === code;

test('role contracts deny unknown roles, empty identities and unknown actions by default', () => {
  for (const context of [undefined, null, {}, {role:'admin',actorId:'owner-a'}, {role:'owner',actorId:''}, {role:'subscriber',actorId:' '}]) {
    assert.equal(permissions.can('post.edit', context),false);
    assert.equal(permissions.can('gazette.publish', context),false);
    assert.equal(permissions.can('public.read', context),false);
  }
  for (const context of [owner,subscriber,editor]) assert.equal(permissions.can('invented-action',context),false);
});

test('a proprietor manages only records with matching, explicit owner identity', () => {
  for (const action of ['post.read','post.edit','post.delete','animal.manage']) {
    assert.equal(permissions.can(action,owner),true);
    assert.equal(permissions.can(action,{...owner,ownerId:'another-owner'}),false);
    assert.equal(permissions.can(action,{...owner,ownerId:undefined}),false);
    assert.equal(permissions.can(action,subscriber),false);
    assert.equal(permissions.can(action,editor),false);
  }
  for (const context of [owner,subscriber,editor]) assert.equal(permissions.can('public.read',context),true);
});

test('a subscriber may submit or archive their own proposal but never another owner’s', () => {
  for (const action of ['proposal.submit','proposal.withdraw','proposal.archive']) {
    assert.equal(permissions.can(action,subscriber),true);
    assert.equal(permissions.can(action,owner),true);
    assert.equal(permissions.can(action,{...subscriber,ownerId:'another-owner'}),false);
  }
});

test('editorial commands require separately verified editorial authorization', () => {
  for (const action of ['gazette.review','gazette.revise','gazette.approve','gazette.reject','gazette.archive','gazette.publish']) {
    assert.equal(permissions.can(action,editor),true);
    assert.equal(permissions.can(action,{...editor,authorizationVerified:false}),false);
    assert.equal(permissions.can(action,{...editor,authorizationVerified:undefined}),false);
    assert.equal(permissions.can(action,owner),false);
    assert.equal(permissions.can(action,subscriber),false);
  }
});

test('local membership guard matches post and animal without claiming subscriber identity', () => {
  const pet={id:'pet-a'}, post=fixture(), state={pets:[pet],posts:[post]};
  assert.equal(permissions.localOwner(post,pet,state),true);
  for (const [p,a,s] of [[{...post,petId:'other'},pet,state],[post,{id:'other'},state],[post,pet,{pets:[pet],posts:[]}],[post,pet,{pets:[],posts:[post]}],[post,pet,{}],[null,pet,state]]) assert.equal(permissions.localOwner(p,a,s),false);
});

test('starting a proposal is explicit, creates only a draft and preserves every source field', () => {
  const post=fixture(), before=JSON.stringify(post), started=gazette.start(post);
  assert.equal(JSON.stringify(post),before);
  assert.deepEqual(started,{...post,editorial:{status:'draft'}});
  assert.equal(gazette.canTransition(started,'approved',owner),false);
  assert.equal(gazette.canTransition(started,'published',owner),false);
  assert.throws(()=>gazette.start(started),expectedCode('gazette.start'));
  assert.throws(()=>gazette.start({...post,rubric:'pawbook'}),expectedCode('gazette.start'));
});

test('legacy stories are accepted unchanged without an inferred proposal or approval', () => {
  for (const post of [fixture(), {...fixture(),rubric:undefined}, {...fixture(),rubric:'pawbook',editorial:{futureValue:'keep'}}]) {
    const before=JSON.stringify(post);
    assert.equal(gazette.validate(post),true);
    assert.equal(gazette.canTransition(post,'pending',owner),false);
    assert.equal(gazette.canTransition(post,'published',editor),false);
    assert.equal(JSON.stringify(post),before);
  }
});

test('Gazette metadata validation rejects malformed states without discarding extensions', () => {
  for (const editorial of [null,[],{}, {status:'unrecognized'}, {status:'published',editionId:''}, {status:'draft',editionId:17}]) assert.throws(()=>gazette.validate({...fixture(),editorial}),expectedCode('gazette.invalid'));
  const post={...at('pending'),editorial:{status:'pending',editionId:'future-edition',extension:{keep:'yes'}}}, before=JSON.stringify(post);
  assert.equal(gazette.validate(post),true); assert.equal(JSON.stringify(post),before);
});

test('explicit submission stops at pending; validation and publication remain two editorial actions', () => {
  const draft=gazette.start(fixture()), pending=gazette.transition(draft,'pending',owner);
  assert.equal(draft.editorial.status,'draft'); assert.equal(pending.editorial.status,'pending');
  for (const context of [owner,subscriber,{...editor,authorizationVerified:false}]) {
    assert.throws(()=>gazette.transition(pending,'approved',context),expectedCode('gazette.transition'));
    assert.throws(()=>gazette.transition(pending,'published',context),expectedCode('gazette.transition'));
  }
  assert.equal(gazette.canTransition(pending,'published',editor),false);
  const approved=gazette.transition(pending,'approved',editor);
  assert.equal(approved.editorial.status,'approved'); assert.equal(pending.editorial.status,'pending');
  assert.equal(gazette.transition(approved,'published',editor).editorial.status,'published');
});

test('revision, refusal and archival follow deliberate allowed routes', () => {
  const revised=gazette.transition(at('pending'),'revision',editor);
  assert.equal(gazette.transition(revised,'pending',subscriber).editorial.status,'pending');
  assert.equal(gazette.transition(revised,'approved',editor).editorial.status,'approved');
  const rejected=gazette.transition(at('pending'),'rejected',editor);
  assert.equal(gazette.transition(rejected,'archived',owner).editorial.status,'archived');
  assert.equal(gazette.transition(at('published'),'archived',editor).editorial.status,'archived');
  assert.equal(gazette.canTransition(rejected,'published',editor),false);
  assert.equal(gazette.canTransition(at('archived'),'pending',owner),false);
});

test('a local proprietor can withdraw waiting or revised proposals without touching published material', () => {
  for (const status of ['pending','revision']) {
    const post=at(status), previous=JSON.stringify(post), draft=gazette.transition(post,'draft',owner);
    assert.equal(draft.editorial.status,'draft'); assert.equal(JSON.stringify(post),previous);
    assert.deepEqual({...draft,editorial:undefined},{...post,editorial:undefined});
  }
  for (const status of ['draft','pending','revision','rejected']) assert.equal(gazette.transition(at(status),'archived',owner).editorial.status,'archived');
  for (const status of ['approved','published','archived']) {
    assert.equal(gazette.canTransition(at(status),'draft',owner),false);
    assert.equal(gazette.canTransition(at(status),'archived',owner),false);
  }
});

test('ownership mismatches and malformed or unrelated posts cannot enter the workflow', () => {
  for (const post of [at('draft'),{...at('draft'),ownerId:'owner-b'}]) {
    const context=post.ownerId ? owner : {...owner,ownerId:'owner-b'};
    assert.equal(gazette.canTransition(post,'pending',context),false);
    assert.throws(()=>gazette.transition(post,'pending',context),expectedCode('gazette.transition'));
  }
  for (const post of [{...at('draft'),rubric:'sav'},{...at('draft'),editorial:null},null]) assert.equal(gazette.canTransition(post,'pending',owner),false);
  assert.equal(gazette.canTransition(at('pending'),'pending',editor),false);
  assert.equal(gazette.canTransition(at('draft'),'invented',owner),false);
});

test('status changes and JSON round trips preserve identity, animal, original text, photo, hashtags and extensions', () => {
  const original=at('draft'), before=JSON.stringify(original), pending=gazette.transition(original,'pending',owner);
  const {editorial:oldEditorial,...oldFields}=original, {editorial:newEditorial,...newFields}=pending;
  assert.deepEqual(newFields,oldFields); assert.equal(JSON.stringify(original),before);
  assert.deepEqual(newEditorial.futureEditorial,oldEditorial.futureEditorial);
  for (const version of [1,2]) {
    const backup=JSON.parse(JSON.stringify({app:'AniMoi',version,pets:[{id:'pet-a'}],posts:[pending]}));
    assert.deepEqual(backup.posts,[pending]);
  }
});
