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
});
