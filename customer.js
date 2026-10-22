$(document).ready(function(){
  var STORAGE_KEY = 'joeysFarmCustomerDetails';
  var $form = $('#customer-details-form');

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
      // storage unavailable
    }
  }

  var saved = loadSaved();
  Object.keys(fields).forEach(function (key) {
    if (saved[key]) {
      fields[key].val(saved[key]);
    }
  });

  $form.on('input change', 'input', saveCurrent);

  $form.on('submit', function(e){
    e.preventDefault();

    var $inputs = $(this).find('input');
    var $button = $(this).find('button[type="submit"]');

    if ($button.hasClass('btn-edit')) {
      $inputs.prop('readonly', false);
      $button.html('<i class="fas fa-check mr-1"></i> Submit Details')
             .removeClass('btn-edit')
             .addClass('btn-confirm');
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
    $button.html('<i class="fas fa-pen mr-1"></i> Edit Details')
           .addClass('btn-edit')
           .removeClass('btn-confirm');
  });

  $(window).on('scroll', function(){
    if ($(window).scrollTop() >= 56) {
      $('.navbar').addClass('navbar-scrolled');
    } else {
      $('.navbar').removeClass('navbar-scrolled');
    }
  });
});
