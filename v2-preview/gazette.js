/* Editorial state transitions only. No network, automatic publication or roles.
 * Public access and editorial writes require a separately authenticated server.
 * JSON metadata and browser-supplied context are never proof of publication rights.
 */
(function (root) {
  'use strict';
  const permissions = root.AniMoiPermissions || (typeof module !== 'undefined' ? require('./permissions.js') : null);
  const statuses = Object.freeze(['draft', 'pending', 'revision', 'approved', 'published', 'rejected', 'archived']);
  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const failure = code => Object.assign(new Error(code), { code });

  function validate(post) {
    // Preserve historical/foreign metadata on other rubrics without interpreting
    // it as an editorial proposal, approval, or public article.
    if (!post || post.rubric !== 'potins' || post.editorial === undefined) return true;
    const value = post.editorial;
    if (!isRecord(value) || !statuses.includes(value.status)) throw failure('gazette.invalid');
    if (value.editionId !== undefined && (typeof value.editionId !== 'string' || !value.editionId.trim() || value.editionId.length > 160)) throw failure('gazette.invalid');
    return true;
  }

  function start(post) {
    // Called only by an explicit creation action. Existing Potins stories are
    // never upgraded to proposals or approved articles by reading the repository.
    if (!isRecord(post) || post.rubric !== 'potins' || post.editorial !== undefined) throw failure('gazette.start');
    return { ...post, editorial: { status: 'draft' } };
  }

  const editorRoutes = Object.freeze({
    pending: Object.freeze({ revision: 'gazette.revise', approved: 'gazette.approve', rejected: 'gazette.reject', archived: 'gazette.archive' }),
    revision: Object.freeze({ approved: 'gazette.approve', rejected: 'gazette.reject', archived: 'gazette.archive' }),
    approved: Object.freeze({ published: 'gazette.publish', revision: 'gazette.revise', archived: 'gazette.archive' }),
    published: Object.freeze({ archived: 'gazette.archive' }),
    rejected: Object.freeze({ archived: 'gazette.archive' })
  });

  function ownerAction(from, target) {
    if ((from === 'draft' || from === 'revision') && target === 'pending') return 'proposal.submit';
    if ((from === 'pending' || from === 'revision') && target === 'draft') return 'proposal.withdraw';
    if (['draft', 'pending', 'revision', 'rejected'].includes(from) && target === 'archived') return 'proposal.archive';
    return null;
  }

  function canTransition(post, target, context = {}) {
    if (!permissions || !isRecord(post) || post.rubric !== 'potins' || !statuses.includes(target)) return false;
    try { validate(post); } catch { return false; }
    const from = post.editorial?.status;
    if (!statuses.includes(from) || from === target) return false;
    // A future server passes ownership read from its authoritative record.
    // An existing ownerId must not be contradicted by a supplied context.
    if (post.ownerId !== undefined && post.ownerId !== context?.ownerId) return false;
    const personal = ownerAction(from, target);
    if (personal && permissions.can(personal, context)) return true;
    const editorial = editorRoutes[from]?.[target];
    return !!editorial && permissions.can(editorial, context);
  }

  function transition(post, target, context = {}) {
    if (!canTransition(post, target, context)) throw failure('gazette.transition');
    // Updating the status is a separate explicit command at every step. The
    // original story, identity, date, hashtags, photo and extensions stay intact.
    return { ...post, editorial: { ...post.editorial, status: target } };
  }

  const api = Object.freeze({ statuses, validate, start, canTransition, transition });
  root.AniMoiGazette = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
