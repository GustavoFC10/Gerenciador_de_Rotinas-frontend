/* global console */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { Window } from 'happy-dom'

// Behavioral verification of the two isolated prototypes. This does not assert
// browser geometry or replace the application's API/permission test suite.
let checks = 0
function check(message, assertion) {
  assertion()
  checks += 1
  console.log(`OK ${message}`)
}
async function mount(htmlName, scriptName) {
  const window = new Window({
    url: 'http://localhost:4173/previews/processos-ux/',
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      enableJavaScriptEvaluation: true,
    },
  })
  window.document.write(
    await readFile(new URL(htmlName, import.meta.url), 'utf8'),
  )
  window.eval(await readFile(new URL(scriptName, import.meta.url), 'utf8'))
  return window
}
function set(window, selector, value, type = 'change') {
  const node = window.document.querySelector(selector)
  assert.ok(node, selector)
  node.value = value
  node.dispatchEvent(new window.Event(type, { bubbles: true }))
}
function click(window, selector) {
  const node = window.document.querySelector(selector)
  assert.ok(node, selector)
  node.click()
}

const list = await mount('index.html', 'preview.js')
try {
  const document = list.document
  check('uma busca e um ponto de criação visível na lista', () => {
    assert.equal(document.querySelectorAll('input[type="search"]').length, 1)
    assert.equal(document.querySelectorAll('#new-process').length, 1)
    assert.equal(document.querySelector('#new-process').hidden, false)
    assert.equal(document.querySelectorAll('select[multiple]').length, 0)
  })
  check('Abertos sem três filtros implícitos repetidos', () => {
    assert.equal(document.querySelector('#active-filters').hidden, true)
    assert.match(
      document.querySelector('#result-count').textContent,
      /5 processos/,
    )
  })
  set(list, '#search', 'Aurora', 'input')
  check('busca contextual com contagem global preservada', () => {
    assert.equal(document.querySelectorAll('.process-row').length, 1)
    assert.match(
      document.querySelector('[data-view="ativos"] .counter').textContent,
      /5/,
    )
    assert.match(document.querySelector('#filter-chips').textContent, /Aurora/)
  })
  click(list, '[data-view="agendados"]')
  click(list, '#clear')
  check('limpar refinamentos conserva recorte e libera os agendados', () => {
    assert.equal(
      document.querySelector('#view-title').textContent,
      'Aguardando liberação',
    )
    assert.equal(document.querySelectorAll('.process-row').length, 2)
  })
  click(list, '#more-toggle')
  click(list, '#customize-status')
  click(list, 'input[value="atrasado"]')
  check('situações personalizadas não deixam Abertos selecionado', () => {
    assert.equal(
      document
        .querySelector('[data-view="todos"]')
        .getAttribute('aria-current'),
      'page',
    )
    assert.equal(document.querySelectorAll('.process-row').length, 1)
  })
  click(list, '#clear')
  click(list, '#next')
  check('paginação e filtros não buscam outra coleção', () => {
    assert.match(document.querySelector('#range').textContent, /6–8 de 8/)
    assert.equal(document.querySelectorAll('.process-row').length, 3)
  })
  set(list, '#scenario', 'error')
  check('falha não se apresenta como nenhum resultado', () => {
    assert.ok(document.querySelector('[role="alert"]'))
    assert.doesNotMatch(
      document.querySelector('#result-count').textContent,
      /0 processo/,
    )
  })
  click(list, '[data-retry]')
  set(list, '#persona', 'reg')
  check('perfil de Regularidade retira ação de criação', () => {
    assert.equal(document.querySelector('#new-process').hidden, true)
  })
  click(list, '#theme')
  check('variante escura disponível para avaliação', () => {
    assert.equal(document.documentElement.dataset.theme, 'dark')
  })
  set(list, '#search', '<img src=x onerror=alert(1)>', 'input')
  check('texto digitado não é interpretado como HTML', () => {
    assert.equal(document.querySelector('#filter-chips img'), null)
    assert.match(document.querySelector('#filter-chips').textContent, /<img/)
  })
} finally {
  await list.happyDOM.abort()
  list.close()
}

const recipients = await mount('recipients.html', 'recipients.js')
try {
  const document = recipients.document
  check('primeiro pendente mostra imediatamente setores e pessoas', () => {
    assert.equal(document.querySelector('#alert-detail').hidden, false)
    assert.equal(document.querySelector('#pending-content').hidden, false)
    assert.match(
      document.querySelector('#effective-heading').textContent,
      /4 pessoas/,
    )
  })
  click(recipients, '#recipient-trigger')
  check(
    'um único seletor reúne departamentos e pessoas, incluindo Todos',
    () => {
      assert.equal(document.querySelectorAll('#recipient-trigger').length, 1)
      assert.equal(document.querySelector('#recipient-popover').hidden, false)
      click(recipients, '#all-recipients')
      assert.match(
        document.querySelector('#effective-heading').textContent,
        /5 pessoas/,
      )
      click(recipients, '#all-recipients')
      click(recipients, '#sector-options input[value="com"]')
      click(recipients, '#sector-options input[value="fin"]')
      click(recipients, '#recipient-done')
    },
  )
  click(recipients, '#prepare-button')
  check('preparo sem declaração automática e deduplicação por pessoa', () => {
    assert.equal(document.querySelectorAll('#prepared-recipients li').length, 4)
    assert.equal(document.querySelector('#declare-button').disabled, true)
  })
  click(recipients, '#recipient-trigger')
  click(recipients, '#sector-options input[value="com"]')
  check('editar seleção invalida a preparação anterior', () => {
    assert.equal(document.querySelector('#prepared-review').hidden, true)
    assert.equal(document.querySelector('#declare-button').disabled, true)
  })
  click(recipients, '#recipient-done')
  set(recipients, '#demo-state', 'revoked')
  click(recipients, '#prepare-button')
  check('destinatário revogado apresenta validação', () => {
    assert.equal(document.querySelector('#validation-message').hidden, false)
  })
  set(recipients, '#demo-state', 'history')
  check('histórico preserva destinatários e retira seleção editável', () => {
    assert.equal(document.querySelector('#history-content').hidden, false)
    assert.equal(document.querySelector('#pending-content').hidden, true)
    assert.ok(document.querySelector('#history-recipients li'))
  })
  set(recipients, '#demo-role', 'fin')
  check('Financeiro não recebe o formulário restrito', () => {
    assert.equal(document.querySelector('#restricted-state').hidden, false)
    assert.equal(document.querySelector('#workspace').hidden, true)
  })
} finally {
  await recipients.happyDOM.abort()
  recipients.close()
}
console.log(`${checks} cenários comportamentais verificados.`)
