// Used on two pages:
//  - order_finalize.html : the "Finalize Order" button saves the cart as an order in the database
//  - customer-orders.html: the Order history table is loaded from the database (with Cancel)
(function () {
  var CART_KEY = 'joeysFarmCart';

  function api(url, body) {
    var opts = { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
    if (body) {
      opts.method = 'POST';
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) {
        window.location.replace('Index.html?login=1');
        throw new Error('Not logged in');
      }
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Request failed');
        return j;
      });
    });
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function peso(n) {
    return '₱ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function loadCart() {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(cart) ? cart : [];
    } catch (err) {
      return [];
    }
  }

  /* ---------------- order_finalize.html ---------------- */
  var finalizeBtn = document.querySelector('.action-footer .btn-finalize');
  var detailsForm = document.getElementById('customer-details-form');

  if (finalizeBtn && detailsForm) {
    // Tell the customer about a waiting discount (the server applies it when the order is placed).
    api('orders.php?scope=discount').then(function (d) {
      if (!d.available) return;
      var note = el('div', 'alert alert-success', 'You have a ' + d.percent + '% discount from a verified cracked-egg report. It will be applied to this order automatically.');
      detailsForm.parentNode.insertBefore(note, detailsForm);
    }).catch(function () {});
    finalizeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (finalizeBtn.classList.contains('disabled')) return;

      var cart = loadCart();
      if (!cart.length) {
        alert('Your cart is empty.');
        window.location.href = 'Order.html';
        return;
      }
      if (!detailsForm.checkValidity()) {
        detailsForm.reportValidity();
        return;
      }

      finalizeBtn.classList.add('disabled');
      api('orders.php', {
        action: 'place',
        name: document.getElementById('customer-name').value.trim(),
        address: document.getElementById('customer-address').value.trim(),
        contact: document.getElementById('customer-contact').value.trim(),
        payment: document.getElementById('customer-payment').value.trim(),
        // only what to buy is sent; the server looks up the real prices
        cart: cart.map(function (c) { return { size: c.size, tray: c.tray, qty: c.qty }; })
      }).then(function (res) {
        try { localStorage.removeItem(CART_KEY); } catch (err) { /* ignore */ }
        alert('Order placed! Your receipt number is ' + res.receipt + '.' +
          (res.discount_percent ? '\nYour ' + res.discount_percent + '% cracked-egg discount was applied (-' + peso(res.discount_amount) + ').' : ''));
        window.location.href = 'customer-orders.html';
      }).catch(function (err) {
        finalizeBtn.classList.remove('disabled');
        if (err.message !== 'Not logged in') alert(err.message);
      });
    });
  }

  /* ---------------- customer-orders.html ---------------- */
  var tbody = document.querySelector('.order-history-table tbody');

  if (tbody) {
    var statusLabel = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Delivered', cancelled: 'Cancelled' };

    var render = function (orders) {
      tbody.innerHTML = '';

      if (!orders.length) {
        var empty = el('tr');
        var td = el('td', 'text-center text-muted', 'You have no orders yet.');
        td.colSpan = 7;
        empty.appendChild(td);
        tbody.appendChild(empty);
        return;
      }

      orders.forEach(function (o) {
        var tr = el('tr');
        tr.appendChild(el('td', '', o.details));
        tr.appendChild(el('td', '', o.receipt));
        tr.appendChild(el('td', '', peso(o.total)));
        tr.appendChild(el('td', '', o.delivery_date));
        tr.appendChild(el('td', '', statusLabel[o.status] || o.status));
        // Staff remarks are shown for every status (pending, confirmed, delivered, cancelled).
        tr.appendChild(el('td', o.remark ? '' : 'text-muted', o.remark || '—'));

        var action = el('td');
        if (o.status === 'pending') {
          var btn = el('button', 'btn btn-danger btn-cancel', 'Cancel');
          btn.type = 'button';
          btn.addEventListener('click', function () {
            if (!confirm('Cancel order ' + o.receipt + '?')) return;
            api('orders.php', { action: 'cancel', id: o.id }).then(load).catch(function (err) {
              alert(err.message);
              load();
            });
          });
          action.appendChild(btn);
        } else {
          action.textContent = '—';
        }
        tr.appendChild(action);
        tbody.appendChild(tr);
      });
    };

    var load = function () {
      return api('orders.php?scope=mine').then(function (res) { render(res.orders); }).catch(function () {});
    };

    api('orders.php?scope=discount').then(function (d) {
      var box = document.getElementById('discount-notice');
      if (box && d.available) {
        box.textContent = 'Good news! A staff-verified cracked-egg report earned you a ' + d.percent + '% discount on your next order. It is applied automatically when you place it.';
        box.hidden = false;
      }
    }).catch(function () {});

    load();
    // Pick up new staff remarks without a page refresh.
    setInterval(load, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }
})();