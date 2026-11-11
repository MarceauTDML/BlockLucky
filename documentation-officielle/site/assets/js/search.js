(function () {
  var input = document.getElementById('recherche');
  var panel = document.getElementById('resultats');
  if (!input || !panel) return;
  var rootPrefix = document.body.getAttribute('data-root') || '';
  var index = null;
  var loading = null;
  var selected = -1;

  var normalize = function (value) {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  };

  var load = function () {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(rootPrefix + 'search-index.json')
        .then(function (response) {
          return response.json();
        })
        .then(function (entries) {
          index = entries.map(function (entry) {
            return {
              entry: entry,
              p: normalize(entry.p),
              s: normalize(entry.s),
              t: normalize(entry.t),
            };
          });
          return index;
        });
    }
    return loading;
  };

  var escapeHtml = function (value) {
    return value.replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };

  var excerpt = function (text, terms) {
    var normalized = normalize(text);
    var position = -1;
    for (var i = 0; i < terms.length && position < 0; i++) position = normalized.indexOf(terms[i]);
    var start = Math.max(0, position - 60);
    var snippet = (start > 0 ? '…' : '') + text.slice(start, start + 180) + (start + 180 < text.length ? '…' : '');
    var html = escapeHtml(snippet);
    terms.forEach(function (term) {
      if (term.length < 2) return;
      var normalizedHtml = normalize(html);
      var result = '';
      var cursor = 0;
      var found = normalizedHtml.indexOf(term, cursor);
      while (found >= 0) {
        result += html.slice(cursor, found) + '<mark>' + html.slice(found, found + term.length) + '</mark>';
        cursor = found + term.length;
        found = normalizedHtml.indexOf(term, cursor);
      }
      html = result + html.slice(cursor);
    });
    return html;
  };

  var search = function (query) {
    var terms = normalize(query)
      .split(/\s+/)
      .filter(function (term) {
        return term.length > 0;
      });
    if (!terms.length) return [];
    var results = [];
    index.forEach(function (item) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var inTitle = item.p.indexOf(term) >= 0;
        var inSection = item.s.indexOf(term) >= 0;
        var inText = item.t.indexOf(term) >= 0;
        if (!inTitle && !inSection && !inText) return;
        score += (inTitle ? 8 : 0) + (inSection ? 5 : 0) + (inText ? 1 : 0);
      }
      if (!item.entry.s) score += 2;
      results.push({ item: item, score: score });
    });
    results.sort(function (a, b) {
      return b.score - a.score;
    });
    return results.slice(0, 12).map(function (result) {
      return { entry: result.item.entry, terms: terms };
    });
  };

  var render = function (results, query) {
    selected = -1;
    if (!query.trim()) {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    if (!results.length) {
      panel.innerHTML = '<p class="search-empty">Aucun résultat pour « ' + escapeHtml(query) + ' ».</p>';
    } else {
      panel.innerHTML = results
        .map(function (result, position) {
          var entry = result.entry;
          var path = [entry.g, entry.p].filter(Boolean).join(' / ');
          return (
            '<a class="search-result" role="option" id="resultat-' + position + '" href="' + rootPrefix + entry.u + '">' +
            '<span class="search-result-path">' + escapeHtml(path) + '</span>' +
            '<span class="search-result-title">' + escapeHtml(entry.s || entry.p) + '</span>' +
            '<span class="search-result-excerpt">' + excerpt(entry.t, result.terms) + '</span>' +
            '</a>'
          );
        })
        .join('');
    }
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  var update = function () {
    var query = input.value;
    load().then(function () {
      if (input.value === query) render(search(query), query);
    });
  };

  var move = function (delta) {
    var items = panel.querySelectorAll('.search-result');
    if (!items.length) return;
    selected = (selected + delta + items.length) % items.length;
    items.forEach(function (item, position) {
      item.setAttribute('aria-selected', String(position === selected));
    });
    items[selected].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', items[selected].id);
  };

  input.addEventListener('focus', load);
  input.addEventListener('input', update);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter') {
      var items = panel.querySelectorAll('.search-result');
      var target = items[selected >= 0 ? selected : 0];
      if (target) window.location.href = target.href;
    } else if (event.key === 'Escape') {
      input.value = '';
      render([], '');
      input.blur();
    }
  });

  document.addEventListener('keydown', function (event) {
    var typing = /input|textarea|select/i.test(document.activeElement && document.activeElement.tagName);
    if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  document.addEventListener('click', function (event) {
    if (!panel.contains(event.target) && event.target !== input) {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }
  });
})();
