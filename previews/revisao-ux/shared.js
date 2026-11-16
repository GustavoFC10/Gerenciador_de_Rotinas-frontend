/* global window, document, localStorage, setTimeout, clearTimeout */
;(() => {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5"/>',
    building:
      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/>',
    file: '<path d="M14 3H5v18h14V8Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    settings:
      '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    'arrow-left': '<path d="m10 5-7 7 7 7M3 12h18"/>',
    'arrow-right': '<path d="m14 5 7 7-7 7M21 12H3"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  }
  const esc = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  const icon = (name) =>
    `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.file}</svg>`
  const defaults = {
    Rotinas: [
      { label: 'Planilha', icon: 'grid', href: 'base-visual.html' },
      {
        label: 'Rotinas',
        icon: 'refresh',
        href: 'catalogo-rotinas.html',
        active: true,
      },
    ],
    Processos: [
      {
        label: 'Processos',
        icon: 'list',
        href: 'processos.html',
        active: true,
      },
    ],
    Honorários: [
      { label: 'Painel', icon: 'home', href: 'painel-honorarios.html' },
      { label: 'Orçamentos', icon: 'file', href: 'orcamentos-honorarios.html' },
      {
        label: 'Clientes',
        icon: 'building',
        href: 'clientes-honorarios.html',
      },
      { label: 'Parâmetros', icon: 'settings', href: 'parametros.html' },
    ],
    Empresas: [
      {
        label: 'Empresas',
        icon: 'building',
        href: 'empresas.html',
        active: true,
      },
    ],
    Equipe: [
      { label: 'Pessoas', icon: 'users', href: 'equipe.html', active: true },
    ],
  }
  try {
    document.documentElement.dataset.theme =
      localStorage.getItem('jaral-ux-preview-theme') || 'light'
  } catch {
    /* File previews may deny storage. */
  }
  function mount({
    id,
    title,
    module = 'Rotinas',
    nav,
    content = '',
    actions = '',
    notes = [],
    before = '',
  }) {
    const host =
      document.getElementById('preview') ||
      document.body.appendChild(document.createElement('div'))
    const items = nav || defaults[module] || []
    const notesHtml = Array.isArray(notes)
      ? `<ul>${notes.map((note) => `<li>${note}</li>`).join('')}</ul>`
      : `<p>${notes}</p>`
    const beforeLinks = (Array.isArray(before) ? before : [before])
      .filter(Boolean)
      .map(
        (url, i) =>
          `<a href="${esc(url)}" target="_blank" rel="noopener">Atual${i ? ` ${i + 1}` : ''} ↗</a>`,
      )
      .join('')
    host.innerHTML = `<a class="skip-link" href="#main">Ir para o conteúdo</a><div class="review-bar"><a href="index.html">← Propostas</a><strong>${esc(id)}</strong><span class="review-title">${esc(title)}</span><div class="review-tools">${beforeLinks}<button type="button" id="review-notes-toggle" aria-expanded="false" aria-controls="review-notes">O que avaliar</button><button type="button" id="review-theme" aria-label="Alternar tema da prévia">Tema escuro</button></div></div><aside class="review-notes" id="review-notes" hidden><h2>${esc(id)} · ${esc(title)}</h2>${notesHtml}<p class="muted">Prévia local com dados fictícios. Nenhuma alteração é enviada ao sistema.</p><button class="button small" type="button" id="review-notes-close">Fechar orientações</button></aside><div class="app-shell"><aside class="sidebar" aria-label="Navegação do módulo"><div class="brand"><span class="brand-logo"><img src="../../src/assets/jaralcon-report-logo.png" alt="" /></span><div><strong>Jaralcon</strong><span class="brand-caption">Organização Controle</span></div></div><div class="sidebar-body"><a class="back-modules" href="navegacao.html#hub">${icon('arrow-left')} Voltar aos módulos</a><p class="module-caption">${esc(module)}</p><nav>${items.map((item) => `<a class="nav-item ${item.active ? 'active' : ''}" href="${esc(item.href || '#main')}" ${item.active ? 'aria-current="page"' : ''}>${icon(item.icon || 'file')}${esc(item.label)}</a>`).join('')}</nav></div><div class="sidebar-footer"><span class="avatar">MC</span><div>Mariana Costa<small>Jaralcon</small></div></div></aside><div class="workspace"><header class="topbar"><span class="organization">Jaralcon · Escritório contábil</span><div class="topbar-right"><span>Ambiente de trabalho</span><span class="avatar" aria-label="Mariana Costa">MC</span></div></header><main class="main" id="main" tabindex="-1"><div class="breadcrumb"><span>${esc(module)}</span><span aria-hidden="true">/</span><span>${esc(title)}</span></div><header class="page-heading"><h1>${esc(title)}</h1><div class="actions">${actions}</div></header>${content}</main></div></div><div id="review-toast" role="status" aria-live="polite"></div>`
    const noteToggle = document.getElementById('review-notes-toggle')
    const notePanel = document.getElementById('review-notes')
    noteToggle.addEventListener('click', () => {
      notePanel.hidden = !notePanel.hidden
      noteToggle.setAttribute('aria-expanded', String(!notePanel.hidden))
    })
    document
      .getElementById('review-notes-close')
      .addEventListener('click', () => {
        notePanel.hidden = true
        noteToggle.setAttribute('aria-expanded', 'false')
        noteToggle.focus()
      })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !notePanel.hidden) {
        notePanel.hidden = true
        noteToggle.setAttribute('aria-expanded', 'false')
        noteToggle.focus()
      }
    })
    const theme = document.getElementById('review-theme')
    const setThemeLabel = () => {
      theme.textContent =
        document.documentElement.dataset.theme === 'dark'
          ? 'Tema claro'
          : 'Tema escuro'
    }
    setThemeLabel()
    theme.addEventListener('click', () => {
      const next =
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem('jaral-ux-preview-theme', next)
      } catch {
        /* Preview works without storage. */
      }
      setThemeLabel()
    })
    return document.getElementById('main')
  }
  let toastTimeout
  function toast(message) {
    const container =
      document.getElementById('review-toast') ||
      document.body.appendChild(document.createElement('div'))
    container.className = 'toast'
    container.setAttribute('role', 'status')
    container.textContent = message
    clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => {
      container.className = ''
      container.textContent = ''
    }, 5000)
  }
  function confirm({
    title = 'Descartar alterações?',
    body = 'As alterações ainda não foram salvas.',
    confirmLabel = 'Descartar alterações',
  } = {}) {
    return new Promise((resolve) => {
      const previous = document.activeElement
      const dialog = document.createElement('dialog')
      dialog.className = 'dialog'
      dialog.setAttribute('aria-labelledby', 'review-confirm-title')
      dialog.innerHTML = `<div class="dialog-head"><h2 id="review-confirm-title">${esc(title)}</h2></div><div class="dialog-body"><p>${esc(body)}</p></div><div class="dialog-footer"><button class="button" data-choice="cancel" autofocus>Continuar editando</button><button class="button primary danger" data-choice="confirm">${esc(confirmLabel)}</button></div>`
      document.body.append(dialog)
      const finish = (choice) => {
        dialog.close()
        dialog.remove()
        previous?.focus()
        resolve(choice)
      }
      dialog
        .querySelector('[data-choice="cancel"]')
        .addEventListener('click', () => finish(false))
      dialog
        .querySelector('[data-choice="confirm"]')
        .addEventListener('click', () => finish(true))
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        finish(false)
      })
      dialog.showModal()
    })
  }
  const rowBindings = new WeakMap()
  function rows(container, { selector, onOpen }) {
    let bindings = rowBindings.get(container)
    if (!bindings) {
      bindings = new Map()
      rowBindings.set(container, bindings)
    }
    let binding = bindings.get(selector)
    if (!binding) {
      binding = { onOpen }
      bindings.set(selector, binding)
      const interactive =
        'a,button,input,select,textarea,summary,[contenteditable="true"],[data-row-action]'
      const findRow = (event) => {
        const row = event.target.closest(selector)
        if (!row || !container.contains(row)) return null
        const action = event.target.closest(interactive)
        return action && action !== row ? null : row
      }
      container.addEventListener('click', (event) => {
        const row = findRow(event)
        if (!row || window.getSelection()?.toString().trim()) return
        binding.onOpen(row, event)
      })
      container.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        const row = findRow(event)
        if (!row || event.repeat) return
        event.preventDefault()
        binding.onOpen(row, event)
      })
    } else binding.onOpen = onOpen
    container.querySelectorAll(selector).forEach((row) => {
      row.tabIndex = 0
      row.dataset.clickableRow = ''
      row.setAttribute('aria-keyshortcuts', 'Enter Space')
    })
  }
  window.Review = { mount, icon, toast, confirm, esc, rows }
})()
