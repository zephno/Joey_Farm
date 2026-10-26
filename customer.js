window.JoeysFarmCustomerProfileReady = new Promise(function(resolve, reject) {
  $(document).ready(function() {
    initializeCustomerDetails(resolve, reject);
  });
});

function initializeCustomerDetails(resolveProfile, rejectProfile) {
  var $form = $('#customer-details-form');

  var receiveOnly = $form.data('sync') === 'receive-only';

  var fields = {
    address: $('#customer-address'),
    name: $('#customer-name'),
    contact: $('#customer-contact')
  };
  Object.keys(fields).forEach(function(key) {
    fields[key].prop('disabled', true);
  });

  // Configure contact field for 11 digits (09XXXXXXXXX) and numeric-only input
  if (fields.contact.length) {
    fields.contact.attr({
      'maxlength': '11',
      'pattern': '09[0-9]{9}',
      'inputmode': 'numeric',
      'placeholder': '09123456789',
      'title': 'Must be exactly 11 digits starting with 09'
    });

    fields.contact.on('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }

  function profileRequest(method, details) {
    var options = {
      method: method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    };
    if (details) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(details);
    }
    return fetch('customer-profile.php', options).then(function(response) {
      return response.json().then(function(result) {
        if (!response.ok) throw new Error(result.error || 'Could not load customer details.');
        return result;
      });
    });
  }

  profileRequest('GET').then(function(profile) {
    Object.keys(fields).forEach(function(key) {
      fields[key].val(profile[key] || '');
      fields[key].prop('disabled', false);
      fields[key].prop('readonly', receiveOnly);
    });
    resolveProfile(profile);
  }).catch(function(error) {
    console.error('Could not load customer details.', error);
    rejectProfile(error);
  });

  if (receiveOnly) return;

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

    // Strict 11-digit format check starting with 09
    var contactPattern = /^09[0-9]{9}$/;
    if (!contactPattern.test(details.contact)) {
      alert('Contact number must be exactly 11 digits starting with 09 (e.g. 09123456789).');
      fields.contact.focus();
      return;
    }

    if (window.location.pathname.toLowerCase().endsWith('/customer-orders.html')) {
      profileRequest('POST', details).then(function() {
        window.location.href = 'Order.html';
      }).catch(function(error) {
        alert(error.message);
      });
      return;
    }

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
}