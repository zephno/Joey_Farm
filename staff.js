$(document).ready(function () {

    function refreshRecentOrders() {
        const recentOrders = [
            {
                details: '5 Trays Large Eggs',
                receipt: 'REC-2026-001',
                amount: '₱ 1,100',
                date: '2026-09-28',
                status: 'Pending'
            },
            {
                details: '10 Trays Medium Eggs',
                receipt: 'REC-2026-002',
                amount: '₱ 2,000',
                date: '2026-09-29',
                status: 'Pending'
            },
            {
                details: '3 Trays XL Eggs',
                receipt: 'REC-2026-000',
                amount: '₱ 750',
                date: '2026-09-27',
                status: 'Confirmed'
            }
        ];

        const $tbody = $('#recent-orders-table tbody');
        $tbody.empty();

        recentOrders.forEach(function (order) {
            const $row = $('<tr>');
            $row.append($('<td>').addClass('details').text(order.details));
            $row.append($('<td>').addClass('receipt').text(order.receipt));
            $row.append($('<td>').addClass('amount').text(order.amount));
            $row.append($('<td>').addClass('date').text(order.date));

            const $statusCell = $('<td>');
            if (order.status === 'Confirmed') {
                $statusCell.append($('<span>').addClass('badge badge-info px-3 py-2').text('Confirmed'));
            } else {
                $statusCell.append($('<span>').addClass('badge badge-warning px-3 py-2').text('Pending'));
            }
            $row.append($statusCell);

            const $actionCell = $('<td>');
            if (order.status === 'Pending') {
                $actionCell.append($('<button>').addClass('btn-pill-action btn-confirm-order').text('confirm'));
            } else {
                $actionCell.append($('<button>').addClass('btn-pill-action btn-complete-order').text('complete'));
            }
            $row.append($actionCell);

            $tbody.append($row);
        });
    }

    $('.nav-link').on('click', function (e) {
        e.preventDefault();
        $('.nav-link').removeClass('active');
        $(this).addClass('active');

        const target = $(this).data('target');
        $('.tab-content-page').removeClass('active');
        $('#' + target).addClass('active');

        if (target === 'home-section') {
            refreshRecentOrders();
        }
    });

    $('#brand-link').on('click', function (e) {
        e.preventDefault();
        $('.nav-link[data-target="home-section"]').click();
    });

    function updateInventoryTotals() {
        $('#inventory-table tbody tr').each(function () {
            const fresh = parseInt($(this).find('.fresh-qty').val(), 10) || 0;
            const expiry = parseInt($(this).find('.expiry-qty').val(), 10) || 0;
            const broken = parseInt($(this).find('.broken-qty').val(), 10) || 0;

            const total = fresh + expiry + broken;
            $(this).find('.total-calc').val(total);
        });
    }

    $(document).on('input change', '.fresh-qty, .expiry-qty, .broken-qty', function () {
        updateInventoryTotals();
    });

    $(document).on('click', '.btn-confirm-order', function () {
        const $row = $(this).closest('tr');
        const details = $row.find('.details').text();
        const receipt = $row.find('.receipt').text();
        const amount = $row.find('.amount').text();
        const date = $row.find('.date').text();

        $row.remove();

        const $confirmedRow = $(`
            <tr data-id="${receipt}">
                <td class="details">${details}</td>
                <td class="receipt">${receipt}</td>
                <td class="amount">${amount}</td>
                <td class="date">${date}</td>
                <td>
                    <button class="btn-pill-action btn-complete-order">complete</button>
                </td>
                <td>
                    <input type="text" class="table-input remark-field" placeholder="txt Input field" value="Confirmed and scheduled">
                </td>
            </tr>
        `);

        $('#confirmed-orders-table tbody').append($confirmedRow);
    });

    $(document).on('click', '.btn-complete-order', function () {
        const $row = $(this).closest('tr');
        const details = $row.find('.details').text();
        const receipt = $row.find('.receipt').text();
        const amount = $row.find('.amount').text();
        const date = $row.find('.date').text();

        $row.remove();

        const $completedRow = $(`
            <tr>
                <td class="details">${details}</td>
                <td class="receipt">${receipt}</td>
                <td class="amount">${amount}</td>
                <td class="date">${date}</td>
                <td><span class="badge badge-success px-3 py-2">Delivered</span></td>
            </tr>
        `);

        $('#completed-orders-table tbody').append($completedRow);
    });

    updateInventoryTotals();
    refreshRecentOrders();
});
