(function () {
  var stored = null;
  try {
    stored = window.localStorage.getItem('bl-doc-theme');
  } catch (error) {
    stored = null;
  }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light');
})();
