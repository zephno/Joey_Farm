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
       ORDERS FILTERING & DISPLAY
       ------------------------------------------------------------------ */
    $(document).on('click', '.order-filter', function () {
        var filter = $(this).data('filter');
        $('.order-filter').removeClass('active');
        $(this).addClass('active');

        if (filter === 'all') {
            $('.order-card-wrapper').show();
        } else {
            $('.order-card-wrapper').hide();
            $('.order-card-wrapper[data-status="' + filter + '"]').show();
        }
    });

    function baseCells($row, order) {
        $row.attr('data-id', order.id);
        $row.append($('<td>').addClass('details').text(order.details));
        $row.append($('<td>').addClass('receipt font-weight-bold text-secondary').text(order.receipt));
        $row.append($('<td>').addClass('amount font-weight-bold').text(peso(order.total)));
        $row.append($('<td>').addClass('date').text(order.delivery_date));
    }

    function statusBadge(status) {
        var map = {
            pending:   ['badge-warning text-dark', 'Pending'],
            confirmed: ['badge-info', 'Confirmed'],
            completed: ['badge-success', 'Delivered'],
            cancelled: ['badge-danger', 'Cancelled']
        };
        var m = map[status] || map.pending;
        return $('<span>').addClass('badge px-3 py-2 ' + m[0]).text(m[1]);
    }

    function cancelBtn() {
        return $('<button type="button">').addClass('btn btn-outline-danger btn-sm btn-cancel-order ml-1 rounded-pill')
            .text('Cancel');
    }

    function remarkInput(val) {
        return $('<input type="text" class="table-input remark-field" placeholder="Add a remark">').val(val || '');
    }

    function renderOrders(orders) {
        var $recent    = $('#recent-orders-table tbody').empty();
        var $pending   = $('#pending-orders-table tbody').empty();
        var $confirmed = $('#confirmed-orders-table tbody').empty();
        var $completed = $('#completed-orders-table tbody').empty();
        var $cancelled = $('#cancelled-orders-table tbody').empty();

        orders.forEach(function (order, index) {
            // Home tab: most recent 5 orders with status, remarks, and actions
            if (index < 5) {
                var $r = $('<tr>');
                baseCells($r, order);
                $r.append($('<td>').append(statusBadge(order.status)));
                $r.append($('<td>').append(remarkInput(order.remark)));
                var $act = $('<td class="text-center">');
                if (order.status === 'pending') {
                    $act.append($('<button>').addClass('btn btn-sm btn-primary rounded-pill btn-confirm-order px-3').text('Confirm'))
                        .append(cancelBtn());
                } else if (order.status === 'confirmed') {
                    $act.append($('<button>').addClass('btn btn-sm btn-success rounded-pill btn-complete-order px-3').text('Complete'))
                        .append(cancelBtn());
                }
                $r.append($act);
                $recent.append($r);
            }

            // Orders tab: separate cards/tables per status with dedicated Remarks column
            var $row = $('<tr>');
            baseCells($row, order);

            if (order.status === 'pending') {
                $row.append($('<td>').append($('<button>').addClass('btn btn-sm btn-primary rounded-pill btn-confirm-order px-3').text('Confirm'))
                    .append(cancelBtn()));
                $row.append($('<td>').append(remarkInput(order.remark)));
                $pending.append($row);
            } else if (order.status === 'confirmed') {
                $row.append($('<td>').append($('<button>').addClass('btn btn-sm btn-success rounded-pill btn-complete-order px-3').text('Complete'))
                    .append(cancelBtn()));
                $row.append($('<td>').append(remarkInput(order.remark)));
                $confirmed.append($row);
            } else if (order.status === 'completed') {
                $row.append($('<td>').append(statusBadge('completed')));
                $row.append($('<td>').append(remarkInput(order.remark)));
                $completed.append($row);
            } else {
                $row.append($('<td>').append(statusBadge('cancelled')));
                $row.append($('<td>').append(remarkInput(order.remark)));
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
            $row.append($('<td>').addClass('font-weight-bold').text(message.sender_name));
            $row.append($('<td>').text(message.sender_email));
            $row.append($('<td>').addClass('text-muted small').text(message.created_at));
            $row.append($('<td>').append(
                $('<span>').addClass('badge px-3 py-2 ' +
                    (message.status === 'unread' ? 'badge-primary' :
                        message.status === 'archived' ? 'badge-secondary' : 'badge-success'))
                    .text(message.status.charAt(0).toUpperCase() + message.status.slice(1))
            ));
            $row.append($('<td>').text(message.message.length > 80
                ? message.message.slice(0, 80) + '…'
                : message.message));
            $row.append($('<td class="text-center">').append(
                $('<button type="button">').addClass('btn btn-outline-primary btn-sm rounded-pill px-3 btn-view-message')
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
        api('orders.php', { action: 'confirm', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('click', '.btn-cancel-order', function () {
        var $tr = $(this).closest('tr');
        var id = $tr.data('id');
        if (!window.confirm('Cancel order ' + ($tr.find('.receipt').text() || '') + '? This cannot be undone.')) return;
        api('orders.php', { action: 'cancel', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('click', '.btn-complete-order', function () {
        var id = $(this).closest('tr').data('id');
        api('orders.php', { action: 'complete', id: id }).then(function () {
            return Promise.all([refreshOrders(), loadInventory()]);
        }).catch(showError);
    });

    $(document).on('change', '.remark-field', function () {
        var id = $(this).closest('tr').data('id');
        api('orders.php', { action: 'remark', id: id, remark: $(this).val() }).catch(showError);
    });

    /* ------------------------------------------------------------------
       NAVIGATION / TABS
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
       INVENTORY & SEPARATE BROKEN EGGS SECTION
       ------------------------------------------------------------------ */
    function updateInventoryTotals() {
        var grandTotalBroken = 0;

        // Process Main Inventory Table
        $('#inventory-table tbody tr').each(function () {
            const $traySelect = $(this).find('.tray-select');
            const traySize = parseInt($traySelect.val(), 10) || 36;

            const fresh = parseInt($(this).find('.fresh-qty').val(), 10) || 0;
            const totalEggs = fresh;
            const totalTrays = Math.floor(totalEggs / traySize);
            const looseEggs = totalEggs % traySize;

            $(this).find('.total-trays').val(totalTrays);
            $(this).find('.loose-eggs').val(looseEggs);
            $(this).find('.total-eggs').val(totalEggs);

            const reserved = parseInt($(this).data('reserved'), 10) || 0;
            $(this).find('.reserved-eggs').val(reserved);
            $(this).find('.available-eggs').val(Math.max(0, fresh - reserved));
        });

        // Process Broken Eggs Table
        $('#broken-eggs-table tbody tr').each(function () {
            const brokenEggs = parseInt($(this).find('.broken-qty').val(), 10) || 0;
            grandTotalBroken += brokenEggs;

            // Match tray configuration from corresponding size in inventory table
            const size = $(this).data('egg-size');
            const $mainRow = $('#inventory-table tbody tr').filter(function() { return $(this).data('egg-size') === size; });
            const traySize = parseInt($mainRow.find('.tray-select').val(), 10) || 36;

            const equivTrays = (brokenEggs / traySize).toFixed(1);
            $(this).find('.broken-trays-text').text(equivTrays + ' Trays (' + traySize + '/tray)');
        });

        $('#total-broken-badge').text(grandTotalBroken.toLocaleString() + ' Broken Eggs Total');
    }

    function sizeKey($row) {
        return String($row.data('egg-size')).toLowerCase().replace(/\s+/g, '');
    }

    function loadInventory() {
        return api('inventory.php').then(function (res) {
            res.rows.forEach(function (r) {
                var $mainRow = $('#inventory-table tbody tr').filter(function () { return sizeKey($(this)) === r.size_key; });
                if ($mainRow.length) {
                    $mainRow.find('.tray-select').val(String(r.tray_size));
                    $mainRow.find('.fresh-qty').val(r.fresh);
                    $mainRow.find('.expiry-qty').val(r.near_expiry);
                    $mainRow.data('reserved', r.reserved || 0);
                }

                var $brokenRow = $('#broken-eggs-table tbody tr').filter(function () { return sizeKey($(this)) === r.size_key; });
                if ($brokenRow.length) {
                    $brokenRow.find('.broken-qty').val(r.unsellable);
                }
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
        $invStatus.text('Saving changes…');

        var $mainRow = $('#inventory-table tbody tr').filter(function () { return sizeKey($(this)) === key; });
        var $brokenRow = $('#broken-eggs-table tbody tr').filter(function () { return sizeKey($(this)) === key; });

        saveTimers[key] = setTimeout(function () {
            api('inventory.php', {
                size_key: key,
                tray_size: parseInt($mainRow.find('.tray-select').val(), 10),
                fresh: Math.max(0, parseInt($mainRow.find('.fresh-qty').val(), 10) || 0),
                near_expiry: Math.max(0, parseInt($mainRow.find('.expiry-qty').val(), 10) || 0),
                unsellable: Math.max(0, parseInt($brokenRow.find('.broken-qty').val(), 10) || 0)
            }).then(function () {
                $invStatus.text('All stock and broken egg changes saved.');
            }).catch(function (err) {
                $invStatus.text('Could not save: ' + (err.message || 'error'));
                loadInventory();
            });
        }, 500);
    }

    $(document).on('input change', '#inventory-table .fresh-qty, #inventory-table .expiry-qty, #inventory-table .tray-select', function () {
        updateInventoryTotals();
        saveInventoryRow($(this).closest('tr'));
    });

    $(document).on('input change', '#broken-eggs-table .broken-qty', function () {
        updateInventoryTotals();
        saveInventoryRow($(this).closest('tr'));
    });

    /* ------------------------------------------------------------------
       INITIALIZATION
       ------------------------------------------------------------------ */
    loadInventory();
    refreshOrders();
    refreshMessages();

    const hashTarget = window.location.hash.replace('#', '');
    if (hashTarget) {
        $('.nav-link[data-target="' + hashTarget + '"]').click();
    }
});
