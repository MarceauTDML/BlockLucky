(function () {
  var root = document.documentElement;
  var body = document.body;

  var menuButton = document.querySelector('.menu-button');
  var backdrop = document.querySelector('.backdrop');
  var setMenu = function (open) {
    body.classList.toggle('nav-open', open);
    if (menuButton) menuButton.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.hidden = !open;
  };
  if (menuButton) {
    menuButton.addEventListener('click', function () {
      setMenu(!body.classList.contains('nav-open'));
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', function () {
      setMenu(false);
    });
  }

  document.querySelectorAll('.nav-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var item = button.closest('li');
      var open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });

  var current = document.querySelector('.sidebar a[aria-current="page"]');
  if (current) current.scrollIntoView({ block: 'center' });

  var renderDiagrams = function () {
    if (!window.mermaid) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    var nodes = document.querySelectorAll('pre.mermaid');
    nodes.forEach(function (node) {
      if (!node.dataset.source) node.dataset.source = node.textContent;
      node.removeAttribute('data-processed');
      node.textContent = node.dataset.source;
    });
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark ? 'dark' : 'neutral',
      fontFamily: 'Inter, system-ui, sans-serif',
      flowchart: { htmlLabels: false, curve: 'basis' },
      sequence: { useMaxWidth: true },
    });
    window.mermaid.run({ nodes: nodes }).catch(function () {});
  };
  renderDiagrams();

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        window.localStorage.setItem('bl-doc-theme', next);
      } catch (error) {
        return renderDiagrams();
      }
      renderDiagrams();
    });
  }

  document.querySelectorAll('.code-block').forEach(function (block) {
    var head = block.querySelector('.code-head');
    var code = block.querySelector('code');
    if (!head || !code || !navigator.clipboard) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = 'Copier';
    button.addEventListener('click', function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        button.textContent = 'Copié';
        setTimeout(function () {
          button.textContent = 'Copier';
        }, 1600);
      });
    });
    head.appendChild(button);
  });

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (link) {
      byId[decodeURIComponent(link.getAttribute('href').slice(1))] = link;
    });
    var visible = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting;
        });
        var headings = document.querySelectorAll('.markdown h2[id], .markdown h3[id]');
        var active = null;
        for (var i = 0; i < headings.length; i++) {
          if (visible[headings[i].id]) {
            active = headings[i].id;
            break;
          }
        }
        if (!active) return;
        tocLinks.forEach(function (link) {
          link.classList.toggle('active', link === byId[active]);
        });
      },
      { rootMargin: '-70px 0px -60% 0px' }
    );
    document.querySelectorAll('.markdown h2[id], .markdown h3[id]').forEach(function (heading) {
      observer.observe(heading);
    });
  }
})();
