$(document).ready(function () {

    /* ------------------------------------------------------------------
       Small helper for talking to the PHP endpoints (orders.php, inventory.php)
       ------------------------------------------------------------------ */
    function api(url, body) {
        var opts = { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
        if (body) {
            opts.method = 'POST';
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(url, opts).then(function (r) {
            if (r.status === 401 || r.status === 403) {
                window.location.replace('Index.html?login=1');
                throw new Error('Not allowed');
            }
            return r.json().then(function (j) {
                if (!r.ok) throw new Error(j.error || 'Request failed');
                return j;
            });
        });
    }

    function peso(n) {
        return '₱ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function showError(err) {
        if (err && err.message !== 'Not allowed') alert(err.message || 'Something went wrong.');
    }

    /* ------------------------------------------------------------------
       ORDERS (loaded from the database)
       ------------------------------------------------------------------ */
    function baseCells($row, order) {
        $row.attr('data-id', order.id);
        $row.append($('<td>').addClass('details').text(order.details));
        $row.append($('<td>').addClass('receipt').text(order.receipt));
        $row.append($('<td>').addClass('amount').text(peso(order.total)));
        $row.append($('<td>').addClass('date').text(order.delivery_date));
    }

    function statusBadge(status) {
        var map = {
            pending:   ['badge-warning', 'Pending'],
            confirmed: ['badge-info', 'Confirmed'],
            completed: ['badge-success', 'Delivered'],
            cancelled: ['badge-danger', 'Cancelled']
        };
        var m = map[status] || map.pending;
        return $('<span>').addClass('badge px-3 py-2 ' + m[0]).text(m[1]);
    }

    function cancelBtn() {
        return $('<button type="button">').addClass('btn btn-danger btn-sm btn-cancel-order ml-2')
            .css('border-radius', '20px').text('Cancel');
    }

    function renderOrders(orders) {
        var $recent    = $('#recent-orders-table tbody').empty();
        var $pending   = $('#pending-orders-table tbody').empty();
        var $confirmed = $('#confirmed-orders-table tbody').empty();
        var $completed = $('#completed-orders-table tbody').empty();
        var $cancelled = $('#cancelled-orders-table tbody').empty();

        orders.forEach(function (order, index) {
            // Home tab: most recent 5 orders with their status and next action
            if (index < 5) {
                var $r = $('<tr>');
                baseCells($r, order);
                $r.append($('<td>').append(statusBadge(order.status)));
                var $act = $('<td>');
                if (order.status === 'pending') {
                    $act.append($('<button>').addClass('btn-pill-action btn-confirm-order').text('confirm'))
                        .append(cancelBtn());
                } else if (order.status === 'confirmed') {
                    $act.append($('<button>').addClass('btn-pill-action btn-complete-order').text('complete'))
                        .append(cancelBtn());
                }
                $r.append($act);
                $recent.append($r);
            }

            // Orders tab: one table per status
            var $row = $('<tr>');
            baseCells($row, order);

            if (order.status === 'pending') {
                $row.append($('<td>').append($('<button>').addClass('btn-pill-action btn-confirm-order').text('Confirm'))
                    .append(cancelBtn()));
                $pending.append($row);
            } else if (order.status === 'confirmed') {
                $row.append($('<td>').append($('<button>').addClass('btn-pill-action btn-complete-order').text('Complete'))
                    .append(cancelBtn()));
                $row.append($('<td>').append(
                    $('<input type="text" class="table-input remark-field" placeholder="Add a remark">').val(order.remark)
                ));
                $confirmed.append($row);
            } else if (order.status === 'completed') {
                $row.append($('<td>').append(statusBadge('completed')));
                $completed.append($row);
            } else {
                $row.append($('<td>').append(statusBadge('cancelled')));
                $cancelled.append($row);
            }
        });
    }

    function refreshOrders() {
        return api('orders.php?scope=all').then(function (res) {
            renderOrders(res.orders);
            $('#val-daily').text(peso(res.sales.daily));
            $('#val-weekly').text(peso(res.sales.weekly));
            $('#val-monthly').text(peso(res.sales.monthly));
        }).catch(showError);
    }

    /* ------------------------------------------------------------------
       CUSTOMER MESSAGES
       ------------------------------------------------------------------ */
    var contactMessages = [];
    var messageFilter = 'all';
    var activeContactMessageId = null;

    function renderMessages() {
        var visibleMessages = contactMessages.filter(function (message) {
            return messageFilter === 'all' || message.status === messageFilter;
        });
        var $tbody = $('#contact-messages-table tbody').empty();

        visibleMessages.forEach(function (message) {
            var $row = $('<tr>').attr('data-id', message.id);
            $row.append($('<td>').text(message.sender_name));
            $row.append($('<td>').text(message.sender_email));
            $row.append($('<td>').text(message.created_at));
            $row.append($('<td>').append(
                $('<span>').addClass('badge px-3 py-2 ' +
                    (message.status === 'unread' ? 'badge-primary' :
                        message.status === 'archived' ? 'badge-secondary' : 'badge-success'))
                    .text(message.status.charAt(0).toUpperCase() + message.status.slice(1))
            ));
            $row.append($('<td>').text(message.message.length > 100
                ? message.message.slice(0, 100) + '…'
                : message.message));
            $row.append($('<td>').append(
                $('<button type="button">').addClass('btn btn-outline-primary btn-sm btn-view-message')
                    .attr('data-message-id', message.id).text('View')
            ));
            $tbody.append($row);
        });

        $('#messages-empty').prop('hidden', visibleMessages.length !== 0);
    }

    function refreshMessages() {
        return api('contact_messages.php').then(function (res) {
            contactMessages = res.messages;
            $('#messages-error').prop('hidden', true).text('');
            renderMessages();
            if (activeContactMessageId !== null) {
                showContactMessage(activeContactMessageId);
            }
        }).catch(function (err) {
            $('#messages-error').prop('hidden', false).text(err.message || 'Could not load messages.');
        });
    }

    function showContactMessage(id) {
        var message = contactMessages.find(function (item) {
            return String(item.id) === String(id);
        });
        if (!message) return;

        activeContactMessageId = message.id;
        $('#message-sender').text(message.sender_name);
        $('#message-email').text(message.sender_email);
        $('#message-date').text(message.created_at);
        $('#message-content').text(message.message);
        $('#message-status').text(message.status.charAt(0).toUpperCase() + message.status.slice(1));
        $('#message-action-error').prop('hidden', true).text('');
        $('.message-mark-read').prop('hidden', message.status !== 'unread');
        $('.message-archive').prop('hidden', message.status === 'archived');
        $('#contactMessageModal').modal('show');
    }

    function updateContactMessage(action) {
        if (activeContactMessageId === null) return;
        api('contact_messages.php', { action: action, id: activeContactMessageId })
            .then(refreshMessages)
            .catch(function (err) {
                $('#message-action-error').prop('hidden', false)
                    .text(err.message || 'Could not update the message.');
            });
    }

    $(document).on('click', '.message-filter', function () {
        messageFilter = $(this).data('filter');
        $('.message-filter').removeClass('active');
        $(this).addClass('active');
        renderMessages();
    });

    $(document).on('click', '.btn-view-message', function () {
        showContactMessage($(this).data('message-id'));
    });

    $('.message-mark-read').on('click', function () {
        updateContactMessage('mark_read');
    });

    $('.message-archive').on('click', function () {
        updateContactMessage('archive');
    });

    $('#contactMessageModal').on('hidden.bs.modal', function () {
        activeContactMessageId = null;
    });

    $(document).on('click', '.btn-confirm-order', function () {
        var id = $(this).closest('tr').data('id');
        // Confirming reserves the order's eggs, so refresh the inventory columns too
        api('orders.php', { action: 'confirm', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('click', '.btn-cancel-order', function () {
        var $tr = $(this).closest('tr');
        var id = $tr.data('id');
        if (!window.confirm('Cancel order ' + ($tr.find('.receipt').text() || '') + '? This cannot be undone.')) return;
        // A cancelled confirmed order releases its reserved eggs, so reload inventory too
        api('orders.php', { action: 'cancel', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('click', '.btn-complete-order', function () {
        var id = $(this).closest('tr').data('id');
        // Completing an order removes its eggs from inventory on the server, so reload both
        api('orders.php', { action: 'complete', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('change', '.remark-field', function () {
        var id = $(this).closest('tr').data('id');
        api('orders.php', { action: 'remark', id: id, remark: $(this).val() }).catch(showError);
    });

    /* ------------------------------------------------------------------
       TABS
       ------------------------------------------------------------------ */
    $('.nav-link').on('click', function (e) {
        const target = $(this).data('target');
        if (!target) return;
        e.preventDefault();
        $('.nav-link').removeClass('active'); $(this).addClass('active');

        $('.tab-content-page').removeClass('active'); $('#' + target).addClass('active');

        if (target === 'home-section') {
            refreshOrders();
        } else if (target === 'messages-section') {
            refreshMessages();
        }
    });

    $('#brand-link').on('click', function (e) {
        e.preventDefault();
        $('.nav-link[data-target="home-section"]').click();
    });

    /* ------------------------------------------------------------------
       INVENTORY (loaded from and saved to the database)
       ------------------------------------------------------------------ */
    function updateInventoryTotals() {
        $('#inventory-table tbody tr').each(function () {
            const $traySelect = $(this).find('.tray-select');
            const traySize = parseInt($traySelect.val(), 10) || 36;

            const fresh = parseInt($(this).find('.fresh-qty').val(), 10) || 0;
            const expiry = parseInt($(this).find('.expiry-qty').val(), 10) || 0;
            const broken = parseInt($(this).find('.broken-qty').val(), 10) || 0;

            // Stock is counted in EGGS. Only FRESH eggs count towards the totals:
            // near-expiry and unsellable eggs are tracked in their own columns but
            // are left out of Total Egg Qty, trays, loose eggs and value.
            // The tray size only changes how many trays those eggs make up.
            const totalEggs = fresh;
            const totalTrays = Math.floor(totalEggs / traySize);   // whole trays only
            const looseEggs = totalEggs % traySize;                // eggs left over, not in a full tray

            $(this).find('.total-trays').val(totalTrays);
            $(this).find('.loose-eggs').val(looseEggs);
            $(this).find('.total-eggs').val(totalEggs);

            // Reserved = eggs in Confirmed (not yet completed) orders; Available = what customers can still order
            const reserved = parseInt($(this).data('reserved'), 10) || 0;
            $(this).find('.reserved-eggs').val(reserved);
            $(this).find('.available-eggs').val(Math.max(0, fresh - reserved));
        });
    }

    // "Extra Large" in the HTML -> "extralarge" in the database
    function sizeKey($row) {
        return String($row.data('egg-size')).toLowerCase().replace(/\s+/g, '');
    }

    function loadInventory() {
        return api('inventory.php').then(function (res) {
            res.rows.forEach(function (r) {
                var $row = $('#inventory-table tbody tr').filter(function () { return sizeKey($(this)) === r.size_key; });
                if (!$row.length) return;
                $row.find('.tray-select').val(String(r.tray_size));
                $row.find('.fresh-qty').val(r.fresh);
                $row.find('.expiry-qty').val(r.near_expiry);
                $row.find('.broken-qty').val(r.unsellable);
                $row.data('reserved', r.reserved || 0);
            });
            updateInventoryTotals();
        }).catch(showError);
    }

    var $invStatus = $('<div class="text-center text-muted small mt-2" id="inv-status" aria-live="polite"></div>')
        .insertAfter('#inventory-section .tagalog-note');
    var saveTimers = {};

    function saveInventoryRow($row) {
        var key = sizeKey($row);
        clearTimeout(saveTimers[key]);
        $invStatus.text('Saving…');
        saveTimers[key] = setTimeout(function () {
            api('inventory.php', {
                size_key: key,
                tray_size: parseInt($row.find('.tray-select').val(), 10),
                fresh: Math.max(0, parseInt($row.find('.fresh-qty').val(), 10) || 0),
                near_expiry: Math.max(0, parseInt($row.find('.expiry-qty').val(), 10) || 0),
                unsellable: Math.max(0, parseInt($row.find('.broken-qty').val(), 10) || 0)
            }).then(function () {
                $invStatus.text('All changes saved.');
            }).catch(function (err) {
                $invStatus.text('Could not save: ' + (err.message || 'error'));
                loadInventory();   // put the real (saved) numbers back on screen
            });
        }, 500);
    }

    $(document).on('input change', '.fresh-qty, .expiry-qty, .broken-qty, .tray-select', function () {
        updateInventoryTotals();
        saveInventoryRow($(this).closest('tr'));
    });

    /* ------------------------------------------------------------------
       START
       ------------------------------------------------------------------ */
    // Inventory columns are in eggs (the HTML headers still say "Trays")
    $('#inventory-table thead th').each(function () {
        $(this).text($(this).text().replace('(Trays)', '(Eggs)'));
    });
    $('#inventory-table .fresh-qty, #inventory-table .expiry-qty, #inventory-table .broken-qty').attr({ min: 0, step: 1 });

    // Remove the "Price / Tray" and "Est. Total Value" columns: prices are managed in Product Maintenance
    $('#inventory-table thead th').filter(function () {
        var t = $(this).text().trim();
        return t === 'Price / Tray' || t === 'Est. Total Value';
    }).remove();
    $('#inventory-table .price-display, #inventory-table .total-value').closest('td').remove();

    // Add a "Loose Eggs" column right after "Total Trays" (eggs that do not fill a whole tray)
    if (!$('#inventory-table .loose-eggs').length) {
        var trayCol = $('#inventory-table thead th').filter(function () { return $(this).text().trim() === 'Total Trays'; });
        trayCol.after('<th>Loose Eggs</th>');
        $('#inventory-table tbody tr').each(function () {
            $(this).find('.total-trays').closest('td')
                .after('<td><input type="number" class="table-input loose-eggs" value="0" readonly></td>');
        });
    }

    // Reserved / Available columns (filled from the server; see updateInventoryTotals)
    if (!$('#inventory-table .reserved-eggs').length) {
        $('#inventory-table thead tr').first().append('<th>Reserved (Eggs)</th><th>Available (Eggs)</th>');
        $('#inventory-table tbody tr').each(function () {
            $(this).append('<td><input type="number" class="table-input reserved-eggs" value="0" readonly></td>' +
                           '<td><input type="number" class="table-input available-eggs" value="0" readonly></td>');
        });
    }

    loadInventory();
    refreshOrders();
    refreshMessages();

    const hashTarget = window.location.hash.replace('#', '');
    if (hashTarget) {
        $('.nav-link[data-target="' + hashTarget + '"]').click();
    }
});
