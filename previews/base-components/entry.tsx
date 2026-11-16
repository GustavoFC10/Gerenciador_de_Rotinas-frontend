import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Button from '../../src/components/ui/Button'
import IconButton from '../../src/components/ui/IconButton'
import TextField from '../../src/components/ui/TextField'
import Select from '../../src/components/ui/Select'
import Textarea from '../../src/components/ui/Textarea'
import Card from '../../src/components/ui/Card'
import Badge from '../../src/components/ui/Badge'
import Dialog from '../../src/components/ui/Dialog'
import FloatingMenu from '../../src/components/ui/FloatingMenu'
import Combobox from '../../src/components/ui/Combobox'
import { statusTone, feeAlignmentTone } from '../../src/constants/designTokens'
import '../../src/styles/index.css'
import './review.css'

const companies = [
  {
    value: '1',
    label: 'Aurora Comércio',
    description: 'CNPJ 12.345.678/0001-95 · Código 001',
    keywords: ['12345678000195', '001'],
  },
  {
    value: '2',
    label: 'Cedro Tecnologia',
    description: 'CNPJ 23.456.789/0001-00 · Código 002',
    keywords: ['23456789000100', '002'],
  },
  {
    value: '3',
    label: 'Horizonte Serviços',
    description: 'Código 003',
    keywords: ['003'],
  },
]

export default function App() {
  const [dark, setDark] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const [company, setCompany] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const anchor = useRef<HTMLButtonElement>(null)
  return (
    <>
      <header className="base-review-header">
        <div>
          <strong>JARALCON</strong>
          <span>Componentes base · React real</span>
        </div>
        <a href="../revisao-ux/index.html">Prévias dos módulos ↗</a>
        <Button
          id="theme-toggle"
          onClick={() => {
            setDark(!dark)
            document.documentElement.dataset.theme = dark ? 'light' : 'dark'
          }}
        >
          Tema {dark ? 'claro' : 'escuro'}
        </Button>
      </header>
      <main className="base-review-main">
        <div className="base-review-title">
          <h1>Base visual implementada</h1>
          <Badge variant="brand">Etapa 1</Badge>
        </div>
        <p className="base-review-note">
          Esta página importa os componentes de src. Os dados são fictícios e as
          ações não enviam informações.
        </p>
        <div className="base-review-grid">
          <Card>
            <h2>Controles e hierarquia</h2>
            <div className="base-review-row">
              <Button tone="primary" id="primary-md">
                Salvar alterações
              </Button>
              <Button>Cancelar</Button>
              <Button tone="selected">Selecionado</Button>
              <Button tone="ghost">Ação discreta</Button>
            </div>
            <div className="base-review-row">
              <Button size="sm">Compacto · 32 px</Button>
              <Button size="lg">Destaque · 44 px</Button>
              <Button disabled tone="primary">
                Indisponível
              </Button>
              <IconButton
                label="Mais opções"
                ref={anchor}
                onClick={() => setMenu(!menu)}
              >
                •••
              </IconButton>
            </div>
            <FloatingMenu
              anchorRef={anchor}
              isOpen={menu}
              onDismiss={() => setMenu(false)}
              ariaLabel="Mais opções"
            >
              <button
                onClick={() => {
                  setMessage('Ação de demonstração concluída.')
                  setMenu(false)
                }}
              >
                Executar demonstração
              </button>
            </FloatingMenu>
            <div className="base-review-row">
              <Badge>Rascunho</Badge>
              <Badge variant="brand">Administração</Badge>
              <Button id="open-dialog" onClick={() => setDialog(true)}>
                Abrir diálogo
              </Button>
            </div>
            <p role="status" className="base-review-note">
              {message}
            </p>
          </Card>
          <Card>
            <h2>Campos com medidas consistentes</h2>
            <div className="base-review-fields">
              <TextField
                id="base-name"
                label="Nome fantasia *"
                placeholder="Ex.: Aurora Comércio"
              />
              <Select id="base-regime" label="Regime tributário">
                <option>Simples Nacional</option>
                <option>Lucro Presumido</option>
                <option>Lucro Real</option>
              </Select>
              <TextField
                label="Campo somente leitura"
                readOnly
                value="Código 001"
              />
              <TextField
                label="Campo desativado"
                disabled
                value="Indisponível"
              />
              <TextField
                label="Campo com erro"
                aria-invalid="true"
                aria-describedby="base-error"
                defaultValue="Dado incompleto"
              />
              <p id="base-error" className="base-review-error">
                Revise o preenchimento.
              </p>
            </div>
          </Card>
          <Card>
            <h2>Busca e seleção no mesmo campo</h2>
            <Combobox
              id="base-company"
              label="Empresa"
              options={companies}
              value={company}
              onValueChange={setCompany}
              placeholder="Nome, código ou CNPJ"
              required
              hint="Digite para filtrar e selecione uma empresa."
            />
          </Card>
          <Card>
            <h2>Cores com significados próprios</h2>
            <p className="base-review-note">Estados de Rotinas preservados</p>
            <div className="base-review-row">
              {Object.entries(statusTone).map(([key, tone]) => (
                <span
                  key={key}
                  data-routine-status={key}
                  className={`base-review-status border ${tone.surface}`}
                >
                  <i className={tone.dot} />
                  {tone.label}
                </span>
              ))}
            </div>
            <p className="base-review-note">Comparação financeira</p>
            <div className="base-review-row">
              {Object.entries(feeAlignmentTone).map(([key, tone]) => (
                <span
                  key={key}
                  data-fee-status={key}
                  className={`base-review-status border ${tone}`}
                >
                  {key === 'abaixo'
                    ? 'Podem aumentar'
                    : key === 'alinhado'
                      ? 'Alinhados'
                      : 'Acima'}
                </span>
              ))}
            </div>
          </Card>
        </div>
        <p className="base-review-note">
          Para conferir a estrutura preservada:{' '}
          <a href="../revisao-ux/base-visual.html">Planilha e Agenda reais</a> ·{' '}
          <a href="../revisao-ux/empresas-rotinas.html">
            Catálogos reais de Rotinas
          </a>
          .
        </p>
      </main>
      <Dialog
        open={dialog}
        title="Selecionar empresa"
        onClose={() => setDialog(false)}
        footer={
          <>
            <Button onClick={() => setDialog(false)}>Cancelar</Button>
            <Button tone="primary" onClick={() => setDialog(false)}>
              Concluir demonstração
            </Button>
          </>
        }
      >
        <div className="base-review-dialog-fields">
          <Combobox
            id="dialog-company"
            label="Empresa"
            options={companies}
            value={company}
            onValueChange={setCompany}
            placeholder="Nome, código ou CNPJ"
          />
          <Textarea
            label="Observações"
            rows={3}
            placeholder="Informações adicionais"
          />
        </div>
      </Dialog>
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
