/* Protótipo local: dados fictícios, sem API, persistência ou envio de e-mail. */
/* global document, navigator */
;(() => {
  'use strict'

  const sectorNames = {
    com: 'Diretoria',
    fin: 'Financeiro',
    reg: 'Regularidade',
  }
  const members = [
    {
      id: 'demo-marina',
      name: 'Marina Duarte',
      email: 'marina@example.test',
      sectors: ['com', 'fin'],
    },
    {
      id: 'demo-caio',
      name: 'Caio Nunes',
      email: 'caio@example.test',
      sectors: ['fin'],
    },
    {
      id: 'demo-beatriz',
      name: 'Beatriz Lima',
      email: 'beatriz@example.test',
      sectors: ['reg'],
    },
    {
      id: 'demo-joana',
      name: 'Joana Sales',
      email: 'joana@example.test',
      sectors: ['com'],
    },
    {
      id: 'demo-lucas',
      name: 'Lucas Alves',
      email: 'lucas@example.test',
      sectors: ['fin', 'reg'],
    },
  ]
  const alerts = [
    {
      id: 'demo-leggacy',
      company: 'Horizonte Estúdio · exemplo',
      code: 'ABE-DEMO-01',
      kind: 'Retorno da Leggacy',
      type: 'Abertura',
      typeClass: '',
      defaults: ['com', 'fin'],
      subject:
        '[SIMULAÇÃO] Acompanhamento do retorno da Leggacy · Horizonte Estúdio',
      body: 'Olá, equipe.\n\nEste é um aviso fictício de acompanhamento do retorno da Leggacy no processo ABE-DEMO-01.\n\nVerifiquem a situação do processo e registrem o retorno quando ele ocorrer.\n\nMensagem apenas para demonstração. Nenhum e-mail foi enviado.',
    },
    {
      id: 'demo-overdue',
      company: 'Canto Verde Serviços · exemplo',
      code: 'ALT-DEMO-02',
      kind: 'Processo em atraso',
      type: 'Alteração',
      typeClass: 'alteracao',
      defaults: ['com', 'fin', 'reg'],
      subject: '[SIMULAÇÃO] Acompanhamento do prazo · Canto Verde Serviços',
      body: 'Olá, equipe.\n\nEste é um aviso fictício sobre o prazo do processo ALT-DEMO-02.\n\nConfiram a etapa atual e alinhem os próximos passos entre os setores responsáveis.\n\nMensagem apenas para demonstração. Nenhum e-mail foi enviado.',
    },
  ]
  const drafts = new Map()
  const sent = new Map()
  let selectedId = alerts[0].id
  let prepared = null
  let copied = false
  let scenario = 'normal'
  const byId = (id) => document.getElementById(id)
  const currentAlert = () => alerts.find((alert) => alert.id === selectedId)

  function draftFor(alert) {
    if (!drafts.has(alert.id))
      drafts.set(alert.id, { sectors: [...alert.defaults], memberIds: [] })
    return drafts.get(alert.id)
  }

  function resolveRecipients(draft) {
    // A produção resolve e deduplica no servidor. Aqui a união é só demonstrativa.
    return members.filter(
      (member) =>
        draft.memberIds.includes(member.id) ||
        member.sectors.some((sector) => draft.sectors.includes(sector)),
    )
  }

  function clear(node) {
    node.replaceChildren()
  }
  function element(tag, text, className) {
    const node = document.createElement(tag)
    if (text !== undefined) node.textContent = text
    if (className) node.className = className
    return node
  }
  function message(text) {
    byId('workflow-message').textContent = text
  }
  function setRecipientOpen(open) {
    byId('recipient-popover').hidden = !open
    byId('recipient-trigger').setAttribute('aria-expanded', String(open))
    if (open) byId('member-search').focus()
    else byId('recipient-trigger').focus()
  }

  function resetPreparation(text) {
    prepared = null
    copied = false
    byId('prepared-review').hidden = true
    byId('manual-copy').hidden = true
    byId('external-confirmation').checked = false
    byId('external-confirmation').disabled = true
    byId('declare-button').disabled = true
    byId('validation-message').hidden = true
    message(
      text || 'Selecione os destinatários e prepare o texto para continuar.',
    )
  }

  function selectionChanged() {
    resetPreparation(
      'Seleção alterada. Prepare e copie o texto novamente antes de declarar o envio.',
    )
    renderMembers()
    renderEffectiveRecipients()
  }

  function renderList() {
    const list = byId('alert-list')
    clear(list)
    const filter = byId('alert-filter').value
    const visible = alerts.filter(
      (alert) =>
        filter === 'all' ||
        (filter === 'sent' ? sent.has(alert.id) : !sent.has(alert.id)),
    )
    byId('list-count').textContent =
      filter === 'pending'
        ? `${visible.length} pendentes`
        : `${visible.length} avisos`
    visible.forEach((alert) => {
      const row = element('button', undefined, 'alert-row')
      row.type = 'button'
      row.setAttribute('aria-pressed', String(selectedId === alert.id))
      row.append(element('span', alert.kind, 'alert-kind'))
      row.append(
        element(
          'span',
          sent.has(alert.id) ? 'Envio declarado' : 'Pendente',
          `status-badge${sent.has(alert.id) ? ' sent' : ''}`,
        ),
      )
      row.append(element('strong', alert.company))
      row.append(element('small', alert.code))
      row.append(
        element(
          'span',
          sent.has(alert.id)
            ? 'Consultar registro →'
            : 'Selecionar destinatários →',
          'open-alert-label',
        ),
      )
      row.addEventListener('click', () => {
        selectedId = alert.id
        resetPreparation()
        render()
        const heading = byId('company-name')
        heading.setAttribute('tabindex', '-1')
        heading.focus({ preventScroll: true })
        if (document.documentElement.clientWidth <= 900)
          byId('alert-detail').scrollIntoView?.({ block: 'start' })
      })
      list.append(row)
    })
    if (!visible.length)
      list.append(element('p', 'Nenhum aviso nesta consulta.', 'empty-list'))
  }

  function renderMembers() {
    const alert = currentAlert()
    if (!alert) return
    const draft = draftFor(alert)
    const query = byId('member-search').value.trim().toLocaleLowerCase('pt-BR')
    const list = byId('member-list')
    clear(list)
    const visible = members.filter((member) =>
      `${member.name} ${member.email}`
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    )
    visible.forEach((member) => {
      const label = element('label', undefined, 'member-row')
      const checkbox = element('input')
      checkbox.type = 'checkbox'
      checkbox.value = member.id
      checkbox.checked = draft.memberIds.includes(member.id)
      checkbox.addEventListener('change', () => {
        draft.memberIds = checkbox.checked
          ? [...draft.memberIds, member.id]
          : draft.memberIds.filter((id) => id !== member.id)
        selectionChanged()
        byId('member-list')
          .querySelector(`input[value="${member.id}"]`)
          ?.focus()
      })
      const name = element('span', undefined, 'member-name')
      name.append(
        element('strong', member.name),
        element('small', member.email),
      )
      label.append(
        checkbox,
        name,
        element(
          'span',
          member.sectors.map((key) => sectorNames[key]).join(' · '),
          'member-sectors',
        ),
      )
      list.append(label)
    })
    if (!visible.length)
      list.append(
        element(
          'p',
          'Nenhuma pessoa encontrada. Ajuste a busca ou o setor.',
          'empty-list',
        ),
      )

    const chips = byId('selected-people')
    clear(chips)
    const everyone = Object.keys(sectorNames).every((sector) =>
      draft.sectors.includes(sector),
    )
    byId('all-recipients').checked = everyone
    byId('all-recipients').indeterminate = !everyone && draft.sectors.length > 0
    byId('recipient-summary').textContent = everyone
      ? 'Todos com acesso a Processos'
      : `${draft.sectors.length} departamentos e ${draft.memberIds.length} pessoas`
    function appendDepartmentChip(text, removeSelection) {
      const chip = element('li')
      const remove = element('button', '×')
      remove.type = 'button'
      remove.setAttribute('aria-label', `Remover ${text}`)
      remove.addEventListener('click', () => {
        removeSelection()
        selectionChanged()
      })
      chip.append(element('span', text), remove)
      chips.append(chip)
    }
    if (everyone)
      appendDepartmentChip('Todos com acesso a Processos', () => {
        draft.sectors = []
      })
    else
      draft.sectors.forEach((sector) =>
        appendDepartmentChip(sectorNames[sector], () => {
          draft.sectors = draft.sectors.filter((value) => value !== sector)
        }),
      )
    byId('sector-options')
      .querySelectorAll('label')
      .forEach((label) => {
        const checkbox = label.querySelector('input')
        checkbox.checked = draft.sectors.includes(checkbox.value)
        label.hidden = !sectorNames[checkbox.value]
          .toLocaleLowerCase('pt-BR')
          .includes(query)
      })
    draft.memberIds.forEach((id) => {
      const member = members.find((item) => item.id === id)
      const chip = element('li')
      const remove = element('button', '×')
      remove.type = 'button'
      remove.setAttribute(
        'aria-label',
        `Remover ${member.name} da seleção individual`,
      )
      remove.addEventListener('click', () => {
        draft.memberIds = draft.memberIds.filter((selected) => selected !== id)
        selectionChanged()
        byId('member-search').focus()
      })
      chip.append(element('span', member.name), remove)
      chips.append(chip)
    })
  }

  function renderEffectiveRecipients() {
    const alert = currentAlert()
    if (!alert) return
    const recipients = resolveRecipients(draftFor(alert))
    byId('effective-heading').textContent =
      recipients.length === 1
        ? '1 pessoa receberia este aviso'
        : `${recipients.length} pessoas receberiam este aviso`
    byId('effective-names').textContent = recipients.length
      ? recipients.map((member) => member.name).join(' · ')
      : 'Nenhum destinatário. Escolha um setor ou uma pessoa para continuar.'
    byId('prepare-button').disabled = !recipients.length
  }

  function renderHistory(alert, record) {
    byId('history-author').textContent =
      `Declarado por ${record.author} em ${record.date}.`
    const list = byId('history-recipients')
    clear(list)
    record.recipients.forEach((member) =>
      list.append(element('li', `${member.name} · ${member.email}`)),
    )
    byId('email-subject').textContent = record.subject
    byId('email-body').textContent = record.body
  }

  function render() {
    const restricted = byId('demo-role').value !== 'com'
    byId('profile-label').textContent = sectorNames[byId('demo-role').value]
    byId('restricted-state').hidden = !restricted
    byId('loading-state').hidden = restricted || scenario !== 'loading'
    byId('error-state').hidden = restricted || scenario !== 'error'
    byId('workspace').hidden =
      restricted || ['loading', 'error'].includes(scenario)
    if (restricted || ['loading', 'error'].includes(scenario)) return
    renderList()
    const alert = currentAlert()
    byId('empty-detail').hidden = !!alert
    byId('alert-detail').hidden = !alert
    if (!alert) return
    const record = sent.get(alert.id)
    byId('company-name').textContent = alert.company
    byId('process-type').textContent = alert.type
    byId('process-type').className = `type-badge ${alert.typeClass}`
    byId('alert-description').textContent = `${alert.kind} · ${alert.code}`
    byId('alert-status').textContent = record ? 'Envio declarado' : 'Pendente'
    byId('alert-status').className = `status-badge${record ? ' sent' : ''}`
    byId('pending-content').hidden = !!record
    byId('history-content').hidden = !record
    byId('email-subject').textContent = alert.subject
    byId('email-body').textContent = alert.body
    if (record) {
      renderHistory(alert, record)
      return
    }
    const draft = draftFor(alert)
    byId('sector-options')
      .querySelectorAll('input')
      .forEach((checkbox) => {
        checkbox.checked = draft.sectors.includes(checkbox.value)
      })
    renderMembers()
    renderEffectiveRecipients()
    if (scenario === 'revoked') showRevokedError()
  }

  function showRevokedError() {
    byId('validation-message').hidden = false
    byId('validation-message').textContent =
      'Não foi possível preparar (400 simulado): Marina Duarte teve o acesso a Processos revogado. Revise os destinatários e prepare novamente. Nenhum envio foi declarado.'
  }

  function prepare() {
    const alert = currentAlert()
    if (!alert || sent.has(alert.id)) return
    setRecipientOpen(false)
    if (scenario === 'revoked') {
      resetPreparation(
        'Revise a seleção. Para continuar o fluxo sem erro, escolha “Aviso pendente” no controle da demonstração.',
      )
      showRevokedError()
      return
    }
    const recipients = resolveRecipients(draftFor(alert))
    if (!recipients.length) return
    prepared = {
      alertId: alert.id,
      recipients: recipients.map((member) => ({ ...member })),
      subject: alert.subject,
      body: alert.body,
    }
    prepared.copyText = `Para: ${recipients.map((member) => `${member.name} <${member.email}>`).join('; ')}\nAssunto: ${alert.subject}\n\n${alert.body}`
    const list = byId('prepared-recipients')
    clear(list)
    prepared.recipients.forEach((member) =>
      list.append(element('li', `${member.name} · ${member.email}`)),
    )
    byId('copy-text').value = prepared.copyText
    byId('prepared-review').hidden = false
    byId('manual-copy').hidden = true
    byId('external-confirmation').checked = false
    byId('external-confirmation').disabled = true
    byId('declare-button').disabled = true
    copied = false
    message(
      'Texto preparado. Revise a lista e copie o conteúdo para enviar pelo seu canal de e-mail.',
    )
  }

  function markCopied() {
    if (!prepared) return
    copied = true
    byId('external-confirmation').disabled = false
    byId('manual-copy').hidden = true
    message(
      'Texto de demonstração copiado. Nenhum e-mail foi enviado. Confirme a etapa externa para simular a declaração.',
    )
  }

  async function copy() {
    if (!prepared) return
    const snapshot = prepared
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard indisponível')
      await navigator.clipboard.writeText(snapshot.copyText)
      if (prepared === snapshot) markCopied()
    } catch {
      if (prepared !== snapshot) return
      byId('copy-text').focus()
      byId('copy-text').select()
      byId('manual-copy').hidden = false
      message(
        'O texto está selecionado. Copie manualmente e confirme a cópia da demonstração.',
      )
    }
  }

  function declareSent() {
    if (!prepared || !copied || !byId('external-confirmation').checked) return
    sent.set(prepared.alertId, {
      ...prepared,
      author: 'Marina Duarte · exemplo',
      date: '04/11/2026 às 09:25',
    })
    resetPreparation()
    byId('alert-filter').value = 'all'
    render()
  }

  function applyScenario(value) {
    scenario = value
    resetPreparation()
    selectedId = value === 'unselected' ? '' : alerts[0].id
    byId('alert-filter').value = value === 'history' ? 'all' : 'pending'
    if (value === 'history')
      sent.set(alerts[0].id, {
        recipients: members.slice(0, 2).map((member) => ({ ...member })),
        subject: alerts[0].subject,
        body: alerts[0].body,
        author: 'Marina Duarte · exemplo',
        date: '04/11/2026 às 09:25',
      })
    else sent.delete(alerts[0].id)
    render()
  }

  byId('demo-role').addEventListener('change', () => {
    resetPreparation()
    render()
  })
  byId('demo-state').addEventListener('change', (event) =>
    applyScenario(event.target.value),
  )
  byId('alert-filter').addEventListener('change', renderList)
  byId('member-search').addEventListener('input', renderMembers)
  byId('recipient-trigger').addEventListener('click', () =>
    setRecipientOpen(byId('recipient-popover').hidden),
  )
  byId('recipient-done').addEventListener('click', () =>
    setRecipientOpen(false),
  )
  byId('recipient-field').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setRecipientOpen(false)
    }
  })
  document.addEventListener('pointerdown', (event) => {
    if (!byId('recipient-field').contains(event.target)) {
      byId('recipient-popover').hidden = true
      byId('recipient-trigger').setAttribute('aria-expanded', 'false')
    }
  })
  byId('all-recipients').addEventListener('change', () => {
    const alert = currentAlert()
    if (!alert) return
    draftFor(alert).sectors = byId('all-recipients').checked
      ? Object.keys(sectorNames)
      : []
    selectionChanged()
  })
  byId('sector-options').addEventListener('change', () => {
    const alert = currentAlert()
    if (!alert) return
    draftFor(alert).sectors = [
      ...byId('sector-options').querySelectorAll('input:checked'),
    ].map((checkbox) => checkbox.value)
    selectionChanged()
  })
  byId('prepare-button').addEventListener('click', prepare)
  byId('back-to-alerts').addEventListener('click', () => {
    const selected = document.querySelector('.alert-row[aria-pressed="true"]')
    selected?.focus()
    selected?.scrollIntoView?.({ block: 'start' })
  })
  byId('copy-button').addEventListener('click', copy)
  byId('manual-copy-confirm').addEventListener('click', markCopied)
  byId('external-confirmation').addEventListener('change', () => {
    byId('declare-button').disabled =
      !copied || !byId('external-confirmation').checked
  })
  byId('declare-button').addEventListener('click', declareSent)
  byId('retry-demo').addEventListener('click', () => {
    byId('demo-state').value = 'normal'
    applyScenario('normal')
  })
  byId('reset-demo').addEventListener('click', () => {
    drafts.clear()
    sent.clear()
    byId('demo-role').value = 'com'
    byId('demo-state').value = 'normal'
    byId('member-search').value = ''
    applyScenario('normal')
  })
  render()
})()
