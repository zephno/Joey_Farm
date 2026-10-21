$(document).ready(function(){
  $('.header').height($(window).height());

  // Login modal talks to login.php (checks the users table, starts a PHP session).
  // Uses fetch() because Index.html loads the slim jQuery build, which has no $.ajax.
  $('#loginForm').on('submit', function(e) {
    e.preventDefault();

    var $form = $(this);
    var $btn = $form.find('button[type="submit"]').prop('disabled', true);
    $form.find('.login-error').remove();

    function showError(msg) {
      $form.prepend($('<div class="alert alert-danger login-error py-2"></div>').text(msg));
      $btn.prop('disabled', false);
    }

    fetch('login.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        email: $('#loginEmail').val().trim(),
        password: $('#loginPassword').val()
      })
    }).then(function(r) {
      return r.json().then(function(j) { return { ok: r.ok, body: j }; });
    }).then(function(res) {
      if (res.ok && res.body.redirect) {
        window.location.href = res.body.redirect;
      } else {
        showError(res.body.error || 'Login failed.');
      }
    }).catch(function() {
      showError('Could not reach the server. Is Apache/PHP running?');
    });
  });

  // Sign-up link in the modal goes to the real registration page.
  $('#loginModal .modal-footer a:contains("Sign up")').attr('href', 'register.php');

  if (new URLSearchParams(window.location.search).has('login') && $('#loginModal').length) {
    $('#loginModal').modal('show');
  }

  var $contactForm = $('#contactForm');
  if ($contactForm.length) {
    var $contactFields = $contactForm.find('.contact-field');
    var $contactStatus = $('#contactStatus');
    var contactSession = fetch('session.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function(response) {
      if (!response.ok) throw new Error('Could not check your login.');
      return response.json();
    }).then(function(session) {
      if (session.loggedIn && session.role === 'customer') {
        $('#contactName').val(session.name);
        $('#contactEmail').val(session.email);
        $contactFields.prop('readonly', false);
        $('#contactSendButton').prop('disabled', false);
        return true;
      }
      return false;
    }).catch(function() {
      $contactStatus.addClass('alert alert-danger')
        .text('Could not check your login. Please refresh the page and try again.');
      return false;
    });

    function promptContactLogin() {
      contactSession.then(function(isCustomer) {
        if (!isCustomer) {
          if ($('#loginModal').length) {
            if (!$('#loginModal').hasClass('show')) $('#loginModal').modal('show');
          } else {
            window.location.href = 'Index.html?login=1';
          }
        }
      });
    }

    $contactFields.on('click focus', function(event) {
      if ($(this).prop('readonly')) {
        event.preventDefault();
        promptContactLogin();
      }
    });

    $contactForm.on('submit', function(event) {
      event.preventDefault();
      contactSession.then(function(isCustomer) {
        if (!isCustomer) {
          promptContactLogin();
          return;
        }

        var $button = $('#contactSendButton').prop('disabled', true);
        $contactStatus.removeClass('alert alert-danger alert-success').text('Sending…');
        fetch('contact_messages.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create',
            name: $('#contactName').val(),
            email: $('#contactEmail').val(),
            message: $('#contactMessage').val()
          })
        }).then(function(response) {
          return response.json().then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Could not send your message.');
            return data;
          });
        }).then(function() {
          $('#contactMessage').val('');
          $contactStatus.addClass('alert alert-success').text('Your message has been sent.');
        }).catch(function(error) {
          $contactStatus.addClass('alert alert-danger')
            .text(error.message || 'Could not send your message.');
        }).then(function() {
          $button.prop('disabled', false);
        });
      });
    });
  }

  $(window).scroll(function() {
    if ($(window).scrollTop() >= 56) {
      $('.navbar').addClass('navbar-scrolled');
    } else {
      $('.navbar').removeClass('navbar-scrolled');
    }
  });
});
