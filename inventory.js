$(function () {
    function updateTotal($row) {
        const fresh = Number($row.find('input[name$="[fresh]"]').val()) || 0;
        const nearExpiry = Number($row.find('input[name$="[near_expiry]"]').val()) || 0;

        $row.find('.inventory-total').val(fresh + nearExpiry);
    }

    $('.inventory-table tbody tr').each(function () {
        updateTotal($(this));
    });

    $('.inventory-table').on(
        'input change',
        'input[name$="[fresh]"], input[name$="[near_expiry]"]',
        function () {
            updateTotal($(this).closest('tr'));
        }
    );
});
