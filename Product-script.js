document.addEventListener("DOMContentLoaded", function () {

  var CART_KEY = null;
  var currentUser = null;

  // ---- 1. Product data ----
  // These are only a fallback. The real list comes from the database (api_products.php),
  // so changes made in Product Maintenance show up here automatically.
  var products = {
    peewee: {
      title: "Peewee",
      desc: "Peewee eggs are the smallest size we offer, perfect for bakers who want precise control over ingredient ratios. Despite their petite size, they're just as fresh and flavorful as our larger eggs.",
      image: "images/Pewee_Egg.jpg",
      prices: { "12": 87.00, "24": 172.00, "36": 258.00 }
    },
    small: {
      title: "Small",
      desc: "Small eggs are compact but full of flavor, making them a great everyday choice for cooking and baking. They're typically laid by younger hens and offer a more affordable option without sacrificing freshness.",
      image: "images/Small_Egg.jpg",
      prices: { "12": 92.00, "24": 184.00, "36": 276.00 }
    },
    medium: {
      title: "Medium",
      desc: "Medium eggs strike the perfect balance between size and value, making them our most versatile everyday option. Whether you're frying, boiling, or baking, they deliver consistent results for just about any recipe.",
      image: "images/Medium_Egg.jpg",
      prices: { "12": 98.00, "24": 195.00, "36": 293.00 }
    },
    large: {
      title: "Large",
      desc: "Large eggs are the standard size most recipes are written for, making them a safe and reliable choice for cooking and baking alike. Their generous yolk-to-white ratio makes them ideal for everything from breakfast staples to baked goods.",
      image: "images/Large_Egg.jpg",
      prices: { "12": 103.00, "24": 207.00, "36": 310.00 }
    },
    extralarge: {
      title: "Extra Large",
      desc: "Extra Large eggs offer bigger yolks and whites, perfect for families who go through eggs quickly or for recipes that benefit from a little extra richness. They're a favorite among home cooks and small resellers looking for great value per egg.",
      image: "images/ExtraLarge_Egg.jpg",
      prices: { "12": 109.00, "24": 218.00, "36": 327.00 }
    },
    jumbo: {
      title: "Jumbo",
      desc: "Jumbo eggs are our biggest and most generous size, packed with rich, golden yolks in every bite. They're perfect for hearty breakfasts, baking recipes that call for extra richness, or anyone who simply wants more egg for their money.",
      image: "images/Jumbo_Egg.jpg",
      prices: { "12": 115.00, "24": 230.00, "36": 345.00 }
    }
  };

  var POLL_MS = 15000;
  var started = false;

  // Ask the database for the live product list (prices AND stock), then start the page.
  // If the request fails (e.g. PHP is not running) the fallback above is used, without stock limits.
  function fetchProducts() {
    return fetch("api_products.php", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && Object.keys(data).length) { products = data; return true; }
        return false;
      })
      .catch(function () { return false; });
  }

  Promise.all([
    fetchProducts(),
    window.JoeysFarmCartSession.ready
  ]).then(function (results) {
    var session = results[1];
    currentUser = session.loggedIn && session.role === "customer" ? session : null;
    if (currentUser) CART_KEY = window.JoeysFarmCartSession.cartKey(currentUser);
    start();
  }).catch(function (error) {
    console.error("Could not initialize the customer cart session.", error);
    fetchProducts().then(function () { start(); });
  });

  function start() {
    if (started) return;
    started = true;

    // ---- 2. Read ?size=... from the URL ----
    var params = new URLSearchParams(window.location.search);
    var sizeKey = params.get("size");
    var product = products[sizeKey];

    // Fallback in case the URL is missing, invalid, or the product was removed
    if (!product) {
      sizeKey = products["small"] ? "small" : Object.keys(products)[0];
      product = products[sizeKey];
    }

    // ---- 3. Fill in the page content ----
    document.getElementById("productTitle").textContent = product.title;
    document.getElementById("productDesc").textContent = product.desc;
    document.getElementById("productImage").src = product.image;
    document.getElementById("productImage").alt = product.title + " Eggs";
    document.title = "Joey's Farm - " + product.title;

    // ---- 4. Quantity + tray + price + stock logic ----
    var qtyInput = document.getElementById("qtyValue");
    var minusBtn = document.getElementById("qtyMinus");
    var plusBtn = document.getElementById("qtyPlus");
    var priceDisplay = document.getElementById("priceDisplay");
    var addBtn = document.getElementById("addToCartBtn");
    var trayLabels = document.querySelectorAll(".tray-option");
    var TRAYS = ["12", "24", "36"];

    // Small status line under the tray buttons (created here so Product.html needs no edit).
    var trayGroup = trayLabels.length ? trayLabels[0].parentNode : null;
    var note = document.createElement("div");
    note.id = "stockNote";
    note.className = "small mt-2";
    if (trayGroup && trayGroup.parentNode) {
      trayGroup.parentNode.insertBefore(note, trayGroup.nextSibling);
    }

    // One "N available" line inside each tray button.
    var badges = {};
    trayLabels.forEach(function (label) {
      var input = label.querySelector("input");
      var span = document.createElement("small");
      span.className = "d-block tray-stock";
      label.appendChild(span);
      if (input) badges[input.value] = span;
    });

    function loadCart() {
      try {
        var cart = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(cart) ? cart : [];
      } catch (err) {
        return [];
      }
    }

    // Eggs of THIS size already sitting in the cart (any tray size).
    function eggsInCart() {
      return loadCart().reduce(function (sum, item) {
        return item.size === sizeKey ? sum + (item.tray * item.qty) : sum;
      }, 0);
    }

    // null = unknown (API down) -> no limit shown, server still checks at checkout.
    function hasStockInfo() {
      return !!(product.stock && typeof product.stock.eggs === "number");
    }

    // Trays of this tray size in stock: the same number the Order page shows.
    function maxTrays(tray) {
      if (!hasStockInfo()) return Infinity;
      return Math.max(0, Math.floor(product.stock.eggs / parseInt(tray, 10)));
    }

    // Trays of this size the customer can still ADD, counting what is already in their cart.
    function canStillAdd(tray) {
      if (!hasStockInfo()) return Infinity;
      return Math.max(0, Math.floor((product.stock.eggs - eggsInCart()) / parseInt(tray, 10)));
    }

    function selectedTray() {
      var s = document.querySelector('input[name="traySize"]:checked');
      return s ? s.value : null;
    }

    function selectTray(value) {
      trayLabels.forEach(function (label) {
        var input = label.querySelector("input");
        var on = input && input.value === value;
        if (input) input.checked = !!on;
        label.classList.toggle("active", !!on);
      });
    }

    function updatePrice() {
      var tray = selectedTray();
      if (!tray) {
        priceDisplay.textContent = "";
        return;
      }
      var qty = parseInt(qtyInput.value, 10) || 1;
      priceDisplay.textContent = "₱ " + (product.prices[tray] * qty).toFixed(2);
    }

    // Re-draws everything that depends on stock. Safe to call any time.
    function refreshStock() {
      var anyAvailable = false;

      trayLabels.forEach(function (label) {
        var input = label.querySelector("input");
        if (!input) return;
        var max = maxTrays(input.value);
        var badge = badges[input.value];
        var out = max === 0;
        if (!out) anyAvailable = true;

        input.disabled = out;
        label.classList.toggle("disabled", out);
        if (badge) {
          badge.textContent = max === Infinity ? "" : (out ? "Out of stock" : max + (max === 1 ? " tray available" : " trays available"));
        }
      });

      // The chosen tray ran out: move to the first one that still has stock.
      var cur = selectedTray();
      if (cur && maxTrays(cur) === 0) {
        selectTray(null);
        cur = null;
      }
      if (!cur) {
        for (var i = 0; i < TRAYS.length; i++) {
          if (badges[TRAYS[i]] && maxTrays(TRAYS[i]) > 0) { selectTray(TRAYS[i]); cur = TRAYS[i]; break; }
        }
      }

      // Quantity can never exceed what is left.
      var qty = parseInt(qtyInput.value, 10) || 1;
      var max = cur ? maxTrays(cur) : 0;
      if (max !== Infinity && qty > max) qty = Math.max(1, max);
      qtyInput.value = qty;
      plusBtn.disabled = !cur || (max !== Infinity && qty >= max);
      minusBtn.disabled = qty <= 1;

      // Add to cart button
      if (hasStockInfo() && !anyAvailable) {
        addBtn.disabled = true;
        addBtn.classList.add("disabled");
        addBtn.textContent = "Out of stock";
        addBtn.style.cursor = "not-allowed";
        note.className = "small mt-2 text-danger";
        note.textContent = "Sorry, " + product.title + " eggs are out of stock right now.";
      } else {
        addBtn.disabled = false;
        addBtn.classList.remove("disabled");
        addBtn.textContent = "Add to Cart";
        addBtn.style.cursor = "";
        if (hasStockInfo() && cur) {
          note.className = "small mt-2 text-muted";
          var m = maxTrays(cur);
          note.textContent = "You can order up to " + m + " " + cur + "-egg tray" + (m === 1 ? "" : "s") + ".";
        } else {
          note.textContent = "";
        }
      }
      updatePrice();
    }

    minusBtn.addEventListener("click", function () {
      var current = parseInt(qtyInput.value, 10);
      if (current > 1) {
        qtyInput.value = current - 1;
        refreshStock();
      }
    });

    plusBtn.addEventListener("click", function () {
      var tray = selectedTray();
      var current = parseInt(qtyInput.value, 10);
      if (tray && current >= maxTrays(tray)) return;
      qtyInput.value = current + 1;
      refreshStock();
    });

    trayLabels.forEach(function (label) {
      label.addEventListener("click", function () {
        // Bootstrap toggles the radio after the click; wait for it, then re-check limits.
        setTimeout(refreshStock, 0);
      });
    });

    // ---- 5. Add to cart (saved in the browser, read by cart.html) ----
    addBtn.addEventListener("click", function () {
      if (!currentUser) {
        window.location.href = "Index.html?login=1";
        return;
      }
      if (addBtn.disabled) return;
      var tray = selectedTray();
      if (!tray) {
        alert("Please choose a tray size first.");
        return;
      }
      var qty = parseInt(qtyInput.value, 10) || 1;

      // Re-check with the very latest stock, so nobody adds trays that were just taken.
      addBtn.disabled = true;
      fetchProducts().then(function () {
        if (products[sizeKey]) product = products[sizeKey];
        refreshStock();                      // redraws, and re-enables the button if still in stock
        if (qty > maxTrays(tray)) {
          alert("Stock just changed: only " + maxTrays(tray) + " " + tray + "-egg tray(s) can be ordered now. Please adjust your quantity.");
          return;
        }
        // Eggs already in the cart (any tray size of this product) count against the same stock.
        if (qty > canStillAdd(tray)) {
          var more = canStillAdd(tray);
          alert("Your cart already holds some of this stock. " +
            (more > 0 ? "You can add " + more + " more " + tray + "-egg tray(s)." : "You can't add any more of this size."));
          return;
        }

        var id = sizeKey + "-" + tray;
        var cart = loadCart();
        var existing = cart.filter(function (item) { return item.id === id; })[0];

        if (existing) {
          existing.qty += qty;
          existing.unitPrice = product.prices[tray];
        } else {
          cart.push({
            id: id,
            size: sizeKey,
            title: product.title,
            image: product.image,
            tray: parseInt(tray, 10),
            unitPrice: product.prices[tray],
            qty: qty
          });
        }

        try {
          localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (err) {
          alert("Sorry, your cart could not be saved in this browser.");
          return;
        }

        window.location.href = "cart.html";
      });
    });

    // ---- 6. Keep stock live while the page is open ----
    function poll() {
      fetchProducts().then(function (ok) {
        if (ok && products[sizeKey]) {
          product = products[sizeKey];
          refreshStock();
        }
      });
    }
    setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) poll();
    });

    refreshStock();
  }
});