(() => {
  const JINA = 'https://r.jina.ai/';
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $('form'), url: $('url'), status: $('status'), article: $('article'),
    raw: $('rawView'), empty: $('empty'), rawToggle: $('raw'),
    font: $('font'), size: $('size'), width: $('width'), theme: $('theme'),
  };
  const root = document.documentElement;
  const DEFAULTS = { font: 'serif', size: '19', width: '680', theme: 'auto' };
  let lastMarkdown = '';

  // ---- preferences (localStorage may be unavailable, so never depend on it)
  const store = {
    get(k) { try { return localStorage.getItem('readable.' + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('readable.' + k, v); } catch { /* ignore */ } },
  };

  function applyPrefs() {
    root.dataset.font = els.font.value;
    root.dataset.theme = els.theme.value;
    root.style.setProperty('--size', els.size.value + 'px');
    root.style.setProperty('--width', els.width.value + 'px');
  }

  for (const key of ['font', 'size', 'width', 'theme']) {
    els[key].value = store.get(key) ?? DEFAULTS[key];
    els[key].addEventListener('input', () => {
      store.set(key, els[key].value);
      applyPrefs();
    });
  }
  els.rawToggle.addEventListener('change', () => render(lastMarkdown));
  applyPrefs();

  // ---- helpers
  function normalizeUrl(input) {
    let s = input.trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      return /^https?:$/.test(u.protocol) ? u.href : null;
    } catch { return null; }
  }

  function setStatus(msg, isError = false) {
    els.status.textContent = msg;
    els.status.classList.toggle('error', isError);
  }

  // Jina prepends "Title: ...\nURL Source: ...\n...\nMarkdown Content:\n"
  function parseJina(text) {
    const marker = 'Markdown Content:';
    const i = text.indexOf(marker);
    const head = i === -1 ? '' : text.slice(0, i);
    const body = i === -1 ? text : text.slice(i + marker.length).replace(/^\s*\n/, '');
    const field = (name) => (head.match(new RegExp('^' + name + ':\\s*(.*)$', 'm')) || [])[1] || '';
    return { title: field('Title'), source: field('URL Source'), published: field('Published Time'), body };
  }

  function render(markdown) {
    els.empty.hidden = !!markdown;
    if (!markdown) { els.article.hidden = els.raw.hidden = true; return; }
    const showRaw = els.rawToggle.checked;
    els.raw.hidden = !showRaw;
    els.article.hidden = showRaw;
    if (showRaw) { els.raw.textContent = markdown; return; }

    const { title, source, published, body } = parseJina(markdown);
    const html = DOMPurify.sanitize(marked.parse(body, { gfm: true, breaks: false }), {
      USE_PROFILES: { html: true },
    });
    els.article.innerHTML = html;

    // open article links in a new tab, safely
    for (const a of els.article.querySelectorAll('a[href]')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    // lazy images; drop broken ones rather than show broken-image icons
    for (const img of els.article.querySelectorAll('img')) {
      img.loading = 'lazy';
      img.addEventListener('error', () => img.remove());
    }

    if (source || published) {
      const meta = document.createElement('p');
      meta.className = 'meta';
      if (source) {
        const a = document.createElement('a');
        a.href = source; a.target = '_blank'; a.rel = 'noopener noreferrer';
        try { a.textContent = new URL(source).hostname.replace(/^www\./, ''); } catch { a.textContent = source; }
        meta.append(a);
      }
      if (published) meta.append((source ? ' · ' : '') + published);
      let h1 = els.article.querySelector('h1');
      if (!h1 && title) {
        h1 = document.createElement('h1');
        h1.textContent = title;
        els.article.prepend(h1);
      }
      if (h1) h1.after(meta);
      else els.article.prepend(meta);
    }
    document.title = title ? `${title} · Readable` : 'Readable';
  }

  // ---- main flow
  let controller;
  async function load(rawInput, { pushState = true } = {}) {
    const target = normalizeUrl(rawInput);
    if (!target) { setStatus('That doesn’t look like a valid http(s) URL.', true); return; }

    controller?.abort();
    controller = new AbortController();
    els.url.value = target;
    setStatus('Fetching…');
    if (pushState) {
      const next = new URL(location.href);
      next.searchParams.set('u', target);
      history.pushState({ u: target }, '', next);
    }

    try {
      const res = await fetch(JINA + target, { signal: controller.signal });
      if (!res.ok) throw new Error(`Jina Reader returned ${res.status} ${res.statusText}`.trim());
      lastMarkdown = await res.text();
      if (!lastMarkdown.trim()) throw new Error('Jina Reader returned an empty page.');
      render(lastMarkdown);
      setStatus('');
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus(err instanceof TypeError
        ? 'Network or CORS error while reaching r.jina.ai.'
        : err.message, true);
    }
  }

  els.form.addEventListener('submit', (e) => { e.preventDefault(); load(els.url.value); });
  addEventListener('popstate', () => {
    const u = new URLSearchParams(location.search).get('u');
    if (u) load(u, { pushState: false });
    else { lastMarkdown = ''; els.url.value = ''; setStatus(''); render(''); document.title = 'Readable'; }
  });

  const initial = new URLSearchParams(location.search).get('u');
  if (initial) load(initial, { pushState: false });
})();
