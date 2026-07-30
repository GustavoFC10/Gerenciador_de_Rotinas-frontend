import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import {
  clientTaxRegimeOptions,
  routineRecurrenceOptions,
} from '../../constants/entityOptions'
import type {
  Client,
  ClientDivisionAssignment,
  ClientTaxRegime,
  Department,
  DepartmentDivision,
  Routine,
  RoutineRecurrence,
  UpdateClientInput,
  UpdateRoutineInput,
} from '../../types/domain'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import TextField from '../ui/TextField'

type EntityEditModalProps =
  | {
      type: 'client'
      entity: Client
      departments: Department[]
      divisions: DepartmentDivision[]
      onClose: () => void
      onSave: (changes: UpdateClientInput) => void
    }
  | {
      type: 'routine'
      entity: Routine
      onClose: () => void
      onSave: (changes: UpdateRoutineInput) => void
    }

function EntityEditModal(props: EntityEditModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const dialog = document.querySelector<HTMLElement>(
      '[data-entity-edit-dialog]',
    )
    const focusableSelector = [
      'button:not([disabled])',
      'select:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        props.onClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusableElements = [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => element.getClientRects().length > 0)

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus()
    }
  }, [props])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
    >
      {props.type === 'client' ? (
        <ClientEditForm {...props} />
      ) : (
        <RoutineEditForm {...props} />
      )}
    </div>
  )
}

function ClientEditForm({
  entity,
  departments,
  divisions,
  onClose,
  onSave,
}: Extract<EntityEditModalProps, { type: 'client' }>) {
  const [name, setName] = useState(entity.name)
  const [code, setCode] = useState(entity.code)
  const [legalName, setLegalName] = useState(entity.legalName ?? '')
  const [document, setDocument] = useState(entity.document ?? '')
  const [email, setEmail] = useState(entity.email ?? '')
  const [phone, setPhone] = useState(entity.phone ?? '')
  const [taxRegime, setTaxRegime] = useState<ClientTaxRegime | ''>(
    entity.taxRegime ?? '',
  )
  const [divisionAssignments, setDivisionAssignments] = useState<
    ClientDivisionAssignment[]
  >(entity.divisionAssignments ?? [])
  const [active, setActive] = useState(entity.active !== false)
  const [error, setError] = useState('')
  const departmentsWithDivisions = departments
    .map((department) => ({
      department,
      divisions: divisions
        .filter(
          (division) =>
            division.departmentId === department.id &&
            division.active !== false,
        )
        .sort((left, right) => left.position - right.position),
    }))
    .filter((group) => group.divisions.length > 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !code.trim()) {
      setError('Informe o nome e o código interno da empresa.')
      return
    }

    const hasMissingDivision = departmentsWithDivisions.some(
      ({ department }) =>
        !divisionAssignments.some(
          (assignment) => assignment.departmentId === department.id,
        ),
    )

    if (hasMissingDivision) {
      setError('Selecione a divisão operacional de cada departamento.')
      return
    }

    onSave({
      name: name.trim(),
      code: code.trim(),
      legalName: legalName.trim() || undefined,
      document: document.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      taxRegime: taxRegime || undefined,
      divisionAssignments,
      active,
    })
  }

  function handleDivisionChange(departmentId: string, divisionId: string) {
    setDivisionAssignments((currentAssignments) => {
      const existingAssignment = currentAssignments.find(
        (assignment) => assignment.departmentId === departmentId,
      )
      const remainingAssignments = currentAssignments.filter(
        (assignment) => assignment.departmentId !== departmentId,
      )

      if (!divisionId) return remainingAssignments

      return [
        ...remainingAssignments,
        {
          id:
            existingAssignment?.id ??
            `client-division-${entity.id}-${departmentId}`,
          departmentId,
          divisionId,
        },
      ]
    })
  }

  return (
    <ModalForm
      title="Editar empresa"
      description="Dados cadastrais usados nas planilhas e rotinas vinculadas."
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <TextField
          label="Nome de exibição *"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
        <TextField
          label="Código interno *"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <TextField
          label="Razão social"
          value={legalName}
          onChange={(event) => setLegalName(event.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label="CNPJ"
          value={document}
          onChange={(event) => setDocument(event.target.value)}
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
        />
        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="contato@empresa.com"
        />
        <TextField
          label="Telefone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(00) 0000-0000"
        />
        <Select
          label="Regime tributário"
          value={taxRegime}
          onChange={(event) =>
            setTaxRegime(event.target.value as ClientTaxRegime | '')
          }
        >
          <option value="">Não informado</option>
          {clientTaxRegimeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {departmentsWithDivisions.map(({ department, divisions: options }) => {
          const selectedDivisionId =
            divisionAssignments.find(
              (assignment) => assignment.departmentId === department.id,
            )?.divisionId ?? ''

          return (
            <Select
              key={department.id}
              label={`Divisão ${department.name.toLocaleLowerCase('pt-BR')} *`}
              value={selectedDivisionId}
              onChange={(event) =>
                handleDivisionChange(department.id, event.target.value)
              }
            >
              <option value="">Selecione uma divisão</option>
              {options.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </Select>
          )
        })}
        <EntityStatusField active={active} onChange={setActive} />
      </div>
    </ModalForm>
  )
}

function RoutineEditForm({
  entity,
  onClose,
  onSave,
}: Extract<EntityEditModalProps, { type: 'routine' }>) {
  const [name, setName] = useState(entity.name)
  const [shortName, setShortName] = useState(entity.shortName)
  const [description, setDescription] = useState(entity.description ?? '')
  const [recurrence, setRecurrence] = useState<RoutineRecurrence>(
    entity.recurrence ?? 'monthly',
  )
  const [defaultDueDay, setDefaultDueDay] = useState(
    String(entity.defaultDueDay ?? 20),
  )
  const [active, setActive] = useState(entity.active !== false)
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueDay = Number(defaultDueDay)

    if (!name.trim() || !shortName.trim()) {
      setError('Informe o nome e o nome curto da rotina.')
      return
    }

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError('O prazo padrão deve ser um dia entre 1 e 31.')
      return
    }

    onSave({
      name: name.trim(),
      shortName: shortName.trim(),
      description: description.trim() || undefined,
      recurrence,
      defaultDueDay: dueDay,
      active,
    })
  }

  return (
    <ModalForm
      title="Editar rotina"
      description="A configuração atual orienta novas tarefas; tarefas já geradas preservam seus próprios prazos."
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nome *"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
        <TextField
          label="Nome curto *"
          value={shortName}
          onChange={(event) => setShortName(event.target.value)}
        />
        <Textarea
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="sm:col-span-2"
        />
        <Select
          label="Recorrência"
          value={recurrence}
          onChange={(event) =>
            setRecurrence(event.target.value as RoutineRecurrence)
          }
        >
          {routineRecurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <TextField
          label="Dia padrão de vencimento"
          type="number"
          min="1"
          max="31"
          value={defaultDueDay}
          onChange={(event) => setDefaultDueDay(event.target.value)}
        />
        <EntityStatusField active={active} onChange={setActive} />
      </div>
    </ModalForm>
  )
}

function ModalForm({
  title,
  description,
  error,
  onClose,
  onSubmit,
  children,
}: {
  title: string
  description: string
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-edit-title"
      data-entity-edit-dialog
      tabIndex={-1}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
        <div>
          <h2
            id="entity-edit-title"
            className="text-xl font-black tracking-tight text-[var(--color-text-strong)]"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-5 text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-lg font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label="Fechar edição"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        {error && (
          <p
            className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {children}
        <p className="mt-5 border-t border-[var(--color-divider)] pt-4 text-xs leading-5 text-[var(--color-text-muted)]">
          Nesta etapa, as alterações permanecem somente na sessão atual. O
          histórico e a persistência serão feitos pelo backend.
        </p>
      </div>

      <footer className="flex justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-3 sm:px-5">
        <Button type="button" tone="neutral" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" tone="primary">
          Salvar alterações
        </Button>
      </footer>
    </form>
  )
}

function EntityStatusField({
  active,
  onChange,
}: {
  active: boolean
  onChange: (active: boolean) => void
}) {
  return (
    <Select
      label="Situação do cadastro"
      value={active ? 'active' : 'inactive'}
      onChange={(event) => onChange(event.target.value === 'active')}
    >
      <option value="active">Ativo</option>
      <option value="inactive">Inativo</option>
    </Select>
  )
}

export default EntityEditModal
