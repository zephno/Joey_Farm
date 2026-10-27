// Used on two pages:
//  - order_finalize.html : the "Finalize Order" button saves the cart as an order in the database
//  - customer-orders.html: the Order history table is loaded from the database (with Cancel and Broken Egg Returns)
(function () {
  var CART_KEY = null;
  var EXCLUDED_KEY = null;
  var cartSessionReady = window.JoeysFarmCartSession.ready.then(function (user) {
    if (user.loggedIn && user.role === 'customer') {
      CART_KEY = window.JoeysFarmCartSession.cartKey(user);
      EXCLUDED_KEY = window.JoeysFarmCartSession.excludedKey(user);
    }
    return user;
  });

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

  // Like api(), but sends multipart form data (used for the broken-egg photo).
  // No Content-Type header here: the browser adds the multipart boundary itself.
  function apiForm(url, formData) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: formData
    }).then(function (r) {
      if (r.status === 401) {
        window.location.replace('Index.html?login=1');
        throw new Error('Not logged in');
      }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Request failed');
        return j;
      });
    });
  }

  // Photos from phones are often several MB. Anything big is shrunk in the browser
  // (longest side 1600 px, JPEG) so it fits the server's 2 MB limit.
  var MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
  function preparePhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        reject(new Error('Please attach a JPG, PNG or WebP photo.'));
        return;
      }
      if (file.size <= 1.5 * 1024 * 1024) { resolve(file); return; }

      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (blob && blob.size <= MAX_UPLOAD_BYTES) resolve(blob);
          else reject(new Error('That photo is too large. Please choose a smaller one.'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that photo. Please choose another one.'));
      };
      img.src = url;
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

  function loadSelectedCart() {
    var cart = loadCart();
    try {
      var excluded = JSON.parse(localStorage.getItem(EXCLUDED_KEY));
      var excludedIds = new Set(Array.isArray(excluded) ? excluded.map(String) : []);
      return cart.filter(function (item) { return !excludedIds.has(String(item.id)); });
    } catch (err) {
      return cart;
    }
  }

  function removePurchasedCartItems(purchasedItems) {
    var purchasedIds = new Set(purchasedItems.map(function (item) { return String(item.id); }));
    var remaining = loadCart().filter(function (item) { return !purchasedIds.has(String(item.id)); });
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(remaining));
      localStorage.removeItem(EXCLUDED_KEY);
    } catch (err) { /* storage unavailable */ }
  }

  /* ---------------- order_finalize.html ---------------- */
  var finalizeBtn = document.querySelector('.action-footer .btn-finalize');
  var detailsForm = document.getElementById('customer-details-form');

  if (finalizeBtn && detailsForm) {
    finalizeBtn.classList.add('disabled');
    Promise.all([cartSessionReady, window.JoeysFarmCustomerProfileReady]).then(function (results) {
      var user = results[0];
      if (!user.loggedIn || user.role !== 'customer') {
        window.location.replace('Index.html?login=1');
        return;
      }
      finalizeBtn.classList.remove('disabled');
    }).catch(function (error) {
      console.error('Could not verify the customer cart session.', error);
      finalizeBtn.textContent = 'Unable to load account details';
    });
    finalizeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (finalizeBtn.classList.contains('disabled')) return;

      var allCart = loadCart();
      var cart = loadSelectedCart();
      if (!cart.length) {
        alert(allCart.length ? 'Select at least one item from your cart to checkout.' : 'Your cart is empty.');
        window.location.href = allCart.length ? 'cart.html' : 'Order.html';
        return;
      }
      if (!detailsForm.checkValidity()) {
        detailsForm.reportValidity();
        return;
      }

      var customerName = document.getElementById('customer-name').value.trim();
      var customerAddress = document.getElementById('customer-address').value.trim();
      var customerContact = document.getElementById('customer-contact').value.trim();
      if (!customerName || !customerAddress || !/^09[0-9]{9}$/.test(customerContact)) {
        alert('Your saved delivery details are incomplete or invalid. Update them from My Account before checking out.');
        window.location.href = 'customer-orders.html';
        return;
      }

      finalizeBtn.classList.add('disabled');
      api('orders.php', {
        action: 'place',
        name: customerName,
        address: customerAddress,
        contact: customerContact,
        payment: document.getElementById('customer-payment').value.trim(),
        // only what to buy is sent; the server looks up the real prices
        cart: cart.map(function (c) { return { size: c.size, tray: c.tray, qty: c.qty }; })
      }).then(function (res) {
        removePurchasedCartItems(cart);
        var message = 'Order placed! Your receipt number is ' + res.receipt + '.';
        var appliedCredits = res.discount_by_size || {};
        var appliedSizes = Object.keys(appliedCredits).filter(function (key) {
          return appliedCredits[key].amount > 0;
        });
        if (appliedSizes.length) {
          message += ' Return credit applied: ' + appliedSizes.map(function (key) {
            return appliedCredits[key].title + ' ' + peso(appliedCredits[key].amount);
          }).join(', ') + '.';
        }
        alert(message);
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
    var returnItemsBox = document.getElementById('return-items');
    var orderHistoryPage = 1;
    var orderHistoryPageSize = 10;
    var orderHistoryRows = [];

    function renderOrderHistoryPage() {
      tbody.innerHTML = '';
      var pageCount = Math.max(1, Math.ceil(orderHistoryRows.length / orderHistoryPageSize));
      orderHistoryPage = Math.min(orderHistoryPage, pageCount);
      var start = (orderHistoryPage - 1) * orderHistoryPageSize;
      orderHistoryRows.slice(start, start + orderHistoryPageSize).forEach(function(row) {
        tbody.appendChild(row);
      });

      var pagination = document.getElementById('customer-order-pagination');
      pagination.hidden = orderHistoryRows.length <= orderHistoryPageSize;
      document.getElementById('customer-order-page-status').textContent =
        orderHistoryRows.length
          ? 'Showing ' + (start + 1) + '-' + Math.min(start + orderHistoryPageSize, orderHistoryRows.length) +
              ' of ' + orderHistoryRows.length + ' orders · Page ' + orderHistoryPage + ' of ' + pageCount
          : '';
      document.getElementById('customer-order-prev').disabled = orderHistoryPage <= 1;
      document.getElementById('customer-order-next').disabled = orderHistoryPage >= pageCount;
    }

    document.getElementById('customer-order-prev').addEventListener('click', function() {
      if (orderHistoryPage > 1) {
        orderHistoryPage -= 1;
        renderOrderHistoryPage();
      }
    });

    document.getElementById('customer-order-next').addEventListener('click', function() {
      var pageCount = Math.max(1, Math.ceil(orderHistoryRows.length / orderHistoryPageSize));
      if (orderHistoryPage < pageCount) {
        orderHistoryPage += 1;
        renderOrderHistoryPage();
      }
    });

    // One row per egg size in the order: a checkbox plus a quantity box that unlocks when ticked.
    function buildReturnItems(returnable) {
      returnItemsBox.innerHTML = '';
      Object.keys(returnable).forEach(function (key) {
        var item = returnable[key];
        var row = el('div', 'd-flex align-items-center mb-2');

        var wrap = el('div', 'custom-control custom-checkbox flex-grow-1');
        var check = el('input', 'custom-control-input');
        check.type = 'checkbox';
        check.id = 'return-check-' + key;
        var label = el('label', 'custom-control-label', item.title + ' (' + item.eggs + ' eggs available)');
        label.htmlFor = check.id;
        wrap.appendChild(check);
        wrap.appendChild(label);

        var qty = el('input', 'form-control form-control-sm return-qty ml-3');
        qty.type = 'number';
        qty.min = '1';
        qty.max = String(item.eggs);
        qty.placeholder = '1-' + item.eggs;
        qty.style.width = '110px';
        qty.disabled = true;
        qty.dataset.size = key;
        qty.dataset.max = String(item.eggs);

        check.addEventListener('change', function () {
          qty.disabled = !check.checked;
          qty.required = check.checked;
          if (check.checked) qty.focus(); else qty.value = '';
        });

        row.appendChild(wrap);
        row.appendChild(qty);
        returnItemsBox.appendChild(row);
      });
    }

    var render = function (orders) {
      orderHistoryRows = [];

      if (!orders.length) {
        var empty = el('tr');
        var td = el('td', 'text-center text-muted', 'You have no orders yet.');
        td.colSpan = 6;
        empty.appendChild(td);
        orderHistoryRows.push(empty);
        renderOrderHistoryPage();
        return;
      }

      orders.forEach(function (o) {
        var tr = el('tr');
        var detailsCell = el('td', 'order-details-cell');
        if (Array.isArray(o.detail_items) && o.detail_items.length) {
          var itemList = el('div', 'customer-order-items');
          o.detail_items.forEach(function (item) {
            var itemRow = el('div', 'customer-order-item');
            var itemHeading = el('div', 'customer-order-item-heading');
            itemHeading.appendChild(el('strong', 'customer-order-product', item.title));
            itemHeading.appendChild(el('span', 'customer-order-eggs',
              Number(item.eggs_total).toLocaleString('en-US') + ' eggs'));
            itemRow.appendChild(itemHeading);
            itemRow.appendChild(el('span', 'customer-order-quantity',
              item.qty + (Number(item.qty) === 1 ? ' tray' : ' trays') + ' · ' + item.tray_size + ' eggs per tray'));
            itemList.appendChild(itemRow);
          });
          detailsCell.appendChild(itemList);
        } else {
          detailsCell.textContent = o.details || '—';
        }
        tr.appendChild(detailsCell);
        tr.appendChild(el('td', '', o.receipt));

        // Show the paid total and any return credit applied to this order.
        var displayTotal = peso(o.total);
        if (o.discount_total && o.discount_total > 0) {
          displayTotal += ' (Credit: -' + peso(o.discount_total) + ')';
        }
        tr.appendChild(el('td', '', displayTotal));

        tr.appendChild(el('td', '', o.delivery_date));
        tr.appendChild(el('td', '', statusLabel[o.status] || o.status));

        var action = el('td');
        action.className = 'text-center';

        if (o.status === 'pending') {
          var btn = el('button', 'btn btn-danger btn-cancel btn-sm', 'Cancel');
          btn.type = 'button';
          btn.addEventListener('click', function () {
            if (!confirm('Cancel order ' + o.receipt + '?')) return;
            api('orders.php', { action: 'cancel', id: o.id }).then(load).catch(function (err) {
              alert(err.message);
              load();
            });
          });
          action.appendChild(btn);
        } else if (o.status === 'completed' && Object.keys(o.returnable || {}).length) {
          var returnBtn = el('button', 'btn btn-report-return btn-sm rounded-pill px-3', 'Report Broken Eggs');
          returnBtn.type = 'button';
          returnBtn.addEventListener('click', function () {
            $('#return-order-id').val(o.id);
            buildReturnItems(o.returnable);
            $('#return-photo').val('');
            $('#return-error-msg').hide().text('');
            $('#reportBrokenModal').modal('show');
          });
          action.appendChild(returnBtn);
        } else if (o.status === 'completed') {
          action.appendChild(el('div', '', o.reported ? 'Already reported' : 'No eggs remaining to report'));
          var reportStatus = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' };
          var reportClass = { pending: 'text-muted', approved: 'text-success', rejected: 'text-danger' };
          (o.report_updates || []).forEach(function (u) {
            var box = el('div', 'small text-left mt-2 mx-auto');
            box.style.maxWidth = '230px';
            var line = el('div', 'font-weight-bold ' + (reportClass[u.status] || ''),
              u.title + ': ' + (reportStatus[u.status] || u.status) +
              (u.status === 'approved' ? ' (' + peso(u.discount_amount) + ' credit)' : ''));
            box.appendChild(line);
            if (u.staff_message) {
              var note = el('div', 'text-muted font-italic', 'Farm staff: ' + u.staff_message);
              note.style.whiteSpace = 'pre-wrap';
              note.style.overflowWrap = 'anywhere';
              box.appendChild(note);
            }
            action.appendChild(box);
          });
        } else {
          action.textContent = '—';
        }
        tr.appendChild(action);
        orderHistoryRows.push(tr);
      });
      renderOrderHistoryPage();
    };

    var load = function () {
      return api('orders.php?scope=mine').then(function (res) {
        render(res.orders);
        var creditStatus = document.getElementById('return-credit-status');
        var credits = res.discount_credit_by_size || {};
        var creditSizes = Object.keys(credits);
        if (creditStatus && creditSizes.length) {
          creditStatus.textContent = 'Approved return credit for matching products: ' + creditSizes.map(function (key) {
            return credits[key].title + ' ' + peso(credits[key].amount);
          }).join(', ');
          creditStatus.hidden = false;
        } else if (creditStatus) {
          creditStatus.hidden = true;
        }
      }).catch(function () {});
    };

    load();

    // Handle AJAX submission of the Report Broken Eggs modal form
    var brokenForm = document.getElementById('report-broken-form');
    if (brokenForm && !brokenForm.dataset.bound) {
      brokenForm.dataset.bound = 'true';
      brokenForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var errDiv = document.getElementById('return-error-msg');
        var submitBtn = brokenForm.querySelector('button[type="submit"]');
        function showError(message) {
          errDiv.textContent = message || 'Something went wrong.';
          errDiv.style.display = 'block';
          submitBtn.disabled = false;
        }
        errDiv.style.display = 'none';

        // A photo of the broken eggs is required as proof for staff.
        var photoInput = document.getElementById('return-photo');
        var photo = photoInput && photoInput.files && photoInput.files[0];
        if (!photo) {
          showError('Please attach a photo of the broken eggs as proof.');
          return;
        }

        // Collect every ticked egg size
        var items = [];
        var invalid = false;
        returnItemsBox.querySelectorAll('.return-qty').forEach(function (input) {
          if (input.disabled) return;
          var n = parseInt(input.value, 10);
          var max = parseInt(input.dataset.max, 10);
          if (!n || n < 1 || n > max) { invalid = true; return; }
          items.push({ size_key: input.dataset.size, broken_qty: n });
        });
        if (!items.length) {
          showError('Please tick at least one egg size and enter how many were broken.');
          return;
        }
        if (invalid) {
          showError('Each ticked size needs a number between 1 and the eggs available.');
          return;
        }

        submitBtn.disabled = true;
        preparePhoto(photo).then(function (blob) {
          var form = new FormData();
          form.append('action', 'report_return');
          form.append('order_id', document.getElementById('return-order-id').value);
          form.append('items', JSON.stringify(items));
          form.append('image', blob, blob === photo ? photo.name : 'photo.jpg');
          return apiForm('orders.php', form);
        }).then(function (res) {
          submitBtn.disabled = false;
          alert(res.message);
          $('#reportBrokenModal').modal('hide');
          load();
        }).catch(function (err) {
          showError(err.message);
        });
      });
    }
  }
})();