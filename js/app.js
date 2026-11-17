(function () {
  'use strict';
  // DEMO: dane są zapisane tylko w przeglądarce tego urządzenia (localStorage).
  var KEY = 'gdteam-v2', INST = 'gdteam-installed', S, tab = '', skip = false, guide = false, deferred = null;

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() { return new Date().toLocaleDateString('pl-PL'); }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function ini(n) {
    var p = n.trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[1][0] : n.slice(0, 2)).toUpperCase();
  }

  function seed() {
    return {
      me: null, nextId: 10, cards: {}, hide: false,
      users: [
        { id: 'u1', name: 'Anna Kowalska', role: 'worker' },
        { id: 'u2', name: 'Marek Wiśniewski', role: 'worker' },
        { id: 'u3', name: 'Ola Nowak', role: 'worker' },
        { id: 'boss', name: 'Prezes', role: 'boss' },
        { id: 'acc', name: 'Księgowa', role: 'acc' }
      ],
      ledger: [
        { id: 1, uid: 'u1', delta: 300, reason: 'Premia za sezon wiosenny', status: 'ok', date: today() },
        { id: 2, uid: 'u2', delta: 200, reason: 'Premia za szybkie dostawy', status: 'ok', date: today() },
        { id: 3, uid: 'u3', delta: 150, reason: 'Pomoc przy wdrożeniu nowego drona', status: 'ok', date: today() },
        // świeża premia: przy pierwszym wejściu Anny dron „zrzuca” punkty
        { id: 4, uid: 'u1', delta: 50, reason: 'Pomoc w magazynie', status: 'ok', fresh: true, date: today() }
      ],
      rewards: [
        { id: 'r1', ico: '🏋️', name: 'Dopłata do karty Multisport', cost: 100 },
        { id: 'r2', ico: '🛒', name: 'Bon na zakupy', cost: 150 },
        { id: 'r3', ico: '☕', name: 'Lunch dla zespołu', cost: 80 },
        { id: 'r4', ico: '🌴', name: 'Dodatkowy dzień wolny', cost: 500 }
      ]
    };
  }
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
    if (!S || !S.users) S = seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function user(id) { return S.users.filter(function (u) { return u.id === id; })[0]; }
  function me() { return S.me ? user(S.me) : null; }
  function workers() { return S.users.filter(function (u) { return u.role === 'worker'; }); }
  function bal(id) {
    return S.ledger.reduce(function (s, l) { return l.uid === id && l.status === 'ok' ? s + l.delta : s; }, 0);
  }
  function pending() { return S.ledger.filter(function (l) { return l.status === 'pend'; }); }
  function toast(m) {
    var t = $('#toast'); t.textContent = m; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  var TABS = {
    worker: [['wallet', '💰', 'Portfel'], ['rewards', '🎁', 'Nagrody'], ['card', '🏋️', 'Multisport']],
    boss: [['award', '⭐', 'Przyznaj'], ['hist', '🧾', 'Historia']],
    acc: [['appr', '✅', 'Do akceptacji'], ['bal', '📊', 'Salda'], ['hist', '🧾', 'Historia']]
  };
  var ROLE_NAME = { worker: 'Pracownik', boss: 'Prezes / dyrektor', acc: 'Księgowość' };
  var THEME = { worker: '#14532d', boss: '#0b3b21', acc: '#27423a' };

  var EYE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYEOFF = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.5 16.5 0 0 0 2 12s3.5 7 10 7a10.5 10.5 0 0 0 5-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function empty(t) {
    return '<div class="empty"><img src="img/dog.png" alt="" width="88" height="88"><p>' + t + '</p></div>';
  }
  function steps(l) {
    if (!l.by) return '';
    var s2 = l.status === 'ok' ? 'on' : (l.status === 'rej' ? 'bad' : '');
    return '<div class="st"><span class="on">Złożono</span><i></i><span class="' + s2 + '">' + (l.status === 'rej' ? 'Odrzucono' : 'Zatwierdzono') + '</span></div>';
  }
  function row(l, showName) {
    var st = { ok: '', pend: '<em class="b w">Oczekuje</em>', rej: '<em class="b r">Odrzucono</em>' }[l.status] || '';
    var u = user(l.uid);
    return '<li><div><strong>' + esc(l.reason) + '</strong><small>' + (showName && u ? esc(u.name) + ' · ' : '') + l.date + ' ' + st + '</small>' + steps(l) + '</div>' +
      '<span class="pts ' + (l.delta < 0 ? 'neg' : 'pos') + '">' + (l.delta > 0 ? '+' : '') + l.delta + '</span></li>';
  }
  function list(items, showName, emptyText) {
    if (!items.length) return empty(emptyText);
    return '<ul class="l">' + items.slice().reverse().map(function (l) { return row(l, showName); }).join('') + '</ul>';
  }

  function brand(sub) {
    return '<div class="wl-top"><div class="logo-c"><img src="img/logo.jpg" alt="GardenDrop" width="480" height="480"></div>' +
      '<h1>GardenDrop Team</h1><p>' + sub + '</p></div>';
  }
  function loginView() {
    return '<div class="welcome">' + brand('Premie punktowe i benefity dla zespołu') + '<div class="wl-body"><h2>Kto wchodzi?</h2>' +
      S.users.map(function (u) {
        return '<button class="who" data-act="login" data-id="' + u.id + '"><span class="av ' + u.role + '">' + esc(ini(u.name)) + '</span>' +
          '<span class="wn"><strong>' + esc(u.name) + '</strong><small>' + ROLE_NAME[u.role] + '</small></span><span class="chev">›</span></button>';
      }).join('') +
      '<p class="note">Wersja demonstracyjna. Dane są zapisane tylko na tym urządzeniu.</p></div></div>';
  }

  function view(u) {
    var h = '';
    if (tab === 'wallet') {
      var b = bal(u.id), hide = S.hide, nx = '';
      var cand = S.rewards.filter(function (r) { return r.cost > b; }).sort(function (a, c) { return a.cost - c.cost; })[0];
      if (cand && !hide) {
        nx = '<div class="nx"><div class="pb"><i style="width:' + Math.min(100, Math.round(b / cand.cost * 100)) + '%"></i></div>' +
          '<small>Do „' + esc(cand.name) + '” brakuje ' + (cand.cost - b) + ' pkt</small></div>';
      }
      h = '<div class="hero"><div class="hr"><small>Twoje punkty</small><button class="eye" data-act="eye" aria-label="' + (hide ? 'Pokaż saldo' : 'Ukryj saldo') + '">' + (hide ? EYEOFF : EYE) + '</button></div>' +
        '<div class="n" id="bal">' + (hide ? '•••••' : b) + '</div>' + nx + '</div><h2>Historia</h2>' +
        list(S.ledger.filter(function (l) { return l.uid === u.id; }), false, 'Na razie pusto. Pierwsza premia pojawi się tutaj.') +
        '<button class="link" data-act="replay">▶ Zobacz animację premii (demo)</button>';
    } else if (tab === 'rewards') {
      h = '<h2>Wymień punkty</h2><p class="note">Saldo: <strong>' + bal(u.id) + ' pkt</strong>. Nagrody poniżej to przykłady.</p><ul class="l">' +
        S.rewards.map(function (r) {
          return '<li><div><strong>' + r.ico + ' ' + esc(r.name) + '</strong><small>' + r.cost + ' pkt</small></div>' +
            '<button class="btn s" data-act="redeem" data-id="' + r.id + '"' + (bal(u.id) < r.cost ? ' disabled' : '') + '>Wymień</button></li>';
        }).join('') + '</ul>';
    } else if (tab === 'card') {
      var c = S.cards[u.id];
      h = '<h2>Karta Multisport</h2><div class="card"><strong>' + (c ? 'Karta zapisana: •••• ' + esc(c) : 'Nie dodano karty') + '</strong></div>' +
        '<form data-form="card"><label for="c4">Ostatnie 4 cyfry numeru karty</label><input id="c4" name="c4" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required>' +
        '<p></p><button class="btn" type="submit">Zapisz</button></form>' +
        '<p class="note">Połączenie z systemem Multisport wymaga ustaleń z dostawcą karty. Na razie zapisujemy tylko ostatnie cyfry na tym urządzeniu.</p>';
    } else if (tab === 'award') {
      h = '<h2>Nowa premia punktowa</h2><form data-form="award"><label for="w">Pracownik</label><select id="w" name="w">' +
        workers().map(function (w) { return '<option value="' + w.id + '">' + esc(w.name) + '</option>'; }).join('') +
        '</select><label for="p">Liczba punktów</label><input id="p" name="p" type="number" inputmode="numeric" min="1" max="10000" required>' +
        '<label for="r">Powód</label><input id="r" name="r" maxlength="80" required><p></p>' +
        '<button class="btn" type="submit">Wyślij do akceptacji księgowej</button></form>' +
        '<p class="note">Premia trafia do pracownika dopiero po zatwierdzeniu przez księgową.</p><h2>Twoje wnioski</h2>' +
        list(S.ledger.filter(function (l) { return l.by === 'boss'; }), true, 'Nie wysłano jeszcze żadnych wniosków.');
    } else if (tab === 'appr') {
      var p = pending();
      h = '<h2>Do akceptacji</h2>' + (p.length ? '<ul class="l">' + p.map(function (l) {
        return '<li style="flex-wrap:wrap"><div><strong>' + esc(l.reason) + '</strong><small>' + esc(user(l.uid).name) + ' · ' + l.date + '</small>' + steps(l) + '</div><span class="pts pos">+' + l.delta + '</span>' +
          '<div class="acts" style="width:100%"><button class="btn s" data-act="ok" data-id="' + l.id + '">Zatwierdź</button><button class="btn s d" data-act="rej" data-id="' + l.id + '">Odrzuć</button></div></li>';
      }).join('') + '</ul>' : empty('Wszystko załatwione. Brak wniosków do akceptacji.'));
    } else if (tab === 'bal') {
      h = '<h2>Salda pracowników</h2><ul class="l">' + workers().map(function (w) {
        return '<li><strong>' + esc(w.name) + '</strong><span class="pts pos">' + bal(w.id) + ' pkt</span></li>';
      }).join('') + '</ul>';
    } else if (tab === 'hist') {
      h = '<h2>Historia</h2>' + list(S.ledger, true, 'Brak wpisów.');
    }
    return h;
  }

  // ---- Ekran instalacji (tylko telefony) ----
  var UA = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var MOBILE = IOS || /Android/i.test(UA);
  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function installed() { try { return localStorage.getItem(INST) === '1'; } catch (e) { return false; } }
  function setInstalled() { try { localStorage.setItem(INST, '1'); } catch (e) {} }
  function needInstall() { return MOBILE && !standalone() && !installed() && !skip; }
  var SHARE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-5px"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>';
  function installView() {
    var st = IOS
      ? ['Kliknij ikonę „Udostępnij” ' + SHARE + ' na dole ekranu Safari.', 'Przewiń w dół i wybierz „Dodaj do ekranu początkowego”.', 'Kliknij „Dodaj”. Ikona pojawi się na ekranie głównym.']
      : ['Kliknij menu przeglądarki ⋮ (prawy górny róg).', 'Wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.', 'Potwierdź. Ikona pojawi się na ekranie głównym.'];
    return '<div class="welcome inst">' + brand('Zainstaluj aplikację na telefonie, aby mieć ją zawsze pod ręką.') + '<div class="wl-body">' +
      (guide
        ? '<ol class="guide">' + st.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
          '<button class="btn" data-act="installdone">Gotowe, dodałem ikonę</button>' +
          '<p class="note">Potem otwórz aplikację z ikony na ekranie głównym.</p>'
        : '<button class="btn" data-act="install">📲 Dodaj do ekranu głównego</button>') +
      '<button class="link" data-act="skipinstall">Kontynuuj w przeglądarce</button></div></div>';
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
  });
  window.addEventListener('appinstalled', function () { setInstalled(); deferred = null; if (!me()) render(); });

  // ---- Animacja: dron zrzuca premię ----
  var DRONE = '<svg class="drone" viewBox="0 0 200 100" width="200" height="100" aria-hidden="true">' +
    '<g class="rot"><ellipse cx="30" cy="26" rx="26" ry="4" fill="#8fd14f"/><ellipse cx="170" cy="26" rx="26" ry="4" fill="#8fd14f"/><ellipse cx="68" cy="12" rx="20" ry="3" fill="#cdeeb0"/><ellipse cx="132" cy="12" rx="20" ry="3" fill="#cdeeb0"/></g>' +
    '<path d="M30 30v6M170 30v6M68 15v8M132 15v8" stroke="#fff" stroke-width="3"/>' +
    '<path d="M30 36L88 54M170 36L112 54M68 23L92 48M132 23L108 48" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="78" y="44" width="44" height="20" rx="10" fill="#fff"/><circle cx="100" cy="54" r="4.5" fill="#3f9a1f"/>' +
    '<path d="M92 64l-9 32M108 64l9 32" stroke="#8fd14f" stroke-width="2"/></svg>';
  function countTo(el, from, to, dur, delay) {
    if (!el) return;
    setTimeout(function () {
      var t0 = null;
      function f(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    }, delay);
  }
  function playDrop(delta, reason, wait) {
    var u = me(); if (!u) return;
    var el = $('#bal'), end = bal(u.id), start = end - delta, show = !S.hide;
    if (el && show) el.textContent = start;
    if (reduced()) { if (el && show) el.textContent = end; toast('Nowa premia: +' + delta + ' pkt'); return; }
    if (wait) setTimeout(function () { showDrop(delta, reason, el, start, end, show); }, wait);
    else showDrop(delta, reason, el, start, end, show);
  }
  function showDrop(delta, reason, el, start, end, show) {
    var o = document.createElement('div');
    o.className = 'drop'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Nowa premia');
    o.innerHTML = '<div class="dwrap">' + DRONE + '<div class="pkg">🌱</div></div>' +
      '<div class="pop"><b>+' + delta + ' pkt</b><span>' + esc(reason) + '</span></div><small class="tap">Dotknij, aby zamknąć</small>';
    document.body.appendChild(o);
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      o.classList.add('out'); setTimeout(function () { o.remove(); }, 350);
    }
    o.addEventListener('click', close);
    setTimeout(close, 3600);
    if (el && show) countTo(el, start, end, 900, 1700);
  }
  function checkFresh(u) {
    var f = S.ledger.filter(function (l) { return l.uid === u.id && l.status === 'ok' && l.fresh; });
    if (!f.length) return;
    var total = f.reduce(function (s, l) { return s + l.delta; }, 0);
    f.forEach(function (l) { l.fresh = false; });
    save();
    var why = f.length > 1 ? 'Nowe premie (' + f.length + ')' : f[0].reason;
    playDrop(total, why, 250);
  }

  function render() {
    var u = me();
    document.documentElement.setAttribute('data-role', u ? u.role : '');
    var tc = document.querySelector('meta[name=theme-color]');
    if (tc) tc.setAttribute('content', u ? THEME[u.role] : '#14532d');
    if (!u) { $('#app').innerHTML = needInstall() ? installView() : loginView(); window.scrollTo(0, 0); return; }
    var tabs = TABS[u.role];
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = tabs[0][0];
    var np = pending().length;
    $('#app').innerHTML = '<header class="bar"><div class="who2"><span class="av ' + u.role + '">' + esc(ini(u.name)) + '</span><div><b>GardenDrop Team</b><small>' + esc(u.name) + '</small></div></div>' +
      '<button class="ghost" data-act="logout">Wyloguj</button></header><main>' + view(u) + '</main><nav class="tabs">' +
      tabs.map(function (t) {
        var badge = (t[0] === 'appr' && np) ? '<em class="dot">' + np + '</em>' : '';
        return '<button data-act="tab" data-t="' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '><span>' + t[1] + badge + '</span>' + t[2] + '</button>';
      }).join('') + '</nav>';
    window.scrollTo(0, 0);
    if (u.role === 'worker' && tab === 'wallet') checkFresh(u);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var a = t.dataset.act, id = t.dataset.id, u = me();
    if (a === 'install') {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function (c) {
          deferred = null;
          if (c && c.outcome === 'accepted') { setInstalled(); toast('Dodano! Otwórz aplikację z ekranu głównego'); }
          else { guide = true; }
          render();
        });
      } else { guide = true; render(); }
    }
    else if (a === 'installdone') { setInstalled(); render(); }
    else if (a === 'skipinstall') { skip = true; render(); }
    else if (a === 'login') { S.me = id; tab = ''; save(); render(); }
    else if (a === 'logout') { S.me = null; save(); render(); }
    else if (a === 'tab') { tab = t.dataset.t; render(); }
    else if (a === 'eye') { S.hide = !S.hide; save(); render(); }
    else if (a === 'replay') {
      var last = S.ledger.filter(function (l) { return l.uid === u.id && l.status === 'ok' && l.delta > 0; }).pop();
      if (last) playDrop(last.delta, last.reason); else toast('Brak premii do pokazania');
    }
    else if (a === 'redeem') {
      var r = S.rewards.filter(function (x) { return x.id === id; })[0];
      if (!r || bal(u.id) < r.cost) { toast('Za mało punktów'); return; }
      if (!confirm('Wymienić ' + r.cost + ' pkt na: ' + r.name + '?')) return;
      S.ledger.push({ id: S.nextId++, uid: u.id, delta: -r.cost, reason: 'Wymiana: ' + r.name, status: 'ok', date: today() });
      save(); render(); toast('Wymieniono punkty');
    } else if (a === 'ok' || a === 'rej') {
      S.ledger.forEach(function (l) {
        if (String(l.id) === id) { l.status = a === 'ok' ? 'ok' : 'rej'; if (a === 'ok') l.fresh = true; }
      });
      save(); render(); toast(a === 'ok' ? 'Zatwierdzono' : 'Odrzucono');
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target, k = f.dataset.form; if (!k) return;
    e.preventDefault();
    var u = me(), d = new FormData(f);
    if (k === 'card') {
      var c = String(d.get('c4') || '');
      if (!/^[0-9]{4}$/.test(c)) { toast('Podaj 4 cyfry'); return; }
      S.cards[u.id] = c; save(); render(); toast('Zapisano kartę');
    } else if (k === 'award') {
      var pts = parseInt(d.get('p'), 10), why = String(d.get('r') || '').trim();
      if (!(pts > 0) || !why) { toast('Uzupełnij pola'); return; }
      S.ledger.push({ id: S.nextId++, uid: d.get('w'), delta: pts, reason: why, status: 'pend', by: 'boss', date: today() });
      save(); render(); toast('Wysłano do księgowej');
    }
  });

  load(); render();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
