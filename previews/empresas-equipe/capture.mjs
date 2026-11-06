/* global process, console, setTimeout, clearTimeout, WebSocket, Buffer */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL, fileURLToPath } from 'node:url'

// Isolated, local-only browser QA of the synthetic design previews.
const browserPath =
  process.env.UX_BROWSER_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const profile = await mkdtemp(join(tmpdir(), 'jaralcon-directory-preview-'))
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
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError
    try {
      portData = await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
      break
    } catch {
      await pause(100)
    }
  }
  assert.ok(
    portData,
    'O navegador não disponibilizou DevTools no perfil isolado.',
  )
  const [port, socketPath] = portData.trim().split(/\r?\n/)
  connection = new WebSocket(`ws://127.0.0.1:${port}${socketPath}`)
  await new Promise((resolve, reject) => {
    connection.addEventListener('open', resolve, { once: true })
    connection.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  connection.addEventListener('message', (event) => {
    const response = JSON.parse(String(event.data))
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
      connection.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      )
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const command = (method, params) => send(method, params, sessionId)
  const evaluate = async (expression) => {
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
  await command('Page.enable')
  const output = new URL('images/', import.meta.url)
  await mkdir(output, { recursive: true })
  const scenarios = [
    { name: 'empresas-a', module: 'empresas', layout: 'tabela' },
    { name: 'equipe-a', module: 'equipe', layout: 'tabela' },
    {
      name: 'empresas-b',
      module: 'empresas',
      layout: 'ficha',
      record: '0',
    },
    { name: 'equipe-b', module: 'equipe', layout: 'ficha', record: '0' },
    {
      name: 'equipe-acessos',
      module: 'equipe',
      layout: 'tabela',
      record: '0',
      tab: 'acessos',
    },
    { name: 'convite', module: 'equipe', layout: 'tabela', create: true },
  ]
  const checks = []
  const failures = []
  for (const scenario of scenarios) {
    const url = new URL('index.html', import.meta.url)
    url.searchParams.set('modulo', scenario.module)
    url.searchParams.set('layout', scenario.layout)
    if (scenario.record !== undefined)
      url.searchParams.set('registro', scenario.record)
    if (scenario.tab) url.searchParams.set('aba', scenario.tab)
    for (const width of [1440, 1024, 768, 390, 320]) {
      await command('Emulation.setDeviceMetricsOverride', {
        width,
        height: width < 700 ? 844 : 1000,
        deviceScaleFactor: 1,
        mobile: width < 700,
      })
      await command('Page.navigate', { url: url.href })
      let ready = false
      for (let attempt = 0; attempt < 60; attempt++) {
        ready = await evaluate(
          'document.readyState === "complete" && window.previewReady === true',
        )
        if (ready) break
        await pause(100)
      }
      assert.ok(ready, `A preview não inicializou: ${url.href}`)
      if (scenario.create) {
        assert.ok(await evaluate('!!document.querySelector("#create")'))
        await evaluate('document.querySelector("#create").click()')
      }
      await pause(250)
      const dimensions = await evaluate(`({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        panel: !!document.querySelector('#detail-panel')
      })`)
      const pass = dimensions.scroll <= width && dimensions.body <= width
      const check = { scenario: scenario.name, width, pass, ...dimensions }
      checks.push(check)
      if (!pass) failures.push(check)
      if ([1440, 390].includes(width)) {
        const screenshot = await command('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        })
        const name = `${scenario.name}${width === 390 ? '-mobile' : ''}.png`
        await writeFile(
          new URL(name, output),
          Buffer.from(screenshot.data, 'base64'),
        )
        console.log(`Captura: ${name}`)
      }
    }
  }
  const interactions = []
  async function loadPreview(query, width = 1440) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height: width < 700 ? 844 : 1000,
      deviceScaleFactor: 1,
      mobile: width < 700,
    })
    await command('Page.navigate', {
      url: new URL(`index.html?${query}`, import.meta.url).href,
    })
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      ready = await evaluate(
        'document.readyState === "complete" && window.previewReady === true',
      )
      if (ready) break
      await pause(100)
    }
    assert.ok(ready, `A preview não inicializou: ${query}`)
  }
  for (const width of [1440, 390]) {
    await loadPreview(
      'modulo=equipe&layout=tabela&registro=0&aba=acessos',
      width,
    )
    await evaluate('document.querySelector("button[data-action=edit]").click()')
    assert.ok(
      await evaluate(
        '!document.querySelector("details.optional-details").open',
      ),
      'Os detalhes opcionais devem iniciar recolhidos.',
    )
    assert.ok(await evaluate('document.querySelector("#save").disabled'))
    await evaluate('document.querySelector("[data-sector=com]").click()')
    assert.ok(
      await evaluate(
        'document.querySelector("[data-sector=com]").checked && !document.querySelector("#save").disabled',
      ),
      'Selecionar Diretoria deve marcar o setor e permitir salvar.',
    )
    for (const sector of ['fin', 'reg']) {
      const checked = await evaluate(
        `document.querySelector('[data-sector=${sector}]').checked`,
      )
      await evaluate(
        `document.querySelector('[data-sector=${sector}]').click()`,
      )
      assert.equal(
        await evaluate(
          `document.querySelector('[data-sector=${sector}]').checked`,
        ),
        !checked,
        `O seletor ${sector} deve alternar.`,
      )
      await evaluate(
        `document.querySelector('[data-sector=${sector}]').click()`,
      )
    }
    assert.ok(
      await evaluate(
        '!document.querySelector("details.optional-details").open',
      ),
    )
    await pause(250)
    const screenshot = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    const screenshotName = `equipe-selecao-setores${width === 390 ? '-mobile' : ''}.png`
    await writeFile(
      new URL(screenshotName, output),
      Buffer.from(screenshot.data, 'base64'),
    )
    console.log(`Captura: ${screenshotName}`)
    await evaluate('document.querySelector("[data-action=cancel]").click()')
    assert.ok(await evaluate('document.querySelector("#confirm-dialog").open'))
    await evaluate('document.querySelector("#confirm-ok").click()')
    assert.ok(
      await evaluate(
        '!document.querySelector("#confirm-dialog").open && !document.querySelector("#save") && !!document.querySelector("button[data-action=edit]")',
      ),
      'Descartar deve retornar à leitura.',
    )
    interactions.push({
      name: 'selecionar setores e descartar',
      width,
      pass: true,
    })
  }
  await loadPreview('modulo=equipe&layout=tabela')
  await evaluate(`(() => {
    const search = document.querySelector('#search');
    search.value = 'souz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  assert.ok(
    await evaluate(`(() => {
      const rows = [...document.querySelectorAll('[data-record]')];
      return rows.length === 1 && rows[0].textContent.includes('Elisa Souza');
    })()`),
    'A busca souz deve retornar somente Elisa Souza.',
  )
  interactions.push({ name: 'busca parcial por pessoa', pass: true })
  await loadPreview('modulo=equipe&layout=tabela&registro=elisa')
  assert.equal(
    await evaluate('document.querySelector("#detail-title").textContent'),
    'Elisa Souza',
    'O link direto do registro elisa deve abrir Elisa Souza.',
  )
  await evaluate('document.querySelector("[data-action=close]").click()')
  assert.equal(
    await evaluate('document.activeElement.dataset.record'),
    'elisa',
    'Fechar a ficha deve devolver o foco à linha de Elisa.',
  )
  interactions.push({
    name: 'link direto e retorno de foco da pessoa',
    pass: true,
  })
  await loadPreview('modulo=empresas&layout=tabela&registro=lume')
  assert.equal(
    await evaluate('document.querySelector("#detail-title").textContent'),
    'Lume Arquitetura',
    'O link direto do registro lume deve abrir Lume Arquitetura.',
  )
  interactions.push({ name: 'link direto da empresa', pass: true })
  await loadPreview('modulo=empresas&layout=tabela&registro=0')
  await evaluate('document.querySelector("#read-mode").click()')
  assert.ok(
    await evaluate(`(() => {
      const create = document.querySelector('#create');
      return (!create || create.hidden || getComputedStyle(create).display === 'none')
        && !document.querySelector('button[data-action=edit]');
    })()`),
    'O modo leitura deve ocultar criação e edição.',
  )
  interactions.push({ name: 'modo leitura sem criação e edição', pass: true })
  for (const extra of [
    { file: 'comparativo.html', name: 'comparativo.png', height: 1050 },
    {
      file: 'index.html?modulo=equipe&layout=ficha&registro=ana&tema=dark',
      name: 'equipe-escuro.png',
      height: 1000,
    },
  ]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: extra.height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await command('Page.navigate', {
      url: new URL(extra.file, import.meta.url).href,
    })
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      ready = await evaluate(
        extra.file === 'comparativo.html'
          ? 'document.readyState === "complete" && [...document.images].every(image => image.complete)'
          : 'document.readyState === "complete" && window.previewReady === true',
      )
      if (ready) break
      await pause(100)
    }
    assert.ok(ready, `A captura extra não inicializou: ${extra.file}`)
    await pause(300)
    const dimensions = await evaluate(`({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    })`)
    const check = {
      scenario: extra.name,
      ...dimensions,
      pass: dimensions.scroll <= 1440 && dimensions.body <= 1440,
    }
    checks.push(check)
    if (!check.pass) failures.push(check)
    const screenshot = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    await writeFile(
      new URL(extra.name, output),
      Buffer.from(screenshot.data, 'base64'),
    )
    console.log(`Captura: ${extra.name}`)
  }
  await writeFile(
    new URL('qa-report.json', output),
    JSON.stringify({ checks, failures, interactions }, null, 2) + '\n',
  )
  console.log(`Capturas em ${fileURLToPath(output)}`)
  console.log(
    `${checks.length} layouts verificados; ${failures.length} com overflow.`,
  )
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2))
  await send('Browser.close').catch(() => undefined)
} finally {
  connection?.close()
  if (browser.exitCode === null) browser.kill()
}
