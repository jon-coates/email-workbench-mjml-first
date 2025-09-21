(async function () {
    const listEl = document.getElementById('list');
    const frame = document.getElementById('frame');
    const subjectEl = document.getElementById('subject');
    const btns = Array.from(document.querySelectorAll('.devices button'));
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const themeText = themeToggle.querySelector('.theme-text');
  
    // Load manifest + optional config for "From" and "To" lines
    const [manRes, cfgRes] = await Promise.all([
      fetch('/previews/manifest.json', { cache: 'no-store' }),
      fetch('/previews/config.json', { cache: 'no-store' }).catch(() => null)
    ]);
    if (!manRes.ok) {
      listEl.innerHTML = '<p style="color:#fca5a5">Manifest not found. Run <code>npm run build</code> first.</p>';
      return;
    }
    const { grouped } = await manRes.json();
  
    // Sidebar From/To labels
    let cfg = { from: 'CarExpert Exchange', to: 'you@example.com' };
    if (cfgRes && cfgRes.ok) {
      try { cfg = { ...cfg, ...(await cfgRes.json()) }; } catch { /* ignore */ }
    }
  
    let first = null;
  
    // Build sidebar: From / To / Subject (no preheader)
    Object.keys(grouped).sort().forEach(tpl => {
      const group = document.createElement('div');
      group.className = 'group';
      const h = document.createElement('h2');
      h.textContent = tpl.replace(/[-_]+/g, ' ').toUpperCase();
      group.appendChild(h);
  
      grouped[tpl].forEach(it => {
        const subject = it.subject || `${tpl} — ${it.variant}`;
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'item';
        a.dataset.url = it.url;
        a.dataset.subject = subject;
        a.dataset.preheader = it.preheader || ''; // may be empty; we’ll display "none" if so
  
        a.innerHTML = `
          <div class="from">${escapeHtml(cfg.from)}</div>
          <div class="to">To: ${escapeHtml(cfg.to)}</div>
          <div class="subject">${escapeHtml(subject)}</div>
        `;
  
        a.onclick = (e) => {
          e.preventDefault();
          select(it.url, subject, it.preheader || '');
          document.querySelectorAll('.item').forEach(el => el.classList.remove('active'));
          a.classList.add('active');
        };
  
        if (!first) first = a;
        group.appendChild(a);
      });
  
      listEl.appendChild(group);
    });
  
    function select(url, subject, preheader) {
      frame.src = url;
      const fromText = escapeHtml(cfg.from);
      const subjText = escapeHtml(subject || '');
      const preText = escapeHtml(preheader && preheader.trim() ? preheader : 'none');
  
      subjectEl.innerHTML = `
        <div class="hdr-from">${fromText}</div>
        <div class="hdr-subject">${subjText}</div>
        <div class="hdr-preheader">Preheader: ${preText}</div>
      `;
    }
  
    // Default selection
    if (first) {
      first.classList.add('active');
      select(first.dataset.url, first.dataset.subject, first.dataset.preheader);
    }
  
    // Device width buttons
    function setWidth(w) {
      btns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (w === '100%') {
        frame.style.width = '100%';
        frame.classList.remove('frame-fixed');
      } else {
        frame.style.width = w + 'px';
        frame.classList.add('frame-fixed');
      }
    }
    btns.forEach(b => b.addEventListener('click', function () {
      setWidth.call(this, this.dataset.w);
    }));
    (btns.find(b => b.dataset.w === '100%') || btns[0]).click();
  
    // Theme switching functionality
    function initTheme() {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeUI(savedTheme);
    }

    function updateThemeUI(theme) {
      if (theme === 'light') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
      } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
      }
    }

    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
    }

    // Initialize theme and add event listener
    initTheme();
    themeToggle.addEventListener('click', toggleTheme);

    // Basic HTML escaper for safety
    function escapeHtml(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  })();
  