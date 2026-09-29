$(document).ready(function(){
  $('#customer-details-form').on('submit', function(e){
    e.preventDefault();

    var $inputs = $(this).find('input');
    var $button = $(this).find('button[type="submit"]');

    if ($button.text().trim() === 'Edit') {
      $inputs.prop('readonly', false).removeClass('locked-field');
      $button.text('Submit details').removeClass('btn-edit').addClass('btn-confirm');
      return;
    }

    var details = {
      address: $('#customer-address').val().trim(),
      name: $('#customer-name').val().trim(),
      contact: $('#customer-contact').val().trim()
    };

    if (!details.address || !details.name || !details.contact) {
      alert('Please fill out all fields first.');
      return;
    }

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
