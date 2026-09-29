$(document).ready(function(){
  $('.header').height($(window).height());

  $('#loginForm').on('submit', function(e) {
    e.preventDefault(); 

    var email = $('#loginEmail').val().trim().toLowerCase();

    var STAFF_EMAILS = ['staff@joeysfarm.com'];

    $('#loginModal').modal('hide');
    $(this).trigger('reset');

    if (STAFF_EMAILS.indexOf(email) !== -1) {
      window.location.href = 'staff.html';
    } else {
      window.location.href = 'customer-orders.html';
    }
  });

  if (new URLSearchParams(window.location.search).has('login') && $('#loginModal').length) {
    $('#loginModal').modal('show');
  }

  $(window).scroll(function() {
    if ($(window).scrollTop() >= 56) {
      $('.navbar').addClass('navbar-scrolled');
    } else {
      $('.navbar').removeClass('navbar-scrolled');
    }
  });
});
