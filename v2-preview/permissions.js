/* Policy contracts for a future authenticated server, not browser authentication.
 * Never derive an application role from the hosting session or localStorage.
 * A server must resolve roles, identities and ownership itself before using can().
 */
(function (root) {
  'use strict';
  const roles = Object.freeze(['owner', 'subscriber', 'editor']);
  const identity = value => typeof value === 'string' && value.trim().length > 0;
  const ownerActions = new Set(['post.read', 'post.edit', 'post.delete', 'animal.manage']);
  const proposalActions = new Set(['proposal.submit', 'proposal.withdraw', 'proposal.archive']);
  const editorActions = new Set(['gazette.review', 'gazette.revise', 'gazette.approve', 'gazette.reject', 'gazette.archive', 'gazette.publish']);

  function can(action, context = {}) {
    const { role, actorId, ownerId, authorizationVerified } = context || {};
    if (!roles.includes(role) || !identity(actorId)) return false;
    const owns = identity(ownerId) && actorId === ownerId;
    if (ownerActions.has(action)) return role === 'owner' && owns;
    if (action === 'public.read') return true;
    if (proposalActions.has(action)) return (role === 'owner' || role === 'subscriber') && owns;
    // This flag is a contract for server-verified context. Setting it in a
    // browser is not proof of authority, and no editor UI sets it locally.
    if (editorActions.has(action)) return role === 'editor' && authorizationVerified === true;
    return false;
  }

  function localOwner(post, pet, state) {
    // A prototype guard only: membership in this browser's local repository.
    // It does not establish the identity or rights of a real subscriber.
    if (!post || !pet || !Array.isArray(state?.pets) || !Array.isArray(state?.posts)) return false;
    if (!identity(post.id) || !identity(post.petId) || !identity(pet.id) || post.petId !== pet.id) return false;
    return state.pets.some(value => value.id === pet.id) &&
      state.posts.some(value => value.id === post.id && value.petId === pet.id);
  }

  const api = Object.freeze({ roles, can, localOwner });
  root.AniMoiPermissions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
