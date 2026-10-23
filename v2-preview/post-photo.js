/* Browser-local publication attachments. No upload or profile-photo mutation. */
(function (root) {
  'use strict';
  const MAX_INPUT_BYTES = 20 * 1024 * 1024;
  const MAX_DATA_URL_LENGTH = 600000;
  const MAX_DIMENSION = 1280;
  const acceptedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
  const raster = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i;
  function parsed(value) {
    if (typeof value !== 'string') return null;
    const match = raster.exec(value);
    return match && match[2].length % 4 === 0 ? match : null;
  }
  function isRenderable(value) { return !!parsed(value); }
  function failure(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }
  async function prepare(file) {
    const type = typeof file?.type === 'string' ? file.type.toLowerCase() : '';
    const recognisedExtension = !type && typeof file?.name === 'string' && /\.(?:jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
    if (!file || (!acceptedTypes.has(type) && !recognisedExtension) || !Number.isSafeInteger(file.size) || file.size <= 0) throw failure('photo.invalid');
    if (file.size > MAX_INPUT_BYTES) throw failure('photo.tooLarge');
    let url;
    try {
      url = root.URL.createObjectURL(file);
      const image = new root.Image();
      image.decoding = 'async';
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(failure('photo.unreadable'));
        image.src = url;
      });
      const width = image.naturalWidth, height = image.naturalHeight;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw failure('photo.unreadable');
      const canvas = root.document.createElement('canvas');
      const ratio = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      let targetWidth = Math.max(1, Math.round(width * ratio)), targetHeight = Math.max(1, Math.round(height * ratio));
      let quality = 0.78;
      for (let attempt = 0; attempt < 9; attempt++) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext('2d');
        if (!context) throw failure('photo.unreadable');
        // JPEG has no alpha channel: transparent source pixels get a white background.
        context.fillStyle = '#fff';
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        const result = canvas.toDataURL('image/jpeg', quality);
        if (!result.startsWith('data:image/jpeg;base64,') || !isRenderable(result)) throw failure('photo.unreadable');
        if (result.length <= MAX_DATA_URL_LENGTH) return result;
        if (quality > 0.55) quality -= 0.12;
        else {
          targetWidth = Math.max(1, Math.round(targetWidth * 0.75));
          targetHeight = Math.max(1, Math.round(targetHeight * 0.75));
        }
      }
      throw failure('photo.tooLarge');
    } catch (error) {
      if (['photo.invalid', 'photo.tooLarge', 'photo.unreadable'].includes(error?.code)) throw error;
      throw failure('photo.unreadable');
    } finally {
      if (url) root.URL.revokeObjectURL(url);
    }
  }
  function fileForShare(photo) {
    try {
      const match = parsed(photo);
      if (!match || typeof root.File !== 'function' || typeof root.atob !== 'function') return null;
      const bytes = root.atob(match[2]);
      const content = new Uint8Array(bytes.length);
      for (let index = 0; index < bytes.length; index++) content[index] = bytes.charCodeAt(index);
      const subtype = match[1].toLowerCase();
      return new root.File([content], 'animoi-publication.' + (subtype === 'jpeg' ? 'jpg' : subtype), { type: 'image/' + subtype });
    } catch { return null; }
  }
  const api = { isRenderable, prepare, fileForShare, MAX_INPUT_BYTES, MAX_DATA_URL_LENGTH, MAX_DIMENSION };
  root.AniMoiPostPhoto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
