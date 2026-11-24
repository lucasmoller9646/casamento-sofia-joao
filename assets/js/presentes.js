/* Lista de presentes: o convidado monta um "carrinho" e o site gera um QR Code Pix
   com o valor total (BR Code estático do Banco Central, montado no próprio navegador).
   Nada passa por plataforma de pagamento: o dinheiro cai direto na conta dos noivos.
   Depois de pagar, o convidado deixa o nome e um recado, que vão para a aba Presentes. */
(function () {
  "use strict";

  var CFG = window.CASAMENTO_CONFIG || {};
  var DATA = window.LISTA_PRESENTES || { categorias: [], itens: [] };
  var T = (window.I18N && window.I18N.presentes) || { pt: {}, it: {} };
  var root = document.getElementById("presentes");
  if (!root || !DATA.itens.length) return;

  var MAXQ = 10;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var listEl = document.getElementById("gift-list");
  var cartEl = document.getElementById("gift-cart");
  var barEl = document.getElementById("gift-bar");

  /* ---------- utilidades ---------- */
  function lang() { return (document.documentElement.lang || "pt").indexOf("it") === 0 ? "it" : "pt"; }
  function t(key, data) {
    var s = (T[lang()] && T[lang()][key]) || T.pt[key] || key;
    return data ? String(s).replace(/\{(\w+)\}/g, function (_, k) { return data[k] != null ? data[k] : ""; }) : s;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(v) { v = Math.round(v * 100) / 100; return "R$ " + (v % 1 ? nf2 : nf0).format(v); }
  function byId(id) { for (var i = 0; i < DATA.itens.length; i++) if (DATA.itens[i].id === id) return DATA.itens[i]; return null; }
  function nameOf(item) { return item[lang()] || item.pt; }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* ---------- estado ---------- */
  var cart = {};          // id -> quantidade
  var lastTotal = null;   // para o total pulsar quando muda
  var livre = 0;          // presente em dinheiro, valor escolhido pelo convidado
  var MAX_LIVRE = 50000;
  var FREE = { id: "dinheiro", pt: "Presente em dinheiro", it: "Regalo in denaro" };
  var state = "list";     // list | pay | done
  var order = null;       // { txid, total, code, items }
  try {
    var saved = JSON.parse(store("casamento-presentes") || "{}");
    Object.keys(saved).forEach(function (id) { var q = parseInt(saved[id], 10); if (byId(id) && q > 0) cart[id] = Math.min(MAXQ, q); });
    var lv = Number(saved._livre); if (lv > 0 && lv <= MAX_LIVRE) livre = Math.round(lv * 100) / 100;
  } catch (e) { cart = {}; }

  function cartItems() {
    var rows = livre > 0 ? [{ item: { id: FREE.id, pt: FREE.pt, it: FREE.it, valor: livre }, qtd: 1, subtotal: livre }] : [];
    return rows.concat(DATA.itens.filter(function (it) { return cart[it.id] > 0; })
      .map(function (it) { return { item: it, qtd: cart[it.id], subtotal: it.valor * cart[it.id] }; }));
  }
  function total() { return Math.round(cartItems().reduce(function (s, r) { return s + r.subtotal; }, 0) * 100) / 100; }
  function save() {
    var o = {}; Object.keys(cart).forEach(function (k) { o[k] = cart[k]; });
    if (livre > 0) o._livre = livre;
    store("casamento-presentes", JSON.stringify(o));
  }
  function count() { return cartItems().reduce(function (s, r) { return s + r.qtd; }, 0); }

  function setQty(id, q) {
    var old = cart[id] || 0;
    q = Math.max(0, Math.min(MAXQ, q));
    if (q) cart[id] = q; else delete cart[id];
    save();
    if (state !== "list") { state = "list"; order = null; }
    renderRow(id);
    if (q > old && !reduceMotion) {   // a linha acende quando a quantidade sobe
      var row = listEl.querySelector('[data-row="' + id + '"]');
      if (row) { row.classList.remove("just-added"); void row.offsetWidth; row.classList.add("just-added"); }
    }
    renderCart();
    updateBar();
  }

  /* =========================================================
     Pix: BR Code estático (EMV QRCPS-MPM) com valor
     ========================================================= */
  function ascii(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function field(id, value) { var v = String(value); return id + (v.length < 10 ? "0" : "") + v.length + v; }
  function crc16(s) {
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return ("0000" + crc.toString(16).toUpperCase()).slice(-4);
  }
  function pixKey(raw) {
    var k = String(raw || "").trim();
    if (/^[\d.\-\/ ]+$/.test(k) && k.replace(/\D/g, "").length >= 11 && k.indexOf("+") !== 0) return k.replace(/\D/g, ""); // CPF/CNPJ
    if (k.indexOf("@") > 0) return k.toLowerCase();                                                                       // e-mail
    if (/^\+?[\d ()\-]+$/.test(k)) { var d = k.replace(/\D/g, ""); return "+" + (d.indexOf("55") === 0 ? d : "55" + d); } // telefone
    return k;                                                                                                              // aleatória
  }
  function pixConfig() {
    var p = CFG.pix || {};
    var key = pixKey(p.chave);
    return {
      test: !key,
      key: key || "teste@exemplo.com.br",
      name: ascii(p.nome || "Sofia e Joao Otavio").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 25).toUpperCase(),
      city: ascii(p.cidade || "Guaratingueta").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 15).toUpperCase()
    };
  }
  function brcode(amount, txid) {
    var c = pixConfig();
    var desc = "Presente casamento Sofia e Joao";
    var gui = field("00", "br.gov.bcb.pix") + field("01", c.key);
    var mai = gui + field("02", desc);
    if (mai.length > 99) mai = gui;
    var payload = field("00", "01") +
      field("26", mai) +
      field("52", "0000") +
      field("53", "986") +
      field("54", amount.toFixed(2)) +
      field("58", "BR") +
      field("59", c.name) +
      field("60", c.city) +
      field("62", field("05", txid)) +
      "6304";
    return payload + crc16(payload);
  }
  function newTxid() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "SJ";
    var r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
    for (var i = 0; i < 8; i++) s += a[(r ? r[i] : Math.floor(Math.random() * 256)) % a.length];
    return s;
  }
  function qrSvg(text) {
    var qr = window.qrcode(0, "M");
    qr.addData(text, "Byte");
    qr.make();
    var n = qr.getModuleCount(), q = 4, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + (c + q) + " " + (r + q) + "h1v1h-1z";
    var size = n + q * 2;
    return '<svg class="pay__qr" viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="' + esc(t("qr_alt")) + '" shape-rendering="crispEdges">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#232b1a"/></svg>';
  }

  /* =========================================================
     Lista
     ========================================================= */
  function ctlHtml(it) {
    var q = cart[it.id] || 0, nm = esc(nameOf(it));
    if (!q) return '<button type="button" class="gift__add" data-act="add" data-id="' + it.id + '" aria-label="' + esc(t("aria_add", { item: nameOf(it) })) + '"><span aria-hidden="true">+</span><span class="gift__add-label">' + esc(t("add")) + "</span></button>";
    return '<span class="qty" role="group" aria-label="' + esc(t("qty")) + ": " + nm + '">' +
      '<button type="button" class="qty__btn" data-act="less" data-id="' + it.id + '" aria-label="' + esc(t(q === 1 ? "aria_remove" : "aria_less", { item: nameOf(it) })) + '">−</button>' +
      '<output class="qty__val" aria-live="polite">' + q + "</output>" +
      '<button type="button" class="qty__btn" data-act="more" data-id="' + it.id + '" aria-label="' + esc(t("aria_more", { item: nameOf(it) })) + '"' + (q >= MAXQ ? " disabled" : "") + ">+</button></span>";
  }

  function parseMoney(raw) {
    var s = String(raw || "").replace(/R\$|\s/gi, "");
    if (!s) return NaN;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");                       // 1.250,50
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, ""); // 1.250
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100) / 100;
  }
  function freeHtml() {
    var has = livre > 0;
    return '<div class="gifts__free">' +
      '<form class="free" novalidate><label class="free__lead" for="free-val">' + esc(t("free_lead")) + "</label>" +
      '<div class="free__row"><span class="free__input"><span class="free__cur" aria-hidden="true">R$</span>' +
      '<input id="free-val" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (has ? esc(nf2.format(livre)) : "") + '"></span>' +
      '<button type="submit" class="btn btn--line btn--small free__btn">' + esc(t(has ? "free_update" : "free_add")) + "</button></div>" +
      '<p class="field__error free__err" role="alert"></p>' +
      (has ? '<p class="free__on">' + esc(t("free_on", { valor: money(livre) })) + ' <button type="button" class="link" data-free="remove">' + esc(t("free_remove")) + "</button></p>" : "") +
      "</form></div>";
  }
  function setLivre(v) {
    livre = v > 0 ? v : 0;
    save();
    if (state !== "list") { state = "list"; order = null; }
    var box = listEl.querySelector(".gifts__free");
    if (box) box.outerHTML = freeHtml();
    renderCart();
    updateBar();
  }

  function renderList() {
    var html = "";
    DATA.categorias.forEach(function (cat) {
      var items = DATA.itens.filter(function (it) { return it.categoria === cat.id; });
      if (!items.length) return;
      html += '<div class="gifts__group"><h3 class="gifts__cat">' + esc(cat[lang()] || cat.pt) + '</h3><ul class="gifts__items">';
      items.forEach(function (it) {
        html += '<li class="gift' + (cart[it.id] ? " is-on" : "") + '" data-row="' + it.id + '">' +
          '<span class="gift__name">' + esc(nameOf(it)) + "</span>" +
          '<span class="gift__price">' + money(it.valor) + "</span>" +
          '<span class="gift__ctl">' + ctlHtml(it) + "</span></li>";
      });
      html += "</ul></div>";
    });
    listEl.innerHTML = html + freeHtml();
  }

  function renderRow(id) {
    var row = listEl.querySelector('[data-row="' + id + '"]');
    var it = byId(id);
    if (!row || !it) return;
    var hadFocus = document.activeElement && row.contains(document.activeElement) ? document.activeElement.getAttribute("data-act") : null;
    row.classList.toggle("is-on", !!cart[id]);
    row.querySelector(".gift__ctl").innerHTML = ctlHtml(it);
    if (hadFocus) {
      var target = row.querySelector('[data-act="' + hadFocus + '"]:not([disabled])') || row.querySelector("[data-act]:not([disabled])");
      if (target) target.focus();
    }
  }

  listEl.addEventListener("submit", function (e) {
    if (!e.target.classList.contains("free")) return;
    e.preventDefault();
    var input = e.target.querySelector("#free-val"), err = e.target.querySelector(".free__err");
    var v = parseMoney(input.value);
    if (!(v > 0)) { err.textContent = t("free_err"); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    if (v > MAX_LIVRE) { err.textContent = t("free_err_max", { max: money(MAX_LIVRE) }); input.setAttribute("aria-invalid", "true"); input.focus(); return; }
    setLivre(v);
    var b = listEl.querySelector(".free__btn"); if (b) b.focus();
  });
  listEl.addEventListener("input", function (e) {
    if (e.target.id !== "free-val") return;
    e.target.removeAttribute("aria-invalid");
    var err = listEl.querySelector(".free__err"); if (err) err.textContent = "";
  });

  listEl.addEventListener("click", function (e) {
    if (e.target.closest('[data-free="remove"]')) { setLivre(0); var i = listEl.querySelector("#free-val"); if (i) i.focus(); return; }
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var id = b.getAttribute("data-id"), q = cart[id] || 0, act = b.getAttribute("data-act");
    setQty(id, act === "less" ? q - 1 : q + 1);
  });

  /* =========================================================
     Painel do presente (carrinho → Pix → agradecimento)
     ========================================================= */
  function renderCart() {
    var rows = cartItems(), tot = total();
    // durante o pagamento o painel fica alto demais para acompanhar a rolagem
    cartEl.classList.toggle("is-open", state !== "list");
    var html = '<h3 class="cart__title">' + esc(t("cart_title")) + "</h3>";

    if (state === "done" && order) {
      html += '<div class="cart__done" tabindex="-1">' +
        '<p class="script cart__thanks">' + esc(t("thanks_big")) + "</p>" +
        "<p>" + esc(t("thanks", { name: order.who.split(/\s+/)[0], valor: money(order.total) })) + "</p>" +
        (order.test ? '<p class="cart__note">' + esc(t("test_send")) + "</p>" : "") +
        '<button type="button" class="link" data-cart="again">' + esc(t("again")) + "</button></div>";
      cartEl.innerHTML = html;
      return;
    }

    if (!rows.length) {
      cartEl.innerHTML = html + '<p class="cart__empty">' + esc(t("cart_empty")) + "</p>";
      return;
    }

    html += '<ul class="cart__items">';
    rows.forEach(function (r) {
      html += '<li><span class="cart__name">' + (r.qtd > 1 ? '<span class="cart__q">' + r.qtd + "×</span> " : "") + esc(nameOf(r.item)) + '</span><span class="cart__sub">' + money(r.subtotal) + "</span></li>";
    });
    html += '</ul><p class="cart__total"><span>' + esc(t("total")) + '</span><strong class="' + (lastTotal !== null && lastTotal !== tot && !reduceMotion ? "is-bump" : "") + '">' + money(tot) + "</strong></p>";
    lastTotal = tot;

    if (state === "list") {
      html += '<button type="button" class="btn btn--wide" data-cart="pay">' + esc(t("gen", { valor: money(tot) })) + "</button>";
      cartEl.innerHTML = html;
      return;
    }

    // state === "pay"
    var c = pixConfig();
    html += '<div class="pay">' +
      (c.test ? '<p class="cart__note pay__test">' + esc(t("test_key")) + "</p>" : "") +
      '<p class="pay__how">' + esc(t("pay_how")) + "</p>" +
      '<div class="pay__qrbox">' + qrSvg(order.code) + "</div>" +
      '<dl class="pay__facts"><div><dt>' + esc(t("to")) + "</dt><dd>" + esc(c.name) + "</dd></div>" +
      "<div><dt>" + esc(t("value")) + "</dt><dd>" + money(order.total) + "</dd></div></dl>" +
      '<button type="button" class="btn btn--line btn--wide" data-cart="copy">' + esc(t("copy")) + "</button>" +
      '<p class="pay__copied" role="status" aria-live="polite"></p>' +
      '<label class="pay__codelabel" for="pix-code">' + esc(t("code_label")) + "</label>" +
      '<textarea id="pix-code" class="pay__code" readonly rows="3">' + esc(order.code) + "</textarea>";

    var iban = CFG.iban || {};
    if (iban.iban) {
      html += '<div class="pay__iban"><p class="pay__iban-title">' + esc(t("iban_title")) + "</p>" +
        "<p>" + esc(t("iban_text")) + "</p><p class=\"pay__iban-data\">" +
        (iban.titular ? esc(iban.titular) + "<br>" : "") + "IBAN " + esc(iban.iban) + (iban.bic ? "<br>BIC/SWIFT " + esc(iban.bic) : "") + "</p></div>";
    }

    html += '<form class="done" novalidate>' +
      '<p class="done__title">' + esc(t("done_title")) + "</p>" +
      '<p class="done__lead">' + esc(t("done_lead")) + "</p>" +
      '<div class="field"><label for="g-nome">' + esc(t("your_name")) + '</label><input id="g-nome" type="text" autocomplete="name" maxlength="80" required></div>' +
      '<p class="field__error" data-for="g-nome"></p>' +
      '<div class="field"><label for="g-recado">' + esc(t("message")) + ' <span class="opt">' + esc(t("optional")) + '</span></label><textarea id="g-recado" rows="3" maxlength="500"></textarea></div>' +
      '<button type="submit" class="btn btn--wide">' + esc(t("done_btn")) + "</button>" +
      '<p class="form__status" role="status" aria-live="polite"></p>' +
      "</form>" +
      '<button type="button" class="link pay__back" data-cart="back">' + esc(t("change")) + "</button></div>";
    cartEl.innerHTML = html;
  }

  function copyCode() {
    var ta = cartEl.querySelector("#pix-code"), msg = cartEl.querySelector(".pay__copied");
    function ok() { msg.textContent = t("copied"); }
    function fallback() {
      ta.focus(); ta.select();
      try { if (document.execCommand("copy")) return ok(); } catch (e) {}
      msg.textContent = t("copy_fail");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(order.code).then(ok, fallback);
    else fallback();
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function send(data) {
    var body = JSON.stringify(data);
    if (!CFG.endpoint) return new Promise(function (res) { setTimeout(function () { res({ ok: true, test: true }); }, 600); });
    return fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, redirect: "follow" })
      .then(function (r) { return r.json(); })
      .catch(function () {
        return fetch(CFG.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
          .then(function () { return { ok: true, opaque: true }; })
          .catch(function () { return { ok: false }; });
      });
  }

  cartEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cart]");
    if (!b) return;
    var act = b.getAttribute("data-cart");
    if (act === "pay") {
      var rows = cartItems(), tot = total(), txid = newTxid();
      order = { txid: txid, total: tot, code: brcode(tot, txid), rows: rows, test: pixConfig().test };
      state = "pay";
      renderCart();
      var box = cartEl.querySelector(".pay");
      if (box) {
        box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        var qr = cartEl.querySelector(".pay__qrbox");
        if (qr && !reduceMotion) qr.classList.add("is-new");
      }
    } else if (act === "copy") {
      copyCode();
    } else if (act === "back") {
      state = "list"; order = null; renderCart();
      var first = listEl.querySelector(".gift.is-on [data-act]") || listEl.querySelector("[data-act]");
      if (first) first.focus();
    } else if (act === "again") {
      state = "list"; order = null; cart = {}; livre = 0; save();
      renderList(); renderCart(); updateBar();
      var f = listEl.querySelector("[data-act]"); if (f) f.focus();
    }
  });

  cartEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target, name = form.querySelector("#g-nome"), err = form.querySelector('[data-for="g-nome"]');
    var status = form.querySelector(".form__status"), btn = form.querySelector('button[type="submit"]');
    status.classList.remove("is-error"); status.textContent = "";
    if (!name.value.trim()) {
      err.textContent = t("err_name"); name.setAttribute("aria-invalid", "true"); name.focus(); return;
    }
    err.textContent = ""; name.removeAttribute("aria-invalid");
    var data = {
      tipo: "presente",
      id: uid(),
      enviado: new Date().toISOString(),
      idioma: lang(),
      nome: name.value.trim(),
      recado: form.querySelector("#g-recado").value.trim(),
      txid: order.txid,
      total: order.total,
      itens: order.rows.map(function (r) { return { id: r.item.id, nome: r.item.pt, qtd: r.qtd, valor: r.item.valor }; })
    };
    btn.disabled = true; status.textContent = t("sending");
    send(data).then(function (res) {
      btn.disabled = false;
      if (!res || res.ok === false) { status.classList.add("is-error"); status.textContent = t("err_send"); return; }
      order.who = data.nome;
      order.test = !!res.test;
      cart = {}; livre = 0; save();
      state = "done";
      renderList(); renderCart(); updateBar();
      var d = cartEl.querySelector(".cart__done"); if (d) d.focus();
      if (window.celebrate) window.celebrate();
    });
  });

  cartEl.addEventListener("input", function (e) {
    if (e.target.id === "g-nome") {
      e.target.removeAttribute("aria-invalid");
      var err = cartEl.querySelector('[data-for="g-nome"]'); if (err) err.textContent = "";
    }
  });

  /* ---------- barra flutuante no celular ---------- */
  var cartVisible = false, listVisible = false;
  function updateBar() {
    if (!barEl) return;
    var n = count();
    var show = n > 0 && state === "list" && listVisible && !cartVisible;
    barEl.hidden = !show;
    if (show) {
      barEl.querySelector(".cartbar__sum").textContent = (n === 1 ? t("one_gift") : t("n_gifts", { n: n })) + " · " + money(total());
      barEl.querySelector(".cartbar__btn").textContent = t("bar_btn");
    }
  }
  if (barEl) {
    barEl.querySelector(".cartbar__btn").addEventListener("click", function () {
      cartEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      var b = cartEl.querySelector('[data-cart="pay"]'); if (b) setTimeout(function () { b.focus({ preventScroll: true }); }, reduceMotion ? 0 : 500);
    });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { cartVisible = e.isIntersecting; }); updateBar(); }, { threshold: 0.15 }).observe(cartEl);
    new IntersectionObserver(function (es) { es.forEach(function (e) { listVisible = e.isIntersecting; }); updateBar(); }).observe(listEl);
  }

  /* ---------- idioma ---------- */
  document.addEventListener("casamento:lang", function () { renderList(); renderCart(); updateBar(); });

  renderList();
  renderCart();
  updateBar();
})();
