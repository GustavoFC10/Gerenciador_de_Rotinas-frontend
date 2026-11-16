import { useEffect, useState } from 'react'
import Dialog from '../../../src/components/ui/Dialog'
import Button from '../../../src/components/ui/Button'
import Select from '../../../src/components/ui/Select'
import TextField from '../../../src/components/ui/TextField'

export interface PreviewCompany {
  id: string
  name: string
  code?: string
  legalName?: string
  cnpj?: string
  email?: string
  phone?: string
  taxRegime?: string
  status: 'active' | 'archived'
}
interface RoutineSettings {
  department: string
  screen: string
  startsOn: string
  routineIds: string[]
}
export interface CompanyPreviewStore {
  list: () => PreviewCompany[]
  getRoutines: (
    id: string,
  ) => (RoutineSettings & { contexts?: Record<string, RoutineSettings> }) | null
  setRoutines: (id: string, settings: RoutineSettings) => void
}
const contexts: Record<
  string,
  { screens: string[]; routines: [string, string][] }
> = {
  Fiscal: {
    screens: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    routines: [
      ['das', 'Apurar e enviar DAS'],
      ['dctfweb', 'DCTFWeb'],
      ['notas', 'Conferir notas fiscais'],
    ],
  },
  Contábil: {
    screens: ['Contábil'],
    routines: [
      ['balancete', 'Balancete mensal'],
      ['balanco', 'Conferir balanço'],
    ],
  },
  Pessoal: {
    screens: ['Departamento pessoal'],
    routines: [
      ['folha', 'Folha de pagamento'],
      ['ferias', 'Conferir férias'],
    ],
  },
}

export default function RoutineCompanyDialog({
  company,
  store,
  onClose,
}: {
  company: PreviewCompany
  store: CompanyPreviewStore
  onClose: () => void
}) {
  const settingsFor = (department: string): RoutineSettings => {
    const saved = store.getRoutines(company.id)
    return (
      saved?.contexts?.[department] ||
      (saved?.department === department ? saved : null) || {
        department,
        screen: contexts[department]!.screens[0]!,
        startsOn: '',
        routineIds: [],
      }
    )
  }
  const [settings, setSettings] = useState(() =>
    settingsFor(store.getRoutines(company.id)?.department || 'Fiscal'),
  )
  const [baseline, setBaseline] = useState(() => JSON.stringify(settings))
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dirty = JSON.stringify(settings) !== baseline
  const archived = company.status === 'archived'
  const change = (next: Partial<RoutineSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    setMessage('')
    setError('')
  }
  const guard = (action: () => void) => {
    if (dirty) setPending(() => action)
    else action()
  }
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const central = `empresas.html?empresa=${encodeURIComponent(company.id)}`
  return (
    <>
      <Dialog
        open
        title={company.name}
        description={`Rotinas · Código ${company.code || 'não informado'} · ${company.cnpj || 'CNPJ não informado'}`}
        size="lg"
        className="routine-company-dialog"
        onClose={() => guard(onClose)}
        footer={
          <>
            <a
              className="ui-button ui-button--md mr-auto text-[var(--color-brand)]"
              href={central}
              onClick={(event) => {
                if (dirty) {
                  event.preventDefault()
                  guard(() => {
                    window.location.href = central
                  })
                }
              }}
            >
              Cadastro geral da empresa ↗
            </a>
            <Button onClick={() => guard(onClose)}>Fechar</Button>
            {!archived && (
              <Button
                tone="primary"
                type="submit"
                form="routine-company-window-form"
              >
                Salvar configuração
              </Button>
            )}
          </>
        }
      >
        <form
          id="routine-company-window-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (archived) return
            try {
              store.setRoutines(company.id, settings)
              setBaseline(JSON.stringify(settings))
              setMessage('Configuração salva somente nesta prévia.')
              setError('')
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'Não foi possível salvar.',
              )
            }
          }}
        >
          <p className="mb-5 text-sm text-[var(--color-text-muted)]">
            Dados específicos de Rotinas. Consulte as informações completas no
            cadastro geral.
          </p>
          {archived && (
            <p className="mb-5 text-sm text-[var(--status-error-text)]">
              Empresa arquivada. Restaure-a no cadastro geral para alterar seus
              vínculos.
            </p>
          )}
          <fieldset disabled={archived} className="m-0 border-0 p-0">
            <div className="grid grid-cols-2 gap-5">
              <Select
                label="Departamento"
                name="department"
                value={settings.department}
                onChange={(event) => {
                  const department = event.target.value
                  guard(() => {
                    const next = settingsFor(department)
                    setSettings(next)
                    setBaseline(JSON.stringify(next))
                    setMessage('')
                    setError('')
                  })
                }}
              >
                {Object.keys(contexts).map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </Select>
              <Select
                label="Tela operacional"
                name="screen"
                value={settings.screen}
                onChange={(event) => change({ screen: event.target.value })}
              >
                {contexts[settings.department]!.screens.map((screen) => (
                  <option key={screen}>{screen}</option>
                ))}
              </Select>
              <TextField
                label="Início dos vínculos"
                name="startsOn"
                type="date"
                value={settings.startsOn}
                required={settings.routineIds.length > 0}
                onChange={(event) => change({ startsOn: event.target.value })}
              />
            </div>
            <fieldset className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4">
              <legend className="px-2 text-sm font-semibold">
                Rotinas vinculadas
              </legend>
              <div className="grid gap-4">
                {contexts[settings.department]!.routines.map(([id, label]) => (
                  <label key={id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="routineIds"
                      value={id}
                      checked={settings.routineIds.includes(id)}
                      onChange={(event) =>
                        change({
                          routineIds: event.target.checked
                            ? [...settings.routineIds, id]
                            : settings.routineIds.filter(
                                (value) => value !== id,
                              ),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-[var(--status-error-text)]"
            >
              {error}
            </p>
          )}
          <p
            role="status"
            className="mt-4 text-sm text-[var(--color-text-muted)]"
          >
            {message || (dirty ? 'Alterações não salvas' : '')}
          </p>
        </form>
      </Dialog>
      <Dialog
        open={!!pending}
        title="Descartar alterações de Rotinas?"
        onClose={() => setPending(null)}
        size="sm"
        footer={
          <>
            <Button onClick={() => setPending(null)}>Continuar editando</Button>
            <Button
              tone="primary"
              onClick={() => {
                const action = pending
                setPending(null)
                action?.()
              }}
            >
              Descartar alterações
            </Button>
          </>
        }
      >
        A configuração deste departamento ainda não foi salva.
      </Dialog>
    </>
  )
}
