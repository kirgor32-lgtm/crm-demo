/* Демо-режим CRM без сервера (для GitHub Pages).
   Подменяет fetch('/api/...') и EventSource: данные берутся из demo-data.json, изменения живут до перезагрузки страницы.
   В настоящей CRM этот файл не подключается. */
(function () {
  'use strict'
  var DAY = 86400000
  var realFetch = window.fetch.bind(window)
  var D = null
  var ready = realFetch('demo-data.json').then(function (r) { return r.json() }).then(function (d) {
    // сдвигаем даты, чтобы демо всегда выглядело «свежим»
    var shiftDays = Math.max(0, Math.round((Date.now() - d.snapshotAt) / DAY))
    if (shiftDays) shift(d, shiftDays)
    D = d
    D.nextId = 1e6
  })

  function shift(o, days) {
    if (Array.isArray(o)) { o.forEach(function (x) { shift(x, days) }); return }
    if (!o || typeof o !== 'object') return
    Object.keys(o).forEach(function (k) {
      var v = o[k]
      if (typeof v === 'number' && v > 1e12 && (/_at$/.test(k) || k === 'from')) o[k] = v + days * DAY
      else if (k === 'd' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) o[k] = new Date(Date.parse(v + 'T12:00:00Z') + days * DAY).toISOString().slice(0, 10)
      else if (v && typeof v === 'object') shift(v, days)
    })
  }

  function Err(status, msg) { this.status = status; this.msg = msg }
  var DENY = 'В демо-версии настройки не сохраняются — в настоящей CRM это работает'
  var STATUS_RU = { new: 'Новый', confirmed: 'Подтверждён', packed: 'Собран', shipped: 'Отправлен', delivered: 'Получен', cancelled: 'Отменён' }
  var like = function (v, q) { return String(v == null ? '' : v).toLowerCase().indexOf(q) !== -1 }
  var byId = function (list, id) { return list.find(function (x) { return x.id === Number(id) }) }
  var now = function () { return Date.now() }

  function counters() {
    return {
      unread: D.conversations.filter(function (c) { return c.status === 'open' }).reduce(function (s, c) { return s + (c.unread || 0) }, 0),
      newOrders: D.orders.filter(function (o) { return o.status === 'new' }).length,
    }
  }
  function convDetail(c) {
    var orders = c.customer_id ? D.orders.filter(function (o) { return o.customer_id === c.customer_id }).slice(0, 20) : []
    return Object.assign({}, c, { messages: D.messages[c.id] || [], orders: orders })
  }
  function customerRows() {
    return D.customers.map(function (cu) {
      var os = D.orders.filter(function (o) { return o.customer_id === cu.id })
      return Object.assign({}, cu, {
        orders: os.length,
        spent: os.filter(function (o) { return o.status !== 'cancelled' }).reduce(function (s, o) { return s + o.total }, 0),
        last_order_at: os.length ? Math.max.apply(null, os.map(function (o) { return o.created_at })) : null,
        conversations: D.conversations.filter(function (c) { return c.customer_id === cu.id }).length,
      })
    })
  }
  function addMessage(c, m) {
    var msg = Object.assign({ id: D.nextId++, conversation_id: c.id, external_id: '', status: 'ok', error: '', created_at: now() }, m)
    ;(D.messages[c.id] = D.messages[c.id] || []).push(msg)
    if (m.direction !== 'note') { c.last_message_at = msg.created_at; c.last_text = m.text }
    if (m.direction === 'in') { c.unread = (c.unread || 0) + 1; c.status = 'open' }
    D.conversations.sort(function (a, b) { return b.last_message_at - a.last_message_at })
    emit({ type: 'message', conversationId: c.id, message: msg })
    return msg
  }
  // покупатель «отвечает» через несколько секунд — чтобы было видно, как приходят новые сообщения
  var REPLIES = ['Спасибо! 🙏', 'Отлично, жду 👍', 'Поняла, спасибо за помощь!', 'Хорошо, тогда оформлю заказ']
  function fakeReply(c) {
    if (c.source === 'site') return
    setTimeout(function () { addMessage(c, { direction: 'in', text: REPLIES[Math.floor(Math.random() * REPLIES.length)], user_id: null }) }, 4000)
  }

  function handle(method, url, b) {
    var u = new URL(url, location.href)
    var p = u.pathname.replace(/^.*?\/api/, '')
    var s = u.searchParams
    var m
    var brand = Number(s.get('brand')) || 0
    if (method === 'GET' && p === '/me') return D.me
    if (method === 'POST' && p === '/login') return D.me
    if (method === 'POST' && p === '/logout') return { ok: true }
    if (method === 'POST' && p === '/me/password') throw new Err(400, DENY)
    if (method === 'GET' && p === '/counters') return counters()
    if (method === 'GET' && p === '/brands') return D.brands
    if (method === 'GET' && p === '/channels') return D.channels
    if (method === 'GET' && p === '/users') return D.users
    if (method === 'GET' && p === '/promos') {
      return D.promos.map(function (pr) {
        return Object.assign({}, pr, { used: D.orders.filter(function (o) { return o.promo === pr.code && o.status !== 'cancelled' && (!pr.brand_id || o.brand_id === pr.brand_id) }).length })
      })
    }
    if (method === 'POST' && p === '/promos') {
      var code = String(b.code || '').trim().toUpperCase()
      if (!/^[A-ZА-ЯЁ0-9_-]{3,30}$/.test(code)) throw new Err(400, 'Код — от 3 до 30 букв и цифр, без пробелов')
      var val = Math.round(Number(b.value) || 0)
      if (val < 1 || (b.kind !== 'fixed' && val > 90)) throw new Err(400, b.kind === 'fixed' ? 'Укажите сумму скидки в рублях' : 'Скидка — от 1 до 90%')
      if (b.starts_at && b.expires_at && b.expires_at <= b.starts_at) throw new Err(400, 'Дата окончания должна быть позже даты начала')
      if (D.promos.some(function (x) { return x.code === code && (x.brand_id || 0) === (b.brand_id || 0) })) throw new Err(400, 'Такой промокод уже есть')
      var np = { id: D.nextId++, brand_id: b.brand_id || null, code: code, kind: b.kind === 'fixed' ? 'fixed' : 'pct', value: val, starts_at: b.starts_at || null, expires_at: b.expires_at || null,
        first_order: b.first_order ? 1 : 0, max_uses: b.max_uses || null, note: b.note || '', created_at: now(), used: 0 }
      D.promos.unshift(np)
      return np
    }
    if ((m = p.match(/^\/promos\/(\d+)$/)) && method === 'DELETE') { D.promos = D.promos.filter(function (x) { return x.id !== Number(m[1]) }); return { ok: true } }
    if (method === 'GET' && p === '/analytics') return D.analytics[(s.get('days') || 30) + '|' + (brand || '')] || D.analytics['30|']

    if (method === 'GET' && p === '/orders') {
      var oq = (s.get('q') || '').replace(/^\+/, '').toLowerCase()
      return D.orders.filter(function (o) {
        return (!brand || o.brand_id === brand) && (!s.get('status') || o.status === s.get('status')) &&
          (!oq || like(o.number, oq) || like(o.phone, oq) || like(o.name, oq)) && (!Number(s.get('customer')) || o.customer_id === Number(s.get('customer')))
      })
    }
    if ((m = p.match(/^\/orders\/(\d+)$/))) {
      var o = byId(D.orders, m[1])
      if (!o) throw new Err(404, 'Заказ не найден')
      var det = D.orderDetails[o.id] || { items: [], history: [] }
      if (method === 'GET') {
        var cust = byId(D.customers, o.customer_id)
        return Object.assign({}, o, { items: det.items, history: det.history, customer_name: cust ? cust.name : '',
          conversations: o.customer_id ? D.conversations.filter(function (c) { return c.customer_id === o.customer_id }) : [] })
      }
      if (method === 'PATCH') {
        if (b.items !== undefined || b.contact !== undefined || b.discount !== undefined) {
          if (o.status !== 'new') throw new Err(400, 'Менять состав можно только у заказа в статусе «Новый»')
          var its = (b.items || det.items).filter(function (i) { return i.name })
          if (!its.length) throw new Err(400, 'В заказе должен остаться хотя бы один товар')
          det.items = its.map(function (i) { return { name: i.name, variant: i.variant || '', qty: Number(i.qty) || 1, price: Number(i.price) || 0 } })
          var sum0 = det.items.reduce(function (s0, i) { return s0 + i.qty * i.price }, 0)
          o.discount = Math.min(sum0, Math.max(0, Number(b.discount) || 0)); o.total = sum0 - o.discount
          o.items_count = det.items.reduce(function (s0, i) { return s0 + i.qty }, 0)
          if (b.contact) { o.name = b.contact.name; o.delivery = b.contact.delivery; var ph0 = String(b.contact.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'); if (ph0.length === 11) o.phone = ph0 }
          det.history.unshift({ id: D.nextId++, text: 'Изменено: состав и данные заказа', user_name: D.me.name, created_at: now() })
        }
        if (b.status && b.status !== o.status) { det.history.unshift({ id: D.nextId++, text: 'Статус: ' + STATUS_RU[o.status] + ' → ' + STATUS_RU[b.status], user_name: D.me.name, created_at: now() }); o.status = b.status }
        if (b.note !== undefined && b.note !== o.note) { o.note = b.note; det.history.unshift({ id: D.nextId++, text: 'Изменена заметка', user_name: D.me.name, created_at: now() }) }
        o.updated_at = now()
        D.orderDetails[o.id] = det
        emit({ type: 'order', orderId: o.id, brandId: o.brand_id })
        return { ok: true }
      }
    }
    if (method === 'POST' && p === '/orders') {
      var br = byId(D.brands, b.brand_id)
      if (!br) throw new Err(400, 'Выберите марку')
      var items = (b.items || []).filter(function (i) { return i.name })
      if (!items.length) throw new Err(400, 'Добавьте хотя бы один товар')
      var total = items.reduce(function (sum, i) { return sum + (Number(i.price) || 0) * (Number(i.qty) || 1) }, 0)
      var c0 = b.contact || {}
      var no = { id: D.nextId++, number: 'Т' + String(now()).slice(-6), brand_id: br.id, brand_name: br.name, brand_color: br.color, status: 'new', total: total,
        customer_id: (function () { var ph1 = String(c0.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'); var cu1 = D.customers.find(function (x) { return x.phone === ph1 }); return cu1 ? cu1.id : null })(),
        name: c0.name || '', phone: String(c0.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'), delivery: c0.delivery || '', items_count: items.reduce(function (sum, i) { return sum + (Number(i.qty) || 1) }, 0), created_at: now(), updated_at: now() }
      D.orders.unshift(no)
      D.orderDetails[no.id] = { items: items, history: [{ id: D.nextId++, text: 'Заказ создан вручную', user_name: D.me.name, created_at: now() }] }
      emit({ type: 'order', orderId: no.id, brandId: br.id })
      return { id: no.id, number: no.number }
    }

    if (method === 'GET' && p === '/conversations') {
      var cq = (s.get('q') || '').toLowerCase()
      return D.conversations.filter(function (c) {
        return (!brand || c.brand_id === brand) && (!(s.get('status') === 'open' || s.get('status') === 'closed') || c.status === s.get('status')) &&
          (s.get('unread') !== '1' || c.unread > 0) && (!s.get('source') || c.source === s.get('source')) &&
          (!cq || like(c.title, cq) || like(c.username, cq) || like(c.customer_phone, cq) || like(c.customer_name, cq)) &&
          (!Number(s.get('customer')) || c.customer_id === Number(s.get('customer')))
      })
    }
    if ((m = p.match(/^\/conversations\/(\d+)(\/messages)?$/))) {
      var c = byId(D.conversations, m[1])
      if (!c) throw new Err(404, 'Переписка не найдена')
      if (method === 'GET') return convDetail(c)
      if (method === 'POST' && m[2]) {
        var text = String(b.text || '').trim()
        if (!text) throw new Err(400, 'Пустое сообщение')
        if (b.note) return addMessage(c, { direction: 'note', text: text, user_id: D.me.id, user_name: D.me.name })
        if (c.source === 'site') throw new Err(400, 'Это заявка с сайта — ответить можно только по телефону')
        c.unread = 0
        var out = addMessage(c, { direction: 'out', text: text, user_id: D.me.id, user_name: D.me.name })
        fakeReply(c)
        return out
      }
      if (method === 'PATCH') {
        if (b.read) c.unread = 0
        if (b.status === 'open' || b.status === 'closed') c.status = b.status
        if (b.phone !== undefined) {
          var ph = String(b.phone).replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')
          if (ph.length === 10) ph = '7' + ph
          if (ph.length < 11) throw new Err(400, 'Укажите телефон полностью')
          var cu = D.customers.find(function (x) { return x.phone === ph })
          if (!cu) { cu = { id: D.nextId++, name: b.name || c.title, phone: ph, email: '', note: '', created_at: now() }; D.customers.unshift(cu) }
          c.customer_id = cu.id; c.customer_name = cu.name; c.customer_phone = cu.phone
        }
        emit({ type: 'conversation', conversationId: c.id })
        return { ok: true }
      }
    }

    if (method === 'GET' && p === '/customers') {
      var uq = (s.get('q') || '').replace(/^\+/, '').toLowerCase()
      return customerRows().filter(function (x) { return !uq || like(x.name, uq) || like(x.phone, uq) || like(x.email, uq) })
    }
    if ((m = p.match(/^\/customers\/(\d+)$/))) {
      var k = byId(D.customers, m[1])
      if (!k) throw new Err(404, 'Покупатель не найден')
      if (method === 'GET') {
        return Object.assign({}, k, {
          orders: D.orders.filter(function (o) { return o.customer_id === k.id }),
          conversations: D.conversations.filter(function (c) { return c.customer_id === k.id }),
        })
      }
      if (method === 'PATCH') { ['name', 'email', 'note'].forEach(function (f) { if (b[f] !== undefined) k[f] = b[f] }); return { ok: true } }
    }
    // марки, мессенджеры, сотрудники — только просмотр
    throw new Err(400, DENY)
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url
    if (!/^\/api\//.test(url)) return realFetch(input, init)
    var method = ((init && init.method) || 'GET').toUpperCase()
    var body = {}
    try { body = init && init.body ? JSON.parse(init.body) : {} } catch (e) { /* пусто */ }
    return ready.then(function () {
      var status = 200, out
      try { out = handle(method, url, body) } catch (e) {
        if (!(e instanceof Err)) throw e
        status = e.status; out = { error: e.msg }
      }
      return new Response(JSON.stringify(out), { status: status, headers: { 'content-type': 'application/json' } })
    })
  }

  // живые события (новые сообщения) — вместо соединения с сервером
  var streams = []
  function emit(e) { setTimeout(function () { streams.forEach(function (es) { if (es.onmessage) es.onmessage({ data: JSON.stringify(e) }) }) }, 0) }
  window.EventSource = function () { this.onmessage = null; streams.push(this) }
  window.EventSource.prototype.close = function () { var i = streams.indexOf(this); if (i >= 0) streams.splice(i, 1) }

  // плашка «демо»
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div')
    bar.textContent = innerWidth < 700 ? 'Демо: данные выдуманы, сообщения никуда не уходят' : 'Демо-версия CRM: данные выдуманы, сообщения никуда не отправляются, изменения сбросятся после перезагрузки страницы'
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100;background:#2e2c38;color:#fff;font:500 12px/1.3 system-ui,sans-serif;padding:6px 12px;text-align:center'
    document.body.appendChild(bar)
    document.body.style.paddingTop = bar.offsetHeight + 'px'
    document.documentElement.style.setProperty('--demo-bar', bar.offsetHeight + 'px')
    var st = document.createElement('style')
    st.textContent = '.side{top:var(--demo-bar);height:calc(100vh - var(--demo-bar))}.layout,.login{min-height:calc(100vh - var(--demo-bar))}' +
      '.inbox{height:calc(100vh - 100px - var(--demo-bar))}@media (max-width:900px){.inbox,.inbox.noaside{height:calc(100vh - 150px - var(--demo-bar))}}'
    document.head.appendChild(st)
  })
})()
