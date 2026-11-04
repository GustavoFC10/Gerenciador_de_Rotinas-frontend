/* global console, setTimeout, Buffer */
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { URL } from 'node:url'

// Used only against the local preview backend, never a deployed tenant.
export async function verifyLiveApplication({
  command,
  evaluate,
  output,
  baseUrl,
}) {
  const origin = new URL(baseUrl)
  assert.ok(
    origin.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(origin.hostname),
    'Use apenas o servidor de preview local.',
  )
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  async function ready(expression) {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (await evaluate(expression)) return
      await pause(100)
    }
    throw new Error(
      `A tela não ficou pronta: ${expression}; ${await evaluate('document.body.innerText.slice(0,1800)')}`,
    )
  }
  async function navigate(path) {
    await command('Page.navigate', { url: new URL(path, origin).href })
    await ready(
      'document.title.startsWith("Preview local") && !!document.querySelector(".feature-preview-controls") && !!document.querySelector(".processes-module main h1")',
    )
  }
  async function geometry(label, width) {
    const size = await evaluate(
      '({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})',
    )
    assert.ok(
      size.scroll <= width && size.body <= width,
      `${label} excedeu ${width}px: ${JSON.stringify(size)}`,
    )
  }
  async function screenshot(name) {
    await pause(100)
    const data = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    await writeFile(new URL(name, output), Buffer.from(data.data, 'base64'))
    console.log(`Aplicação: ${name}`)
  }
  let layouts = 0
  for (const width of [1440, 1024, 768, 390, 320]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height: width < 700 ? 1100 : 1150,
      deviceScaleFactor: 1,
      mobile: width < 700,
    })
    await navigate('/processos/lista?situacao=todos')
    await ready(
      '!!document.querySelector(".process-list .lrow") && !document.querySelector(".process-list").getAttribute("aria-busy").includes("true")',
    )
    assert.equal(
      await evaluate(
        `document.querySelectorAll('.processes-module button[aria-label="Novo processo"]').length`,
      ),
      1,
    )
    assert.equal(
      await evaluate(
        'document.querySelectorAll(".processes-module input[type=search]").length',
      ),
      1,
    )
    assert.equal(
      await evaluate(
        'document.querySelectorAll(".processes-module select[multiple]").length',
      ),
      0,
    )
    await geometry('Lista', width)
    const heights = await evaluate(
      'Array.from(document.querySelectorAll(".process-list-toolbar input,.process-list-toolbar select,.process-list-more-toggle")).map(node=>Math.round(node.getBoundingClientRect().height))',
    )
    assert.ok(
      heights.every((height) => height >= 40 && height <= 44),
      `Campos desiguais: ${heights}`,
    )
    if (width === 1440 || width === 390)
      await screenshot(`app-lista-${width === 1440 ? 'desktop' : 'mobile'}.png`)
    await evaluate(
      'document.querySelector(".process-list-more-toggle").click()',
    )
    await geometry('Lista com filtros adicionais', width)
    if (width === 1440) await screenshot('app-lista-filtros.png')
    // A server request must not unmount the focused search or eat spaces.
    await evaluate(
      'document.querySelector(".process-list-search input").focus()',
    )
    await command('Input.insertText', { text: 'Empresa ' })
    await pause(25)
    assert.equal(
      await evaluate(
        'document.activeElement === document.querySelector(".process-list-search input")',
      ),
      true,
    )
    assert.equal(
      await evaluate(
        'document.querySelector(".process-list-search input").value',
      ),
      'Empresa ',
    )
    await ready(
      'document.querySelector(".process-list").getAttribute("aria-busy") === "false"',
    )
    layouts++
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height: width < 700 ? 1250 : 1250,
      deviceScaleFactor: 1,
      mobile: width < 700,
    })
    await navigate('/processos/avisos')
    await ready('!!document.querySelector(".process-alert-row")')
    await evaluate('document.querySelector(".process-alert-row").click()')
    await ready('!!document.querySelector(".process-recipient-trigger")')
    assert.equal(
      await evaluate(
        'document.querySelectorAll(".process-recipient-trigger").length',
      ),
      1,
    )
    await evaluate(
      'document.querySelector(".process-recipient-trigger").click()',
    )
    await ready(
      `document.querySelectorAll('[aria-label="Pessoas cadastradas"] .process-recipient-option').length === 5`,
    )
    const clipped = await evaluate(`(() => {
      const popup = document.querySelector('.process-recipient-popover');
      const rect = popup.getBoundingClientRect();
      const clipped = [];
      for (let ancestor = popup.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
        if (/hidden|clip|auto|scroll/.test(style.overflowY) && (rect.bottom > bounds.bottom + 1 || rect.top < bounds.top - 1)) clipped.push(ancestor.className);
      }
      popup.scrollIntoView({block:'nearest'});
      return clipped;
    })()`)
    assert.deepEqual(
      clipped,
      [],
      'O seletor não pode ser cortado pelo cartão ou outro ancestral.',
    )
    await geometry('Seletor unificado aberto', width)
    if (width === 1440 || width === 390)
      await screenshot(
        `app-destinatarios-${width === 1440 ? 'desktop' : 'mobile'}.png`,
      )
    await evaluate(
      'document.querySelector(".process-recipient-everyone input").click()',
    )
    assert.equal(
      await evaluate(
        'document.querySelector(".process-recipient-everyone input").checked',
      ),
      true,
    )
    await evaluate(
      'Array.from(document.querySelectorAll(".process-recipient-footer button")).find(node=>node.textContent.includes("Concluir seleção")).click()',
    )
    await evaluate(
      'Array.from(document.querySelectorAll(".process-alert-actions button")).find(node=>node.textContent.includes("Preparar texto")).click()',
    )
    await ready(
      'document.querySelectorAll(".process-alert-effective-recipients li").length === 5',
    )
    assert.equal(
      await evaluate(
        'new Set(Array.from(document.querySelectorAll(".process-alert-effective-recipients li")).map(node=>node.textContent)).size',
      ),
      5,
    )
    assert.equal(
      await evaluate(
        'Array.from(document.querySelectorAll(".process-alert-actions button")).find(node=>node.textContent.includes("Declarar envio")).disabled',
      ),
      true,
    )
    layouts++
  }
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1150,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await navigate('/processos/lista?situacao=todos')
  await ready('!!document.querySelector(".process-list .lrow")')
  await evaluate(
    'document.querySelector(".feature-preview-controls > button").click()',
  )
  await ready(`!!document.querySelector('[aria-label="Tema do preview"]')`)
  await evaluate(
    `Array.from(document.querySelectorAll('[aria-label="Tema do preview"] button')).find(node=>node.textContent.includes("Escuro")).click(); document.querySelector(".feature-preview-controls > button").click()`,
  )
  await ready('document.documentElement.dataset.theme === "dark"')
  await screenshot('app-lista-escura.png')
  console.log(
    `${layouts} layouts reais verificados, incluindo seletor unificado, Todos, preparo sem declaração e digitação com foco preservado.`,
  )
}
