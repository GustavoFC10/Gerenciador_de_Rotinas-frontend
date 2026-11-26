/* global Buffer, console, process, clearTimeout, setTimeout, WebSocket */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { URL } from 'node:url'

const origin = 'http://127.0.0.1:4174'
const output = new URL(
  '../../../docs/auditoria-ux/componentes/imagens/',
  import.meta.url,
)
const browserPath =
  process.env.UX_BROWSER_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const temporaryRoot = await realpath(tmpdir())
const profile = await mkdtemp(
  join(temporaryRoot, 'jaralcon-auditoria-componentes-'),
)
const browser = spawn(
  browserPath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
)

let launchError
browser.on('error', (error) => {
  launchError = error
})
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let connection

try {
  let portData
  for (let attempt = 0; attempt < 80 && !portData; attempt++) {
    if (launchError) throw launchError
    portData = await readFile(
      join(profile, 'DevToolsActivePort'),
      'utf8',
    ).catch(() => '')
    if (!portData) await pause(100)
  }
  assert.ok(portData, 'Não foi possível abrir o navegador local.')
  const [port, socketPath] = portData.trim().split(/\r?\n/)
  connection = new WebSocket(`ws://127.0.0.1:${port}${socketPath}`)
  await new Promise((resolve, reject) => {
    connection.addEventListener('open', resolve, { once: true })
    connection.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  connection.addEventListener('message', ({ data }) => {
    const response = JSON.parse(String(data))
    const request = pending.get(response.id)
    if (!request) return
    pending.delete(response.id)
    clearTimeout(request.timeout)
    if (response.error) request.reject(new Error(response.error.message))
    else request.resolve(response.result)
  })
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`DevTools não respondeu a ${method}.`))
      }, 15000)
      pending.set(id, { resolve, reject, timeout })
      connection.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const command = (method, params) => send(method, params, sessionId)
  await command('Page.enable')
  async function evaluate(expression) {
    const response = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (response.exceptionDetails)
      throw new Error(
        response.exceptionDetails.exception?.description ||
          response.exceptionDetails.text,
      )
    return response.result.value
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return
      await pause(80)
    }
    throw new Error(
      `A condição ${expression} expirou em ${await evaluate('location.pathname')}.`,
    )
  }
  async function navigate(path, width = 1440, height = 1000) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await command('Page.navigate', { url: new URL(path, origin).href })
    await waitFor('document.readyState === "complete"')
  }
  async function liveRoute(path, ready, width, height) {
    await navigate(path, width, height)
    await waitFor('document.title.startsWith("Preview local")')
    await waitFor(ready)
    await evaluate('document.fonts.ready.then(() => true)')
    await evaluate(
      'document.querySelector(".feature-preview-controls")?.style.setProperty("display", "none", "important")',
    )
  }
  async function capture(selector, options = {}) {
    const match = JSON.stringify(selector)
    await waitFor(`!!document.querySelector(${match})`)
    await evaluate(`Promise.all(document.querySelector(${match}).getAnimations()
      .filter(animation => animation.effect.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {}))).then(() => true)`)
    const { x, y, right, bottom, viewRight, viewBottom } =
      await evaluate(`(() => {
      const element = document.querySelector(${match});
      if (${Boolean(options.scroll)}) element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.left + scrollX, y: bounds.top + scrollY,
        right: bounds.right + scrollX, bottom: bounds.bottom + scrollY,
        viewRight: innerWidth + scrollX, viewBottom: innerHeight + scrollY,
      };
    })()`)
    const pad = options.pad ?? 0
    const left = Math.max(0, Math.floor(x - pad))
    const top = Math.max(0, Math.floor(y - pad))
    const cropRight = Math.min(right + pad, options.full ? Infinity : viewRight)
    const cropBottom = Math.min(
      bottom + pad,
      y + (options.height ?? Infinity) + pad,
      options.full ? Infinity : viewBottom,
    )
    const clipped = {
      x: left,
      y: top,
      width: Math.ceil(cropRight - left),
      height: Math.ceil(cropBottom - top),
      scale: 1,
    }
    assert.ok(clipped.width > 0 && clipped.height > 0, selector)
    const result = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: Boolean(options.full),
      clip: clipped,
    })
    return result.data
  }
  async function clickLabel(text, selector = 'button, a') {
    const find = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(node => (node.innerText.trim() === ${JSON.stringify(text)} || node.getAttribute('aria-label') === ${JSON.stringify(text)}) && node.getBoundingClientRect().width > 0)`
    await waitFor(`!!(${find})`)
    await evaluate(`(${find}).click()`)
  }

  // The local preview installs an in-browser mock before loading App.
  const captures = {}
  await liveRoute('/minhas-tarefas', '!!document.querySelector("main h1")')
  await clickLabel('Nova tarefa')
  captures.task = await capture('form:has([aria-label="Fechar formulário"])', {
    pad: 12,
  })
  assert.equal(
    await evaluate(
      '!!document.querySelector(\'form:has([aria-label="Fechar formulário"])\').closest(\'[role="dialog"]\')',
    ),
    false,
  )

  const previewPath = '/previews/revisao-ux/componentes/'
  await navigate(`${previewPath}dialogo-tarefa.html`, 1440, 1000)
  await waitFor('!!document.querySelector(".ui-dialog")')
  await evaluate('document.fonts.ready.then(() => true)')
  await waitFor('document.activeElement.hasAttribute("data-overlay-close")')
  captures.taskProposal = await capture('.ui-dialog', { pad: 12 })
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await waitFor('!document.querySelector(".ui-dialog")')

  await liveRoute(
    '/equipe/novo',
    '!!document.querySelector("#employee-invitation-form")',
  )
  captures.invite = await capture('[aria-labelledby="invitation-title"]')
  await liveRoute(
    '/empresas/00000000-0000-4000-8001-000000000001?source=catalog',
    '!!document.querySelector("main h1")',
  )
  captures.companyName = await evaluate(
    'document.querySelector("main h1").textContent.trim()',
  )
  await clickLabel('Configurações', 'main button')
  await waitFor('!!document.querySelector("[data-entity-edit-dialog] form")')
  await clickLabel('Zona de risco', '[data-entity-edit-dialog] button')
  await evaluate(
    'window.confirm = (text) => { window.auditConfirmText = text; return false; }',
  )
  const archiveButton = `Array.from(document.querySelectorAll('[data-entity-edit-dialog] button')).find(button => button.innerText.trim().startsWith('Arquivar'))`
  await waitFor(`!!(${archiveButton})`)
  await evaluate(`(${archiveButton}).click()`)
  await waitFor('typeof window.auditConfirmText === "string"')
  captures.confirmText = await evaluate('window.auditConfirmText')

  await liveRoute('/empresas/nova', '!!document.getElementById("company-cnpj")')
  await evaluate('document.getElementById("company-cnpj").focus()')
  await command('Input.insertText', { text: '123456780001' })
  await clickLabel('Continuar', 'form button')
  captures.companyField = await capture('div:has(> #company-cnpj-error)', {
    pad: 6,
    scroll: true,
  })

  const processList = '/processos/lista?situacao=todos'
  await liveRoute(
    `${processList}&page=2&pageSize=10`,
    '!!document.querySelector(".process-list .lrow")',
    1150,
  )
  captures.processPager = await capture('.process-list-pagination', {
    scroll: true,
  })
  captures.processRange = await evaluate(
    'document.querySelector(".process-list-pagination p").innerText.replace(/^Exibindo /, "")',
  )
  captures.processPage = await evaluate(
    'document.querySelector(".process-list-pagination nav span").innerText.replace(/^Página /, "")',
  )
  captures.processPageSize = await evaluate(
    'document.querySelector(".process-list-pagination select").value',
  )
  captures.processNextDisabled = await evaluate(
    'document.querySelector(".process-list-pagination nav button:last-child").disabled',
  )
  const search = '.process-list-search'
  await evaluate(`document.querySelector('${search} input').focus()`)
  await command('Input.insertText', { text: 'Aurora' })
  await waitFor(`document.querySelector('${search} input').value === 'Aurora'`)
  captures.processSearch = await capture(search, { pad: 8, scroll: true })
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    modifiers: 2,
    windowsVirtualKeyCode: 65,
  })
  await command('Input.insertText', { text: 'sem-correspondencia' })
  await waitFor(
    `document.querySelector('.process-list')?.getAttribute('aria-busy') === 'false' && !document.querySelector('.process-list .lrow')`,
  )
  await waitFor(
    'document.querySelector(".process-list .panel.empty h2")?.innerText === "Nenhum resultado nos filtros"',
  )
  captures.processEmpty = await capture('.process-list .panel.empty', {
    scroll: true,
  })
  await clickLabel('Novo processo')
  captures.processForm = await capture(
    '.processes-module .modal[role="dialog"]',
    { pad: 12 },
  )
  captures.processTypes = await evaluate(
    `Array.from(document.querySelectorAll('.modal .opts .opt')).map(option => ({ name: option.querySelector('b').innerText, detail: option.querySelector('small').innerText }))`,
  )

  await liveRoute(
    '/processos/movimentacoes',
    'Array.from(document.querySelectorAll("main button")).some(button => button.innerText.trim() === "Relatório do mês" && !button.disabled)',
  )
  await clickLabel('Relatório do mês')
  captures.processReport = await capture('.processes-module .modal.report', {
    height: 275,
    pad: 12,
  })
  captures.processMonth = await evaluate(
    'document.getElementById("process-report-title").innerText',
  )
  captures.processMetrics = await evaluate(
    `Array.from(document.querySelectorAll('.modal.report .scard')).map(metric => ({ label: metric.querySelector('span').innerText, value: metric.querySelector('b').innerText, detail: metric.querySelector('small').innerText }))`,
  )

  await liveRoute(
    '/processos/00000000-0000-4000-8000-000000000001',
    '!!document.querySelector(".d-actions")',
  )
  await clickLabel('Excluir', '.d-actions button')
  captures.processActions = await capture('.d-actions .confirm', {
    pad: 5,
    scroll: true,
  })
  await clickLabel('Manter', '.d-actions button')
  await clickLabel('Cancelar processo', '.d-actions button')
  captures.processCancel = await capture('.d-actions .confirm', {
    pad: 5,
    scroll: true,
  })

  await navigate(`${previewPath}pranchas.html`, 1360, 1050)
  await waitFor('typeof window.renderBoard === "function"')
  const names = await evaluate('window.boardNames')
  for (const name of names) {
    await evaluate(
      `window.renderBoard(${JSON.stringify(name)}, ${JSON.stringify(captures)});`,
    )
    await evaluate(
      'Promise.all([...document.images].map(img => img.decode())).then(() => document.fonts.ready).then(() => true)',
    )
    const overflow = await evaluate(
      `Array.from(document.querySelectorAll('.board, .stage, .frame, .mock, .sample')).filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className)`,
    )
    assert.deepEqual(overflow, [], `Transbordamento na prancha ${name}`)
    const image = await capture('.board', { full: true })
    await writeFile(
      new URL(`${name}.png`, output),
      Buffer.from(image, 'base64'),
    )
    console.log(`${name}.png`)
  }
} finally {
  connection?.close()
  browser.kill()
  if (
    dirname(profile) === temporaryRoot &&
    basename(profile).startsWith('jaralcon-auditoria-componentes-')
  ) {
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 150,
    }).catch(() => {})
  }
}
