/* Cardápio Nojoud — monta a página a partir do menu.json.
   Segurança: nada vindo do JSON vira HTML. Todo texto entra com textContent,
   e cada campo é validado antes de aparecer na tela. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const SVGNS = 'http://www.w3.org/2000/svg';

  // cria elemento: h('div', {class: 'x'}, 'texto', outroNo)
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  function leaf() {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#leaf'); s.append(u);
    return s;
  }

  /* ---------- validação do menu.json ---------- */
  const RX = {
    id: /^[a-z0-9-]{1,30}$/,
    foto: /^[a-z0-9-]{1,40}$/,
    preco: /^\d{1,4},\d{2}$/,
    ar: /^[؀-ۿ\s]{1,60}$/
  };
  const str = (v, max) => typeof v === 'string' && v.length <= max;
  const VEG = { vegano: 'Vegano', sim: 'Vegetariano', opcao: 'Opção vegetariana', troca: 'Pode trocar para vegano ou vegetariano' };

  function validItem(it, lista) {
    if (!it || typeof it !== 'object') return false;
    if (!str(it.nome, 60) || !it.nome.trim()) return false;
    if (it.desc != null && !str(it.desc, 400)) return false;
    if (!lista && !RX.foto.test(it.foto || '')) return false;
    if (!Array.isArray(it.precos) || it.precos.length < 1 || it.precos.length > 6) return false;
    if (!it.precos.every(p => Array.isArray(p) && p.length === 2 && str(p[0], 80) && RX.preco.test(p[1]))) return false;
    if (it.viagem != null && !RX.preco.test(it.viagem)) return false;
    if (it.veg != null && !(it.veg in VEG)) return false;
    if (it.encomenda != null && typeof it.encomenda !== 'boolean') return false;
    return true;
  }
  function clean(data) {
    if (!data || !Array.isArray(data.secoes)) throw new Error('menu.json inválido');
    return {
      atualizado: str(data.atualizado, 40) ? data.atualizado : '',
      secoes: data.secoes
        .filter(s => s && RX.id.test(s.id || '') && str(s.nome, 60) && Array.isArray(s.itens))
        .map(s => ({
          id: s.id, nome: s.nome, lista: s.lista === true,
          ar: typeof s.ar === 'string' && RX.ar.test(s.ar) ? s.ar : '',
          itens: s.itens.filter(it => {
            const ok = validItem(it, s.lista === true);
            if (!ok) console.warn('Item ignorado no menu.json:', it && it.nome);
            return ok;
          })
        }))
        .filter(s => s.itens.length)
    };
  }

  /* ---------- montagem ---------- */
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const items = [];

  function priceBlock(precos) {
    if (precos.length === 1 && !precos[0][0]) return h('div', { class: 'one' }, h('b', { text: 'R$ ' + precos[0][1] }));
    return precos.map(([l, v]) => h('div', { class: 'price' }, h('span', { text: l }), h('b', { text: 'R$ ' + v })));
  }
  function tags(it) {
    const t = [];
    if (it.veg) t.push(h('span', { class: 'tag' }, leaf(), VEG[it.veg]));
    if (it.encomenda) t.push(h('span', { class: 'tag enc', text: 'Sob encomenda' }));
    return t.length ? h('div', { class: 'tags' }, t) : null;
  }
  function photo(it, alt, lazy) {
    const img = h('img', { src: `img/${it.foto}.jpg`, alt, loading: lazy ? 'lazy' : null, decoding: 'async' });
    const done = () => img.classList.add('ok');
    if (img.complete) done(); else { img.addEventListener('load', done); img.addEventListener('error', done); }
    return h('div', { class: 'ph' }, img);
  }
  function details(it, titleId) {
    return h('div', { class: 'body' },
      h('h3', { text: it.nome, id: titleId || null }),
      it.desc ? h('p', { class: 'desc', text: it.desc }) : null,
      tags(it),
      h('div', { class: 'prices' }, priceBlock(it.precos)));
  }
  const togo = it => it.viagem ? h('div', { class: 'togo' }, 'Para viagem: ', h('b', { text: '+ R$ ' + it.viagem })) : null;

  function card(it, i) {
    return h('button', { class: 'card reveal', type: 'button', 'data-i': i, 'aria-haspopup': 'dialog' },
      photo(it, '', true), details(it), togo(it));
  }
  function row(it, i) {
    return h('div', { class: it.precos.length > 1 ? 'row multi' : 'row', 'data-i': i },
      h('h3', { text: it.nome }),
      h('div', { class: 'rp' }, it.precos.map(([l, v]) => h('div', {}, l ? h('span', { text: l }) : null, h('b', { text: 'R$ ' + v })))));
  }

  function render(data) {
    const menu = $('#menu'), tabs = $('#tabs'), quick = $('#quick');
    data.secoes.forEach((s, si) => {
      tabs.append(h('a', { href: '#' + s.id, 'data-s': s.id, text: s.nome }));
      quick.append(h('a', { href: '#' + s.id, text: s.nome }));
      const list = h('div', { class: s.lista ? 'list reveal' : 'grid' });
      s.itens.forEach(it => {
        const i = items.length;
        it._key = norm([it.nome, it.desc || '', ...it.precos.map(p => p[0]), s.lista ? 'bebida' : ''].join(' '));
        it._sec = s.id;
        items.push(it);
        list.append(s.lista ? row(it, i) : card(it, i));
      });
      menu.append(h('section', { class: 'sec ' + (si % 2 ? 'alt' : 'pattern'), id: s.id, 'aria-labelledby': 'h-' + s.id },
        h('div', { class: 'sec-head' },
          h('img', { class: 'orn', src: 'img/ornament.png', alt: '', width: 443, height: 171, loading: 'lazy' }),
          s.ar ? h('span', { class: 'ar', lang: 'ar', text: s.ar }) : null,
          h('h2', { id: 'h-' + s.id, text: s.nome }),
          h('span', { class: 'count', text: `${s.itens.length} ${s.lista ? 'opções' : 'pratos'}` })),
        list));
    });
    if (data.atualizado) $('#upd').textContent = 'Preços atualizados em ' + data.atualizado + '.';
    watch();
  }

  /* ---------- busca e filtro ---------- */
  function filter() {
    const q = norm($('#q').value.trim()).slice(0, 40);
    const veg = $('#veg').getAttribute('aria-pressed') === 'true';
    $('#clear').hidden = !q;
    let total = 0;
    document.querySelectorAll('.sec').forEach(sec => {
      let n = 0;
      sec.querySelectorAll('[data-i]').forEach(el => {
        const it = items[+el.dataset.i];
        const ok = (!q || q.split(/\s+/).every(w => it._key.includes(w))) && (!veg || !!it.veg);
        el.hidden = !ok;
        if (ok) { n++; el.classList.add('in'); }
      });
      sec.hidden = n === 0;
      total += n;
    });
    $('#empty').hidden = total > 0;
    document.querySelectorAll('.tabs a').forEach(a => { a.hidden = !!(document.getElementById(a.dataset.s) || {}).hidden; });
  }

  /* ---------- rolagem: aba ativa, barra, topo, entrada suave ---------- */
  function watch() {
    const tabs = [...document.querySelectorAll('.tabs a')];
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      tabs.forEach(t => t.classList.toggle('on', t.dataset.s === e.target.id));
      const on = tabs.find(t => t.dataset.s === e.target.id);
      if (on) { const box = on.parentElement; box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.clientWidth / 2 }); }
    }), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.sec').forEach(s => spy.observe(s));

    const fade = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); fade.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach(el => fade.observe(el));

    const bar = $('#bar'), top = $('#top'), cover = $('.cover');
    const onScroll = () => {
      const past = window.scrollY > cover.offsetHeight;
      bar.classList.toggle('stuck', past);
      top.classList.toggle('show', window.scrollY > window.innerHeight * 1.2);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- detalhe do prato ---------- */
  const dlg = $('#dlg');
  let lastFocus = null;
  function openItem(i) {
    const it = items[i];
    if (!it || !it.foto) return;
    lastFocus = document.activeElement;
    dlg.replaceChildren(
      h('button', { class: 'x', type: 'button', 'aria-label': 'Fechar', text: '×' }),
      photo(it, it.nome, false), details(it, 'dlg-title'), togo(it));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeItem() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.x')) closeItem(); });
  $('#menu').addEventListener('click', e => {
    const c = e.target.closest('.card');
    if (c) openItem(+c.dataset.i);
  });

  /* ---------- controles ---------- */
  $('#q').addEventListener('input', filter);
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  $('#clear').addEventListener('click', () => { $('#q').value = ''; filter(); $('#q').focus(); });
  $('#reset').addEventListener('click', () => { $('#q').value = ''; $('#veg').setAttribute('aria-pressed', 'false'); filter(); });
  $('#veg').addEventListener('click', e => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    filter();
  });
  $('#top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- carregar ---------- */
  fetch('menu.json', { cache: 'no-cache', credentials: 'same-origin' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => render(clean(d)))
    .catch(err => {
      console.error(err);
      $('#menu').replaceChildren(h('p', { class: 'empty', text: 'Não foi possível carregar o cardápio. Tente recarregar a página.' }));
    });
})();
