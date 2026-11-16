import { readFile, writeFile } from 'node:fs/promises'
import vm from 'node:vm'
import { URL } from 'node:url'
import ts from 'typescript'

// Offline extraction of the common, fictional Processos fixture. No app/API executes.
const base = new URL('./processos-react/fixtures.ts', import.meta.url)
const source = ts.createSourceFile(
  'fixtures.ts',
  await readFile(base, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
)
const localSource = ts.factory.updateSourceFile(
  source,
  source.statements.filter((statement) => !ts.isImportDeclaration(statement)),
)
const code = ts.transpileModule(ts.createPrinter().printFile(localSource), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText
const context = {
  exports: {},
  workflowFixtures: JSON.parse(
    await readFile(
      new URL('../../src/preview/workflows.json', import.meta.url),
      'utf8',
    ),
  ),
}
vm.runInNewContext(code, context, { timeout: 1000 })
const catalog = context.exports.catalog
const processes = JSON.parse(JSON.stringify(context.exports.processes))

// Deliberate relationship cases, shared by A/B/C/D: a company can have several processes.
for (const [index, original] of [
  [12, 0],
  [13, 1],
  [14, 0],
  [15, 3],
]) {
  processes[index].companyId = processes[original].companyId
  processes[index].empresa = processes[original].empresa
}
for (const index of [16, 17]) {
  processes[index].companyId = null
  processes[index].companyLinkRequired = true
  processes[index].empresa = 'Empresa em abertura'
}
for (const item of processes) {
  if (!item.companyId) continue
  item.companyReference = {
    id: item.companyId,
    code: item.companyId.replace('review-company-', '').padStart(3, '0'),
    name: item.empresa,
    legalName: `${item.empresa} Ltda.`,
    cnpj: '',
    status: 'active',
  }
}
await writeFile(
  new URL('./organizacao-processos-dados.js', import.meta.url),
  `/* global window */\n/* Generated offline by organizacao-processos-gerar-dados.mjs. Fictional data only. */\nwindow.JaralProcessOrganizationData = ${JSON.stringify({ catalog, processes, referenceDate: '2026-11-15' }, null, 2)}\n`,
)
