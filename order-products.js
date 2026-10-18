// Order.html: build the product cards from the database so products added, hidden or removed in
// Product Maintenance show up here, together with LIVE stock (exact trays available per size).
// Sold-out sizes get a grey, disabled "Out of stock" button. If the request fails, the static
// cards stay as they are.
(function () {
  var row = document.querySelector('#productList .row');
  if (!row) return;

  var POLL_MS = 15000;
  var cards = {};          // size key -> { stock: <p>, btn: <a> }
  var lastKeys = '';

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function applyStock(key, p) {
    var c = cards[key];
    if (!c) return;
    var t = (p.stock && p.stock.trays) || null;
    if (!t) { c.stock.textContent = ''; return; }          // no stock info: leave the button alone

    var total = (t['12'] || 0) + (t['24'] || 0) + (t['36'] || 0);
    if (total === 0) {
      c.stock.textContent = 'Out of stock';
      c.stock.className = 'card-text small font-weight-bold text-danger stock-line';
      c.btn.textContent = 'Out of stock';
      c.btn.classList.add('disabled');
      c.btn.setAttribute('aria-disabled', 'true');
      c.btn.setAttribute('tabindex', '-1');
      c.btn.style.pointerEvents = 'none';
      c.btn.removeAttribute('href');
    } else {
      c.stock.textContent = 'Available: ' + plural(t['12'], '12-egg tray') + ' · ' +
        plural(t['24'], '24-egg tray') + ' · ' + plural(t['36'], '36-egg tray');
      c.stock.className = 'card-text small text-muted stock-line';
      c.btn.textContent = 'Order';
      c.btn.classList.remove('disabled');
      c.btn.removeAttribute('aria-disabled');
      c.btn.removeAttribute('tabindex');
      c.btn.style.pointerEvents = '';
      c.btn.href = 'Product.html?size=' + encodeURIComponent(key);
    }
  }

  function build(data, keys) {
    row.innerHTML = '';
    cards = {};
    keys.forEach(function (key) {
      var p = data[key];
      var desc = String(p.desc || '');
      var m = desc.match(/^.*?[.!?](?=\s|$)/);   // first sentence only
      var blurb = m ? m[0] : desc;

      var col = el('div', 'col-lg-4 col-md-4 col-6 mb-4');
      var card = el('div', 'card h-100');

      var img = el('img', 'card-img-top');
      img.src = p.image;
      img.alt = p.title + ' Eggs';

      var body = el('div', 'card-body d-flex flex-column');
      body.appendChild(el('h5', 'card-title h5', p.title));
      body.appendChild(el('p', 'card-text', blurb));
      var stock = el('p', 'card-text small text-muted stock-line');
      body.appendChild(stock);
      var btn = el('a', 'btn btn-secondary btn-block mt-auto', 'Order');
      btn.href = 'Product.html?size=' + encodeURIComponent(key);
      body.appendChild(btn);

      card.appendChild(img);
      card.appendChild(body);
      col.appendChild(card);
      row.appendChild(col);
      cards[key] = { stock: stock, btn: btn };
    });
  }

  function load() {
    return fetch('api_products.php', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var keys = Object.keys(data);
        if (!keys.length) return;
        var sig = keys.join('|');
        if (sig !== lastKeys) { build(data, keys); lastKeys = sig; }
        keys.forEach(function (k) { applyStock(k, data[k]); });
      })
      .catch(function () { /* keep what is on screen */ });
  }

  load();
  setInterval(load, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();