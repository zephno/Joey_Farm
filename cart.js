document.addEventListener("DOMContentLoaded", function () {

  var CART_KEY = "joeysFarmCart";
  var POLL_MS = 15000;
  var listEl = document.getElementById("cartItems");
  var totalEl = document.getElementById("cartTotal");
  var checkoutBtn = document.getElementById("checkoutBtn");

  // Live stock per size key, in eggs: { peewee: 720, ... }. null until the API answers
  // (or if it never does), in which case nothing is limited here and the server still checks.
  var stockEggs = null;

  function loadCart() {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(cart) ? cart : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) { /* storage unavailable */ }
  }

  function peso(n) {
    return "₱ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Eggs of one size across the whole cart (all tray sizes).
  function eggsInCart(cart, size) {
    return cart.reduce(function (sum, c) { return c.size === size ? sum + c.tray * c.qty : sum; }, 0);
  }

  function setCheckout(enabled) {
    checkoutBtn.classList.toggle("disabled", !enabled);
    if (enabled) checkoutBtn.removeAttribute("aria-disabled");
    else checkoutBtn.setAttribute("aria-disabled", "true");
  }

  function render() {
    var cart = loadCart();
    listEl.innerHTML = "";

    if (cart.length === 0) {
      var empty = el("div", "cart-empty");
      empty.appendChild(el("p", "mb-3", "Your cart is empty."));
      var link = el("a", "btn btn-finalize", "Browse Products");
      link.href = "Order.html";
      empty.appendChild(link);
      listEl.appendChild(empty);
      totalEl.textContent = peso(0);
      setCheckout(false);
      return;
    }

    var total = 0;
    var problem = false;

    cart.forEach(function (item) {
      var lineTotal = item.unitPrice * item.qty;
      total += lineTotal;

      // Stock check for this item's size
      var known = stockEggs !== null;
      var have = known ? (stockEggs[item.size] || 0) : Infinity;
      var inCart = eggsInCart(cart, item.size);
      var over = known && inCart > have;
      var canAddMore = !known || inCart + item.tray <= have;
      if (over) problem = true;

      var card = el("div", "cart-item-card d-flex flex-column flex-md-row align-items-center mb-4");

      var imgWrap = el("div", "product-img-wrap mb-3 mb-md-0 mr-md-4");
      var img = el("img", "product-img");
      img.src = item.image;
      img.alt = item.title + " Eggs";
      imgWrap.appendChild(img);

      var body = el("div", "d-flex flex-column flex-md-row align-items-center w-100 justify-content-between");

      var info = el("div", "mb-3 mb-md-0 text-center text-md-left");
      info.appendChild(el("h5", "product-title mb-1", item.title + " Eggs"));
      info.appendChild(el("div", "product-meta", item.tray + "-Egg Tray · " + peso(item.unitPrice) + " each"));
      if (over) {
        var left = have === 0 ? "none" : "only " + Math.floor(have / item.tray) + " of this tray size";
        info.appendChild(el("div", "small text-danger font-weight-bold",
          have === 0 ? "Out of stock: please remove this item."
                     : "Not enough stock (" + left + " left). Please lower the quantity."));
      }

      var controls = el("div", "d-flex align-items-center ml-md-auto");

      var lineEl = el("span", "line-total mr-4", peso(lineTotal));

      var qtyControl = el("div", "qty-control mr-4");
      var minus = el("button", "qty-btn", "-");
      minus.type = "button";
      minus.setAttribute("aria-label", "Decrease quantity");
      var qty = el("span", "qty-display", String(item.qty));
      var plus = el("button", "qty-btn", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Increase quantity");
      if (!canAddMore) {
        plus.disabled = true;
        plus.title = "No more trays available";
        plus.style.opacity = "0.4";
        plus.style.cursor = "not-allowed";
      }
      qtyControl.appendChild(minus);
      qtyControl.appendChild(qty);
      qtyControl.appendChild(plus);

      var trash = el("span", "trash-icon", "🗑️");
      trash.title = "Remove item";

      controls.appendChild(lineEl);
      controls.appendChild(qtyControl);
      controls.appendChild(trash);

      body.appendChild(info);
      body.appendChild(controls);
      card.appendChild(imgWrap);
      card.appendChild(body);
      listEl.appendChild(card);

      minus.addEventListener("click", function () {
        if (item.qty > 1) {
          item.qty -= 1;
          saveCart(cart);
          render();
        }
      });

      plus.addEventListener("click", function () {
        if (!canAddMore) return;
        item.qty += 1;
        saveCart(cart);
        render();
      });

      trash.addEventListener("click", function () {
        cart = cart.filter(function (c) { return c.id !== item.id; });
        saveCart(cart);
        render();
      });
    });

    totalEl.textContent = peso(total);
    setCheckout(!problem);
  }

  checkoutBtn.addEventListener("click", function (e) {
    if (checkoutBtn.classList.contains("disabled")) {
      e.preventDefault();
    }
  });

  function loadStock() {
    return fetch("api_products.php", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var map = {};
        Object.keys(data).forEach(function (k) {
          if (data[k].stock && typeof data[k].stock.eggs === "number") map[k] = data[k].stock.eggs;
          else map[k] = Infinity;
        });
        stockEggs = map;
        render();
      })
      .catch(function () { /* keep going without limits */ });
  }

  render();
  loadStock();
  setInterval(loadStock, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadStock(); });
});