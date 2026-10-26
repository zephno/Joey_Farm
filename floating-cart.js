(function () {
  var creditBySize = {};

  function readArray(key) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch (err) {
      return [];
    }
  }

  function peso(value) {
    return '₱ ' + Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function init(user) {
    if (!user || !user.loggedIn || user.role !== 'customer') return;
    if (document.querySelector('.floating-cart')) return;

    var CART_KEY = window.JoeysFarmCartSession.cartKey(user);
    var EXCLUDED_KEY = window.JoeysFarmCartSession.excludedKey(user);
    var root = node('div', 'floating-cart');
    var toggle = node('button', 'floating-cart-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'floating-cart-panel');
    toggle.setAttribute('aria-label', 'Open cart preview');
    toggle.appendChild(node('span', 'floating-cart-icon', '🛒'));
    toggle.appendChild(node('span', 'floating-cart-toggle-label', 'Cart'));
    toggle.appendChild(node('span', 'floating-cart-count', '0'));

    var panel = node('section', 'floating-cart-panel');
    panel.id = 'floating-cart-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Cart preview');
    panel.hidden = true;

    var heading = node('div', 'floating-cart-heading');
    heading.appendChild(node('h2', '', 'Your cart'));
    var close = node('button', 'floating-cart-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close cart preview');
    heading.appendChild(close);

    var empty = node('p', 'floating-cart-empty', 'Your cart is empty.');
    var list = node('ul', 'floating-cart-items');
    var summary = node('div', 'floating-cart-summary');
    var subtotalRow = node('div', 'floating-cart-subtotal');
    subtotalRow.appendChild(node('span', '', 'Selected subtotal'));
    var subtotalValue = node('strong', '', peso(0));
    subtotalRow.appendChild(subtotalValue);
    var creditRows = node('div', 'floating-cart-credit-lines');
    var discountRow = node('div', 'floating-cart-discount');
    discountRow.appendChild(node('span', '', 'Credit applied'));
    var discountValue = node('strong', '', '- ' + peso(0));
    discountRow.appendChild(discountValue);
    var total = node('div', 'floating-cart-estimated');
    total.appendChild(node('span', '', 'Estimated total'));
    var totalValue = node('strong', '', peso(0));
    total.appendChild(totalValue);
    summary.appendChild(subtotalRow);
    summary.appendChild(creditRows);
    summary.appendChild(discountRow);
    summary.appendChild(total);

    var actions = node('div', 'floating-cart-actions');
    var viewCart = node('a', 'floating-cart-view', 'View cart');
    viewCart.href = 'cart.html';
    var checkout = node('a', 'floating-cart-checkout', 'Proceed to checkout');
    checkout.href = 'order_finalize.html';
    actions.appendChild(viewCart);
    actions.appendChild(checkout);

    panel.appendChild(heading);
    panel.appendChild(empty);
    panel.appendChild(list);
    panel.appendChild(summary);
    panel.appendChild(actions);
    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function render() {
      var cart = readArray(CART_KEY);
      var excluded = new Set(readArray(EXCLUDED_KEY).map(String));
      var selectedSubtotal = 0;
      var subtotalBySize = {};
      var count = cart.reduce(function (sum, item) {
        return sum + Math.max(0, Number(item.qty) || 0);
      }, 0);

      toggle.querySelector('.floating-cart-count').textContent = String(count);
      toggle.setAttribute('aria-label', count === 1 ? 'Open cart preview, 1 item' : 'Open cart preview, ' + count + ' items');
      empty.hidden = cart.length > 0;
      list.hidden = cart.length === 0;
      summary.hidden = cart.length === 0;
      actions.hidden = cart.length === 0;
      list.replaceChildren();
      creditRows.replaceChildren();

      cart.forEach(function (item) {
        var row = node('li', 'floating-cart-item');
        var details = node('span', 'floating-cart-item-details');
        var selected = !excluded.has(String(item.id));
        var lineTotal = (Number(item.unitPrice) || 0) * (Number(item.qty) || 0);
        if (selected) {
          selectedSubtotal += lineTotal;
          subtotalBySize[item.size] = (subtotalBySize[item.size] || 0) + lineTotal;
        }
        details.appendChild(node('strong', '', String(item.title || 'Product')));
        details.appendChild(node('small', '', (Number(item.qty) || 0) + ' × ' + (Number(item.tray) || 0) + '-egg tray'));
        if (excluded.has(String(item.id))) {
          details.appendChild(node('small', 'floating-cart-unselected', 'Not selected for checkout'));
        }
        row.appendChild(details);
        row.appendChild(node('span', 'floating-cart-item-price', peso((Number(item.unitPrice) || 0) * (Number(item.qty) || 0))));
        list.appendChild(row);
      });

      var discount = 0;
      Object.keys(creditBySize).forEach(function (sizeKey) {
        var credit = Math.max(0, Number(creditBySize[sizeKey].amount) || 0);
        var applied = Math.min(subtotalBySize[sizeKey] || 0, credit);
        discount += applied;
        var creditRow = node('div', 'floating-cart-credit-row');
        creditRow.appendChild(node('span', '', String(creditBySize[sizeKey].title || sizeKey) + ' credit available'));
        creditRow.appendChild(node('strong', '', peso(credit)));
        creditRows.appendChild(creditRow);
      });

      subtotalValue.textContent = peso(selectedSubtotal);
      discountValue.textContent = '- ' + peso(discount);
      discountRow.hidden = Object.keys(creditBySize).length === 0;
      totalValue.textContent = peso(Math.max(0, selectedSubtotal - discount));
    }

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open
        ? 'Close cart preview'
        : 'Open cart preview, ' + toggle.querySelector('.floating-cart-count').textContent + ' items');
      if (!open) render();
    }

    toggle.addEventListener('click', function () {
      var open = panel.hidden;
      if (open) render();
      setOpen(open);
    });
    close.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('click', function (event) {
      if (!root.contains(event.target) && !panel.hidden) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
    window.addEventListener('storage', render);
    window.addEventListener('joeys-farm-cart-updated', render);
    render();

    fetch('orders.php?scope=mine', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (data) {
      if (!data) return;
      creditBySize = data.discount_credit_by_size || {};
      render();
    }).catch(function () { /* cart preview remains available when signed out or offline */ });
  }

  window.JoeysFarmCartSession.ready.then(function (user) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { init(user); });
    } else {
      init(user);
    }
  }).catch(function (error) {
    console.error('Could not verify the customer cart session.', error);
  });
})();
