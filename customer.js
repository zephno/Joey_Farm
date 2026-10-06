$(document).ready(function(){
  var STORAGE_KEY = 'joeysFarmCustomerDetails';
  var $form = $('#customer-details-form');

  // customer-orders.html is the source: whatever is typed there gets saved.
  // Forms marked data-sync="receive-only" (order_finalize.html) only read the
  // saved details and never write back, so editing there leaves the source alone.
  var receiveOnly = $form.data('sync') === 'receive-only';

  var fields = {
    address: $('#customer-address'),
    name: $('#customer-name'),
    contact: $('#customer-contact')
  };

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function saveCurrent() {
    if (receiveOnly) return;
    var details = {
      address: fields.address.val(),
      name: fields.name.val(),
      contact: fields.contact.val()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } catch (err) {
      // storage unavailable (private mode, blocked) - the form still works
    }
  }

  // Fill the fields from saved details (both pages); fields stay editable.
  var saved = loadSaved();
  Object.keys(fields).forEach(function (key) {
    if (saved[key]) {
      fields[key].val(saved[key]);
    }
  });

  // Save live as the customer types (source page only).
  $form.on('input change', 'input', saveCurrent);

  $form.on('submit', function(e){
    e.preventDefault();

    var $inputs = $(this).find('input');
    var $button = $(this).find('button[type="submit"]');

    if ($button.text().trim() === 'Edit') {
      $inputs.prop('readonly', false).removeClass('locked-field');
      $button.text('Submit details').removeClass('btn-edit').addClass('btn-confirm');
      return;
    }

    var details = {
      address: fields.address.val().trim(),
      name: fields.name.val().trim(),
      contact: fields.contact.val().trim()
    };

    if (!details.address || !details.name || !details.contact) {
      alert('Please fill out all fields first.');
      return;
    }

    saveCurrent();
    $inputs.prop('readonly', true);
    $button.text('Edit').addClass('btn-edit').removeClass('btn-confirm');
    console.log('Customer details submitted:', details);
  });

  $(window).on('scroll', function(){
    if ($(window).scrollTop() >= 56) {
      $('.navbar').addClass('navbar-scrolled');
    } else {
      $('.navbar').removeClass('navbar-scrolled');
    }
  });
});
