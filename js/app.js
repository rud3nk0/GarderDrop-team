(function () {
  'use strict';
  // DEMO: dane są zapisane tylko w przeglądarce tego urządzenia (localStorage).
  var KEY = 'gdteam-v1', INST = 'gdteam-installed', S, tab = '', skip = false, guide = false, deferred = null;

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() { return new Date().toLocaleDateString('pl-PL'); }

  function seed() {
    return {
      me: null, nextId: 10, cards: {},
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
        { id: 3, uid: 'u3', delta: 150, reason: 'Pomoc przy wdrożeniu nowego drona', status: 'ok', date: today() }
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
  function toast(m) {
    var t = $('#toast'); t.textContent = m; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  var TABS = {
    worker: [['wallet', '💰', 'Portfel'], ['rewards', '🎁', 'Nagrody'], ['card', '🏋️', 'Multisport']],
    boss: [['award', '⭐', 'Przyznaj'], ['hist', '🧾', 'Historia']],
    acc: [['appr', '✅', 'Do akceptacji'], ['bal', '📊', 'Salda'], ['hist', '🧾', 'Historia']]
  };

  function row(l, showName) {
    var st = { ok: '', pend: '<em class="b w">Oczekuje</em>', rej: '<em class="b r">Odrzucono</em>' }[l.status] || '';
    var u = user(l.uid);
    return '<li><div><strong>' + esc(l.reason) + '</strong><small>' + (showName && u ? esc(u.name) + ' · ' : '') + l.date + ' ' + st + '</small></div>' +
      '<span class="pts ' + (l.delta < 0 ? 'neg' : 'pos') + '">' + (l.delta > 0 ? '+' : '') + l.delta + '</span></li>';
  }
  function list(items, showName, empty) {
    if (!items.length) return '<p class="note">' + empty + '</p>';
    return '<ul class="l">' + items.slice().reverse().map(function (l) { return row(l, showName); }).join('') + '</ul>';
  }

  function loginView() {
    return '<div class="login"><img src="img/icon-192.png" alt="" width="96" height="96"><h1>GardenDrop Team</h1>' +
      '<p>Premie punktowe i benefity dla zespołu</p>' +
      S.users.map(function (u) {
        var r = { worker: 'Pracownik', boss: 'Prezes / dyrektor', acc: 'Księgowość' }[u.role];
        return '<button class="btn" data-act="login" data-id="' + u.id + '"><span>' + esc(u.name) + '</span><small>' + r + '</small></button>';
      }).join('') +
      '<p class="note">Wersja demonstracyjna. Dane są zapisane tylko na tym urządzeniu.</p></div>';
  }

  function view(u) {
    var h = '';
    if (tab === 'wallet') {
      h = '<div class="hero"><small>Twoje punkty</small><div class="n">' + bal(u.id) + '</div></div><h2>Historia</h2>' +
        list(S.ledger.filter(function (l) { return l.uid === u.id; }), false, 'Brak wpisów.');
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
        list(S.ledger.filter(function (l) { return l.by === 'boss'; }), true, 'Brak wniosków.');
    } else if (tab === 'appr') {
      var p = S.ledger.filter(function (l) { return l.status === 'pend'; });
      h = '<h2>Do akceptacji</h2>' + (p.length ? '<ul class="l">' + p.map(function (l) {
        return '<li style="flex-wrap:wrap"><div><strong>' + esc(l.reason) + '</strong><small>' + esc(user(l.uid).name) + ' · ' + l.date + '</small></div><span class="pts pos">+' + l.delta + '</span>' +
          '<div class="acts" style="width:100%"><button class="btn s" data-act="ok" data-id="' + l.id + '">Zatwierdź</button><button class="btn s d" data-act="rej" data-id="' + l.id + '">Odrzuć</button></div></li>';
      }).join('') + '</ul>' : '<p class="note">Brak wniosków do akceptacji.</p>');
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
    var steps = IOS
      ? ['Kliknij ikonę „Udostępnij” ' + SHARE + ' na dole ekranu Safari.', 'Przewiń w dół i wybierz „Dodaj do ekranu początkowego”.', 'Kliknij „Dodaj”. Ikona pojawi się na ekranie głównym.']
      : ['Kliknij menu przeglądarki ⋮ (prawy górny róg).', 'Wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.', 'Potwierdź. Ikona pojawi się na ekranie głównym.'];
    return '<div class="login inst"><img src="img/icon-192.png" alt="" width="96" height="96"><h1>GardenDrop Team</h1>' +
      '<p>Zainstaluj aplikację na telefonie, aby mieć ją zawsze pod ręką.</p>' +
      (guide
        ? '<ol class="guide">' + steps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
          '<button class="btn" data-act="installdone">Gotowe, dodałem ikonę</button>' +
          '<p class="note">Potem otwórz aplikację z ikony na ekranie głównym.</p>'
        : '<button class="btn" data-act="install">📲 Dodaj do ekranu głównego</button>') +
      '<button class="link" data-act="skipinstall">Kontynuuj w przeglądarce</button></div>';
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
  });
  window.addEventListener('appinstalled', function () { setInstalled(); deferred = null; if (!me()) render(); });

  function render() {
    var u = me();
    if (!u) { $('#app').innerHTML = needInstall() ? installView() : loginView(); return; }
    var tabs = TABS[u.role];
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = tabs[0][0];
    $('#app').innerHTML = '<header class="bar"><div><b>GardenDrop Team</b><small>' + esc(u.name) + '</small></div>' +
      '<button class="ghost" data-act="logout">Wyloguj</button></header><main>' + view(u) + '</main><nav class="tabs">' +
      tabs.map(function (t) {
        return '<button data-act="tab" data-t="' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '><span>' + t[1] + '</span>' + t[2] + '</button>';
      }).join('') + '</nav>';
    window.scrollTo(0, 0);
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
    else if (a === 'redeem') {
      var r = S.rewards.filter(function (x) { return x.id === id; })[0];
      if (!r || bal(u.id) < r.cost) { toast('Za mało punktów'); return; }
      if (!confirm('Wymienić ' + r.cost + ' pkt na: ' + r.name + '?')) return;
      S.ledger.push({ id: S.nextId++, uid: u.id, delta: -r.cost, reason: 'Wymiana: ' + r.name, status: 'ok', date: today() });
      save(); render(); toast('Wymieniono punkty');
    } else if (a === 'ok' || a === 'rej') {
      S.ledger.forEach(function (l) { if (String(l.id) === id) l.status = a === 'ok' ? 'ok' : 'rej'; });
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
