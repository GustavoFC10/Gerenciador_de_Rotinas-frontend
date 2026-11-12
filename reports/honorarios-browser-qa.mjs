import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'

const browserProfile = await mkdtemp(join(tmpdir(),'codex-honorarios-qa-'))
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--disable-gpu-sandbox','--in-process-gpu','--no-sandbox','--no-first-run','--no-default-browser-check','--remote-debugging-port=9227',`--user-data-dir=${browserProfile}`,'about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
let browserOutput=''
browser.stderr.on('data',chunk => {browserOutput+=String(chunk)})
browser.stdout.on('data',chunk => {browserOutput+=String(chunk)})
for(let attempt=0;attempt<60;attempt++) {
  try {await fetch('http://127.0.0.1:9227/json/version');break} catch {if(attempt===59) throw new Error(`Edge startup failed (${browser.exitCode}): ${browserOutput}`);await new Promise(resolve=>setTimeout(resolve,200))}
}

const params = JSON.parse(await readFile('docs/honorarios_base/config-params.json', 'utf8'))
const module = {module:'honorarios',role:'manager',globalAccess:false,actions:['read','edit','applyAdjustment','manage'],sectors:[]}
const membership = {id:'qa-member',displayName:'Camila Andrade',role:'owner',status:'active',organization:{id:'qa-office',name:'Jaralcon Assessoria Contábil',slug:'qa',timezone:'America/Sao_Paulo'},modules:[module]}
const session = {user:{id:'qa-user',email:'qa@example.invalid',isPlatformStaff:false},memberships:[membership],activeMembership:membership}
const office = {nome:'Jaralcon Assessoria Contábil',crc:'',cidade:'Curitiba/PR',telefone:'(41) 99967-3799',email:'contato@example.invalid',site:'jaralcon.com.br',logo:'',validadeDias:15,condicoes:'Serviços fora do escopo são orçados à parte.',escopoExtra:'Atendimento em horário comercial.',units:[]}
const profile = {regime:'simples',segmento:'servicos',inativa:false,funcionarios:3,socios:1,xml:100,notas:20,emiteNF:true,filiais:0,filiaisInativas:0,faturamento:'50000.00',usarHoras:false,horas:'0.00',servicos:[],anomalias:[]}
const calculation = {total:'620.00',anual:'8060.00',tabela:'620.00',custo:'0.00',valorHoras:'0.00',ajuste:'0.00',linhas:[{label:'Honorário base',value:'450.00'},{label:'Faixa de faturamento',value:'67.50'},{label:'Funcionários adicionais',value:'90.00'},{label:'Arredondamento',value:'12.50'}]}
const company = {id:'qa-company',name:'Empresa de demonstração',cnpj:'12345678000190',code:'001'}
const client = {id:'qa-client',companyId:company.id,company,profile,currentFee:'500.00',adjustmentDate:'2025-11-15',contact:'Maria — financeiro',notes:'',version:1,paramsVersion:1,archivedAt:null,calculation,difference:'-120.00',alignment:'abaixo',adjustment:{dueDate:'2026-11-15',days:3,notice:true,current:'500.00',full:'522.90',value:'522.90',table:'620.00',blocked:false,limited:false,index:{nome:'IPCA',pct:4.58}}}
const dashboard = {paramsVersion:1,year:2026,clients:{count:24,current:'18600.00',suggested:'22800.00',potential:'4200.00',byAlignment:{abaixo:12,alinhado:9,acima:3},adjustmentsDue:4,adjustmentPlan:{maxIncreasePct:20,count:12,monthlyGain:'2340.00',annualGain:'30420.00',entries:[{clientId:client.id,current:'500.00',proposed:'600.00',gain:'100.00',full:false}]}},quotes:{count:18,byStatus:{rascunho:3,enviado:7,aceito:6,recusado:2},acceptedValue:'4860.00',openCount:10,openValue:'7200.00',expiringCount:2,acceptanceRate:0.75}}
const emptyDashboard = {paramsVersion:1,year:2026,clients:{count:0,current:'0.00',suggested:'0.00',potential:'0.00',byAlignment:{},adjustmentsDue:0,adjustmentPlan:{maxIncreasePct:20,count:0,monthlyGain:'0.00',annualGain:'0.00',entries:[]}},quotes:{count:0,byStatus:{},acceptedValue:'0.00',openCount:0,openValue:'0.00',expiringCount:0,acceptanceRate:null}}
const page = results => ({count:results.length,next:null,previous:null,results})
const mode = process.argv[2] ?? 'desktop'
const target = await (await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json()
const socket = new WebSocket(target.webSocketDebuggerUrl)
socket.addEventListener('close',event=>console.error('CDP closed',event.code,event.reason,browserOutput))
socket.addEventListener('error',event=>console.error('CDP error',event.message,browserOutput))
await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let serial=0
const pending=new Map()
const errors=[]
socket.addEventListener('message',message => {
  const packet=JSON.parse(message.data)
  if(packet.id) {const waiter=pending.get(packet.id);pending.delete(packet.id);if(packet.error) waiter.reject(new Error(JSON.stringify(packet.error)));else waiter.resolve(packet.result)}
  if(packet.method==='Runtime.exceptionThrown') errors.push(packet.params.exceptionDetails.exception?.description ?? packet.params.exceptionDetails.text)
})
function send(method,params={}) {return new Promise((resolve,reject) => {const id=++serial;const timeout=setTimeout(()=>reject(new Error(`CDP timeout ${method}: ${browserOutput}`)),10000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value)},reject:error=>{clearTimeout(timeout);reject(error)}});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression) {const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);return result.result.value}
async function until(expression) {for(let attempt=0;attempt<120;attempt++){if(await evaluate(expression)) return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`Timeout: ${expression}\n${await evaluate('document.body.innerText')}`)}
async function clickLink(path) {await evaluate(`document.querySelector('a[href="${path}"]').click()`)}
async function screenshot(name) {const output=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`reports/${name}.png`,Buffer.from(output.data,'base64'))}
const transport = `(() => {
  const fixtures=${JSON.stringify({session,module,office,params,calculation,client,company,dashboard,emptyDashboard,pageEmpty:page([]),pageClients:page([client]),pageCompanies:page([company])})};
  const original=window.fetch.bind(window);window.__honorariosRequests=[];
  window.fetch=async (input,options={}) => {
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(!url.pathname.startsWith('/api/v1/')) return original(input,options);
    window.__honorariosRequests.push({path:url.pathname,method:options.method??'GET',csrf:!!new Headers(options.headers).get('X-CSRFToken')});
    let payload;
    if(url.pathname==='/api/v1/auth/csrf/') payload={csrfToken:'qa-csrf-token'};
    else if(url.pathname==='/api/v1/auth/session/') payload=fixtures.session;
    else if(url.pathname==='/api/v1/module-permissions/') payload={modules:[fixtures.module]};
    else if(url.pathname==='/api/v1/honorarios/configuration/') payload={data:{version:1,params:fixtures.params,office:fixtures.office,permissions:{read:true,edit:true,applyAdjustment:true,manage:true}}};
    else if(url.pathname==='/api/v1/honorarios/dashboard/') payload={data:${mode === 'empty' ? 'fixtures.emptyDashboard' : 'fixtures.dashboard'}};
    else if(url.pathname==='/api/v1/honorarios/calculate/') payload={data:{paramsVersion:1,calculation:fixtures.calculation,plans:[]}};
    else if(url.pathname==='/api/v1/honorarios/company-options/') payload={data:fixtures.pageCompanies};
    else if(url.pathname==='/api/v1/honorarios/clients/') payload={data:fixtures.pageClients};
    else if(url.pathname==='/api/v1/honorarios/clients/qa-client/') payload={data:fixtures.client};
    else if(url.pathname==='/api/v1/honorarios/quotes/'||url.pathname.endsWith('/history/')) payload={data:fixtures.pageEmpty};
    else payload={};
    return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}});
  };
})();`
try {
  await send('Runtime.enable');await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument',{source:transport})
  await send('Emulation.setDeviceMetricsOverride',{width:mode==='mobile'?390:1440,height:mode==='mobile'?844:1000,deviceScaleFactor:1,mobile:mode==='mobile'})
  await send('Page.navigate',{url:'http://127.0.0.1:4177/honorarios'})
  await until(`document.body.textContent.includes('Receita mensal atual')`)
  assert.ok(await evaluate(`document.querySelector('a[href="/hub"]')!==null`),'Return to HUB exists')
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false,'Dashboard must fit viewport')
  await screenshot(`honorarios-${mode}`)
  if(mode!=='mobile') {
    await clickLink('/honorarios/novo');await until(`document.body.textContent.includes('Mensalidade sugerida')`)
    assert.ok((await evaluate('window.__honorariosRequests')).some(item=>item.path.endsWith('/calculate/')&&item.method==='POST'&&item.csrf),'Calculator calls POST with CSRF')
    await screenshot('honorarios-novo-orcamento')
    await clickLink('/honorarios/orcamentos');await until(`document.body.textContent.includes('Nenhum orçamento encontrado')`)
    await clickLink('/honorarios/clientes');await until(`document.body.textContent.includes('Empresa de demonstração')`)
    await screenshot('honorarios-clientes')
    await clickLink('/honorarios/parametros');await until(`document.body.textContent.includes('Nome do escritório')`)
    await screenshot('honorarios-parametros')
    await clickLink('/hub');await until(`document.body.textContent.includes('Onde vamos trabalhar?')`)
  } else {
    await evaluate(`document.querySelector('button[aria-label="Abrir navegação"]').click()`)
    await until(`document.querySelector('[role="dialog"]')!==null`)
    await screenshot('honorarios-mobile-menu')
    await clickLink('/honorarios/novo');await until(`document.body.textContent.includes('Mensalidade sugerida')`)
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false,'Calculator must fit mobile viewport')
    await screenshot('honorarios-mobile-novo')
  }
  assert.deepEqual(errors,[],'No browser exceptions')
  console.log(JSON.stringify({mode,result:'passed',requests:await evaluate('window.__honorariosRequests'),errors},null,2))
} finally {
  await send('Browser.close').catch(()=>{})
  socket.close()
  if(browser.exitCode===null) browser.kill()
}
