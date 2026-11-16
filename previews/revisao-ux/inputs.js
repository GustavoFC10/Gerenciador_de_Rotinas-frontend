/* global Review, document, MutationObserver */
;(() => {
  const decorated = new WeakSet()
  const money = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
  const decimal = (value) => {
    const text = String(value ?? '').replace(/[R$\s]/g, '')
    return text.includes(',')
      ? Number(text.replaceAll('.', '').replace(',', '.'))
      : Number(text)
  }
  function cnpj(value) {
    const raw = String(value)
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 14)
    return (
      raw.slice(0, 2) +
      (raw.length > 2 ? '.' + raw.slice(2, 5) : '') +
      (raw.length > 5 ? '.' + raw.slice(5, 8) : '') +
      (raw.length > 8 ? '/' + raw.slice(8, 12) : '') +
      (raw.length > 12 ? '-' + raw.slice(12) : '')
    )
  }
  function phone(value) {
    let raw = String(value).replace(/\D/g, '').slice(0, 13),
      prefix = ''
    if (raw.length > 11 && raw.startsWith('55')) {
      prefix = '+55 '
      raw = raw.slice(2)
    }
    raw = raw.slice(0, 11)
    if (!raw) return ''
    const split = raw.length > 10 ? 7 : 6
    return (
      prefix +
      '(' +
      raw.slice(0, 2) +
      (raw.length > 2 ? ') ' + raw.slice(2, split) : '') +
      (raw.length > split ? '-' + raw.slice(split) : '')
    )
  }
  function formatOf(input) {
    if (input.dataset.format) return input.dataset.format
    if (input.dataset.fmt === 'money') return 'money'
    if (input.dataset.fmt === 'int') return 'integer'
    if (/cnpj/i.test(input.name + ' ' + input.id)) return 'cnpj'
    if (
      input.type === 'tel' ||
      /phone|telefone/i.test(
        input.name + ' ' + input.id + ' ' + (input.dataset.office || ''),
      )
    )
      return 'phone'
    const label =
      input.closest('label')?.querySelector('span')?.textContent || ''
    return /\(R\$\)|\bR\$/.test(label) ? 'money' : ''
  }
  function decorate(root) {
    const inputs = root.matches?.('input')
      ? [root]
      : [...(root.querySelectorAll?.('input') || [])]
    for (const input of inputs) {
      if (decorated.has(input)) continue
      const format = formatOf(input)
      if (!format) continue
      decorated.add(input)
      input.dataset.format = format
      input.type = 'text'
      input.inputMode = format === 'cnpj' ? 'text' : 'numeric'
      input.autocomplete = format === 'phone' ? 'tel' : 'off'
      if (format === 'money') {
        input.classList.add('money-input')
        const value = decimal(input.value)
        input.value =
          input.value && Number.isFinite(value) ? money.format(value) : ''
      }
      if (format === 'integer')
        input.value = input.value
          ? integer.format(
              Number(input.value.replaceAll('.', '').replace(',', '.')),
            )
          : ''
      if (format === 'cnpj') {
        input.value = cnpj(input.value)
        input.maxLength = 18
        input.placeholder = '00.000.000/0000-00'
      }
      if (format === 'phone') {
        input.value = phone(input.value)
        input.placeholder ||= '(00) 00000-0000'
      }
    }
  }
  document.addEventListener(
    'beforeinput',
    (event) => {
      const input = event.target
      if (
        !input.matches?.('input[data-format]') ||
        event.inputType !== 'deleteContentBackward' ||
        input.selectionStart !== input.selectionEnd
      )
        return
      const position = input.selectionStart
      if (position > 0 && /[^a-z0-9]/i.test(input.value[position - 1])) {
        let start = position - 1
        while (start > 0 && /[^a-z0-9]/i.test(input.value[start])) start -= 1
        input.setSelectionRange(start, position)
      }
    },
    true,
  )
  document.addEventListener(
    'input',
    (event) => {
      const input = event.target
      if (!input.matches?.('input[data-format]')) return
      const format = input.dataset.format
      const position = input.selectionStart ?? input.value.length
      const significantBefore = (
        input.value
          .slice(0, position)
          .match(format === 'cnpj' ? /[a-z0-9]/gi : /\d/g) || []
      ).length
      const raw = input.value.replace(
        format === 'cnpj' ? /[^a-z0-9]/gi : /\D/g,
        '',
      )
      if (format === 'money')
        input.value = raw ? money.format(Number(raw) / 100) : ''
      if (format === 'integer')
        input.value = raw ? integer.format(Number(raw)) : ''
      if (format === 'cnpj') input.value = cnpj(raw)
      if (format === 'phone') input.value = phone(raw)
      if (
        position >= input.value.length ||
        (format === 'money' && significantBefore >= raw.length)
      )
        input.setSelectionRange(input.value.length, input.value.length)
      else {
        let digits = 0,
          cursor = 0
        for (; cursor < input.value.length; cursor += 1) {
          if (
            (format === 'cnpj' ? /[a-z0-9]/i : /\d/).test(input.value[cursor])
          )
            digits += 1
          if (digits >= significantBefore) {
            cursor += 1
            break
          }
        }
        input.setSelectionRange(cursor, cursor)
      }
    },
    true,
  )
  new MutationObserver((changes) =>
    changes.forEach((change) =>
      change.addedNodes.forEach((node) => {
        if (node.nodeType === 1) decorate(node)
      }),
    ),
  ).observe(document.documentElement, { childList: true, subtree: true })
  decorate(document)
  Review.inputs = { decimal, cnpj, phone, decorate }
})()
