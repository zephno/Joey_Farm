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
        $('.order-filter').removeClass('active');
        $(this).addClass('active');
        applyOrderFilters();
    });

    $(document).on('click', '.order-date-filter', function () {
        $('.order-date-filter').removeClass('active');
        $(this).addClass('active');
        applyOrderFilters();
    });

    function matchesOrderDate(dateValue, filter) {
        if (filter === 'all') return true;
        if (!dateValue) return false;

        var orderDate = new Date(String(dateValue).replace(' ', 'T'));
        if (Number.isNaN(orderDate.getTime())) return false;

        var now = new Date();
        if (filter === 'today') {
            return orderDate.getFullYear() === now.getFullYear()
                && orderDate.getMonth() === now.getMonth()
                && orderDate.getDate() === now.getDate();
        }
        if (filter === 'month') {
            return orderDate.getFullYear() === now.getFullYear()
                && orderDate.getMonth() === now.getMonth();
        }
        if (filter === 'week') {
            var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
            return orderDate >= startOfWeek && orderDate <= now;
        }
        return true;
    }

    var orderManagementPageSize = 10;
    var orderManagementTables = {
        pending: { table: '#pending-orders-table tbody', pagination: '#pending-orders-pagination', rows: [], page: 1 },
        confirmed: { table: '#confirmed-orders-table tbody', pagination: '#confirmed-orders-pagination', rows: [], page: 1 },
        replacement: { table: '#replacement-orders-table tbody', pagination: '#replacement-orders-pagination', rows: [], page: 1 },
        completed: { table: '#completed-orders-table tbody', pagination: '#completed-orders-pagination', rows: [], page: 1 },
        cancelled: { table: '#cancelled-orders-table tbody', pagination: '#cancelled-orders-pagination', rows: [], page: 1 },
        returns: { table: '#return-requests-table tbody', pagination: '#returns-orders-pagination', rows: [], page: 1 }
    };

    function renderOrderManagementTable(status, dateFilter) {
        var table = orderManagementTables[status];
        var filteredRows = table.rows.filter(function(row) {
            return matchesOrderDate(row.attr('data-created-at'), dateFilter);
        });
        var pageCount = Math.max(1, Math.ceil(filteredRows.length / orderManagementPageSize));
        table.page = Math.min(table.page, pageCount);
        var start = (table.page - 1) * orderManagementPageSize;
        var $tbody = $(table.table).empty();

        filteredRows.slice(start, start + orderManagementPageSize).forEach(function(row) {
            $tbody.append(row);
        });

        var $pagination = $(table.pagination);
        $pagination.prop('hidden', filteredRows.length <= orderManagementPageSize);
        $pagination.find('.order-management-page-status').text(
            filteredRows.length
                ? 'Showing ' + (start + 1) + '-' + Math.min(start + orderManagementPageSize, filteredRows.length) +
                    ' of ' + filteredRows.length + ' orders · Page ' + table.page + ' of ' + pageCount
                : ''
        );
        $pagination.find('.order-management-page-prev').prop('disabled', table.page <= 1);
        $pagination.find('.order-management-page-next').prop('disabled', table.page >= pageCount);
        return filteredRows.length;
    }

    $(document).on('click', '.order-management-page-prev, .order-management-page-next', function() {
        var paginationId = $(this).closest('.order-management-pagination').attr('id');
        var status = paginationId.replace('-orders-pagination', '');
        var table = orderManagementTables[status];
        if (!table) return;

        if ($(this).hasClass('order-management-page-prev') && table.page > 1) {
            table.page -= 1;
        } else if ($(this).hasClass('order-management-page-next')) {
            // Count only the rows that pass the active date filter, so Next cannot run past the last page.
            var dateFilter = $('.order-date-filter.active').data('date-filter') || 'all';
            var visibleRows = table.rows.filter(function (row) {
                return matchesOrderDate(row.attr('data-created-at'), status === 'returns' ? 'all' : dateFilter);
            });
            var pageCount = Math.max(1, Math.ceil(visibleRows.length / orderManagementPageSize));
            if (table.page < pageCount) table.page += 1;
        }
        applyOrderFilters();
    });

    function applyOrderFilters() {
        var statusFilter = $('.order-filter.active').data('filter') || 'all';
        var dateFilter = $('.order-date-filter.active').data('date-filter') || 'all';

        var matchingCounts = {};
        Object.keys(orderManagementTables).forEach(function(status) {
            matchingCounts[status] = renderOrderManagementTable(status, status === 'returns' ? 'all' : dateFilter);
        });

        $('.order-card-wrapper').each(function () {
            var $wrapper = $(this);
            var status = $wrapper.data('status');
            if (status === 'returns') {
                $wrapper.toggle(statusFilter === 'all' || statusFilter === 'returns');
                return;
            }

            var statusMatches = statusFilter === 'all' || status === statusFilter;
            $wrapper.toggle(statusMatches && (matchingCounts[status] || 0) > 0);
        });
    }

    function baseCells($row, order) {
        $row.attr('data-id', order.id);
        $row.attr('data-created-at', order.created_at || '');
        var $details = $('<td>').addClass('details');
        if (Array.isArray(order.detail_items) && order.detail_items.length) {
            var $itemList = $('<div>').addClass('order-details-list');
            order.detail_items.forEach(function (item) {
                var $item = $('<div>').addClass('order-detail-item');
                $item.append($('<strong>').addClass('order-detail-product').text(item.title));
                var loose = Number(item.tray_size) === 1;
                $item.append($('<span>').addClass('order-detail-quantity')
                    .text(loose
                        ? item.qty + (Number(item.qty) === 1 ? ' loose egg' : ' loose eggs') + ' (replacement)'
                        : item.qty + (Number(item.qty) === 1 ? ' tray' : ' trays') + ' × ' + item.tray_size + ' eggs'));
                $item.append($('<span>').addClass('order-detail-total').text(Number(item.eggs_total).toLocaleString('en-US') + ' eggs total'));
                $itemList.append($item);
            });
            $details.append($itemList);
        } else {
            $details.text(order.details);
        }
        $row.append($details);
        $row.append($('<td>').addClass('receipt font-weight-bold text-secondary').text(order.receipt));
        $row.append($('<td>').addClass('amount font-weight-bold').text(peso(order.total)));
        $row.append($('<td>').addClass('date').text(order.delivery_date));
    }

    function statusBadge(status) {
        var map = {
            pending:   ['badge-warning text-dark', 'Pending'],
            confirmed: ['badge-info', 'Confirmed'],
            replacement: ['badge-primary', 'Replacement'],
            completed: ['badge-success', 'Delivered'],
            cancelled: ['badge-danger', 'Cancelled']
        };
        var m = map[status] || map.pending;
        return $('<span>').addClass('badge px-3 py-2 ' + m[0]).text(m[1]);
    }

    function cancelBtn() {
        return $('<button type="button">').addClass('btn btn-outline-danger btn-sm btn-cancel-order order-action-btn')
            .text('Cancel');
    }

    function orderActionButton(actionClass, styleClass, label) {
        return $('<button type="button">').addClass('btn btn-sm ' + styleClass + ' ' + actionClass + ' order-action-btn')
            .text(label);
    }

    function remarkInput(val) {
        return $('<input type="text" class="table-input remark-field" placeholder="Add a remark">').val(val || '');
    }

    var recentOrdersPage = 1;
    var recentOrdersPerPage = 10;
    var recentOrderRows = [];

    function renderRecentOrdersPage() {
        var $recent = $('#recent-orders-table tbody').empty();
        var pageCount = Math.max(1, Math.ceil(recentOrderRows.length / recentOrdersPerPage));
        recentOrdersPage = Math.min(recentOrdersPage, pageCount);
        var start = (recentOrdersPage - 1) * recentOrdersPerPage;

        recentOrderRows.slice(start, start + recentOrdersPerPage).forEach(function($row) {
            $recent.append($row);
        });

        var $pagination = $('#recent-orders-pagination');
        $pagination.prop('hidden', recentOrderRows.length <= recentOrdersPerPage);
        $('#recent-orders-page-status').text(
            recentOrderRows.length
                ? 'Showing ' + (start + 1) + '-' + Math.min(start + recentOrdersPerPage, recentOrderRows.length) +
                    ' of ' + recentOrderRows.length + ' orders · Page ' + recentOrdersPage + ' of ' + pageCount
                : 'No orders'
        );
        $('#recent-orders-prev').prop('disabled', recentOrdersPage <= 1);
        $('#recent-orders-next').prop('disabled', recentOrdersPage >= pageCount);
    }

    $('#recent-orders-prev').on('click', function() {
        if (recentOrdersPage > 1) {
            recentOrdersPage -= 1;
            renderRecentOrdersPage();
        }
    });

    $('#recent-orders-next').on('click', function() {
        var pageCount = Math.max(1, Math.ceil(recentOrderRows.length / recentOrdersPerPage));
        if (recentOrdersPage < pageCount) {
            recentOrdersPage += 1;
            renderRecentOrdersPage();
        }
    });

    function renderOrders(orders) {
        recentOrderRows = [];
        Object.keys(orderManagementTables).forEach(function(status) {
            orderManagementTables[status].rows = [];
            orderManagementTables[status].page = 1;
        });

        orders.forEach(function (order) {
            var $recentRow = $('<tr>');
            baseCells($recentRow, order);
            $recentRow.append($('<td>').append(statusBadge(order.status)));
            $recentRow.append($('<td>').append(remarkInput(order.remark)));
            var $recentAction = $('<td class="text-center">');
            if (order.status === 'pending') {
                $recentAction.append($('<div class="order-action-buttons">')
                    .append(orderActionButton('btn-confirm-order', 'btn-primary', 'Confirm'))
                    .append(cancelBtn()));
            } else if (order.status === 'confirmed' || order.status === 'replacement') {
                $recentAction.append($('<div class="order-action-buttons">')
                    .append(orderActionButton('btn-complete-order', 'btn-success', 'Complete'))
                    .append(cancelBtn()));
            }
            $recentRow.append($recentAction);
            recentOrderRows.push($recentRow);

            // Orders tab: separate cards/tables per status with dedicated Remarks column
            var $row = $('<tr>');
            baseCells($row, order);

            if (order.status === 'pending') {
                $row.append($('<td>').append($('<div class="order-action-buttons">')
                    .append(orderActionButton('btn-confirm-order', 'btn-primary', 'Confirm'))
                    .append(cancelBtn())));
                $row.append($('<td>').append(remarkInput(order.remark)));
                orderManagementTables.pending.rows.push($row);
            } else if (order.status === 'confirmed') {
                $row.append($('<td>').append($('<div class="order-action-buttons">')
                    .append(orderActionButton('btn-complete-order', 'btn-success', 'Complete'))
                    .append(cancelBtn())));
                $row.append($('<td>').append(remarkInput(order.remark)));
                orderManagementTables.confirmed.rows.push($row);
            } else if (order.status === 'replacement') {
                $row.append($('<td>').append($('<div class="order-action-buttons">')
                    .append(orderActionButton('btn-complete-order', 'btn-success', 'Complete'))
                    .append(cancelBtn())));
                $row.append($('<td>').append(remarkInput(order.remark)));
                orderManagementTables.replacement.rows.push($row);
            } else if (order.status === 'completed') {
                $row.append($('<td>').append(statusBadge('completed')));
                $row.append($('<td>').append(remarkInput(order.remark)));
                orderManagementTables.completed.rows.push($row);
            } else {
                $row.append($('<td>').append(statusBadge('cancelled')));
                $row.append($('<td>').append(remarkInput(order.remark)));
                orderManagementTables.cancelled.rows.push($row);
            }
        });
        renderRecentOrdersPage();
        applyOrderFilters();
    }

    function refreshOrders() {
        return api('orders.php?scope=all').then(function (res) {
            renderOrders(res.orders);
            renderReturnRequests(res.pending_returns || []);
            $('#val-daily').text(peso(res.sales.daily));
            $('#val-weekly').text(peso(res.sales.weekly));
            $('#val-monthly').text(peso(res.sales.monthly));
            $('#val-credit').text(peso(res.credit_outstanding || 0));
        }).catch(showError);
    }

    function renderReturnRequests(returns) {
        var table = orderManagementTables.returns;
        table.rows = [];
        table.page = 1;
        if (!returns.length) {
            table.rows.push($('<tr>').append(
                $('<td colspan="8">').addClass('text-center text-muted').text('No pending customer return requests.')
            ));
            renderOrderManagementTable('returns', 'all');
            return;
        }

        returns.forEach(function (request) {
            var $row = $('<tr>');
            $row.append($('<td>').text(request.customer_name || 'Customer account unavailable'));
            $row.append($('<td>').text(request.receipt_no || 'Order #' + request.order_id));
            $row.append($('<td>').text(request.size_key));
            $row.append($('<td>').text(request.broken_qty));

            // The proof photo the customer attached (only staff can open it, see return_image.php)
            var $photoCell = $('<td>');
            if (request.has_image) {
                var photoSrc = 'return_image.php?id=' + encodeURIComponent(request.id);
                $photoCell.append($('<a target="_blank" rel="noopener" title="Open the photo full size">').attr('href', photoSrc).append(
                    $('<img class="rounded border" style="height: 56px; width: 56px; object-fit: cover;" alt="Photo of the broken eggs">').attr('src', photoSrc)
                ));
            } else {
                $photoCell.addClass('text-muted small').text('No photo (sent before photos were required)');
            }
            $row.append($photoCell);

            $row.append($('<td>').text(peso(request.discount_amount)));
            $row.append($('<td>').text(request.created_at));

            var $actions = $('<td class="text-nowrap">');
            $actions.append($('<button type="button">')
                .addClass('btn btn-sm btn-success btn-approve-return mr-1')
                .attr('data-return-id', request.id)
                .attr('data-broken-qty', request.broken_qty)
                .attr('data-size', request.size_key)
                .attr('data-credit', request.discount_amount)
                .text('Approve'));
            $actions.append($('<button type="button">')
                .addClass('btn btn-sm btn-outline-danger btn-reject-return')
                .attr('data-return-id', request.id)
                .text('Reject'));
            $row.append($actions);
            table.rows.push($row);
        });
        renderOrderManagementTable('returns', 'all');
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
            var preview = message.message.length > 80
                ? message.message.slice(0, 80) + '…'
                : message.message;
            $row.append($('<td>').text((message.has_image ? '📎 ' : '') + preview));
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

        // The photo the customer attached (only staff can open it, see contact_image.php)
        var $photo = $('#message-photo');
        if (!$photo.length) {
            $photo = $('<div id="message-photo" class="mt-3"></div>').insertAfter('#message-content');
        }
        $photo.empty();
        if (message.has_image) {
            var src = 'contact_image.php?id=' + encodeURIComponent(message.id);
            $photo.append($('<label class="font-weight-bold mb-1 d-block">').text('Attached photo:'))
                .append($('<a target="_blank" rel="noopener">').attr('href', src).append(
                    $('<img class="img-fluid rounded border" style="max-height: 320px;" alt="Photo attached by the customer">').attr('src', src)
                ))
                .append($('<small class="form-text text-muted">').text('Click the photo to open it full size.'));
        }

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

    var pendingReturnDecision = null;

    $(document).on('click', '.btn-approve-return, .btn-reject-return', function () {
        var $btn = $(this);
        var approve = $btn.hasClass('btn-approve-return');
        pendingReturnDecision = { id: parseInt($btn.attr('data-return-id'), 10), approve: approve };

        var eggs = parseInt($btn.attr('data-broken-qty'), 10) || 0;
        var size = $btn.attr('data-size') || '';
        var credit = Number($btn.attr('data-credit')) || 0;

        $('#return-decision-title').text(approve ? 'Approve return request' : 'Reject return request');
        $('#return-decision-help').text(approve
            ? 'Please confirm that the photo shows the damage.'
            : 'Rejecting means no credit and no replacement. This order cannot be reported again.');
        $('#return-decision-warning').prop('hidden', !approve).text(approve
            ? '⚠ Approving will:\n' +
              '• Reduce stock by ' + eggs.toLocaleString() + ' ' + size + ' eggs to replace the broken eggs (reserved now, deducted when the replacement is delivered).\n' +
              '• Create a Replacement order with the remark "' + eggs.toLocaleString() + ' eggs will be redelivered".\n' +
              '• Give the customer ' + peso(credit) + ' credit on their next order for the same egg size.'
            : '');
        $('#return-decision-message').val('');
        $('#return-decision-error').prop('hidden', true).text('');
        $('#return-decision-confirm')
            .removeClass('btn-success btn-danger')
            .addClass(approve ? 'btn-success' : 'btn-danger')
            .text(approve ? 'Approve & Reduce Stock' : 'Reject')
            .prop('disabled', false);
        $('#returnDecisionModal').modal('show');
    });

    $('#return-decision-confirm').on('click', function () {
        if (!pendingReturnDecision) return;
        var decision = pendingReturnDecision;
        var $button = $(this).prop('disabled', true);

        api('orders.php', {
            action: decision.approve ? 'approve_return' : 'reject_return',
            return_id: decision.id,
            message: $('#return-decision-message').val().trim()
        }).then(function (res) {
            pendingReturnDecision = null;
            $('#returnDecisionModal').modal('hide');
            alert(res.message);
            return Promise.all([refreshOrders(), decision.approve ? loadInventory() : Promise.resolve()]);
        }).catch(function (err) {
            $button.prop('disabled', false);
            if (err && err.message !== 'Not allowed') {
                $('#return-decision-error').prop('hidden', false).text(err.message || 'Something went wrong.');
            }
        });
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