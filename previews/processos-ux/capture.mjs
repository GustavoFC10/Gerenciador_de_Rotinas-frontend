/* global process, console, setTimeout, WebSocket, Buffer */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { verifyLiveApplication } from './capture-app.mjs'

// Local browser QA of synthetic previews. Always use a fresh, isolated profile.
const browserPath =
  process.env.UX_BROWSER_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const profile = await mkdtemp(join(tmpdir(), 'jaralcon-ux-browser-'))
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
  const [, socketPath] = portData.trim().split(/\r?\n/)
  const port = Number(portData.split(/\r?\n/)[0])
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
    if (response.error) request.reject(new Error(response.error.message))
    else request.resolve(response.result)
  })
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
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
  if (process.env.UX_APP_URL) {
    await verifyLiveApplication({
      command,
      evaluate,
      output,
      baseUrl: process.env.UX_APP_URL,
    })
  } else {
    let layouts = 0
    for (const [file, widths] of [
      ['index.html', [1440, 1024, 768, 390, 320]],
      ['recipients.html', [1440, 768, 390, 320]],
    ]) {
      for (const width of widths) {
        await command('Emulation.setDeviceMetricsOverride', {
          width,
          height: width < 700 ? 1400 : 1200,
          deviceScaleFactor: 1,
          mobile: width < 700,
        })
        await command('Page.navigate', {
          url: new URL(file, import.meta.url).href,
        })
        for (let attempt = 0; attempt < 60; attempt++) {
          const ready = await evaluate(
            file === 'index.html'
              ? 'document.readyState === "complete" && !!document.querySelector(".process-row")'
              : 'document.readyState === "complete" && !!document.querySelector(".alert-row")',
          )
          if (ready) break
          await pause(100)
        }
        await pause(150)
        const dimensions = await evaluate(
          '({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})',
        )
        assert.ok(
          dimensions.scroll <= width && dimensions.body <= width,
          `${file} com overflow em ${width}px: ${JSON.stringify(dimensions)}`,
        )
        if (file === 'index.html') {
          const heights = await evaluate(
            'Array.from(document.querySelectorAll(".filter-row input,.filter-row select,.more-button")).map(node => Math.round(node.getBoundingClientRect().height))',
          )
          assert.ok(
            heights.every((height) => height >= 40 && height <= 44),
            `Alturas de filtros incoerentes: ${heights}`,
          )
        }
        layouts++
        if ([1440, 390].includes(width)) {
          if (file === 'recipients.html' && width === 390)
            await evaluate('document.querySelector(".alert-row").click()')
          if (file === 'recipients.html')
            await evaluate(
              'document.querySelector("#recipient-trigger").click(); document.querySelector("#recipient-popover").scrollIntoView({block:"nearest"})',
            )
          const screenshot = await command('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          })
          const label = file === 'index.html' ? 'lista' : 'destinatarios'
          const name = `${label}-${width === 1440 ? 'desktop' : 'mobile'}.png`
          await writeFile(
            new URL(name, output),
            Buffer.from(screenshot.data, 'base64'),
          )
          console.log(`Captura: ${name}`)
          if (file === 'index.html' && width === 1440) {
            await evaluate('document.querySelector("#theme").click()')
            const dark = await command('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            })
            await writeFile(
              new URL('lista-escura.png', output),
              Buffer.from(dark.data, 'base64'),
            )
          }
        }
        if (file === 'index.html') {
          await evaluate(
            'if (document.documentElement.dataset.theme === "dark") document.querySelector("#theme").click(); document.querySelector("#more-toggle").click(); document.querySelector("#customize-status").click(); document.querySelector("input[value=atrasado]").click()',
          )
          const expanded = await evaluate(
            '({width:innerWidth,scroll:document.documentElement.scrollWidth,heights:Array.from(document.querySelectorAll(".filter-row input,.filter-row select,.more-button")).map(node=>Math.round(node.getBoundingClientRect().height))})',
          )
          assert.ok(
            expanded.scroll <= width &&
              expanded.heights.every((height) => height >= 40 && height <= 44),
            `Painel de situações alterou o layout em ${width}px`,
          )
          if (width === 1440) {
            const filtered = await command('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            })
            await writeFile(
              new URL('lista-filtros.png', output),
              Buffer.from(filtered.data, 'base64'),
            )
          }
        }
      }
    }
    console.log(
      `${layouts} layouts sem overflow horizontal; campos com alturas consistentes.`,
    )
  }
  console.log(`Capturas em ${fileURLToPath(output)}`)
  await send('Browser.close').catch(() => undefined)
} finally {
  connection?.close()
  if (browser.exitCode === null) browser.kill()
}
