/* Sofia & João Otávio — comportamento do site */
(function () {
  "use strict";

  var CFG = window.CASAMENTO_CONFIG || {};
  var I18N = window.I18N || { it: {}, ui: { pt: {}, it: {} } };
  var MAX = CFG.maxPorTipo || 12;
  var EVENT_START = new Date("2027-10-02T14:30:00-03:00");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmt(str, data) { return String(str).replace(/\{(\w+)\}/g, function (_, k) { return data[k] != null ? data[k] : ""; }); }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* =========================================================
     Idioma (PT no HTML, IT em i18n.js)
     ========================================================= */
  var lang = "pt";
  var originals = { text: new Map(), alt: new Map(), aria: new Map(), ph: new Map() };
  $$("[data-i18n]").forEach(function (el) { originals.text.set(el, el.innerHTML); });
  $$("[data-i18n-alt]").forEach(function (el) { originals.alt.set(el, el.getAttribute("alt")); });
  $$("[data-i18n-aria]").forEach(function (el) { originals.aria.set(el, el.getAttribute("aria-label")); });
  $$("[data-i18n-ph]").forEach(function (el) { originals.ph.set(el, el.getAttribute("placeholder")); });

  function ui(key) { return (I18N.ui[lang] && I18N.ui[lang][key]) || I18N.ui.pt[key] || key; }

  function setLang(next) {
    lang = next === "it" ? "it" : "pt";
    var dict = I18N.it || {};
    function pick(map, attr, setter) {
      map.forEach(function (pt, el) {
        var key = el.getAttribute(attr);
        setter(el, lang === "it" && dict[key] != null ? dict[key] : pt);
      });
    }
    pick(originals.text, "data-i18n", function (el, v) { el.innerHTML = v; });
    pick(originals.alt, "data-i18n-alt", function (el, v) { el.setAttribute("alt", v); });
    pick(originals.aria, "data-i18n-aria", function (el, v) { el.setAttribute("aria-label", v); });
    pick(originals.ph, "data-i18n-ph", function (el, v) { el.setAttribute("placeholder", v); });
    document.documentElement.lang = lang === "it" ? "it" : "pt-BR";
    document.title = ui("title");
    $$(".lang__btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    store("casamento-lang", lang);
    buildCalendar();
    buildContact();
    updateCountdown();
    if (rsvp.ready) { renderPeople(); updateTally(); refreshThanks(); }
    // avisa a lista de presentes (presentes.js) para redesenhar no novo idioma
    try { document.dispatchEvent(new CustomEvent("casamento:lang", { detail: lang })); } catch (e) {}
  }

  $$(".lang__btn").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  function initialLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "pt" || q === "it") return q;
    var saved = store("casamento-lang");
    if (saved === "pt" || saved === "it") return saved;
    // idioma do aparelho: o primeiro da lista de preferências que seja português ou italiano
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
    for (var i = 0; i < prefs.length; i++) {
      var l = String(prefs[i] || "").toLowerCase();
      if (l.indexOf("pt") === 0) return "pt";
      if (l.indexOf("it") === 0) return "it";
    }
    return "pt";
  }

  /* =========================================================
     Abertura, barra, mapas, contagem regressiva
     ========================================================= */
  var hero = $(".hero");
  var heroStarted = false;
  var heroSj = $(".hero__sj");
  var pen = penWriter(heroSj, { tinta: heroSj && (heroSj.currentSrc || heroSj.src), dur: 2.7, cls: "hero__ink" });
  function heroReady() {
    if (!hero || heroStarted) return;
    heroStarted = true;
    hero.classList.add("is-ready");
    pen.start(200);
    setTimeout(countUp, 3200);
  }

  /* O SJ escrito à caneta. Cada ponto da tinta tem um "horário" guardado em sj-tempo.png
     (0 = primeiro toque da caneta, 254 = último), calculado ao longo do traço de cada letra:
     o S de cima para baixo, o bico do S, a barra do J e por fim a haste que desce, faz a
     curva e termina no caracol. A cada quadro, os pontos cujo horário já passou aparecem,
     com uma borda macia e a tinta fresca um pouco mais escura, que seca em seguida.
     Sem canvas, ou com "reduzir movimento", fica a imagem estática do SJ. */
  function penWriter(img, o) {
    var none = { start: function () {} };
    var box = img && img.closest(o.box || ".hero__mark");
    var tempo = img && (img.getAttribute("data-tempo") || "assets/img/sj-tempo.png");
    if (!box || !o.tinta || reduceMotion || !window.HTMLCanvasElement || !window.Promise) return none;
    var DUR = o.dur, EDGE = DUR * 0.034, WET = DUR * 0.15;   // borda macia do traço e tempo da tinta molhada
    var cv = document.createElement("canvas");
    var cx = cv.getContext && cv.getContext("2d");
    if (!cx) return none;
    cv.className = o.cls; cv.setAttribute("aria-hidden", "true");
    box.classList.add("is-writing");
    box.appendChild(cv);

    var data = null, startAt = null, failed = false;
    function fail() {
      if (failed) return;
      failed = true; cv.remove(); box.classList.remove("is-writing");   // o SJ estático aparece
    }
    function loadImg(src) {
      return new Promise(function (ok, no) {
        var im = new Image(); im.decoding = "async";
        im.onload = function () { ok(im); }; im.onerror = no; im.src = src;
      });
    }
    function pixels(im, w, h, smooth) {
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d"); x.imageSmoothingEnabled = smooth;
      if (smooth) x.imageSmoothingQuality = "high";
      x.drawImage(im, 0, 0, w, h);
      return x.getImageData(0, 0, w, h).data;
    }
    Promise.all([loadImg(o.tinta), loadImg(tempo)]).then(function (ims) {
      var w = ims[1].naturalWidth, h = ims[1].naturalHeight;
      if (o.px) {                                  // logo pequeno: reduz a pintura ao tamanho da tela
        var r = box.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
        var nw = Math.round((r.width || 35) * dpr);
        h = Math.round(nw * h / w); w = nw;
      }
      var ink = pixels(ims[0], w, h, true), tm = pixels(ims[1], w, h, false);
      cv.width = w; cv.height = h;
      var out = cx.createImageData(w, h), idx = [], when = [];
      for (var i = 0, n = w * h; i < n; i++) {
        var t = tm[i * 4];
        if (t === 255) continue;                   // papel: nunca recebe tinta
        idx.push(i * 4); when.push(t / 254 * DUR);
      }
      data = { ink: ink, out: out, idx: idx, when: new Float32Array(when) };
      cx.putImageData(out, 0, 0);
      if (startAt !== null) requestAnimationFrame(frame);
    }).catch(fail);
    setTimeout(function () { if (!data) fail(); }, 4000);

    function frame(now) {
      if (failed || !data) return;
      if (startAt === true) startAt = now;
      var T = (now - startAt) / 1000;
      var d = data.out.data, ink = data.ink, idx = data.idx, when = data.when;
      for (var k = 0; k < idx.length; k++) {
        var age = T - when[k];
        if (age <= 0) continue;
        var p = idx[k], a = age >= EDGE ? 1 : age / EDGE;
        var wet = age >= WET ? 1 : 1 - 0.2 * (1 - age / WET);   // tinta fresca mais escura
        d[p] = ink[p] * wet; d[p + 1] = ink[p + 1] * wet; d[p + 2] = ink[p + 2] * wet;
        d[p + 3] = 255 * a;
      }
      cx.putImageData(data.out, 0, 0);
      if (T < DUR + WET + 0.05) requestAnimationFrame(frame);
    }
    var started = false;
    return {
      start: function (delay) {
        if (started) return;
        started = true;
        setTimeout(function () {
          if (failed) return;
          startAt = true;
          if (data) requestAnimationFrame(frame);
        }, delay || 0);
      }
    };
  }

  // o SJ pequeno da barra se escreve quando o monograma grande sai da tela (passa a caneta adiante)
  var barImg = $(".bar__mark img");
  if (barImg && heroSj) {
    var barPen = penWriter(barImg, { tinta: heroSj.getAttribute("src"), dur: 1.5, cls: "bar__ink", box: ".bar__mark", px: true });
    var heroMark = $(".hero__mark");
    if ("IntersectionObserver" in window && heroMark) {
      var handOff = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) { barPen.start(120); handOff.disconnect(); }
      }, { rootMargin: "-56px 0px 0px 0px" });
      handOff.observe(heroMark);
    } else barPen.start(3000);
  }
  var heroImg = $(".hero__mark picture img");
  if (heroImg && !heroImg.complete) { heroImg.addEventListener("load", heroReady); heroImg.addEventListener("error", heroReady); setTimeout(heroReady, 1200); }
  else requestAnimationFrame(function () { requestAnimationFrame(heroReady); });

  // surgimento na rolagem: cada [data-reveal] ganha .is-in ao entrar na tela (uma vez só)
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    // a caligrafia começa recortada (clip-path), então quem é observado é o bloco em volta
    var targets = new Map();
    revealEls.forEach(function (el) {
      var t = el.matches(".letter__sign, .foot__names") ? el.parentElement : el;
      if (!targets.has(t)) targets.set(t, []);
      targets.get(t).push(el);
    });
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        (targets.get(e.target) || []).forEach(function (el) { el.classList.add("is-in"); });
        ro.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    targets.forEach(function (_, t) { ro.observe(t); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  var navLinks = $$(".bar__nav a[href^='#']");
  if ("IntersectionObserver" in window && navLinks.length) {
    var navMap = {};
    navLinks.forEach(function (a) { var sec = document.getElementById(a.getAttribute("href").slice(1)); if (sec) navMap[sec.id] = a; });
    var no = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        if (navMap[e.target.id]) navMap[e.target.id].setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(navMap).forEach(function (id) { no.observe(document.getElementById(id)); });
    // seções que não estão no menu também "apagam" o fio quando o leitor passa por elas
    $$("main > section").forEach(function (sec) { if (!navMap[sec.id]) no.observe(sec); });
  }

  // pinturas e flores andam um pouco mais devagar que a página (profundidade suave)
  var drifters = reduceMotion ? [] : $$(".painting img, .bloom img");
  var driftTick = false;
  function drift() {
    driftTick = false;
    var vh = window.innerHeight;
    drifters.forEach(function (img) {
      var r = img.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var off = (r.top + r.height / 2 - vh / 2) / vh;          // -1 (em cima) … 1 (embaixo)
      var fig = img.closest(".painting"), amp = fig ? 28 : 18;
      var t = "0 " + (off * amp).toFixed(1) + "px";
      img.style.translate = t;
      var credit = fig && fig.querySelector(".painting__credit");   // o crédito acompanha a pintura
      if (credit) credit.style.translate = t;
    });
  }
  if (drifters.length) {
    window.addEventListener("scroll", function () { if (!driftTick) { driftTick = true; requestAnimationFrame(drift); } }, { passive: true });
    window.addEventListener("resize", drift);
    drift();
  }

  // pétalas de comemoração: uma chuva curta de pétalas brancas, amarelas e folhas
  window.celebrate = function () {
    if (reduceMotion) return;
    var c = document.createElement("canvas");
    c.className = "petals"; c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    var ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    var colors = ["#fbfaf3", "#fbfaf3", "#f3e9c8", "#f0d478", "#e6bf55", "#a9b98a"];
    var n = Math.min(90, Math.round(W / 9)), ps = [];
    for (var i = 0; i < n; i++) ps.push({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
      vy: 1.1 + Math.random() * 1.6, sway: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.08,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 3.5, col: colors[i % colors.length]
    });
    var t0 = performance.now(), dur = 3800;
    function frame(ts) {
      var el = ts - t0, fade = el > dur - 900 ? Math.max(0, (dur - el) / 900) : 1;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.y += p.vy; p.ph += 0.03; p.x += Math.sin(p.ph) * p.sway; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.h * Math.abs(Math.cos(p.ph * 0.7)) + 0.8, 0, 0, 6.2832);
        ctx.fillStyle = p.col; ctx.fill();
        ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(74, 89, 52, 0.28)"; ctx.stroke();
        ctx.restore();
      });
      if (el < dur) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  };

  function bump(el) { if (!el || reduceMotion) return; el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }

  var bar = $(".bar");
  function onScroll() { if (bar) bar.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // os mapas só carregam quando a seção se aproxima
  var frames = $$("iframe[data-src]");
  // dentro de outro site (como a prévia do Claude) o Google Maps é bloqueado: fica o mapa ilustrado
  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (framed) { frames.forEach(function (f) { f.hidden = true; }); frames = []; }
  function loadFrame(f) { if (!f.src) f.src = f.dataset.src; }
  if ("IntersectionObserver" in window) {
    var mo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { loadFrame(e.target); mo.unobserve(e.target); } });
    }, { rootMargin: "600px 0px" });
    frames.forEach(function (f) { mo.observe(f); });
  } else frames.forEach(loadFrame);

  var counting = false;
  function daysLeft() {
    // dias inteiros até o dia do casamento (meia-noite em Brasília)
    return Math.ceil((new Date("2027-10-02T00:00:00-03:00").getTime() - Date.now()) / 86400000);
  }
  function countUp() {
    var el = $("#countdown"), days = daysLeft();
    if (!el || reduceMotion || days <= 1) return;
    counting = true;
    var t0 = null, dur = 1400;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(ui("count_many"), { n: Math.max(2, Math.round(days * e)) });
      if (k < 1) requestAnimationFrame(step); else { counting = false; updateCountdown(); }
    }
    requestAnimationFrame(step);
  }
  function updateCountdown() {
    var el = $("#countdown");
    if (!el || counting) return;
    var now = new Date();
    var days = daysLeft();
    if (now.getTime() >= EVENT_START.getTime() + 12 * 3600000) el.textContent = ui("count_past");
    else if (days <= 0) el.textContent = ui("count_today");
    else if (days === 1) el.textContent = ui("count_one");
    else el.textContent = fmt(ui("count_many"), { n: days });
  }
  setInterval(updateCountdown, 60000);

  // seções que só aparecem quando tiverem conteúdo (vinhos, presentes)
  $$("[data-needs]").forEach(function (a) {
    var target = document.getElementById(a.dataset.needs);
    if (!target || target.hidden) a.hidden = true;
  });

  /* =========================================================
     Agenda, contato e PIX
     ========================================================= */
  var WHERE = "Hotel Resort & Golfe Clube dos 500, Guaratinguetá - SP, Brasil";
  function buildCalendar() {
    var title = ui("cal_title"), details = ui("cal_details");
    var g = $("#cal-google"), ics = $("#cal-ics");
    if (g) {
      g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" + encodeURIComponent(title) +
        "&dates=20271002T173000Z/20271003T030000Z" +
        "&details=" + encodeURIComponent(details + "\n" + location.href.split("#")[0]) +
        "&location=" + encodeURIComponent(WHERE);
    }
    if (ics) {
      var esc = function (s) { return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n"); };
      var body = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Casamento Sofia e Joao Otavio//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:casamento-sofia-joao-20271002@casamento-sofia-joao",
        "DTSTAMP:20261105T120000Z",
        "DTSTART:20271002T173000Z",
        "DTEND:20271003T030000Z",
        "SUMMARY:" + esc(title),
        "LOCATION:" + esc(WHERE),
        "DESCRIPTION:" + esc(details),
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title), "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");
      ics.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
    }
  }

  /* janelas das tarifas dos hotéis: abrem pelo botão do cartão; fecham no X, no Esc ou tocando fora */
  function closeSheet(d) { if (d.close) d.close(); else { d.removeAttribute("open"); if (d._from) d._from.focus(); } }
  $$("[data-sheet]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = document.getElementById(btn.getAttribute("data-sheet"));
      if (!d) return;
      d._from = btn;
      if (d.showModal) d.showModal(); else d.setAttribute("open", "");
      var inner = $(".sheet__inner", d); if (inner) inner.scrollTop = 0;
    });
  });
  $$(".sheet").forEach(function (d) {
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.closest("[data-close]")) closeSheet(d);
    });
    d.addEventListener("close", function () { if (d._from) d._from.focus(); });
  });

  /* botão "Copiar" da tarifa do casamento: copia o texto para colar no WhatsApp/e-mail do hotel */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() {
        var keep = btn.innerHTML;
        btn.textContent = ui("copied_short") + " ✓";
        btn.classList.add("is-done");
        setTimeout(function () { btn.innerHTML = keep; btn.classList.remove("is-done"); }, 2000);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        ta.remove();
      }
      if (btn.classList.contains("is-done")) return;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  function buildContact() {
    var a = $("#contact-wa");
    if (!a) return;
    var num = String(CFG.whatsappRsvp || "").replace(/\D/g, "");
    if (!num) { a.hidden = true; return; }
    a.hidden = false;
    a.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(ui("wa_text"));
  }

  /* =========================================================
     Confirmação de presença
     ========================================================= */
  var form = $("#rsvp-form");
  var rsvp = { ready: false, adults: 1, kids: 0, people: [], nameTouched: false, last: null };

  function selected(name) { var el = form && form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function attending() { return selected("asiste") === "si"; }
  function event() { return selected("evento") || "ambos"; }

  function syncPeople() {
    var adults = rsvp.people.filter(function (p) { return p.tipo === "adulto"; });
    var kids = rsvp.people.filter(function (p) { return p.tipo === "nino"; });
    while (adults.length < rsvp.adults) adults.push({ tipo: "adulto", nombre: "" });
    while (kids.length < rsvp.kids) kids.push({ tipo: "nino", nombre: "", edad: "" });
    adults.length = rsvp.adults; kids.length = rsvp.kids;
    rsvp.people = adults.concat(kids);
    if (!rsvp.nameTouched && rsvp.people[0]) rsvp.people[0].nombre = $("#f-nombre").value.trim();
  }

  function renderPeople() {
    var list = $("#people-list");
    if (!list) return;
    var nA = 0, nK = 0;
    var focused = document.activeElement && document.activeElement.id;
    list.innerHTML = "";
    rsvp.people.forEach(function (p, i) {
      var n = p.tipo === "adulto" ? ++nA : ++nK;
      var tag = (p.tipo === "adulto" ? ui("adult") : ui("kid")) + " " + n;
      var li = document.createElement("li");
      li.className = "person";
      if (reduceMotion || !rsvp.animateNext || i < rsvp.animateFrom) li.style.animation = "none";

      var head = document.createElement("div");
      head.className = "person__head";
      head.innerHTML = '<span class="person__tag"></span>';
      head.firstChild.textContent = tag;
      li.appendChild(head);

      var input = document.createElement("input");
      input.type = "text"; input.id = "p-" + i; input.maxLength = 80; input.autocomplete = "off";
      input.placeholder = ui("name_ph");
      input.setAttribute("aria-label", tag + ": " + ui("name_ph"));
      input.value = p.nombre;
      input.addEventListener("input", function () {
        p.nombre = input.value;
        if (i === 0) rsvp.nameTouched = true;
        input.removeAttribute("aria-invalid");
      });
      li.appendChild(input);

      if (p.tipo === "nino") {
        var ag = document.createElement("div");
        ag.className = "age";
        var al = document.createElement("label");
        al.htmlFor = "a-" + i; al.textContent = ui("age_label");
        var as = document.createElement("select");
        as.id = "a-" + i;
        as.setAttribute("aria-label", tag + ": " + ui("age_label"));
        var o0 = document.createElement("option"); o0.value = ""; o0.textContent = ui("age_choose"); as.appendChild(o0);
        for (var y = 0; y <= 17; y++) {
          var oy = document.createElement("option");
          oy.value = String(y);
          oy.textContent = y === 0 ? ui("age_under1") : y + " " + (y === 1 ? ui("year") : ui("years"));
          if (p.edad === String(y)) oy.selected = true;
          as.appendChild(oy);
        }
        as.addEventListener("change", function () { p.edad = as.value; as.removeAttribute("aria-invalid"); clearError("personas"); });
        ag.appendChild(al); ag.appendChild(as);
        li.appendChild(ag);
      }

      list.appendChild(li);
    });
    rsvp.animateNext = false;
    if (focused && document.getElementById(focused)) document.getElementById(focused).focus();
  }

  function updateSteppers() {
    $$(".stepper").forEach(function (st) {
      var kind = st.dataset.kind, val = kind === "adulto" ? rsvp.adults : rsvp.kids, min = kind === "adulto" ? 1 : 0;
      $(".stepper__val", st).textContent = val;
      $('[data-step="-1"]', st).disabled = val <= min;
      $('[data-step="1"]', st).disabled = val >= MAX;
    });
  }

  function countLine(a, k) {
    var parts = [a + " " + (a === 1 ? ui("adult1") : ui("adults"))];
    if (k) parts.push(k + " " + (k === 1 ? ui("kid1") : ui("kids")));
    return parts.join(" " + ui("and") + " ");
  }

  function updateTally() {
    var big = $("#tally-big"), small = $("#tally-small");
    if (!big) return;
    var a = selected("asiste");
    if (a === "no") { big.textContent = "—"; small.textContent = ui("tally_no"); return; }
    if (a !== "si") { big.textContent = "—"; small.textContent = ui("tally_empty"); return; }
    var total = rsvp.adults + rsvp.kids;
    if (big.textContent !== String(total)) { big.textContent = String(total); bump(big); }
    small.textContent = (total === 1 ? ui("person") : ui("people")) + " · " + countLine(rsvp.adults, rsvp.kids) + " · " + ui("ev_" + event());
  }

  function setError(key, msg) {
    var p = form.querySelector('.field__error[data-for="' + key + '"]');
    if (p) p.textContent = msg || "";
  }
  function clearError(key) { setError(key, ""); }

  function validate() {
    var ok = true, first = null;
    var name = $("#f-nombre");
    if (!name.value.trim()) { setError("nombre", ui("err_name")); name.setAttribute("aria-invalid", "true"); ok = false; first = first || name; }
    else { clearError("nombre"); name.removeAttribute("aria-invalid"); }
    var a = selected("asiste");
    if (!a) { setError("asiste", ui("err_attend")); ok = false; first = first || form.querySelector('input[name="asiste"]'); }
    else clearError("asiste");
    if (a === "si") {
      var missingName = -1, missingAge = -1;
      rsvp.people.forEach(function (p, i) {
        if (!p.nombre.trim() && missingName < 0) missingName = i;
        if (p.tipo === "nino" && !p.edad && missingAge < 0) missingAge = i;
      });
      if (missingName >= 0) {
        setError("personas", ui("err_person")); ok = false;
        var inp = $("#p-" + missingName); if (inp) { inp.setAttribute("aria-invalid", "true"); first = first || inp; }
      } else if (missingAge >= 0) {
        setError("personas", ui("err_age")); ok = false;
        var asel = $("#a-" + missingAge); if (asel) { asel.setAttribute("aria-invalid", "true"); first = first || asel; }
      } else clearError("personas");
    }
    if (first) first.focus({ preventScroll: false });
    return ok;
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function idadePt(v) {
    if (v === "" || v == null) return "";
    var n = parseInt(v, 10);
    return n === 0 ? "Menos de 1 ano" : n + (n === 1 ? " ano" : " anos");
  }
  function hospedagemPt(v) { return v === "si" ? "Sim" : v === "no" ? "Não" : v === "nose" ? "Ainda não sabe" : ""; }

  function payload() {
    var a = selected("asiste") === "si";
    var ev = event();
    return {
      id: uid(),
      enviado: new Date().toISOString(),
      idioma: lang,
      responsavel: $("#f-nombre").value.trim(),
      telefone: $("#f-tel").value.trim(),
      vem: a ? "sim" : "nao",
      cerimonia: a && ev !== "fiesta",
      festa: a && ev !== "misa",
      adultos: a ? rsvp.adults : 0,
      criancas: a ? rsvp.kids : 0,
      pessoas: a ? rsvp.people.map(function (p) {
        return { nome: p.nombre.trim(), tipo: p.tipo === "adulto" ? "Adulto" : "Criança", idade: p.tipo === "nino" ? idadePt(p.edad) : "" };
      }) : [],
      restricoes: a ? $("#f-restricoes").value.trim() : "",
      hospedagem: a ? hospedagemPt(selected("hospedagem")) : ""
    };
  }

  function send(data) {
    var body = JSON.stringify(data);
    if (!CFG.endpoint) return new Promise(function (res) { setTimeout(function () { res({ ok: true, test: true }); }, 700); });
    return fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, redirect: "follow" })
      .then(function (r) { return r.json(); })
      .catch(function () {
        // alguns navegadores bloqueiam a leitura da resposta do Google; o envio em si funciona
        return fetch(CFG.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
          .then(function () { return { ok: true, opaque: true }; })
          .catch(function () { return { ok: false }; });
      });
  }

  function refreshThanks() {
    if (!rsvp.last || $("#thanks").hidden) return;
    var d = rsvp.last;
    var first = d.responsavel.split(/\s+/)[0];
    $("#thanks-big").textContent = ui("thanks_big");
    if (d.vem === "sim") {
      var total = d.adultos + d.criancas;
      var summary = total + " " + (total === 1 ? ui("person") : ui("people")) + ", " + ui("ev_" + (d.cerimonia && d.festa ? "ambos" : d.cerimonia ? "misa" : "fiesta"));
      $("#thanks-text").textContent = fmt(ui("thanks_yes"), { name: first, summary: summary });
    } else {
      $("#thanks-text").textContent = fmt(ui("thanks_no"), { name: first });
    }
  }

  if (form) {
    var whenYes = $(".when-yes", form);
    var deadline = CFG.prazo ? new Date(CFG.prazo) : null;
    if (CFG.fecharDepoisDoPrazo && deadline && Date.now() > deadline.getTime()) {
      form.hidden = true;
      var closed = document.createElement("p");
      closed.className = "form-closed";
      closed.textContent = ui("closed");
      form.parentNode.insertBefore(closed, form);
    }

    $$('input[name="asiste"]', form).forEach(function (r) {
      r.addEventListener("change", function () {
        whenYes.hidden = !attending();
        clearError("asiste");
        if (attending()) { syncPeople(); rsvp.animateNext = true; rsvp.animateFrom = 0; renderPeople(); }
        updateTally();
      });
    });
    $$('input[name="evento"]', form).forEach(function (r) {
      r.addEventListener("change", function () { clearError("personas"); updateTally(); });
    });
    $("#f-nombre").addEventListener("input", function () {
      clearError("nombre");
      this.removeAttribute("aria-invalid");
      if (!rsvp.nameTouched && rsvp.people[0]) {
        rsvp.people[0].nombre = this.value.trim();
        var p0 = $("#p-0"); if (p0) p0.value = this.value.trim();
      }
    });
    $$(".stepper", form).forEach(function (st) {
      $$(".stepper__btn", st).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var d = parseInt(btn.dataset.step, 10);
          var before = rsvp.people.length;
          if (st.dataset.kind === "adulto") rsvp.adults = Math.min(MAX, Math.max(1, rsvp.adults + d));
          else rsvp.kids = Math.min(MAX, Math.max(0, rsvp.kids + d));
          syncPeople();
          rsvp.animateNext = d > 0;
          rsvp.animateFrom = st.dataset.kind === "adulto" ? rsvp.adults - 1 : before;
          renderPeople();
          updateSteppers();
          updateTally();
          clearError("personas");
        });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $("#form-status"), btn = $("#submit-btn");
      status.classList.remove("is-error");
      status.textContent = "";
      if (!validate()) return;
      var data = payload();
      btn.disabled = true;
      status.textContent = ui("sending");
      send(data).then(function (res) {
        btn.disabled = false;
        if (!res || res.ok === false) {
          status.classList.add("is-error");
          status.textContent = ui("err_send");
          return;
        }
        status.textContent = "";
        rsvp.last = data;
        form.hidden = true;
        var th = $("#thanks");
        th.hidden = false;
        refreshThanks();
        if (res.test) {
          var note = document.createElement("span");
          note.className = "thanks__test";
          note.textContent = ui("test_mode");
          $("#thanks-text").appendChild(note);
        }
        th.focus();
        if (data.vem === "sim" && window.celebrate) window.celebrate();
      });
    });

    $("#thanks-again").addEventListener("click", function () {
      $("#thanks").hidden = true;
      form.hidden = false;
      form.reset();
      rsvp.adults = 1; rsvp.kids = 0; rsvp.people = []; rsvp.nameTouched = false; rsvp.last = null;
      whenYes.hidden = true;
      syncPeople(); renderPeople(); updateSteppers(); updateTally();
      $("#f-nombre").focus();
    });

    syncPeople();
    updateSteppers();
    rsvp.ready = true;
  }

  setLang(initialLang());
})();
