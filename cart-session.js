(function () {
  var ready = fetch('session.php', {
    credentials: 'same-origin',
    cache: 'no-store'
  }).then(function (response) {
    if (!response.ok) throw new Error('Could not verify the customer session.');
    return response.json();
  });

  window.JoeysFarmCartSession = {
    ready: ready,
    cartKey: function (user) {
      return 'joeysFarmCart:' + String(user.id);
    },
    excludedKey: function (user) {
      return 'joeysFarmCartExcluded:' + String(user.id);
    }
  };
})();
