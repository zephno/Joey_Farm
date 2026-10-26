document.addEventListener("DOMContentLoaded", function () {

  window.JoeysFarmCartSession.ready.then(function (user) {
  if (!user.loggedIn || user.role !== "customer") {
    window.location.replace("Index.html?login=1");
    return;
  }

  var CART_KEY = window.JoeysFarmCartSession.cartKey(user);
  var EXCLUDED_KEY = window.JoeysFarmCartSession.excludedKey(user);
  var POLL_MS = 15000;
  var listEl = document.getElementById("cartItems");
  var subtotalEl = document.getElementById("cartSubtotal");
  var totalEl = document.getElementById("cartTotal");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var creditAvailableLabel = document.getElementById("cartCreditAvailableLabel");
  var creditAvailableEl = document.getElementById("cartCreditAvailable");
  var discountLabel = document.getElementById("cartDiscountLabel");
  var discountEl = document.getElementById("cartDiscount");
  var creditNote = document.getElementById("cartCreditNote");
  var selectionNote = document.getElementById("cartSelectionNote");
  var discountCredit = {};
  var excludedIds = loadExcludedIds();

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
      window.dispatchEvent(new Event("joeys-farm-cart-updated"));
    } catch (err) { /* storage unavailable */ }
  }

  function loadExcludedIds() {
    try {
      var ids = JSON.parse(localStorage.getItem(EXCLUDED_KEY));
      return new Set(Array.isArray(ids) ? ids.map(String) : []);
    } catch (err) {
      return new Set();
    }
  }

  function saveExcludedIds() {
    try {
      localStorage.setItem(EXCLUDED_KEY, JSON.stringify(Array.from(excludedIds)));
      window.dispatchEvent(new Event("joeys-farm-cart-updated"));
    } catch (err) { /* storage unavailable */ }
  }

  function isSelected(item) {
    return !excludedIds.has(String(item.id));
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
  function eggsInCart(cart, size, selectedOnly) {
    return cart.reduce(function (sum, c) {
      return c.size === size && (!selectedOnly || isSelected(c)) ? sum + c.tray * c.qty : sum;
    }, 0);
  }

  function setCheckout(enabled) {
    checkoutBtn.classList.toggle("disabled", !enabled);
    if (enabled) checkoutBtn.removeAttribute("aria-disabled");
    else checkoutBtn.setAttribute("aria-disabled", "true");
  }

  function creditForSize(sizeKey) {
    var credit = discountCredit[sizeKey];
    return credit ? Math.max(0, Number(credit.amount) || 0) : 0;
  }

  function updateTotals(subtotal, selectedCount, subtotalBySize) {
    var discount = Object.keys(subtotalBySize).reduce(function (sum, sizeKey) {
      return sum + Math.min(subtotalBySize[sizeKey], creditForSize(sizeKey));
    }, 0);
    var creditAvailable = Object.keys(discountCredit).reduce(function (sum, sizeKey) {
      return sum + creditForSize(sizeKey);
    }, 0);
    subtotalEl.textContent = peso(subtotal);
    totalEl.textContent = peso(Math.max(0, subtotal - discount));
    selectionNote.hidden = selectedCount > 0;

    var hasCredit = creditAvailable > 0;
    creditAvailableLabel.hidden = !hasCredit;
    creditAvailableEl.hidden = !hasCredit;
    discountLabel.hidden = !hasCredit;
    discountEl.hidden = !hasCredit;
    creditNote.hidden = !hasCredit;
    if (hasCredit) {
      creditAvailableEl.textContent = peso(creditAvailable);
      discountEl.textContent = "- " + peso(discount);
      creditNote.textContent = "Available by product: " + Object.keys(discountCredit).map(function (sizeKey) {
        return discountCredit[sizeKey].title + " " + peso(creditForSize(sizeKey));
      }).join(", ") + ". Credit applies only to the same product returned.";
    }
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
      updateTotals(0, 0, {});
      setCheckout(false);
      return;
    }

    var total = 0;
    var selectedCount = 0;
    var subtotalBySize = {};
    var problem = false;

    cart.forEach(function (item) {
      var lineTotal = item.unitPrice * item.qty;
      var selected = isSelected(item);
      if (selected) {
        total += lineTotal;
        selectedCount += 1;
        subtotalBySize[item.size] = (subtotalBySize[item.size] || 0) + lineTotal;
      }

      // Stock check for this item's size
      var known = stockEggs !== null;
      var have = known ? (stockEggs[item.size] || 0) : Infinity;
      var inCart = eggsInCart(cart, item.size, true);
      var allInCart = eggsInCart(cart, item.size, false);
      var over = known && selected && inCart > have;
      var canAddMore = !known || allInCart + item.tray <= have;
      if (over) problem = true;

      var card = el("div", "cart-item-card d-flex flex-column flex-md-row align-items-center mb-4");
      card.classList.toggle("is-unselected", !selected);

      var imgWrap = el("div", "product-img-wrap mb-3 mb-md-0 mr-md-4");
      var img = el("img", "product-img");
      img.src = item.image;
      img.alt = item.title + " Eggs";
      imgWrap.appendChild(img);

      var body = el("div", "d-flex flex-column flex-md-row align-items-center w-100 justify-content-between");

      var info = el("div", "mb-3 mb-md-0 text-center text-md-left");
      var selectLabel = el("label", "cart-item-select-label");
      var selectInput = el("input", "cart-item-select");
      selectInput.type = "checkbox";
      selectInput.checked = selected;
      selectInput.setAttribute("aria-label", "Include " + item.title + " " + item.tray + "-egg tray in checkout");
      selectLabel.appendChild(selectInput);
      selectLabel.appendChild(el("span", "", "Include in checkout"));
      info.appendChild(selectLabel);
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

      selectInput.addEventListener("change", function () {
        if (selectInput.checked) excludedIds.delete(String(item.id));
        else excludedIds.add(String(item.id));
        saveExcludedIds();
        render();
      });

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
        excludedIds.delete(String(item.id));
        saveExcludedIds();
        saveCart(cart);
        render();
      });
    });

    updateTotals(total, selectedCount, subtotalBySize);
    setCheckout(!problem && selectedCount > 0);
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

  function loadDiscountCredit() {
    return fetch("orders.php?scope=mine", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (data) {
      if (!data) return;
      discountCredit = data.discount_credit_by_size && typeof data.discount_credit_by_size === "object"
        ? data.discount_credit_by_size
        : {};
      render();
    }).catch(function () { /* credit is optional when signed out or offline */ });
  }

  render();
  loadStock();
  loadDiscountCredit();
  setInterval(loadStock, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadStock(); });
  }).catch(function (error) {
    console.error("Could not verify the customer cart session.", error);
    var cartItems = document.getElementById("cartItems");
    var checkout = document.getElementById("checkoutBtn");
    if (cartItems) cartItems.textContent = "Your cart could not be loaded. Please refresh and try again.";
    if (checkout) {
      checkout.classList.add("disabled");
      checkout.setAttribute("aria-disabled", "true");
    }
  });
});