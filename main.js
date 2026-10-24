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
    // Every message needs a photo. If the page does not already have the file field,
    // add it just above the Send button (Homepage.html can also contain it directly).
    if (!$('#contactImage').length) {
      $('<div class="form-group">' +
          '<label for="contactImage">Photo (required)</label>' +
          '<input type="file" class="form-control-file contact-field" id="contactImage" ' +
                 'accept="image/jpeg,image/png,image/webp" readonly required>' +
          '<small class="form-text text-muted">JPG, PNG or WebP. Large photos are shrunk automatically.</small>' +
        '</div>').insertBefore('#contactSendButton');
    }

    var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;     // the server accepts up to 2 MB
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

    // Photos from phones are often several MB. Anything big is shrunk in the browser
    // (longest side 1600 px, JPEG) so it fits the server's 2 MB limit.
    function preparePhoto(file) {
      return new Promise(function(resolve, reject) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
          reject(new Error('Please attach a JPG, PNG or WebP photo.'));
          return;
        }
        if (file.size <= 1.5 * 1024 * 1024) { resolve(file); return; }

        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
          var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function(blob) {
            URL.revokeObjectURL(url);
            if (blob && blob.size <= MAX_UPLOAD_BYTES) resolve(blob);
            else reject(new Error('That photo is too large. Please choose a smaller one.'));
          }, 'image/jpeg', 0.85);
        };
        img.onerror = function() {
          URL.revokeObjectURL(url);
          reject(new Error('Could not read that photo. Please choose another one.'));
        };
        img.src = url;
      });
    }

    $contactForm.on('submit', function(event) {
      event.preventDefault();
      contactSession.then(function(isCustomer) {
        if (!isCustomer) {
          promptContactLogin();
          return;
        }

        var $status = $contactStatus.removeClass('alert alert-danger alert-success');
        var photo = $('#contactImage')[0].files[0];
        if (!photo) {
          $status.addClass('alert alert-danger').text('Please attach a photo to your message.');
          return;
        }

        var $button = $('#contactSendButton').prop('disabled', true);
        $status.text('Sending…');

        preparePhoto(photo).then(function(blob) {
          var form = new FormData();
          form.append('action', 'create');
          form.append('name', $('#contactName').val());
          form.append('email', $('#contactEmail').val());
          form.append('message', $('#contactMessage').val());
          form.append('image', blob, blob === photo ? photo.name : 'photo.jpg');

          // No Content-Type header here: the browser adds the multipart boundary itself.
          return fetch('contact_messages.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: form
          });
        }).then(function(response) {
          return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Could not send your message.');
            return data;
          });
        }).then(function() {
          $('#contactMessage').val('');
          $('#contactImage').val('');
          $status.addClass('alert alert-success').text('Your message has been sent.');
        }).catch(function(error) {
          $status.addClass('alert alert-danger')
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