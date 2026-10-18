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

  // Index.html is shared by guests and signed-in customers. Keep the customer
  // session visible in its navigation instead of showing the guest Login link.
  if (document.getElementById('main-navigation-menu')) {
    fetch('session.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Could not check the login session.');
        return response.json();
      })
      .then(function (session) {
        if (!session.loggedIn || session.role !== 'customer') return;

        var nav = document.getElementById('main-navigation-menu');
        var loginItem = nav.querySelector('.nav-login-btn');
        if (loginItem) loginItem.closest('.nav-item').remove();

        function addNavItem(label, href, className, title) {
          var item = document.createElement('li');
          item.className = 'nav-item';
          var link = document.createElement('a');
          link.className = className;
          link.href = href;
          link.textContent = label;
          if (title) link.title = title;
          item.appendChild(link);
          nav.appendChild(item);
        }

        addNavItem('Profile', 'customer-orders.html', 'nav-link nav-outline-text');
        addNavItem('Order', 'Order.html', 'nav-link nav-outline-text');
        addNavItem('Logout', 'logout.php', 'btn nav-login-btn');
        addNavItem('🛒', 'cart.html', 'cart-icon-circle text-dark', 'Cart');

        var orderButton = document.getElementById('order-now-button');
        if (orderButton) {
          orderButton.removeAttribute('data-toggle');
          orderButton.removeAttribute('data-target');
          orderButton.addEventListener('click', function () {
            window.location.href = 'Order.html';
          });
        }
      })
      .catch(function (error) {
        console.error(error);
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