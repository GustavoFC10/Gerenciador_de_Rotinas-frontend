import { useMemo, useState, type FormEvent } from 'react'

import Button from '../../ui/Button'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import TextField from '../../ui/TextField'
import type { AdHocTaskInput } from '../../../services/taskService'
import type { EntityId, RoutineControlData } from '../../../types/domain'

interface TaskFormValues {
  title: string
  description: string
  observation: string
  clientCompanyId: string
  routineId: string
  departmentId: string
  dueDate: string
}

interface LooseTaskFormModalProps {
  data: RoutineControlData
  departmentIds: EntityId[]
  onClose: () => void
  onCreate: (input: AdHocTaskInput) => Promise<void>
}

function LooseTaskFormModal({
  data,
  departmentIds,
  onClose,
  onCreate,
}: LooseTaskFormModalProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    buildInitialValues(data, departmentIds),
  )
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const routinesForDepartment = useMemo(
    () =>
      data.routines.filter(
        (routine) => routine.departmentId === values.departmentId,
      ),
    [data.routines, values.departmentId],
  )

  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) {
    setError(null)
    setValues((current) => {
      if (key === 'departmentId') {
        const routineStillBelongsToDepartment = data.routines.some(
          (routine) =>
            routine.id === current.routineId && routine.departmentId === value,
        )

        return {
          ...current,
          departmentId: value,
          routineId: routineStillBelongsToDepartment ? current.routineId : '',
        }
      }

      return { ...current, [key]: value }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!values.title.trim()) {
      setError('Informe o título da tarefa.')
      return
    }

    if (!values.departmentId) {
      setError('Informe o departamento da tarefa.')
      return
    }

    setIsSubmitting(true)

    try {
      await onCreate(toAdHocTaskInput(values))
      onClose()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível criar a tarefa.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      >
        <header className="border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
                Tarefa avulsa
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text-strong)]">
                Adicionar tarefa avulsa
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="grid size-9 place-items-center rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] text-lg font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
              aria-label="Fechar formulário"
              title="Fechar formulário"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-panel-soft-bg)] px-4 py-4 sm:px-5">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-bold text-[var(--status-error-text)]"
            >
              {error}
            </p>
          )}

          <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 sm:p-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_11rem]">
              <TextField
                label="Título"
                value={values.title}
                onChange={(event) => update('title', event.currentTarget.value)}
                required
              />
              <TextField
                label="Prazo"
                type="date"
                value={values.dueDate}
                onChange={(event) =>
                  update('dueDate', event.currentTarget.value)
                }
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Descrição"
                  value={values.description}
                  onChange={(event) =>
                    update('description', event.currentTarget.value)
                  }
                  placeholder="Detalhe o que precisa ser feito."
                  rows={5}
                />
              </div>
            </div>
          </section>

          <section className="mt-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-control-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] sm:px-5"
              aria-expanded={isAdvancedOpen}
            >
              <span>
                <span className="block text-sm font-black text-[var(--color-text-strong)]">
                  Relações e observação
                </span>
                <span className="mt-1 block text-xs font-medium text-[var(--color-text-muted)]">
                  Departamento é obrigatório; empresa e rotina são opcionais.
                </span>
              </span>
              <span className="text-xl font-black text-[var(--color-text-muted)]">
                {isAdvancedOpen ? '−' : '+'}
              </span>
            </button>

            {isAdvancedOpen && (
              <div className="grid gap-4 border-t border-[var(--color-divider)] px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Select
                  label="Departamento"
                  value={values.departmentId}
                  onChange={(event) =>
                    update('departmentId', event.currentTarget.value)
                  }
                >
                  {data.departments
                    .filter((department) =>
                      departmentIds.includes(department.id),
                    )
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </Select>
                <Select
                  label="Empresa"
                  value={values.clientCompanyId}
                  onChange={(event) =>
                    update('clientCompanyId', event.currentTarget.value)
                  }
                >
                  <option value="">Sem empresa</option>
                  {data.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.code} — {client.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Rotina"
                  value={values.routineId}
                  onChange={(event) =>
                    update('routineId', event.currentTarget.value)
                  }
                >
                  <option value="">Sem rotina</option>
                  {routinesForDepartment.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </Select>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Observação"
                    value={values.observation}
                    onChange={(event) =>
                      update('observation', event.currentTarget.value)
                    }
                    placeholder="Observação opcional."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-4 py-4 sm:px-5">
          <Button
            type="button"
            tone="neutral"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" tone="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Criando…' : 'Criar tarefa'}
          </Button>
        </footer>
      </form>
    </div>
  )
}

function buildInitialValues(
  data: RoutineControlData,
  departmentIds: EntityId[],
): TaskFormValues {
  return {
    title: '',
    description: '',
    observation: '',
    clientCompanyId: '',
    routineId: '',
    departmentId:
      data.departments.find((department) =>
        departmentIds.includes(department.id),
      )?.id ?? '',
    dueDate: '',
  }
}

function toAdHocTaskInput(values: TaskFormValues): AdHocTaskInput {
  const result: AdHocTaskInput = {
    title: values.title.trim(),
    departmentId: values.departmentId,
  }

  if (values.description.trim()) result.description = values.description.trim()
  if (values.observation.trim()) result.observation = values.observation.trim()
  if (values.clientCompanyId) result.clientCompanyId = values.clientCompanyId
  if (values.routineId) result.routineId = values.routineId
  if (values.dueDate) result.dueDate = values.dueDate

  return result
}

export default LooseTaskFormModal
