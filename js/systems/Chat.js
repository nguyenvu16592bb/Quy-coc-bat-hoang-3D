/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Chat.js
 * Sảnh chat (Contract 6i): push phát Bus 'chat:new', chat nền
 * 22-40s từ Data.chatLines, hệ thống báo sự kiện, bot trả lời.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils;
  var D = MVL.Data;

  var CH = {};

  var _inited = false;
  var _ambientTimer = null;

  function playerName() {
    var PS = MVL.Progression;
    return (PS && PS.state && PS.state.name) ? PS.state.name : 'Vô Danh';
  }

  /* push(type, author, text) — type: 'system'|'world'|'npc' */
  CH.push = function (type, author, text) {
    MVL.Bus.emit('chat:new', { type: type, author: author || '', text: text || '' });
  };

  /* chat nền giang hồ: 22-40s một dòng ngẫu nhiên */
  function scheduleAmbient() {
    if (_ambientTimer) clearTimeout(_ambientTimer);
    _ambientTimer = setTimeout(function () {
      var lines = D.chatLines || [];
      if (lines.length) {
        var line = U.pick(lines);
        CH.push('world', line[0], line[1]);
      }
      scheduleAmbient();
    }, U.randInt(22000, 40000));
  }

  /* Người chơi nhắn: 60% khả năng bot đáp sau 1.5-3s */
  CH.sendUser = function (text) {
    text = (text || '').trim();
    if (!text) return;
    CH.push('world', playerName(), text);
    if (Math.random() < 0.6) {
      setTimeout(function () {
        var bots = D.chatBot || [];
        if (!bots.length) return;
        var author = 'Thủy Tinh Linh';
        if (Math.random() < 0.5 && D.chatLines && D.chatLines.length) author = U.pick(D.chatLines)[0];
        CH.push('world', author, U.pick(bots));
      }, U.randInt(1500, 3000));
    }
  };

  /* ==================== LẮNG NGHE BUS ==================== */

  CH.init = function () {
    if (_inited) return;
    _inited = true;
    MVL.Bus.on('player:levelup', function (d) {
      CH.push('system', '', '⚔️ ' + playerName() + ' đột phá cảnh giới — đạt cấp ' + ((d && d.level) || '?') + '!');
    });
    MVL.Bus.on('quest:complete', function (d) {
      CH.push('system', '', '📜 ' + playerName() + ' hoàn thành nhiệm vụ「' + (d && d.def ? d.def.name : '?') + '」');
    });
    MVL.Bus.on('achieve:unlock', function (d) {
      CH.push('system', '', '🏆 Thành tựu mở khóa: ' + (d && d.def ? d.def.name : '?'));
    });
    MVL.Bus.on('scene:entered', function (d) {
      var name = (d && d.def && d.def.name) || (d && d.id) || 'vùng đất mới';
      CH.push('system', '', '🍃 ' + playerName() + ' bước tới ' + name);
    });
    scheduleAmbient();
  };
  CH.init();   /* tự lắng nghe + chạy chat nền ngay khi nạp (idempotent) */

  MVL.Chat = CH;
})(window.MVL);
