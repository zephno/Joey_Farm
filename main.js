$(document).ready(function(){
  $('.header').height($(window).height());

  $('#loginForm').on('submit', function(e) {
    e.preventDefault(); 

    var email = $('#loginEmail').val();
    var password = $('#loginPassword').val();

    console.log('Login submitted:', { email: email, password: password });
    alert('Logged in successfully as ' + email);

    $('#loginModal').modal('hide');

    $(this).trigger('reset');
  });

  $(window).scroll(function() {
    if ($(window).scrollTop() >= 56) {
      $('.navbar').addClass('navbar-scrolled');
    } else {
      $('.navbar').removeClass('navbar-scrolled');
    }
  });
});

