$(function () {
    //example lang to recent orders bale placeholder muna
    const recentOrders = [
        {
            order_details: '5 trays (36 eggs/tray)',
            receipt_number: 'REC-2026-001',
            amount: 1550,
            delivery_date: '2026-09-28',
            status: 'Pending'
        },
        {
            order_details: '10 trays (24 eggs/tray)',
            receipt_number: 'REC-2026-002',
            amount: 1950,
            delivery_date: '2026-09-29',
            status: 'Pending'
        },
        {
            order_details: '3 trays (12 eggs/tray)',
            receipt_number: 'REC-2026-000',
            amount: 327,
            delivery_date: '2026-09-27',
            status: 'Confirmed'
        }
    ];

    const $tableBody = $('#recent-orders-table tbody');

    if (!$tableBody.length) {
        return;
    }

    function formatAmount(amount) {
        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount)) {
            return '—';
        }

        return numericAmount.toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
    }

    function formatDate(date) {
        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '—';
        }

        return parsedDate.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function createStatusBadge(status) {
        const normalizedStatus = String(status || 'Pending').toLowerCase();
        const badgeClass = normalizedStatus === 'confirmed'
            ? 'badge-info'
            : normalizedStatus === 'delivered'
                ? 'badge-success'
                : 'badge-warning';

        return $('<span>')
            .addClass('delivery-status badge ' + badgeClass + ' px-3 py-2')
            .text(status || 'Pending');
    }

    function createOrderRow(order) {
        const normalizedStatus = String(order.status || '').toLowerCase();
        const $row = $('<tr>');
        const $action = $('<a>')
            .addClass('btn btn-pill-action')
            .text(normalizedStatus === 'confirmed' ? 'Complete' : 'Confirm');

        $('<td>')
            .addClass('details')
            .text(order.order_details || '—')
            .appendTo($row);
        $('<td>').text(order.receipt_number || '—').appendTo($row);
        $('<td>').text(formatAmount(order.amount)).appendTo($row);
        $('<td>').text(formatDate(order.delivery_date)).appendTo($row);
        $('<td>').append(createStatusBadge(order.status)).appendTo($row);
        $('<td>').append($action).appendTo($row);

        return $row;
    }

    function showMessage(message, className) {
        const $cell = $('<td>')
            .attr('colspan', 6)
            .addClass('text-center py-4 ' + (className || 'text-muted'))
            .text(message);

        $tableBody.empty().append($('<tr>').append($cell));
    }

    function renderRecentOrders() {
        if (recentOrders.length === 0) {
            showMessage('No recent orders found.');
            return;
        }

        $tableBody.empty();
        $.each(recentOrders, function (index, order) {
            $tableBody.append(createOrderRow(order));
        });
    }

    $tableBody.on('click', '.btn-pill-action', function (event) {
        const $action = $(this);
        const $row = $action.closest('tr');
        const $status = $row.find('.delivery-status');

        if ($action.text().trim().toLowerCase() !== 'confirm') {
            return;
        }

        event.preventDefault();

        $status
            .removeClass('badge-warning badge-success')
            .addClass('badge-info')
            .text('Confirmed');

        $action.text('Complete');
    });

    renderRecentOrders();
});
