document.addEventListener("DOMContentLoaded", function () {

  var CART_KEY = "joeysFarmCart";
  var listEl = document.getElementById("cartItems");
  var totalEl = document.getElementById("cartTotal");
  var checkoutBtn = document.getElementById("checkoutBtn");

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
      checkoutBtn.classList.add("disabled");
      checkoutBtn.setAttribute("aria-disabled", "true");
      return;
    }

    checkoutBtn.classList.remove("disabled");
    checkoutBtn.removeAttribute("aria-disabled");

    var total = 0;

    cart.forEach(function (item) {
      var lineTotal = item.unitPrice * item.qty;
      total += lineTotal;

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
  }

  checkoutBtn.addEventListener("click", function (e) {
    if (checkoutBtn.classList.contains("disabled")) {
      e.preventDefault();
    }
  });

  render();
});
