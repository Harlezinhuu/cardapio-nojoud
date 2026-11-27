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

  /* ---------- idioma ---------- */
  const PT = {
    titulo: 'Cardápio', lede: 'Um cantinho do Líbano pra vocês.',
    buscar: 'Buscar', buscar_label: 'Buscar no cardápio', limpar: 'Limpar busca', veg: 'Veg', veg_title: 'Mostrar só opções vegetarianas',
    idioma: 'Idioma', secoes_nav: 'Seções do cardápio',
    pratos: '{n} pratos', opcoes: '{n} opções', vazio: 'Nenhum prato encontrado.', resetar: 'Limpar busca',
    achados: '{n} itens encontrados', achado: '1 item encontrado',
    tag_vegano: 'Vegano', tag_sim: 'Vegetariano', tag_opcao: 'Opção vegetariana', tag_troca: 'Pode trocar para vegano ou vegetariano', tag_encomenda: 'Sob encomenda',
    fechar: 'Fechar', topo: 'Voltar ao topo',
    onde: 'Onde estamos', como_chegar: 'Como chegar', horario: 'Horário', contato: 'Contato',
    telefone: 'Telefone', whatsapp: 'WhatsApp', entrega: 'Fazemos entrega por Uber Moto. Peça pelo WhatsApp.',
    pedir: 'Pedir pelo WhatsApp', ligar: 'Ligar', instagram: 'Instagram',
    wa_msg: 'Olá! Vi o cardápio e gostaria de fazer um pedido.',
    dias: null, fechado: 'Fechado',
    aberto_agora: 'Aberto agora · fecha às {h}', fechado_hoje_abre: 'Fechado agora · abre hoje às {h}',
    fechado_abre_amanha: 'Fechado agora · abre amanhã às {h}', fechado_abre_dia: 'Fechado agora · abre {d} às {h}',
    excecao_hoje: '{texto} hoje · abre {quando} às {h}', amanha: 'amanhã', fechado_agora: 'Fechado agora', excecao: null,
    precos: 'Preços em reais.', atualizado: 'Preços atualizados em {d}.', atualizado_valor: null,
    falha: 'Não foi possível carregar o cardápio. Tente recarregar a página.'
  };
  const LANGS = { pt: { code: 'PT', html: 'pt-BR', dir: 'ltr' }, en: { code: 'EN', html: 'en', dir: 'ltr' }, ar: { code: 'ع', html: 'ar', dir: 'rtl' } };
  let lang = 'pt', I18N = {};
  const T = k => { const ui = lang !== 'pt' && I18N[lang] ? I18N[lang].ui : null; return ui && ui[k] != null ? ui[k] : PT[k]; };
  const fmt = (k, vars) => String(T(k) || '').replace(/\{(\w+)\}/g, (_, n) => (vars && vars[n] != null ? vars[n] : ''));
  function storeGet() { try { return localStorage.getItem('nojoud-lang'); } catch (_) { return null; } }
  function storeSet(v) { try { localStorage.setItem('nojoud-lang', v); } catch (_) { /* sem armazenamento: tudo bem */ } }
  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && q in LANGS) return q;
    const s = storeGet();
    return s && s in LANGS ? s : 'pt';
  }
  // valida o i18n.json: só texto, com limite de tamanho; o que não passar cai no português
  function cleanI18n(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const l of ['en', 'ar']) {
      const src = raw[l]; if (!src || typeof src !== 'object') continue;
      const ui = {}, secoes = {}, itens = {};
      for (const [k, v] of Object.entries(src.ui || {})) {
        if (k in PT && typeof v === 'string' && v.length <= 200) ui[k] = v;
        if (k === 'dias' && Array.isArray(v) && v.length === 7 && v.every(d => str(d, 20))) ui.dias = v;
      }
      for (const [k, v] of Object.entries(src.secoes || {})) if (RX.id.test(k) && str(v, 60)) secoes[k] = v;
      for (const [k, v] of Object.entries(src.itens || {})) {
        if (!v || typeof v !== 'object' || k.length > 60) continue;
        const it = {};
        if (str(v.nome, 60) && v.nome.trim()) it.nome = v.nome;
        if (str(v.desc, 400)) it.desc = v.desc;
        if (str(v.obs, 80)) it.obs = v.obs;
        if (Array.isArray(v.rotulos) && v.rotulos.length <= 6 && v.rotulos.every(r => str(r, 80))) it.rotulos = v.rotulos;
        itens[k] = it;
      }
      out[l] = { ui, secoes, itens };
    }
    return out;
  }
  // versão do item no idioma atual (preços nunca mudam)
  function loc(it) {
    const tr = lang !== 'pt' && I18N[lang] && I18N[lang].itens[it.foto || it.nome];
    if (!tr) return it;
    let r = 0;
    const precos = it.precos.map(([l, v]) => [l ? ((tr.rotulos && tr.rotulos[r++]) || l) : '', v]);
    return { ...it, nome: tr.nome || it.nome, desc: tr.desc != null ? tr.desc : it.desc, obs: it.obs ? (tr.obs || it.obs) : it.obs, precos };
  }
  const secName = s => (lang !== 'pt' && I18N[lang] && I18N[lang].secoes[s.id]) || s.nome;

  /* ---------- validação do menu.json ---------- */
  const RX = {
    id: /^[a-z0-9-]{1,30}$/,
    foto: /^[a-z0-9-]{1,40}$/,
    preco: /^\d{1,4},\d{2}$/,
    ar: /^[؀-ۿ\s]{1,60}$/
  };
  const str = (v, max) => typeof v === 'string' && v.length <= max;
  const VEG = { vegano: 'tag_vegano', sim: 'tag_sim', opcao: 'tag_opcao', troca: 'tag_troca' };

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
    if (it.obs != null && !str(it.obs, 60)) return false;
    return true;
  }
  function clean(data) {
    if (!data || !Array.isArray(data.secoes)) throw new Error('menu.json inválido');
    return {
      info: cleanInfo(data.info),
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

  function cleanInfo(i) {
    if (!i || typeof i !== 'object') return null;
    const out = {};
    if (str(i.endereco, 120)) out.endereco = i.endereco;
    if (typeof i.maps === 'string' && i.maps.length < 300 && i.maps.startsWith('https://www.google.com/maps/')) out.maps = i.maps;
    if (typeof i.telefone === 'string' && /^[\d\s()+-]{8,20}$/.test(i.telefone)) out.telefone = i.telefone;
    if (typeof i.whatsapp === 'string' && /^\d{10,13}$/.test(i.whatsapp)) out.whatsapp = i.whatsapp;
    if (typeof i.whatsapp_exibicao === 'string' && /^[\d\s()+-]{8,20}$/.test(i.whatsapp_exibicao)) out.whatsappTxt = i.whatsapp_exibicao;
    if (typeof i.instagram === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(i.instagram)) out.instagram = i.instagram;
    if (Array.isArray(i.horarios) && i.horarios.length === 7 &&
        i.horarios.every(x => Array.isArray(x) && x.length === 2 && str(x[0], 12) && str(x[1], 30))) out.horarios = i.horarios;
    out.excecoes = Array.isArray(i.excecoes) ? i.excecoes.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.data) && str(e.texto, 40)).slice(0, 30) : [];
    return out;
  }

  /* ---------- montagem ---------- */
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '').toLowerCase();
  let items = [], DATA = null, ticker = null;

  function priceBlock(precos) {
    if (precos.length === 1 && !precos[0][0]) return h('div', { class: 'one' }, h('b', { dir: 'ltr', text: 'R$ ' + precos[0][1] }));
    return precos.map(([l, v]) => h('div', { class: 'price' }, h('span', { text: l }), h('b', { dir: 'ltr', text: 'R$ ' + v })));
  }
  function tags(it) {
    const t = [];
    if (it.veg) t.push(h('span', { class: 'tag' }, leaf(), it.obs || T(VEG[it.veg])));
    if (it.encomenda) t.push(h('span', { class: 'tag enc', text: T('tag_encomenda') }));
    return t.length ? h('div', { class: 'tags' }, t) : null;
  }
  const WEBP = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (_) { return false; } })();
  function photo(it, alt, lazy, big) {
    const f = it.foto;
    const img = h('img', { src: `img/${f}.jpg`, alt, loading: lazy ? 'lazy' : null, decoding: 'async', width: 640, height: 640 });
    const pic = h('picture', {},
      h('source', { type: 'image/webp', srcset: `img/w/${f}-320.webp 320w, img/w/${f}-640.webp 640w`, sizes: big ? '(max-width: 600px) 100vw, 560px' : '(max-width: 600px) 116px, (max-width: 1100px) 45vw, 300px' }),
      img);
    if (big) { // mostra a miniatura na hora e troca pela foto grande quando ela chegar
      const hi = new Image();
      hi.onload = () => { pic.replaceChildren(h('img', { src: hi.src, alt })); };
      hi.src = WEBP ? `img/g/${f}.webp` : `img/g/${f}.jpg`;
    }
    return h('div', { class: 'ph' }, pic);
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
      h('div', { class: 'rp' }, it.precos.map(([l, v]) => h('div', {}, l ? h('span', { text: l }) : null, h('b', { dir: 'ltr', text: 'R$ ' + v })))));
  }

  function staticTexts() {
    const L = LANGS[lang];
    document.documentElement.lang = L.html;
    document.documentElement.dir = L.dir;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
    document.querySelectorAll('[data-t-ph]').forEach(el => { el.placeholder = T(el.dataset.tPh); });
    document.querySelectorAll('[data-t-aria]').forEach(el => { el.setAttribute('aria-label', T(el.dataset.tAria)); });
    document.querySelectorAll('[data-t-title]').forEach(el => { el.title = T(el.dataset.tTitle); });
    $('#lang-cur').textContent = L.code;
    document.querySelectorAll('#lang-menu [data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
  }

  function render(data) {
    const menu = $('#menu'), tabs = $('#tabs');
    items = [];
    staticTexts();
    menu.replaceChildren(); tabs.replaceChildren();
    data.secoes.forEach((s, si) => {
      const nome = secName(s);
      tabs.append(h('a', { href: '#' + s.id, 'data-s': s.id, text: nome }));
      const list = h('div', { class: s.lista ? 'list reveal' : 'grid' });
      s.itens.forEach(base => {
        const i = items.length, it = loc(base);
        // a busca encontra o prato pelo nome no idioma atual e também em português
        it._key = norm([it.nome, it.desc || '', it.obs || '', ...it.precos.map(p => p[0]), base.nome, base.desc || '', s.lista ? 'bebida drink مشروب' : ''].join(' '));
        it._sec = s.id;
        items.push(it);
        list.append(s.lista ? row(it, i) : card(it, i));
      });
      menu.append(h('section', { class: 'sec ' + (si % 2 ? 'alt' : 'pattern'), id: s.id, 'aria-labelledby': 'h-' + s.id },
        h('div', { class: 'frieze', 'aria-hidden': 'true' }),
        h('div', { class: 'sec-head' },
          s.ar && lang !== 'ar' ? h('span', { class: 'ar', lang: 'ar', text: s.ar }) : null,
          h('h2', { id: 'h-' + s.id, text: nome }),
          h('span', { class: 'count', text: fmt(s.lista ? 'opcoes' : 'pratos', { n: s.itens.length }) })),
        list));
    });
    if (data.info) {
      renderInfo(data.info);
      clearInterval(ticker);
      if (data.info.horarios) ticker = setInterval(() => { // atualiza só o aviso de aberto/fechado, a cada minuto
        const st = status(data.info.horarios, data.info.excecoes), el = $('.status');
        if (st && el) { el.textContent = st.text; el.className = st.open ? 'status' : 'status closed'; }
      }, 60000);
    }
    if (data.atualizado) $('#upd').textContent = fmt('atualizado', { d: T('atualizado_valor') || data.atualizado });
    watch();
    if ($('#q').value.trim() || $('#veg').getAttribute('aria-pressed') === 'true') filter();
  }

  /* ---------- endereço, horário e contato ---------- */
  const DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function nowSP() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value;
    return { dia: DIAS.indexOf(get('weekday')), min: (+get('hour')) * 60 + (+get('minute')), y: +get('year'), m: +get('month'), d: +get('day') };
  }
  // data (AAAA-MM-DD) daqui a k dias, no calendário de São Paulo
  function dateIn(now, k) {
    const t = new Date(Date.UTC(now.y, now.m - 1, now.d + k));
    return t.toISOString().slice(0, 10);
  }
  const excecao = (lista, data) => (lista || []).find(e => e.data === data);
  const dayName = (hor, k) => (T('dias') || [])[k] || hor[k][0];
  const excText = ex => T('excecao') || ex.texto;
  const hourText = t => (span(t) ? t : (lang === 'pt' ? t : T('fechado')));
  const span = txt => { const m = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec(txt.trim()); return m ? [m[1] * 60 + +m[2], m[3] * 60 + +m[4], `${m[1]}:${m[2]}`, `${m[3]}:${m[4]}`] : null; };
  function status(hor, exc) {
    const now = nowSP(), { dia, min } = now;
    if (dia < 0) return null;
    const exHoje = excecao(exc, dateIn(now, 0));
    const hoje = exHoje ? null : span(hor[dia][1]);
    if (hoje && min >= hoje[0] && min < hoje[1]) return { open: true, text: fmt('aberto_agora', { h: hoje[3] }) };
    if (hoje && min < hoje[0]) return { open: false, text: fmt('fechado_hoje_abre', { h: hoje[2] }) };
    for (let k = 1; k <= 14; k++) {
      const d = (dia + k) % 7;
      if (excecao(exc, dateIn(now, k))) continue;
      const s = span(hor[d][1]);
      if (!s) continue;
      const quando = k === 1 ? T('amanha') : dayName(hor, d).toLowerCase();
      if (exHoje) return { open: false, text: fmt('excecao_hoje', { texto: excText(exHoje), quando, h: s[2] }) };
      return { open: false, text: k === 1 ? fmt('fechado_abre_amanha', { h: s[2] }) : fmt('fechado_abre_dia', { d: dayName(hor, d), h: s[2] }) };
    }
    return { open: false, text: T('fechado_agora') };
  }
  function renderInfo(i) {
    const box = $('#info'), boxes = [];
    if (i.endereco) boxes.push(h('div', { class: 'info-box' },
      h('h3', { text: T('onde') }), h('p', { dir: 'ltr', class: 'addr', text: i.endereco }),
      i.maps ? h('a', { class: 'btn', href: i.maps, target: '_blank', rel: 'noopener noreferrer' }, T('como_chegar')) : null));
    if (i.horarios) {
      const now = nowSP(), st = status(i.horarios, i.excecoes), hoje = now.dia;
      // para cada dia da semana, a próxima data em que ele cai (hoje inclusive) e se tem exceção
      const rows = i.horarios.map(([d, t], k) => {
        const ex = excecao(i.excecoes, dateIn(now, (k - hoje + 7) % 7));
        const [, mm, dd] = ex ? ex.data.split('-') : [];
        const nome = dayName(i.horarios, k);
        return h('div', { class: [k === hoje ? 'today' : '', ex ? 'exc' : ''].join(' ').trim() || null },
          h('span', { text: ex ? `${nome} (${dd}/${mm})` : nome }), h('span', { dir: span(t) && !ex ? 'ltr' : null, text: ex ? excText(ex) : hourText(t) }));
      });
      boxes.push(h('div', { class: 'info-box' },
        h('h3', { text: T('horario') }),
        st ? h('span', { class: st.open ? 'status' : 'status closed', text: st.text }) : null,
        h('div', { class: 'hours' }, rows)));
    }
    if (i.telefone || i.whatsapp || i.instagram) {
      const digits = (i.telefone || '').replace(/\D/g, '');
      boxes.push(h('div', { class: 'info-box' },
        h('h3', { text: T('contato') }),
        i.whatsapp ? h('p', { class: 'note', text: T('entrega') }) : null,
        h('dl', { class: 'contacts' },
          i.telefone ? [h('dt', { text: T('telefone') }), h('dd', { dir: 'ltr', text: i.telefone })] : null,
          i.whatsapp ? [h('dt', { text: T('whatsapp') }), h('dd', { dir: 'ltr', text: i.whatsappTxt || i.whatsapp })] : null),
        h('div', { class: 'btns' },
          i.whatsapp ? h('a', { class: 'btn wa', href: `https://wa.me/${i.whatsapp}?text=${encodeURIComponent(T('wa_msg'))}`, target: '_blank', rel: 'noopener noreferrer' }, T('pedir')) : null,
          i.telefone ? h('a', { class: 'btn ghost', href: 'tel:+' + (digits.startsWith('55') ? digits : '55' + digits) }, T('ligar')) : null,
          i.instagram ? h('a', { class: 'btn ghost', href: `https://www.instagram.com/${i.instagram}/`, target: '_blank', rel: 'noopener noreferrer' }, T('instagram')) : null)));
    }
    box.replaceChildren(...boxes);
    box.hidden = !boxes.length;
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
    $('#live').textContent = (q || veg) ? (total ? (total === 1 ? T('achado') : fmt('achados', { n: total })) : T('vazio')) : '';
    document.querySelectorAll('.tabs a').forEach(a => { a.hidden = !!(document.getElementById(a.dataset.s) || {}).hidden; });
  }

  /* ---------- rolagem: aba ativa, barra, topo, entrada suave ---------- */
  let spy = null, fade = null;
  function watch() {
    if (spy) spy.disconnect();
    if (fade) fade.disconnect();
    const tabs = [...document.querySelectorAll('.tabs a')];
    spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      tabs.forEach(t => t.classList.toggle('on', t.dataset.s === e.target.id));
      const on = tabs.find(t => t.dataset.s === e.target.id);
      if (on) {
        const box = on.parentElement, b = box.getBoundingClientRect(), r = on.getBoundingClientRect();
        box.scrollBy({ left: (r.left + r.width / 2) - (b.left + b.width / 2) });
      }
    }), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.sec').forEach(s => spy.observe(s));

    fade = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); fade.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach(el => fade.observe(el));
  }
  {
    const bar = $('#bar'), top = $('#top'), cover = $('.cover');
    const onScroll = () => {
      bar.classList.toggle('stuck', window.scrollY > cover.offsetHeight);
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
      h('button', { class: 'x', type: 'button', 'aria-label': T('fechar'), text: '×' }),
      photo(it, it.nome, false, true), details(it, 'dlg-title'), togo(it));
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

  /* ---------- seletor de idioma ---------- */
  const langBtn = $('#lang-btn'), langMenu = $('#lang-menu');
  function menuOpen(open) {
    langMenu.hidden = !open;
    langBtn.setAttribute('aria-expanded', String(open));
    if (open) (langMenu.querySelector('[aria-checked="true"]') || langMenu.querySelector('button')).focus();
  }
  function setLang(l) {
    if (!(l in LANGS) || l === lang) return;
    lang = l; storeSet(l);
    if (DATA) render(DATA); else staticTexts();
  }
  langBtn.addEventListener('click', () => menuOpen(langMenu.hidden));
  langMenu.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    menuOpen(false); langBtn.focus(); setLang(b.dataset.lang);
  });
  langMenu.addEventListener('keydown', e => {
    const opts = [...langMenu.querySelectorAll('button')], i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
    if (e.key === 'Escape') { menuOpen(false); langBtn.focus(); }
  });
  document.addEventListener('click', e => { if (!langMenu.hidden && !e.target.closest('#lang')) menuOpen(false); });

  /* ---------- carregar ---------- */
  lang = initialLang();
  const getJSON = url => fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
    .then(r => { if (!r.ok) throw new Error(url + ' HTTP ' + r.status); return r.json(); });
  Promise.all([getJSON('menu.json'), getJSON('i18n.json').catch(err => { console.warn('Traduções indisponíveis:', err); return null; })])
    .then(([d, tr]) => {
      I18N = cleanI18n(tr);
      if (!I18N[lang]) lang = 'pt';
      DATA = clean(d);
      render(DATA);
    })
    .catch(err => {
      console.error(err);
      staticTexts();
      $('#menu').replaceChildren(h('p', { class: 'empty', text: T('falha') }));
    });
})();
