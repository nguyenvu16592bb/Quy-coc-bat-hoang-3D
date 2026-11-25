/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Save.js
 * Lưu/tải localStorage + xuất/nhập mã base64.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var KEY = 'mvl3d_save_v1';

  var Save = {
    KEY: KEY,

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('[Save] đọc lưu thất bại:', e && e.message);
        return null;
      }
    },

    save: function (state) {
      try {
        state.updatedAt = Date.now();
        localStorage.setItem(KEY, JSON.stringify(state));
        MVL.Bus.emit('save:done');
        return true;
      } catch (e) {
        console.warn('[Save] ghi lưu thất bại:', e && e.message);
        return false;
      }
    },

    clear: function () { localStorage.removeItem(KEY); },

    exists: function () { return !!localStorage.getItem(KEY); },

    export: function () {
      try {
        var raw = localStorage.getItem(KEY) || '';
        return btoa(unescape(encodeURIComponent(raw)));
      } catch (e) { return ''; }
    },

    import: function (code) {
      try {
        var raw = decodeURIComponent(escape(atob(String(code || '').trim())));
        var obj = JSON.parse(raw);
        localStorage.setItem(KEY, JSON.stringify(obj));
        return obj;
      } catch (e) { return null; }
    }
  };

  MVL.Save = Save;
})(window.MVL);
