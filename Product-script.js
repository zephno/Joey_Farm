document.addEventListener("DOMContentLoaded", function () {

  // ---- 1. Product data: everything about each egg size lives here ----
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

  // ---- 2. Read ?size=... from the URL ----
  var params = new URLSearchParams(window.location.search);
  var sizeKey = params.get("size");
  var product = products[sizeKey];

  // Fallback in case the URL is missing or invalid
  if (!product) {
    product = products["small"];
  }

  // ---- 3. Fill in the page content ----
  document.getElementById("productTitle").textContent = product.title;
  document.getElementById("productDesc").textContent = product.desc;
  document.getElementById("productImage").src = product.image;
  document.getElementById("productImage").alt = product.title + " Eggs";
  document.title = "Joey's Farm - " + product.title;

  // ---- 4. Quantity + tray + price logic ----
  var qtyInput = document.getElementById("qtyValue");
  var minusBtn = document.getElementById("qtyMinus");
  var plusBtn = document.getElementById("qtyPlus");
  var priceDisplay = document.getElementById("priceDisplay");
  var trayLabels = document.querySelectorAll(".tray-option");

  function updatePrice() {
    var selectedTray = document.querySelector('input[name="traySize"]:checked');
    if (!selectedTray) {
      priceDisplay.textContent = "";
      return;
    }
    var traySize = selectedTray.value;
    var qty = parseInt(qtyInput.value, 10);
    var unitPrice = product.prices[traySize];
    var total = unitPrice * qty;
    priceDisplay.textContent = "₱ " + total.toFixed(2);
  }

  minusBtn.addEventListener("click", function () {
    var current = parseInt(qtyInput.value, 10);
    if (current > 1) {
      qtyInput.value = current - 1;
      updatePrice();
    }
  });

  plusBtn.addEventListener("click", function () {
    var current = parseInt(qtyInput.value, 10);
    qtyInput.value = current + 1;
    updatePrice();
  });

  trayLabels.forEach(function (label) {
    label.addEventListener("click", function () {
      setTimeout(updatePrice, 0);
    });
  });

  updatePrice(); // initial state — blank until a tray size is picked
});