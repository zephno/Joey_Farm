// order-products.js
(function () {
  var row = document.querySelector('#productList .row');
  if (!row) return;

  var POLL_MS = 15000;
  var cards = {}; 
  var lastKeys = '';

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function applyStock(key, p) {
    var c = cards[key];
    if (!c) return;
    var t = (p.stock && p.stock.trays) || null;
    
    c.stockLine.innerHTML = '';

    if (!t) { 
      c.badge.style.display = 'none';
      return; 
    }

    var t12 = t['12'] || 0, t24 = t['24'] || 0, t36 = t['36'] || 0;

    // The three tray sizes are drawn from the SAME eggs, so they are alternatives, not a sum.
    // Out of stock only when not even one 12-egg tray can be made.
    if (t12 + t24 + t36 === 0) {
      c.card.classList.add('out-of-stock');
      c.badge.className = 'stock-badge badge-out-of-stock';
      c.badge.textContent = 'Out of Stock';
      c.badge.style.display = 'inline-block';

      c.btn.textContent = 'Out of Stock';
      c.btn.className = 'btn btn-secondary btn-block mt-auto disabled';
      c.btn.setAttribute('aria-disabled', 'true');
      c.btn.style.pointerEvents = 'none';
      c.btn.removeAttribute('href');
    } else {
      c.card.classList.remove('out-of-stock');
      c.badge.className = 'stock-badge badge-in-stock';
      c.badge.textContent = 'In Stock';
      c.badge.style.display = 'inline-block';

        var options = [['12', t12], ['24', t24], ['36', t36]];
        var label = el('div', 'stock-availability-label', 'Available trays');
        var trayGrid = el('div', 'stock-tray-grid');
        var summary = [];

        options.forEach(function (option) {
          var traySize = option[0];
          var count = option[1];
          var tray = el('div', 'stock-tray-option' + (count === 0 ? ' is-empty' : ''));
          tray.appendChild(el('span', 'stock-tray-count', String(count)));
          tray.appendChild(el('span', 'stock-tray-label', traySize + '-egg tray'));
          trayGrid.appendChild(tray);
          summary.push(count + (count === 1 ? ' tray of ' : ' trays of ') + traySize + ' eggs');
        });

        c.stockLine.setAttribute('role', 'group');
        c.stockLine.setAttribute('aria-label', 'Available trays: ' + summary.join(', '));
        c.stockLine.appendChild(label);
        c.stockLine.appendChild(trayGrid);

      c.btn.textContent = 'Select Size';
      c.btn.className = 'btn btn-order btn-block mt-auto';
      c.btn.classList.remove('disabled');
      c.btn.removeAttribute('aria-disabled');
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
      var m = desc.match(/^.*?[.!?](?=\s|$)/);
      var blurb = m ? m[0] : desc;

      var col = el('div', 'col-lg-4 col-md-6 col-12 mb-4');
      var card = el('div', 'card product-card h-100');

      var imgWrapper = el('div', 'product-img-wrapper');
      var img = el('img', 'card-img-top');
      img.src = p.image;
      img.alt = p.title + ' Eggs';

      var badge = el('span', 'stock-badge');
      badge.style.display = 'none';

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(badge);

      var body = el('div', 'card-body d-flex flex-column');
      body.appendChild(el('h2', 'product-card-title', p.title));
      body.appendChild(el('p', 'product-card-desc', blurb));
      
      var stockLine = el('div', 'stock-breakdown mb-3');
      body.appendChild(stockLine);

      var btn = el('a', 'btn btn-order btn-block mt-auto', 'Select Size');
      btn.href = 'Product.html?size=' + encodeURIComponent(key);
      body.appendChild(btn);

      card.appendChild(imgWrapper);
      card.appendChild(body);
      col.appendChild(card);
      row.appendChild(col);

      cards[key] = { card: card, badge: badge, stockLine: stockLine, btn: btn };
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
        if (sig !== lastKeys) { 
          build(data, keys); 
          lastKeys = sig; 
        }
        keys.forEach(function (k) { applyStock(k, data[k]); });
      })
      .catch(function () {
        /* Silently keep standard layout if backend is not live */
      });
  }

  load();
  setInterval(load, POLL_MS);
  document.addEventListener('visibilitychange', function () { 
    if (!document.hidden) load(); 
  });
})();