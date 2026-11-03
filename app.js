// Интерфейс CRM — одна страница без сборки. Разделы: Сводка, Заказы, Переписки, Покупатели, Настройки.
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rub = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' ₽'
const num = (n) => Math.round(n || 0).toLocaleString('ru-RU')
const pct = (x) => (x * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%'
const phoneFmt = (p) => { const d = String(p || ''); return d.length === 11 ? `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}` : d ? '+' + d : '' }
const dt = (t) => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const tm = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dd = (t) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const ago = (t) => {
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'сейчас'
  if (s < 3600) return Math.floor(s / 60) + ' мин'
  if (new Date(t).toDateString() === new Date().toDateString()) return tm(t)
  if (s < 6 * 86400) return new Date(t).toLocaleDateString('ru-RU', { weekday: 'short' })
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const STATUS = { new: 'Новый', confirmed: 'Подтверждён', packed: 'Собран', shipped: 'Отправлен', delivered: 'Получен', cancelled: 'Отменён' }
const SOURCE = { telegram: 'Telegram', max: 'MAX', site: 'Заявка с сайта' }
const SRC_COLOR = { telegram: '#229ed9', max: '#6a3df5', site: '#64748b' }

const I = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
}

/* ---------- запросы к серверу ---------- */
async function api(method, path, body) {
  const r = await fetch('/api' + path, {
    method, headers: { 'content-type': 'application/json', 'x-crm': '1' }, body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (r.status === 401 && path !== '/login') { S.me = null; renderLogin(); throw new Error('Нужно войти') }
  if (!r.ok) throw new Error(j.error || 'Ошибка ' + r.status)
  return j
}
function toast(text, bad) {
  const d = document.createElement('div')
  d.textContent = text
  if (bad) d.className = 'bad'
  $('#toast').append(d)
  setTimeout(() => d.remove(), bad ? 6000 : 3000)
}
const guard = (fn) => async (...a) => { try { await fn(...a) } catch (e) { if (e.message !== 'Нужно войти') toast(e.message, true) } }

/* ---------- состояние ---------- */
const S = { me: null, brands: [], brand: Number(localStorage.getItem('crm-brand') || 0), counters: { unread: 0, newOrders: 0 }, view: null }
const brandQ = () => (S.brand ? `brand=${S.brand}` : '')
const brandOf = (id) => S.brands.find((b) => b.id === id)
const brandPill = (name, color) => (S.brands.length > 1 ? `<span class="pill dot" style="--c:${esc(color)}">${esc(name)}</span>` : '')

/* ---------- вход ---------- */
function renderLogin() {
  $('#app').innerHTML = `<div class="login"><form class="card" id="lf">
    <div class="logo"><i>✓</i> CRM</div>
    <label class="field"><span>Логин</span><input class="input" name="login" autocomplete="username" required></label>
    <label class="field"><span>Пароль</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" style="width:100%;height:42px">Войти</button>
    <p class="muted small" style="margin:14px 0 0">Пароль первого входа лежит в файле <code>data/ПЕРВЫЙ-ВХОД.txt</code> в папке CRM.</p>
  </form></div>`
  $('#lf').onsubmit = guard(async (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    S.me = await api('POST', '/login', { login: f.get('login'), password: f.get('password') })
    boot()
  })
}

/* ---------- каркас ---------- */
const NAV = [['dashboard', 'Сводка', I.dash], ['orders', 'Заказы', I.orders], ['inbox', 'Переписки', I.chat], ['customers', 'Покупатели', I.users], ['promos', 'Промокоды', I.tag], ['settings', 'Настройки', I.gear]]
function renderShell() {
  const opts = `<option value="0">Все марки</option>` + S.brands.map((b) => `<option value="${b.id}" ${b.id === S.brand ? 'selected' : ''}>${esc(b.name)}</option>`).join('')
  $('#app').innerHTML = `<div class="layout">
    <aside class="side">
      <div class="logo"><i>✓</i> CRM</div>
      <nav class="nav">${NAV.map(([k, t, ic]) => `<a href="#/${k}" data-k="${k}">${ic}<span>${t}</span><b class="badge" data-badge="${k}" hidden></b></a>`).join('')}</nav>
      <div class="brandpick"><label>Марка</label><select id="brandSel">${opts}</select></div>
      <div class="me"><span>${esc(S.me.name)}</span><button id="logout">Выйти</button></div>
    </aside>
    <main class="main"><div class="mbrand" style="margin-bottom:10px"><select class="input" id="brandSelM" style="width:100%">${opts}</select></div><div id="view"></div></main>
    <nav class="mnav">${NAV.map(([k, t, ic]) => `<a href="#/${k}" data-k="${k}">${ic}<span>${t}</span><b class="badge" data-badge="${k}" hidden></b></a>`).join('')}</nav>
  </div>`
  const onBrand = (e) => { S.brand = Number(e.target.value); localStorage.setItem('crm-brand', S.brand); $$('#brandSel, #brandSelM').forEach((s) => (s.value = S.brand)); route() }
  $('#brandSel').onchange = onBrand
  $('#brandSelM').onchange = onBrand
  $('#logout').onclick = guard(async () => { await api('POST', '/logout'); S.me = null; renderLogin() })
}
function paintCounters() {
  const set = (k, n) => $$(`[data-badge="${k}"]`).forEach((b) => { b.hidden = !n; b.textContent = n > 99 ? '99+' : n })
  set('inbox', S.counters.unread)
  set('orders', S.counters.newOrders)
  document.title = (S.counters.unread ? `(${S.counters.unread}) ` : '') + 'CRM'
}
const refreshCounters = guard(async () => { S.counters = await api('GET', '/counters'); paintCounters() })

/* ---------- маршруты ---------- */
function route() {
  if (S.curHash !== location.hash) { S.prevHash = S.curHash || ''; S.curHash = location.hash }
  const [, name = 'dashboard', id] = location.hash.split('/')
  $$('.nav a, .mnav a').forEach((a) => a.classList.toggle('on', a.dataset.k === name))
  S.view?.destroy?.()
  S.view = null
  const v = $('#view')
  const views = { dashboard: viewDashboard, orders: viewOrders, inbox: viewInbox, customers: viewCustomers, promos: viewPromos, settings: viewSettings }
  S.view = (views[name] || viewDashboard)(v, id) || null
}
addEventListener('hashchange', route)

/* ====================== СВОДКА ====================== */
function viewDashboard(v) {
  let days = Number(localStorage.getItem('crm-days') || 30)
  const draw = guard(async () => {
    const a = await api('GET', `/analytics?days=${days}&${brandQ()}`)
    const k = a.kpi
    const delta = (c, p, money) => {
      if (!p && !c) return '<span class="delta muted">—</span>'
      if (!p) return '<span class="delta up">новое</span>'
      const d = (c - p) / p
      return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${pct(Math.abs(d))}</span> <span class="muted small">было ${money ? rub(p) : num(p)}</span>`
    }
    const noData = !k.orders && !k.visitors && !k.messagesIn && !k.ordersPrev
    v.innerHTML = `
      <div class="head"><h1>Сводка</h1><div class="grow"></div>
        <div class="tabs" id="days">${[[7, '7 дней'], [30, '30 дней'], [90, '3 месяца'], [365, 'Год']].map(([d, t]) => `<button data-d="${d}" class="${d === days ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      ${noData ? `<div class="alert info">📭 <div>Данных за этот период пока нет. Они появятся, когда сайт будет подключён к CRM (раздел «Настройки → Подключение сайта»), а боты — в «Настройки → Мессенджеры».</div></div>` : ''}
      ${k.unanswered ? `<div class="alert">💬 <div>Ждут ответа: <b>${k.unanswered}</b> ${k.unanswered === 1 ? 'переписка' : 'переписки'}. <a href="#/inbox">Открыть</a></div></div>` : ''}
      <div class="grid g4">
        <div class="card kpi"><div class="label">Выручка</div><div class="val">${rub(k.revenue)}</div>${delta(k.revenue, k.revenuePrev, true)}</div>
        <div class="card kpi"><div class="label">Заказы</div><div class="val">${num(k.orders)}</div>${delta(k.orders, k.ordersPrev)}</div>
        <div class="card kpi"><div class="label">Средний чек</div><div class="val">${rub(k.avgCheck)}</div>${delta(k.avgCheck, k.avgCheckPrev, true)}</div>
        <div class="card kpi"><div class="label">Посетители сайта</div><div class="val">${num(k.visitors)}</div>${delta(k.visitors, k.visitorsPrev)}</div>
        <div class="card kpi"><div class="label">Конверсия в заказ</div><div class="val">${k.visitors ? pct(k.conversion) : '—'}</div><span class="muted small">из посетителей в покупателей</span></div>
        <div class="card kpi"><div class="label">Новые покупатели</div><div class="val">${num(k.newCustomers)}</div><span class="muted small">вернулись повторно за всё время: ${num(k.repeatCustomers)}</span></div>
        <div class="card kpi"><div class="label">Сообщений от покупателей</div><div class="val">${num(k.messagesIn)}</div><span class="muted small">новых переписок: ${num(k.newConversations)}</span></div>
        <div class="card kpi"><div class="label">Скидки по промокодам</div><div class="val">${rub(k.discount)}</div><span class="muted small">отменено заказов: ${num(k.cancelled)}</span></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="head" style="margin-bottom:6px"><h2 style="margin:0">По дням</h2><div class="grow"></div>
          <div class="legend"><span><i style="background:var(--accent)"></i>Выручка</span><span><i style="background:#22c55e"></i>Посетители</span></div></div>
        <div id="chartBox" class="chart-box"></div>
      </div>
      ${a.brands.length > 1 ? `<div class="card" style="margin-top:14px"><h2>По маркам</h2><div class="table-wrap" style="border:0"><table>
        <thead><tr><th>Марка</th><th class="right">Выручка</th><th class="right">Заказы</th><th class="right">Посетители</th><th class="right">Конверсия</th></tr></thead>
        <tbody>${a.brands.map((b) => `<tr><td><span class="pill dot" style="--c:${esc(b.color)}">${esc(b.name)}</span></td><td class="right">${rub(b.revenue)}</td>
          <td class="right">${num(b.orders)}</td><td class="right">${num(b.visitors)}</td><td class="right">${b.visitors ? pct(b.orders / b.visitors) : '—'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
      <div class="grid g2" style="margin-top:14px">
        <div class="card funnel"><h2>Воронка: где уходят покупатели</h2>
          ${a.funnel.map((f) => `<div class="row"><span>${f.label}</span><div class="bar"><i style="width:${a.funnel[0].n ? (f.n / a.funnel[0].n) * 100 : 0}%"></i></div>
            <span class="right"><b>${num(f.n)}</b> <span class="muted small">${a.funnel[0].n ? pct(f.n / a.funnel[0].n) : ''}</span></span></div>`).join('')}
        </div>
        <div class="card"><h2>Популярные товары</h2><div class="list-rows">
          ${a.topProducts.length ? a.topProducts.map((p) => `<div class="r"><span>${esc(p.name)} <span class="muted">${esc(p.variant)}</span></span><span class="nowrap"><b>${rub(p.revenue)}</b> <span class="muted small">${num(p.qty)} шт.</span></span></div>`).join('') : '<p class="muted">Пока нет продаж</p>'}
        </div></div>
        <div class="card"><h2>Откуда приходят</h2><div class="list-rows">
          ${a.sources.length ? a.sources.map((s) => `<div class="r"><span>${esc(s.src)}</span><span class="nowrap"><b>${num(s.visitors)}</b> <span class="muted small">посет. · ${num(s.orders)} зак.</span></span></div>`).join('') : '<p class="muted">Пока нет посещений</p>'}
        </div></div>
        <div class="card"><h2>Популярные страницы</h2><div class="list-rows">
          ${a.pages.length ? a.pages.map((p) => `<div class="r"><span style="overflow-wrap:anywhere">${esc(p.path)}</span><b>${num(p.n)}</b></div>`).join('') : '<p class="muted">Пока нет посещений</p>'}
        </div>
        ${a.devices.length ? `<p class="muted small" style="margin:12px 0 0">Устройства: ${a.devices.map((d) => `${esc(d.device)} — ${num(d.n)}`).join(', ')}</p>` : ''}</div>
      </div>`
    $('#days', v).onclick = (e) => { const d = e.target.dataset.d; if (d) { days = Number(d); localStorage.setItem('crm-days', days); draw() } }
    series = a.series
    paintChart()
  })
  // график рисуем ровно по ширине блока, чтобы подписи не растягивались
  let series = null, lastW = 0
  const paintChart = () => { const box = $('#chartBox', v); if (!box || !series) return; lastW = box.clientWidth; box.innerHTML = chart(series, lastW) }
  const ro = new ResizeObserver(() => { const box = $('#chartBox', v); if (box && Math.abs(box.clientWidth - lastW) > 4) paintChart() })
  ro.observe(v)
  draw()
  return { onEvent: (e) => { if (e.type === 'order') draw() }, destroy: () => ro.disconnect() }
}

function chart(series, width) {
  const W = Math.max(280, Math.round(width || 600)), H = W < 500 ? 180 : 220, P = { l: 44, r: 36, t: 10, b: 24 }
  const n = series.length
  const maxR = Math.max(1, ...series.map((s) => s.revenue))
  const maxV = Math.max(1, ...series.map((s) => s.visitors))
  const bw = (W - P.l - P.r) / n
  const y = (val, max) => H - P.b - (val / max) * (H - P.t - P.b)
  const bars = series.map((s, i) => {
    const h = H - P.b - y(s.revenue, maxR)
    return `<rect x="${P.l + i * bw + bw * 0.15}" y="${y(s.revenue, maxR)}" width="${Math.max(1, bw * 0.7)}" height="${h}" rx="2" fill="var(--accent)" opacity=".85"><title>${dd(s.d)}: ${rub(s.revenue)}, заказов ${s.orders}, посетителей ${s.visitors}</title></rect>`
  }).join('')
  const line = series.map((s, i) => `${P.l + i * bw + bw / 2},${y(s.visitors, maxV)}`).join(' ')
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - P.l - P.r) / 64))))
  const labels = series.map((s, i) => (i % step === 0 ? `<text x="${P.l + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${new Date(s.d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</text>` : '')).join('')
  const grid = [0, 0.5, 1].map((f) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(maxR * f, maxR)}" y2="${y(maxR * f, maxR)}" stroke="#e6e8f0"/>
    <text x="${P.l - 6}" y="${y(maxR * f, maxR) + 4}" text-anchor="end">${maxR * f >= 1000 ? Math.round((maxR * f) / 1000) + 'к' : Math.round(maxR * f)}</text>
    <text x="${W - P.r + 6}" y="${y(maxV * f, maxV) + 4}">${Math.round(maxV * f)}</text>`).join('')
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}${bars}<polyline points="${line}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linejoin="round"/>${labels}</svg>`
}

/* ====================== ЗАКАЗЫ ====================== */
const KANBAN_LIMIT = 60 // карточек в колонке; остальные — через список
function viewOrders(v, id) {
  let status = '', qtext = ''
  let mode = localStorage.getItem('crm-orders-view') === 'kanban' ? 'kanban' : 'list'
  let rows = []
  const orderCard = (o) => `<div class="kcard" data-id="${o.id}" data-st="${o.status}">
      <div class="kc-top"><b>№ ${esc(o.number)}</b>${o.paid ? '<span class="pill st-delivered">оплачен</span>' : ''}<span class="grow"></span><span class="muted small nowrap">${ago(o.created_at)}</span></div>
      <div class="kc-name">${esc(o.name) || '—'}</div>
      <div class="kc-bot"><span class="muted small">${num(o.items_count)} шт.${o.promo ? ' · ' + esc(o.promo) : ''}</span><b class="nowrap">${rub(o.total)}</b></div>
      ${S.brands.length > 1 ? `<div style="margin-top:6px">${brandPill(o.brand_name, o.brand_color)}</div>` : ''}</div>`
  const paint = () => {
    const box = $('#olist', v)
    $$('#vmode button', v).forEach((b) => b.classList.toggle('on', b.dataset.m === mode))
    $('#st', v).hidden = mode === 'kanban'
    if (mode === 'kanban') {
      box.innerHTML = `<p class="muted small" style="margin:0 0 10px">Перетащите карточку в другую колонку, чтобы сменить статус${matchMedia('(pointer: coarse)').matches ? ' (на телефоне — нажмите и подержите карточку)' : ''}.</p>
        <div class="kanban" id="kb">${Object.entries(STATUS).map(([k, t]) => {
          const list = rows.filter((o) => o.status === k)
          const sum = list.reduce((s, o) => s + (o.total || 0), 0)
          return `<div class="kcol" data-st="${k}"><div class="kcol-h"><span class="pill st-${k}">${t}</span><span class="muted small">${list.length}${k !== 'cancelled' && sum ? ' · ' + rub(sum) : ''}</span></div>
            <div class="kcol-b">${list.slice(0, KANBAN_LIMIT).map(orderCard).join('') || '<div class="kempty">пусто</div>'}
            ${list.length > KANBAN_LIMIT ? `<div class="kempty">ещё ${list.length - KANBAN_LIMIT} — смотрите списком</div>` : ''}</div></div>`
        }).join('')}</div>`
      kanbanDrag($('#kb', box), (orderId) => openOrder(orderId, draw), async (orderId, st) => {
        const o = rows.find((x) => x.id === Number(orderId))
        if (!o || o.status === st) return
        const old = o.status
        o.status = st; paint() // сразу двигаем, не дожидаясь сервера
        try { await api('PATCH', `/orders/${o.id}`, { status: st }); toast(`№ ${o.number}: ${STATUS[st]}`); refreshCounters() }
        catch (e) { o.status = old; paint(); toast(e.message, true) }
      })
      return
    }
    const list = status ? rows.filter((o) => o.status === status) : rows
    box.innerHTML = list.length ? `<div class="table-wrap"><table>
      <thead><tr><th>№</th><th>Дата</th><th>Покупатель</th><th class="hide-m">Состав</th><th class="right">Сумма</th><th>Статус</th></tr></thead>
      <tbody>${list.map((o) => `<tr class="link" data-id="${o.id}">
        <td class="nowrap"><b>${esc(o.number)}</b> ${brandPill(o.brand_name, o.brand_color)}</td>
        <td class="nowrap muted">${dt(o.created_at)}</td>
        <td>${esc(o.name) || '—'}<div class="muted small nowrap">${phoneFmt(o.phone)}</div></td>
        <td class="hide-m muted">${num(o.items_count)} шт.${o.promo ? ` · <span class="pill">${esc(o.promo)}</span>` : ''}</td>
        <td class="right nowrap"><b>${rub(o.total)}</b>${o.paid ? '<div class="small" style="color:var(--ok)">оплачен</div>' : ''}</td>
        <td><span class="pill st-${o.status}">${STATUS[o.status]}</span></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card empty"><b>Заказов нет</b>${status || qtext ? 'Попробуйте изменить фильтр' : 'Они появятся здесь сразу после оформления на сайте'}</div>`
    $$('tr.link', v).forEach((tr) => (tr.onclick = () => openOrder(tr.dataset.id, draw)))
  }
  const draw = guard(async () => {
    rows = await api('GET', `/orders?${brandQ()}&q=${encodeURIComponent(qtext)}`)
    paint()
  })
  v.innerHTML = `<div class="head"><h1>Заказы</h1><div class="tabs" id="vmode"><button data-m="list">☰ Список</button><button data-m="kanban">▦ Канбан</button></div>
    <div class="grow"></div><button class="btn primary" id="newOrder">+ Заказ по телефону</button></div>
    <div class="head"><div class="tabs" id="st"><button class="on" data-s="">Все</button>${Object.entries(STATUS).map(([k, t]) => `<button data-s="${k}">${t}</button>`).join('')}</div>
    <input class="input" id="oq" placeholder="Номер, телефон или имя" style="flex:1;min-width:200px"></div><div id="olist"></div>`
  $('#vmode', v).onclick = (e) => { const m = e.target.closest('button')?.dataset.m; if (!m) return; mode = m; localStorage.setItem('crm-orders-view', mode); paint() }
  $('#st', v).onclick = (e) => { if (e.target.dataset.s === undefined) return; status = e.target.dataset.s; $$('#st button', v).forEach((b) => b.classList.toggle('on', b === e.target)); paint() }
  let t; $('#oq', v).oninput = (e) => { clearTimeout(t); t = setTimeout(() => { qtext = e.target.value.trim(); draw() }, 250) }
  $('#newOrder', v).onclick = () => manualOrder(draw)
  draw()
  if (id) openOrder(id, draw)
  return { onEvent: (e) => { if (e.type === 'order' && !document.querySelector('.kcard.dragging')) draw() } }
}

// Перетаскивание карточек: мышью — сразу, пальцем — после удержания 350 мс (иначе мешало бы прокрутке)
function kanbanDrag(board, onOpen, onDrop) {
  let drag = null
  const colAt = (x, y) => document.elementFromPoint(x, y)?.closest('.kcol')
  const clear = () => $$('.kcol.over', board).forEach((c) => c.classList.remove('over'))
  const start = (st) => {
    const r = st.card.getBoundingClientRect()
    const ghost = st.card.cloneNode(true)
    ghost.className = 'kcard kghost'
    ghost.style.width = r.width + 'px'
    document.body.append(ghost)
    st.card.classList.add('dragging')
    st.ghost = ghost; st.dx = st.x0 - r.left; st.dy = st.y0 - r.top; st.active = true
    move(st.x0, st.y0)
    if (navigator.vibrate) navigator.vibrate(15)
  }
  const move = (x, y) => {
    drag.ghost.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px) rotate(2deg)`
    clear(); colAt(x, y)?.classList.add('over')
    // автопрокрутка доски у краёв
    const br = board.getBoundingClientRect()
    if (x > br.right - 40) board.scrollLeft += 12; else if (x < br.left + 40) board.scrollLeft -= 12
  }
  const end = (x, y, cancelled) => {
    const st = drag; drag = null
    clearTimeout(st.timer)
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel)
    if (!st.active) { if (!cancelled && !st.moved) onOpen(st.card.dataset.id); return }
    st.ghost.remove(); st.card.classList.remove('dragging'); clear()
    const col = !cancelled && colAt(x, y)
    if (col && col.dataset.st !== st.card.dataset.st) onDrop(st.card.dataset.id, col.dataset.st)
  }
  const onMove = (e) => {
    if (!drag) return
    const far = Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6
    if (!drag.active) {
      if (far) { drag.moved = true; if (drag.touch) { clearTimeout(drag.timer); end(0, 0, true) } else start(drag) }
      return
    }
    e.preventDefault(); move(e.clientX, e.clientY)
  }
  const onUp = (e) => drag && end(e.clientX, e.clientY, false)
  const onCancel = () => drag && end(0, 0, true)
  board.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.kcard')
    if (!card || e.button > 0) return
    drag = { card, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', active: false, moved: false }
    if (drag.touch) drag.timer = setTimeout(() => drag && !drag.moved && start(drag), 350)
    addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel)
  })
  board.addEventListener('touchmove', (e) => { if (drag?.active) e.preventDefault() }, { passive: false })
  board.addEventListener('contextmenu', (e) => { if (e.target.closest('.kcard')) e.preventDefault() })
}

function modal(html) {
  const o = document.createElement('div')
  o.className = 'overlay'
  o.innerHTML = `<div class="modal">${html}</div>`
  o.onclick = (e) => { if (e.target === o) close() }
  const onKey = (e) => { if (e.key === 'Escape') close() }
  const close = () => { o.remove(); removeEventListener('keydown', onKey) }
  addEventListener('keydown', onKey)
  document.body.append(o)
  return { el: o, close }
}

const openOrder = guard(async (id, onChange) => {
  const o = await api('GET', `/orders/${id}`)
  const editable = o.status === 'new'
  const otherName = o.customer_id && o.customer_name && o.customer_name !== o.name
  const m = modal(`
    <div class="head" style="margin-bottom:10px"><h2 style="margin:0">Заказ № ${esc(o.number)}</h2>${brandPill(o.brand_name, o.brand_color)}${o.paid ? '<span class="pill st-delivered">оплачен</span>' : ''}<div class="grow"></div><button class="btn sm" data-x>✕</button></div>
    <p class="muted" style="margin:0 0 14px">${dt(o.created_at)}${o.utm_source ? ` · источник: ${esc(o.utm_source)}` : ''}</p>
    <label class="field"><span>Статус</span><select class="input" id="ost">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="small" style="display:flex;gap:6px;margin:-4px 0 14px"><input type="checkbox" id="opaid" ${o.paid ? 'checked' : ''}> Оплачен <span class="muted">— отмечайте, когда деньги пришли (проверьте в платёжной системе)</span></label>
    <div id="obody"></div>
    ${o.conversations.length ? `<p style="margin:0 0 14px">Переписки с покупателем: ${o.conversations.map((c) => `<a href="#/inbox/${c.id}" data-x>${SOURCE[c.source] || c.source}</a>`).join(', ')}</p>` : ''}
    <label class="field"><span>Заметка для команды</span><textarea class="input" id="onote" rows="2" placeholder="Например: перезвонить после 18:00">${esc(o.note)}</textarea></label>
    <div class="actions"><button class="btn primary" id="osave">Сохранить</button></div>
    <h2 style="margin-top:16px">История</h2><div class="list-rows small">${o.history.map((h) => `<div class="r"><span>${esc(h.text)}${h.user_name ? ` <span class="muted">— ${esc(h.user_name)}</span>` : ''}</span><span class="muted nowrap">${dt(h.created_at)}</span></div>`).join('')}</div>`)
  let editing = false
  const view = () => `
    <dl class="kv" style="margin:0 0 14px">
      <dt>Покупатель</dt><dd>${esc(o.name) || '—'}${o.customer_id ? ` · <a href="#/customers/${o.customer_id}" data-x>карточка${otherName ? ` «${esc(o.customer_name)}»` : ''}</a>` : ''}
        ${otherName ? `<div class="muted small">На этот номер уже есть покупатель «${esc(o.customer_name)}» — CRM объединяет заказы по телефону</div>` : ''}</dd>
      <dt>Телефон</dt><dd><a href="tel:+${esc(o.phone)}">${phoneFmt(o.phone)}</a></dd>
      ${o.delivery ? `<dt>Доставка</dt><dd>${esc(o.delivery)}</dd>` : ''}
      ${o.comment ? `<dt>Комментарий</dt><dd>${esc(o.comment)}</dd>` : ''}
      ${o.promo ? `<dt>Промокод</dt><dd>${esc(o.promo)} (−${rub(o.discount)})</dd>` : ''}
    </dl>
    <div class="table-wrap" style="margin-bottom:${editable ? 8 : 14}px"><table><tbody>
      ${o.items.map((i) => `<tr><td>${esc(i.name)} <span class="muted">${esc(i.variant)}</span></td><td class="nowrap right">${i.qty} × ${rub(i.price)}</td></tr>`).join('')}
      ${o.discount ? `<tr><td class="muted">Скидка</td><td class="right">−${rub(o.discount)}</td></tr>` : ''}
      <tr><td><b>Итого</b></td><td class="right"><b>${rub(o.total)}</b></td></tr></tbody></table></div>
    ${editable ? '<button class="btn sm" id="oedit" style="margin-bottom:14px">✎ Изменить заказ</button>' : '<p class="muted small" style="margin:-6px 0 14px">Состав можно менять, пока заказ в статусе «Новый».</p>'}`
  const edit = () => `
    <div class="grid g2" style="gap:8px"><label class="field"><span>Имя</span><input class="input" id="en" value="${esc(o.name)}"></label>
      <label class="field"><span>Телефон</span><input class="input" id="ep" inputmode="tel" value="${esc(phoneFmt(o.phone))}"></label></div>
    <label class="field"><span>Доставка / пункт выдачи</span><input class="input" id="ed" value="${esc(o.delivery)}"></label>
    <div class="field"><span>Товары</span><div id="eitems"></div><button class="btn sm" id="eadd" type="button" style="justify-self:start">+ товар</button></div>
    <div class="grid g2" style="gap:8px;align-items:end"><label class="field"><span>Скидка, ₽</span><input class="input" id="edisc" type="number" min="0" value="${o.discount || 0}"></label>
      <div class="field"><span>Итого</span><b id="etotal" style="font-size:18px;line-height:38px"></b></div></div>
    <div class="actions" style="margin:0 0 14px"><button class="btn" id="ecancel">Отмена</button><button class="btn primary" id="eok">Сохранить изменения</button></div>`
  const itemRow = (i = {}) => `<div class="irow"><input class="input" placeholder="Товар" data-n value="${esc(i.name || '')}"><input class="input" placeholder="Фасовка" data-v value="${esc(i.variant || '')}">
    <input class="input" type="number" min="1" value="${i.qty || 1}" data-q title="Количество"><input class="input" type="number" min="0" placeholder="Цена" value="${i.price ?? ''}" data-p title="Цена, ₽"><button class="btn sm" data-del title="Убрать">✕</button></div>`
  const readItems = () => $$('#eitems .irow', m.el).map((r) => ({ id: r.dataset.pid || '', name: $('[data-n]', r).value.trim(), variant: $('[data-v]', r).value.trim(), qty: Number($('[data-q]', r).value) || 1, price: Number($('[data-p]', r).value) || 0 })).filter((i) => i.name)
  const recalc = () => { const s = readItems().reduce((a, i) => a + i.qty * i.price, 0); $('#etotal', m.el).textContent = rub(Math.max(0, s - (Number($('#edisc', m.el).value) || 0))) }
  const paint = () => {
    $('#obody', m.el).innerHTML = editing ? edit() : view()
    $$('#obody [data-x]', m.el).forEach((b) => b.addEventListener('click', m.close))
    if (!editing) { const b = $('#oedit', m.el); if (b) b.onclick = () => { editing = true; paint() }; return }
    $('#eitems', m.el).innerHTML = o.items.map(itemRow).join('')
    $$('#eitems .irow', m.el).forEach((r, k) => (r.dataset.pid = o.items[k].product_id || ''))
    $('#eadd', m.el).onclick = () => { $('#eitems', m.el).insertAdjacentHTML('beforeend', itemRow()); recalc() }
    $('#eitems', m.el).oninput = recalc
    $('#eitems', m.el).onclick = (e) => { if (e.target.dataset.del !== undefined) { e.target.closest('.irow').remove(); recalc() } }
    $('#edisc', m.el).oninput = recalc
    recalc()
    $('#ecancel', m.el).onclick = () => { editing = false; paint() }
    $('#eok', m.el).onclick = guard(async () => {
      const items = readItems()
      if (!items.length) throw new Error('Добавьте хотя бы один товар')
      await api('PATCH', `/orders/${o.id}`, { items, discount: Number($('#edisc', m.el).value) || 0, contact: { name: $('#en', m.el).value, phone: $('#ep', m.el).value, delivery: $('#ed', m.el).value } })
      toast('Заказ изменён'); m.close(); onChange?.(); openOrder(o.id, onChange)
    })
  }
  paint()
  $$('[data-x]', m.el).forEach((b) => b.addEventListener('click', m.close))
  $('#osave', m.el).onclick = guard(async () => {
    if (editing) throw new Error('Сначала сохраните или отмените изменения состава')
    await api('PATCH', `/orders/${o.id}`, { status: $('#ost', m.el).value, note: $('#onote', m.el).value, paid: $('#opaid', m.el).checked })
    toast('Сохранено'); m.close(); onChange?.(); refreshCounters()
  })
})

// Новый заказ вручную (по телефону или из карточки покупателя)
function manualOrder(onDone, preset = {}) {
  const brands = S.brands
  const brandSel = preset.brandId || S.brand || brands[0]?.id
  const m = modal(`<h2>${preset.title || 'Заказ по телефону'}</h2>
    <label class="field"><span>Марка</span><select class="input" id="mb">${brands.map((b) => `<option value="${b.id}" ${b.id === brandSel ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
    <div class="grid g2" style="gap:8px"><label class="field"><span>Имя</span><input class="input" id="mn" value="${esc(preset.name || '')}"></label><label class="field"><span>Телефон</span><input class="input" id="mp" inputmode="tel" placeholder="+7" value="${esc(preset.phone ? phoneFmt(preset.phone) : '')}"></label></div>
    <label class="field"><span>Доставка / пункт выдачи</span><input class="input" id="md"></label>
    <div class="field"><span>Товары</span><div id="mitems"></div><button class="btn sm" id="madd" type="button" style="justify-self:start">+ ещё товар</button></div>
    <div class="actions"><button class="btn" data-x>Отмена</button><button class="btn primary" id="mok">Создать заказ</button></div>`)
  const addRow = () => $('#mitems', m.el).insertAdjacentHTML('beforeend', `<div class="irow"><input class="input" placeholder="Товар" data-n><input class="input" placeholder="Фасовка" data-v>
    <input class="input" type="number" min="1" value="1" data-q title="Количество"><input class="input" type="number" min="0" placeholder="Цена" data-p title="Цена, ₽"><button class="btn sm" data-del title="Убрать" type="button">✕</button></div>`)
  addRow()
  $('#madd', m.el).onclick = addRow
  $('#mitems', m.el).onclick = (e) => { if (e.target.dataset.del !== undefined && $$('#mitems .irow', m.el).length > 1) e.target.closest('.irow').remove() }
  $('[data-x]', m.el).onclick = m.close
  $(preset.phone ? '#mitems [data-n]' : '#mn', m.el).focus()
  $('#mok', m.el).onclick = guard(async () => {
    const items = $$('#mitems .irow', m.el).map((r) => ({ name: $('[data-n]', r).value.trim(), variant: $('[data-v]', r).value.trim(), qty: Number($('[data-q]', r).value) || 1, price: Number($('[data-p]', r).value) || 0 })).filter((i) => i.name)
    if (!items.length) throw new Error('Добавьте хотя бы один товар')
    const r = await api('POST', '/orders', { brand_id: Number($('#mb', m.el).value), items, contact: { name: $('#mn', m.el).value, phone: $('#mp', m.el).value, delivery: $('#md', m.el).value } })
    toast(`Заказ № ${r.number} создан`); m.close(); onDone?.(r); refreshCounters()
  })
}

/* ====================== ПЕРЕПИСКИ ====================== */
function viewInbox(v, openId) {
  let cur = openId ? Number(openId) : null
  let filter = { status: 'open', source: '', q: '' }
  let convs = []
  v.innerHTML = `<div class="inbox noaside" id="ib">
    <div class="conv-list"><div class="filters">
      <div class="tabs" id="fs"><button data-s="open" class="on">Открытые</button><button data-s="unread">Без ответа</button><button data-s="closed">Закрытые</button><button data-s="">Все</button></div>
      <div style="display:flex;gap:8px"><input class="input" id="cq" placeholder="Поиск: имя, @ник, телефон" style="flex:1">
      <select class="input" id="csrc" style="width:120px"><option value="">Все каналы</option><option value="telegram">Telegram</option><option value="max">MAX</option><option value="site">Сайт</option></select></div>
    </div><div class="items" id="citems"></div></div>
    <div class="chat" id="chat"><div class="empty" style="margin:auto"><b>Выберите переписку</b>Сообщения из Telegram, MAX и заявки с сайта собираются здесь</div></div>
    <aside class="chat-aside" id="aside" hidden></aside></div>`

  const ava = (c) => {
    const name = c.customer_name || c.title || '?'
    return `<div class="ava" style="background:${esc(c.brand_color)}">${esc(name.trim()[0] || '?').toUpperCase()}<small style="background:${SRC_COLOR[c.source] || '#999'}"></small></div>`
  }
  const loadList = guard(async () => {
    const st = filter.status === 'unread' ? 'open&unread=1' : filter.status
    convs = await api('GET', `/conversations?${brandQ()}&status=${st}&source=${filter.source}&q=${encodeURIComponent(filter.q)}`)
    $('#citems', v).innerHTML = convs.length ? convs.map((c) => `<div class="conv ${c.id === cur ? 'on' : ''} ${c.unread ? 'unread' : ''}" data-id="${c.id}">${ava(c)}
      <div style="min-width:0"><div class="t">${esc(c.customer_name || c.title)}</div><div class="p">${esc(c.last_text)}</div>
      <div class="small"><span class="src-${c.source}">${SOURCE[c.source] || c.source}</span>${S.brands.length > 1 ? ` · <span class="muted">${esc(c.brand_name)}</span>` : ''}</div></div>
      <div class="m"><span>${ago(c.last_message_at)}</span>${c.unread ? `<b class="unread-dot" title="Непрочитанных: ${c.unread}">${c.unread > 99 ? '99+' : c.unread}</b>` : ''}</div></div>`).join('')
      : `<div class="empty"><b>Пусто</b>${filter.status === 'open' ? 'Новых переписок нет' : 'Ничего не найдено'}</div>`
    $$('.conv', v).forEach((el) => (el.onclick = () => { location.hash = `#/inbox/${el.dataset.id}` }))
  })

  const loadChat = guard(async (keepScroll) => {
    if (!cur) return
    $('#ib', v).classList.add('has-chat')
    const c = await api('GET', `/conversations/${cur}`)
    const canReply = c.source !== 'site'
    const chatEl = $('#chat', v)
    const draft = $('#reply', chatEl)?.value || ''
    const box = $('#msgs', chatEl)
    const atBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 80
    let lastDay = ''
    const msgs = c.messages.map((m) => {
      const day = new Date(m.created_at).toDateString()
      const sep = day !== lastDay ? `<div class="day">${dd(m.created_at)}</div>` : ''
      lastDay = day
      const cls = m.direction === 'note' ? 'note' : m.status === 'failed' ? 'out failed' : m.direction
      const who = m.direction === 'note' ? `📝 заметка · ${esc(m.user_name || '')}` : m.direction === 'out' ? esc(m.user_name || 'CRM') : ''
      return `${sep}<div class="msg ${cls}">${esc(m.text)}<div class="meta">${who ? who + ' · ' : ''}${tm(m.created_at)}${m.status === 'failed' ? ' · не доставлено: ' + esc(m.error) : ''}</div></div>`
    }).join('')
    chatEl.innerHTML = `<div class="chat-head"><a class="btn sm back-m" href="#/inbox">←</a>${ava(c)}<div class="grow">
        <div style="font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.customer_name || c.title)}</div>
        <div class="small muted"><span class="src-${c.source}">${SOURCE[c.source]}</span>${c.username ? ` · @${esc(c.username)}` : ''}${c.customer_phone ? ` · ${phoneFmt(c.customer_phone)}` : ''} ${brandPill(c.brand_name, c.brand_color)}</div></div>
        <button class="btn sm" id="cst">${c.status === 'open' ? '✓ Закрыть' : 'Открыть снова'}</button></div>
      <div class="msgs" id="msgs">${msgs}</div>
      <div class="composer">
        ${canReply ? '' : `<div class="alert info" style="margin:0">📞 Это заявка с формы на сайте — ответить можно по телефону <a href="tel:+${esc(c.customer_phone)}">${phoneFmt(c.customer_phone)}</a>. Здесь можно оставить заметку для команды.</div>`}
        <textarea class="input" id="reply" rows="2" placeholder="${canReply ? `Ответ в ${SOURCE[c.source]} — Enter отправить, Shift+Enter новая строка` : 'Заметка для команды'}"></textarea>
        <div class="row"><label class="small muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="asNote" ${canReply ? '' : 'checked disabled'}> внутренняя заметка (покупатель не увидит)</label>
          <div class="grow"></div><button class="btn primary" id="send">Отправить</button></div></div>`
    $('#reply', chatEl).value = draft
    const mb = $('#msgs', chatEl)
    if (!keepScroll || atBottom) mb.scrollTop = mb.scrollHeight
    $('#cst', chatEl).onclick = guard(async () => { await api('PATCH', `/conversations/${c.id}`, { status: c.status === 'open' ? 'closed' : 'open' }); loadList(); loadChat(true) })
    const send = guard(async () => {
      const ta = $('#reply', chatEl)
      const text = ta.value.trim()
      if (!text) return
      const btn = $('#send', chatEl); btn.disabled = true
      try { await api('POST', `/conversations/${c.id}/messages`, { text, note: $('#asNote', chatEl).checked }); ta.value = '' }
      finally { btn.disabled = false }
      await loadChat(); loadList(); refreshCounters()
    })
    $('#send', chatEl).onclick = send
    $('#reply', chatEl).onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() } }
    if (!keepScroll) $('#reply', chatEl).focus({ preventScroll: true })
    if (c.unread) { await api('PATCH', `/conversations/${c.id}`, { read: true }); refreshCounters(); loadList() }

    const aside = $('#aside', v)
    aside.hidden = false
    $('#ib', v).classList.remove('noaside')
    aside.innerHTML = `<h2>Покупатель</h2>${c.customer_id ? `<dl class="kv"><dt>Имя</dt><dd>${esc(c.customer_name) || '—'}</dd><dt>Телефон</dt><dd>${phoneFmt(c.customer_phone) || '—'}</dd></dl>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><a class="btn sm" href="#/customers/${c.customer_id}">Карточка →</a><button class="btn sm primary" id="aorder">+ Заказ</button></div>`
      : `<p class="muted small">Переписка пока не связана с покупателем. Если он назвал телефон — привяжите, и здесь появятся его заказы со всех сайтов.</p>
        <div style="display:flex;gap:6px"><input class="input" id="lphone" placeholder="+7…" inputmode="tel" style="flex:1"><button class="btn" id="link">Привязать</button></div>`}
      <h2 style="margin-top:18px">Заказы</h2>${c.orders.length ? `<div class="list-rows small">${c.orders.map((o) => `<div class="r"><a href="#/orders/${o.id}">№ ${esc(o.number)}</a><span class="nowrap">${rub(o.total)} <span class="pill st-${o.status}">${STATUS[o.status]}</span></span></div>`).join('')}</div>` : '<p class="muted small">Заказов нет</p>'}`
    const ao = $('#aorder', aside)
    if (ao) ao.onclick = () => manualOrder(() => loadChat(true), { brandId: c.brand_id, name: c.customer_name, phone: c.customer_phone, title: 'Новый заказ · ' + (c.customer_name || 'покупатель') })
    const lb = $('#link', aside)
    if (lb) lb.onclick = guard(async () => { await api('PATCH', `/conversations/${c.id}`, { phone: $('#lphone', aside).value }); toast('Привязано'); loadChat(true); loadList() })
  })

  $('#fs', v).onclick = (e) => { if (e.target.dataset.s === undefined) return; filter.status = e.target.dataset.s; $$('#fs button', v).forEach((b) => b.classList.toggle('on', b === e.target)); loadList() }
  $('#csrc', v).onchange = (e) => { filter.source = e.target.value; loadList() }
  let t; $('#cq', v).oninput = (e) => { clearTimeout(t); t = setTimeout(() => { filter.q = e.target.value.trim(); loadList() }, 250) }
  loadList().then(() => loadChat())
  return {
    onEvent: (e) => {
      if (e.type === 'message' || e.type === 'conversation') {
        loadList()
        if (e.conversationId === cur) loadChat(true)
      }
    },
  }
}

/* ====================== ПОКУПАТЕЛИ ====================== */
function viewCustomers(v, id) {
  if (id) return customerCard(v, id)
  v.innerHTML = `<div class="head"><h1>Покупатели</h1><div class="grow"></div><input class="input" id="uq" placeholder="Имя, телефон, почта" style="min-width:240px"></div><div id="ulist"></div>`
  const draw = guard(async (qq = '') => {
    const rows = await api('GET', `/customers?q=${encodeURIComponent(qq)}`)
    $('#ulist', v).innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Покупатель</th><th>Телефон</th><th class="right">Заказов</th><th class="right">Потратил</th><th class="hide-m">Марки</th><th class="hide-m">Последний заказ</th></tr></thead>
      <tbody>${rows.map((c) => `<tr class="link" data-id="${c.id}"><td><b>${esc(c.name) || 'Без имени'}</b>${c.conversations ? ` <span class="muted small">💬 ${c.conversations}</span>` : ''}</td>
        <td class="nowrap">${phoneFmt(c.phone)}</td><td class="right">${c.orders}</td><td class="right nowrap">${rub(c.spent)}</td>
        <td class="hide-m muted">${esc(c.brands || '—')}</td><td class="hide-m muted nowrap">${c.last_order_at ? dt(c.last_order_at) : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card empty"><b>Покупателей пока нет</b>Карточка появляется автоматически после заказа или заявки с сайта</div>`
    $$('tr.link', v).forEach((tr) => (tr.onclick = () => { location.hash = `#/customers/${tr.dataset.id}` }))
  })
  let t; $('#uq', v).oninput = (e) => { clearTimeout(t); t = setTimeout(() => draw(e.target.value.trim()), 250) }
  draw()
}
const customerCard = guard(async (v, id) => {
  const c = await api('GET', `/customers/${id}`)
  const spent = c.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  const prev = S.prevHash || ''
  const back = /^#\/inbox\/\d+/.test(prev) ? ['← К переписке', prev] : /^#\/orders/.test(prev) ? ['← К заказам', prev] : /^#\/customers\/\d+/.test(prev) || !prev ? ['← Покупатели', '#/customers'] : /^#\/customers/.test(prev) ? ['← Покупатели', prev] : ['← Назад', prev]
  const otherNames = [...new Set(c.orders.map((o) => (o.name || '').trim()).filter((n) => n && n.toLowerCase() !== (c.name || '').trim().toLowerCase()))]
  v.innerHTML = `<div class="head"><a class="btn sm" href="${esc(back[1])}">${back[0]}</a><h1>${esc(c.name) || 'Без имени'}</h1><div class="grow"></div><button class="btn primary" id="cnew">+ Новый заказ</button></div>
    ${otherNames.length ? `<div class="alert info" style="margin-bottom:14px">На этот телефон заказы оформляли и под другими именами: <b>${otherNames.map(esc).join(', ')}</b>. CRM объединяет покупателей по номеру телефона.</div>` : ''}
    <div class="grid g3">
      <div class="card"><h2>Контакты</h2>
        <label class="field"><span>Имя</span><input class="input" id="cn" value="${esc(c.name)}"></label>
        <dl class="kv" style="margin-bottom:12px"><dt>Телефон</dt><dd><a href="tel:+${esc(c.phone)}">${phoneFmt(c.phone) || '—'}</a></dd><dt>С нами с</dt><dd>${dd(c.created_at)}</dd></dl>
        <label class="field"><span>Почта</span><input class="input" id="ce" value="${esc(c.email)}"></label>
        <label class="field"><span>Заметка</span><textarea class="input" id="cnote" rows="3" placeholder="Например: кот на диете, берёт 10 кг раз в месяц">${esc(c.note)}</textarea></label>
        <button class="btn primary" id="csave">Сохранить</button></div>
      <div class="card"><h2>Заказы · ${c.orders.length} · ${rub(spent)}</h2><div class="list-rows">
        ${c.orders.length ? c.orders.map((o) => `<div class="r"><span><a href="#/orders/${o.id}">№ ${esc(o.number)}</a> ${brandPill(o.brand_name, o.brand_color)}<div class="muted small">${dt(o.created_at)}</div></span>
          <span class="nowrap right">${rub(o.total)}<div><span class="pill st-${o.status}">${STATUS[o.status]}</span></div></span></div>`).join('') : '<p class="muted">Заказов нет</p>'}</div></div>
      <div class="card"><h2>Переписки</h2><div class="list-rows">
        ${c.conversations.length ? c.conversations.map((x) => `<div class="r"><span><a href="#/inbox/${x.id}" class="src-${x.source}">${SOURCE[x.source]}</a> ${brandPill(x.brand_name, x.brand_color)}<div class="muted small">${esc(x.last_text).slice(0, 60)}</div></span><span class="muted small nowrap">${ago(x.last_message_at)}</span></div>`).join('') : '<p class="muted">Переписок нет</p>'}</div></div>
    </div>`
  $('#csave', v).onclick = guard(async () => { await api('PATCH', `/customers/${c.id}`, { name: $('#cn', v).value, email: $('#ce', v).value, note: $('#cnote', v).value }); toast('Сохранено') })
  const lastBrand = c.orders[0]?.brand_id || c.conversations[0]?.brand_id
  $('#cnew', v).onclick = () => manualOrder(() => customerCard(v, id), { brandId: lastBrand, name: c.name, phone: c.phone, title: 'Новый заказ · ' + (c.name || 'покупатель') })
  $$('a[href^="#/orders/"]', v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openOrder(a.getAttribute('href').split('/')[2], () => customerCard(v, id)) }))
})

/* ====================== ПРОМОКОДЫ ====================== */
const dayStart = (s) => (s ? new Date(s + 'T00:00:00').getTime() : null)
const dayEnd = (s) => (s ? new Date(s + 'T23:59:59').getTime() : null)
const isoDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function promoState(p) {
  const t = Date.now()
  if (p.starts_at && t < p.starts_at) return ['ещё не начался', 'st-packed']
  if (p.expires_at && t > p.expires_at) return ['истёк', 'st-cancelled']
  if (p.max_uses && p.used >= p.max_uses) return ['исчерпан', 'st-cancelled']
  if (p.expires_at && p.expires_at - t < 3 * 86400_000) return ['скоро истечёт', 'st-new']
  return ['действует', 'st-delivered']
}
function viewPromos(v) {
  const admin = S.me.role === 'admin'
  let show = 'active'
  const draw = guard(async () => {
    const all = await api('GET', '/promos')
    const list = all.filter((p) => (!S.brand || !p.brand_id || p.brand_id === S.brand) &&
      (show === 'all' || (show === 'active') === ['действует', 'скоро истечёт', 'ещё не начался'].includes(promoState(p)[0])))
    const brandName = (id) => { const b = brandOf(id); return b ? brandPill(b.name, b.color) : '<span class="pill">все сайты</span>' }
    $('#plist', v).innerHTML = list.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Промокод</th><th>Скидка</th><th>Где действует</th><th>Срок</th><th class="right">Использован</th><th>Состояние</th>${admin ? '<th></th>' : ''}</tr></thead>
      <tbody>${list.map((p) => { const [st, cls] = promoState(p); return `<tr>
        <td><b class="mono">${esc(p.code)}</b>${p.note ? `<div class="muted small">${esc(p.note)}</div>` : ''}</td>
        <td class="nowrap"><b>${p.kind === 'pct' ? p.value + '%' : rub(p.value)}</b>${p.first_order ? '<div class="muted small">только первый заказ</div>' : ''}</td>
        <td>${brandName(p.brand_id)}</td>
        <td class="small nowrap">${p.starts_at ? 'с ' + dd(p.starts_at) + '<br>' : ''}${p.expires_at ? 'до ' + dd(p.expires_at) : '<span class="muted">бессрочно</span>'}</td>
        <td class="right nowrap">${num(p.used)}${p.max_uses ? ' из ' + num(p.max_uses) : ''}</td>
        <td><span class="pill ${cls}">${st}</span></td>
        ${admin ? `<td class="right nowrap"><button class="btn sm" data-ep="${p.id}">Изменить</button> <button class="btn sm danger" data-dp="${p.id}" title="Удалить">Удалить</button></td>` : ''}</tr>` }).join('')}</tbody></table></div>`
      : `<div class="card empty"><b>${show === 'active' ? 'Действующих промокодов нет' : 'Промокодов нет'}</b>${admin ? 'Нажмите «Новый промокод»' : ''}</div>`
    $$('[data-ep]', v).forEach((b) => (b.onclick = () => promoForm(draw, all.find((x) => x.id === Number(b.dataset.ep)))))
    $$('[data-dp]', v).forEach((b) => (b.onclick = guard(async () => {
      const p = all.find((x) => x.id === Number(b.dataset.dp))
      if (!confirm(`Удалить промокод ${p.code}? На сайте он сразу перестанет работать. Старые заказы с ним останутся.`)) return
      await api('DELETE', `/promos/${p.id}`); toast(`Промокод ${p.code} удалён`); draw()
    })))
  })
  v.innerHTML = `<div class="head"><h1>Промокоды</h1><div class="tabs" id="pshow"><button data-s="active" class="on">Действующие</button><button data-s="all">Все</button></div>
    <div class="grow"></div>${admin ? '<button class="btn primary" id="pnew">+ Новый промокод</button>' : ''}</div>
    <p class="muted small" style="margin-top:0">Промокод действует на выбранном сайте (или на всех сразу). Скидку считает CRM: если код истёк или не подходит, заказ придёт без скидки и с пометкой в истории.</p>
    <div id="plist"></div>`
  $('#pshow', v).onclick = (e) => { const s = e.target.dataset.s; if (!s) return; show = s; $$('#pshow button', v).forEach((b) => b.classList.toggle('on', b === e.target)); draw() }
  if (admin) $('#pnew', v).onclick = () => promoForm(draw)
  draw()
}
function promoForm(done, p = null) {
  const today = isoDay(Date.now())
  const locked = !!(p && p.used) // уже применяли — название и сайт не меняем, чтобы не потерять статистику
  const brandSel = p ? p.brand_id : S.brand
  const m = modal(`<h2>${p ? 'Промокод ' + esc(p.code) : 'Новый промокод'}</h2>
    ${locked ? `<div class="alert info" style="margin-bottom:12px">Промокод уже применили ${num(p.used)} раз — название и сайт не меняются, чтобы не потерялась статистика. Скидку, срок, лимит и условия менять можно: новые условия действуют для следующих заказов.</div>` : ''}
    <label class="field"><span>Код</span><div style="display:flex;gap:6px"><input class="input mono" id="pc" placeholder="Например: ХВОСТИК10" style="flex:1;text-transform:uppercase" maxlength="30" value="${esc(p?.code || '')}" ${locked ? 'disabled' : ''}>${locked ? '' : '<button class="btn" id="pgen" type="button" title="Придумать код">🎲</button>'}</div></label>
    <label class="field"><span>Где действует</span><select class="input" id="pb" ${locked ? 'disabled' : ''}><option value="">Все сайты</option>${S.brands.map((b) => `<option value="${b.id}" ${b.id === brandSel ? 'selected' : ''}>${esc(b.name)}${b.site_url ? ' — ' + esc(b.site_url.replace(/^https?:\/\//, '')) : ''}</option>`).join('')}</select></label>
    <div class="grid g2" style="gap:8px"><label class="field"><span>Скидка</span><input class="input" id="pv" type="number" min="1" placeholder="10" value="${p ? p.value : ''}"></label>
      <label class="field"><span>&nbsp;</span><select class="input" id="pk"><option value="pct">процентов</option><option value="fixed" ${p?.kind === 'fixed' ? 'selected' : ''}>рублей</option></select></label></div>
    <div class="field"><span>Срок действия</span><div class="tabs" id="pdur">${[[7, 'неделя'], [30, 'месяц'], [90, '3 месяца'], [0, 'бессрочно'], ['c', 'свои даты']].map(([d, t]) => `<button type="button" data-d="${d}">${t}</button>`).join('')}</div></div>
    <div class="grid g2" style="gap:8px" id="pdates"><label class="field"><span>Начало</span><input class="input" type="date" id="ps" value="${p?.starts_at ? isoDay(p.starts_at) : today}"></label>
      <label class="field"><span>Последний день</span><input class="input" type="date" id="pe" value="${p?.expires_at ? isoDay(p.expires_at) : ''}"></label></div>
    <div class="grid g2" style="gap:8px"><label class="field"><span>Сколько раз можно применить</span><input class="input" id="pm" type="number" min="1" placeholder="без ограничений" value="${p?.max_uses || ''}"></label>
      <label class="small" style="display:flex;gap:6px;align-items:center;margin-top:18px"><input type="checkbox" id="pf" ${p?.first_order ? 'checked' : ''}> только на первый заказ</label></div>
    <label class="field"><span>Заметка (для себя)</span><input class="input" id="pn" placeholder="Например: для блогера, рассылка к 1 сентября" value="${esc(p?.note || '')}"></label>
    <div class="actions"><button class="btn" data-x>Отмена</button><button class="btn primary" id="pok">${p ? 'Сохранить' : 'Создать'}</button></div>`)
  const setDur = (d) => {
    $$('#pdur button', m.el).forEach((b) => b.classList.toggle('on', b.dataset.d === String(d)))
    if (d === 'c') return
    const s = $('#ps', m.el).value || today
    $('#pe', m.el).value = Number(d) ? isoDay(new Date(s + 'T12:00:00').getTime() + (Number(d) - 1) * 86400_000) : ''
  }
  if (!p) setDur(30)
  else $$('#pdur button', m.el).forEach((b) => b.classList.toggle('on', b.dataset.d === (p.expires_at ? 'c' : '0'))) // при редактировании — даты как есть
  $('#pdur', m.el).onclick = (e) => { const d = e.target.dataset.d; if (d !== undefined) setDur(d === 'c' ? 'c' : Number(d)) }
  $('#pe', m.el).oninput = () => setDur('c')
  const gen = $('#pgen', m.el)
  if (gen) gen.onclick = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $('#pc', m.el).value = Array.from({ length: 8 }, () => a[Math.floor(Math.random() * a.length)]).join('') }
  $('[data-x]', m.el).onclick = m.close
  $(locked ? '#pv' : '#pc', m.el).focus()
  $('#pok', m.el).onclick = guard(async () => {
    const s = $('#ps', m.el).value, e = $('#pe', m.el).value
    // начало «сегодня» = действует сразу; у старого промокода сохраняем прежнюю дату начала, если её не трогали
    const keepStart = p?.starts_at && s === isoDay(p.starts_at)
    const body = {
      code: $('#pc', m.el).value, brand_id: Number($('#pb', m.el).value) || null, kind: $('#pk', m.el).value, value: Number($('#pv', m.el).value),
      starts_at: keepStart ? p.starts_at : s && s !== today ? dayStart(s) : null, expires_at: p?.expires_at && e === isoDay(p.expires_at) ? p.expires_at : dayEnd(e),
      max_uses: Number($('#pm', m.el).value) || null, first_order: $('#pf', m.el).checked, note: $('#pn', m.el).value,
    }
    const r = p ? await api('PATCH', `/promos/${p.id}`, body) : await api('POST', '/promos', body)
    toast(p ? `Промокод ${r.code} сохранён` : `Промокод ${r.code} создан`); m.close(); done()
  })
}

/* ====================== НАСТРОЙКИ ====================== */
function viewSettings(v) {
  const admin = S.me.role === 'admin'
  const draw = guard(async () => {
    const [brands, chans, users] = await Promise.all([api('GET', '/brands'), api('GET', '/channels'), admin ? api('GET', '/users') : []])
    S.brands = brands
    const origin = location.origin
    v.innerHTML = `<div class="head"><h1>Настройки</h1></div>
    ${admin ? `<div class="card" style="margin-bottom:14px"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Марки и сайты</h2><div class="grow"></div><button class="btn sm" id="addBrand">+ Марка</button></div>
      <p class="muted small" style="margin-top:0">Каждая марка — отдельный сайт со своими заказами, ботами и аналитикой. В «Сводке» можно смотреть по одной марке или по всем сразу.</p>
      ${brands.map((b) => `<div class="card" style="margin-bottom:10px;padding:14px">
        <div class="head" style="margin-bottom:8px"><span class="pill dot" style="--c:${esc(b.color)};font-size:14px;height:26px">${esc(b.name)}</span><span class="muted small">${esc(b.site_url) || 'адрес сайта не указан'}</span><div class="grow"></div><button class="btn sm" data-eb="${b.id}">Изменить</button></div>
        <details><summary style="cursor:pointer;font-weight:600">Подключение сайта</summary>
          <p class="small">1. Вставьте на сайт перед <code>&lt;/body&gt;</code>:</p>
          <pre class="code">&lt;script src="${esc(origin)}/tracker.js" data-key="${esc(b.api_key)}" defer&gt;&lt;/script&gt;</pre>
          <p class="small">2. Сайт сам будет присылать просмотры. Корзину, заказы и заявки отправляйте так:</p>
          <pre class="code">crm.track('add_to_cart', { id, name, price })
crm.track('checkout_start')
crm.order({ number, items: [{ id, name, w, qty, price }], contact: { name, phone, delivery }, discount, promo })
crm.lead({ name, phone, topic, msg })</pre>
          <p class="small muted">Ключ сайта: <code>${esc(b.api_key)}</code> · Заказы принимаются только с адреса ${esc(b.site_url) || '(любого — укажите адрес сайта!)'}</p>
        </details>
        <div class="head small" style="margin:8px 0 0;gap:8px;flex-wrap:wrap"><span><b>Прайс:</b> ${b.prices_at ? `обновлён ${dt(b.prices_at)}` : '<span style="color:var(--danger,#d33)">не загружен — цены заказов не сверяются</span>'}</span>
          ${b.prices_error ? `<span class="muted">${esc(b.prices_error)}</span>` : ''}<div class="grow"></div><button class="btn sm" data-ps="${b.id}">Обновить с сайта</button></div>
        <p class="muted small" style="margin:4px 0 0">CRM берёт цены заказов с сайта из прайса, а не из браузера покупателя. Прайс обновляется сам каждый час.</p></div>`).join('')}</div>` : ''}

    <div class="card" style="margin-bottom:14px"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Мессенджеры</h2><div class="grow"></div>${admin ? '<button class="btn sm" id="addCh">+ Подключить бота</button>' : ''}</div>
      <p class="muted small" style="margin-top:0">CRM получает сообщения, которые покупатели пишут <b>боту</b> марки, и отвечает от его имени. Ссылка «Написать в Telegram/MAX» на сайте должна вести на этого бота.</p>
      ${chans.length ? `<div class="table-wrap"><table><thead><tr><th>Канал</th><th>Марка</th><th>Бот</th><th>Режим</th><th>Состояние</th><th></th></tr></thead><tbody>
        ${chans.map((c) => { const b = brands.find((x) => x.id === c.brand_id); return `<tr>
          <td><b class="src-${c.type}">${SOURCE[c.type]}</b><div class="small muted">${esc(c.name)}</div></td><td>${b ? esc(b.name) : '—'}</td>
          <td>${c.bot_username ? '@' + esc(c.bot_username) : '<span class="muted">—</span>'}</td>
          <td class="small">${c.mode === 'webhook' ? 'webhook (сервер)' : 'опрос (polling)'}</td>
          <td class="small">${!c.enabled ? '<span class="pill">выключен</span>' : c.last_error ? `<span class="pill st-cancelled">ошибка</span><div class="muted" style="max-width:260px">${esc(c.last_error)}</div>` : c.running ? '<span class="pill st-delivered">работает</span>' : '<span class="pill">не запущен</span>'}</td>
          <td class="nowrap right">${admin ? `<button class="btn sm" data-ec="${c.id}">Изменить</button>` : ''}</td></tr>` }).join('')}</tbody></table></div>`
      : '<div class="empty"><b>Боты не подключены</b>Нажмите «Подключить бота» — понадобится только токен</div>'}
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Где взять токен</summary>
        <p class="small"><b>Telegram:</b> откройте @BotFather → /newbot → придумайте имя → он пришлёт токен вида <code>123456:ABC…</code>.</p>
        <p class="small"><b>MAX:</b> нужна верифицированная организация на <a href="https://business.max.ru/self" target="_blank" rel="noopener">business.max.ru</a> → «Чат-боты» → создать бота → ⋮ → «Настройки» → скопировать токен.</p>
        <p class="small muted">Режим «опрос» работает на любом компьютере. «Webhook» — только когда CRM стоит на сервере с https-адресом (MAX рекомендует его для постоянной работы).</p></details>
    </div>

    ${admin ? `<div class="card" style="margin-bottom:14px"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Сотрудники</h2><div class="grow"></div><button class="btn sm" id="addUser">+ Сотрудник</button></div>
      <div class="list-rows">${users.map((u) => `<div class="r"><span><b>${esc(u.name)}</b> <span class="muted">${esc(u.login)} · ${u.role === 'admin' ? 'администратор' : 'менеджер'}</span></span>
        ${u.id !== S.me.id ? `<button class="btn sm danger" data-du="${u.id}">Удалить</button>` : '<span class="muted small">это вы</span>'}</div>`).join('')}</div>
      <p class="muted small" style="margin-bottom:0">Менеджер видит заказы и переписки, но не может менять ботов, марки и сотрудников.</p></div>` : ''}

    <div class="card"><h2>Мой пароль</h2><div class="grid g3">
      <input class="input" type="password" id="p0" placeholder="Текущий пароль" autocomplete="current-password">
      <input class="input" type="password" id="p1" placeholder="Новый (от 8 символов)" autocomplete="new-password">
      <button class="btn" id="pset">Сменить пароль</button></div></div>`

    if (admin) {
      $('#addBrand', v).onclick = () => brandForm(null, draw)
      $$('[data-eb]', v).forEach((b) => (b.onclick = () => brandForm(brands.find((x) => x.id === Number(b.dataset.eb)), draw)))
      $$('[data-ps]', v).forEach((b) => (b.onclick = guard(async () => { const r = await api('POST', `/brands/${b.dataset.ps}/prices/sync`); toast(`Прайс обновлён: ${r.n} позиций`); draw() })))
      $('#addCh', v).onclick = () => channelForm(null, brands, draw)
      $$('[data-ec]', v).forEach((b) => (b.onclick = () => channelForm(chans.find((x) => x.id === Number(b.dataset.ec)), brands, draw)))
      $('#addUser', v).onclick = () => userForm(draw)
      $$('[data-du]', v).forEach((b) => (b.onclick = guard(async () => { if (confirm('Удалить сотрудника?')) { await api('DELETE', `/users/${b.dataset.du}`); draw() } })))
    }
    $('#pset', v).onclick = guard(async () => { await api('POST', '/me/password', { old: $('#p0', v).value, password: $('#p1', v).value }); $('#p0', v).value = $('#p1', v).value = ''; toast('Пароль изменён') })
  })
  draw()
  return { onEvent: (e) => { if (e.type === 'channel') draw() } }
}

function brandForm(b, done) {
  const m = modal(`<h2>${b ? 'Марка' : 'Новая марка'}</h2>
    <label class="field"><span>Название</span><input class="input" id="bn" value="${esc(b?.name || '')}" placeholder="Например: Хвостик"></label>
    <label class="field"><span>Адрес сайта</span><input class="input" id="bu" value="${esc(b?.site_url || '')}" placeholder="https://…"><span class="muted small" style="font-weight:400">Заказы будут приниматься только с этого сайта</span></label>
    <label class="field"><span>Адрес прайса</span><input class="input" id="bpu" value="${esc(b?.prices_url || '')}" placeholder="по умолчанию: адрес сайта + /prices.json"><span class="muted small" style="font-weight:400">Файл с ценами, который публикует сайт. По нему CRM проверяет цены в заказах</span></label>
    <label class="field"><span>Цвет метки</span><input type="color" id="bc" value="${esc(b?.color || '#0ea5e9')}" style="width:60px;height:36px;border:0;background:none"></label>
    ${b ? '<label class="small" style="display:flex;gap:6px"><input type="checkbox" id="brk"> выпустить новый ключ сайта (старый перестанет работать)</label>' : ''}
    <div class="actions"><button class="btn" data-x>Отмена</button><button class="btn primary" id="bok">Сохранить</button></div>`)
  $('[data-x]', m.el).onclick = m.close
  $('#bok', m.el).onclick = guard(async () => {
    const body = { name: $('#bn', m.el).value, site_url: $('#bu', m.el).value.trim(), prices_url: $('#bpu', m.el).value.trim(), color: $('#bc', m.el).value, rotateKey: $('#brk', m.el)?.checked }
    if (b) await api('PATCH', `/brands/${b.id}`, body); else await api('POST', '/brands', body)
    S.brands = await api('GET', '/brands'); renderShell(); paintCounters(); route(); m.close()
  })
}
function channelForm(c, brands, done) {
  const m = modal(`<h2>${c ? 'Бот' : 'Подключить бота'}</h2>
    ${c ? '' : `<label class="field"><span>Мессенджер</span><select class="input" id="ct"><option value="telegram">Telegram</option><option value="max">MAX</option></select></label>
    <label class="field"><span>Марка</span><select class="input" id="cb">${brands.map((b) => `<option value="${b.id}" ${b.id === S.brand ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`}
    <label class="field"><span>Название (для себя)</span><input class="input" id="cn" value="${esc(c?.name || '')}" placeholder="Например: Бот поддержки"></label>
    <label class="field"><span>Токен бота</span><input class="input" id="ctk" placeholder="${c ? 'оставьте пустым, чтобы не менять (' + esc(c.token) + ')' : 'вставьте токен'}" autocomplete="off"></label>
    <label class="field"><span>Режим</span><select class="input" id="cm"><option value="polling">Опрос — работает на любом компьютере</option><option value="webhook" ${c?.mode === 'webhook' ? 'selected' : ''}>Webhook — только на сервере с https</option></select></label>
    ${c ? `<label class="small" style="display:flex;gap:6px;margin-bottom:8px"><input type="checkbox" id="cen" ${c.enabled ? 'checked' : ''}> включён</label>` : ''}
    <div class="actions">${c ? '<button class="btn danger" id="cdel" style="margin-right:auto">Удалить</button>' : ''}<button class="btn" data-x>Отмена</button><button class="btn primary" id="cok">${c ? 'Сохранить' : 'Подключить'}</button></div>`)
  $('[data-x]', m.el).onclick = m.close
  $('#cok', m.el).onclick = guard(async () => {
    const btn = $('#cok', m.el); btn.disabled = true; btn.textContent = 'Проверяю…'
    try {
      const body = { name: $('#cn', m.el).value, token: $('#ctk', m.el).value.trim(), mode: $('#cm', m.el).value }
      const r = c ? await api('PATCH', `/channels/${c.id}`, { ...body, enabled: $('#cen', m.el).checked })
        : await api('POST', '/channels', { ...body, type: $('#ct', m.el).value, brand_id: Number($('#cb', m.el).value) })
      if (r.last_error) toast('Бот сохранён, но есть ошибка: ' + r.last_error, true)
      else toast(r.bot_username ? `Подключено: @${r.bot_username}` : 'Сохранено')
      m.close(); done()
    } finally { btn.disabled = false; btn.textContent = 'Сохранить' }
  })
  const del = $('#cdel', m.el)
  if (del) del.onclick = guard(async () => { if (confirm('Отключить и удалить бота? Переписки останутся.')) { await api('DELETE', `/channels/${c.id}`); m.close(); done() } })
}
function userForm(done) {
  const m = modal(`<h2>Новый сотрудник</h2>
    <label class="field"><span>Имя</span><input class="input" id="un"></label>
    <label class="field"><span>Логин (латиницей)</span><input class="input" id="ul" autocomplete="off"></label>
    <label class="field"><span>Пароль (от 8 символов)</span><input class="input" id="up" type="text" autocomplete="off"></label>
    <label class="field"><span>Роль</span><select class="input" id="ur"><option value="manager">Менеджер</option><option value="admin">Администратор</option></select></label>
    <div class="actions"><button class="btn" data-x>Отмена</button><button class="btn primary" id="uok">Создать</button></div>`)
  $('[data-x]', m.el).onclick = m.close
  $('#uok', m.el).onclick = guard(async () => {
    await api('POST', '/users', { name: $('#un', m.el).value, login: $('#ul', m.el).value, password: $('#up', m.el).value, role: $('#ur', m.el).value })
    toast('Сотрудник добавлен'); m.close(); done()
  })
}

/* ---------- живые обновления ---------- */
let es
function connectStream() {
  es?.close()
  es = new EventSource('/api/stream')
  es.onmessage = (ev) => {
    const e = JSON.parse(ev.data)
    S.view?.onEvent?.(e)
    if (e.type === 'message' && e.message.direction === 'in') {
      refreshCounters()
      if (!location.hash.startsWith('#/inbox')) toast('💬 Новое сообщение: ' + e.message.text.slice(0, 60))
    }
    if (e.type === 'order') { refreshCounters(); if (!location.hash.startsWith('#/orders')) toast('🛒 Новый заказ') }
  }
}

/* ---------- запуск ---------- */
async function boot() {
  try { S.me = S.me || await api('GET', '/me') } catch { return }
  S.brands = await api('GET', '/brands')
  if (S.brand && !brandOf(S.brand)) S.brand = 0
  renderShell()
  await refreshCounters()
  route()
  connectStream()
}
boot()
