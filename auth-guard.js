// Add to the static pages that need a login: <script src="auth-guard.js" data-role="staff"></script>
// (data-role is "staff" or "customer"). Sends visitors who are not logged in back to the login modal.
// Static-page visibility is client-side; API endpoints must enforce authorization themselves.
(function () {
  var role = document.currentScript.getAttribute('data-role');
  document.documentElement.style.visibility = 'hidden';

  fetch('session.php', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (!s.loggedIn) { window.location.replace('Index.html?login=1'); return; }
      if (role && s.role !== role) {
        window.location.replace(s.role === 'staff' ? 'staff.html' : 'customer-orders.html');
        return;
      }
      document.documentElement.style.visibility = '';
    })
    .catch(function () { window.location.replace('Index.html?login=1'); });
})();