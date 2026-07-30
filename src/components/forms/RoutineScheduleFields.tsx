import { focusRing } from '../../constants/designTokens'
import type { RoutineRecurrence } from '../../types/domain'
import {
  getExpectedMonthCount,
  monthOptions,
  normalizeMonths,
  type RoutineScheduleValue,
} from '../../utils/routineSchedule'
import Select from '../ui/Select'
import TextField from '../ui/TextField'

interface RoutineScheduleFieldsProps {
  recurrence: RoutineRecurrence
  value: RoutineScheduleValue
  onChange: (value: RoutineScheduleValue) => void
  error?: string
  idPrefix: string
}

function RoutineScheduleFields({
  recurrence,
  value,
  onChange,
  error,
  idPrefix,
}: RoutineScheduleFieldsProps) {
  if (recurrence === 'on_demand') {
    return (
      <div className="sm:col-span-2">
        <TextField
          id={`${idPrefix}-due-date`}
          label="Data específica *"
          type="date"
          value={value.defaultDueDate ?? ''}
          onChange={(event) =>
            onChange({
              defaultDueDate: event.target.value,
              defaultDueDay: undefined,
              recurrenceMonths: undefined,
            })
          }
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idPrefix}-schedule-error` : undefined}
        />
        <ScheduleHint>
          A data será usada como referência quando esta rotina sob demanda for
          criada como tarefa.
        </ScheduleHint>
        <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
      </div>
    )
  }

  if (recurrence === 'annual') {
    return (
      <>
        <Select
          id={`${idPrefix}-month`}
          label="Mês *"
          value={String(value.recurrenceMonths?.[0] ?? '')}
          onChange={(event) =>
            onChange({
              defaultDueDate: undefined,
              defaultDueDay: value.defaultDueDay,
              recurrenceMonths: event.target.value
                ? [Number(event.target.value)]
                : [],
            })
          }
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idPrefix}-schedule-error` : undefined}
        >
          <option value="">Selecione o mês</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>
        <DueDayField
          idPrefix={idPrefix}
          value={value}
          error={error}
          onChange={onChange}
        />
        <div className="sm:col-span-2">
          <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
        </div>
      </>
    )
  }

  if (recurrence === 'monthly') {
    return (
      <div>
        <DueDayField
          idPrefix={idPrefix}
          value={value}
          error={error}
          onChange={onChange}
        />
        <ScheduleHint>
          O vencimento será ajustado para o último dia quando o mês for menor.
        </ScheduleHint>
        <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
      </div>
    )
  }

  const selectedMonths = normalizeMonths(value.recurrenceMonths)
  const expectedCount = getExpectedMonthCount(recurrence)
  const maximumCount = expectedCount ?? 12

  return (
    <>
      <div className="sm:col-span-2">
        <fieldset
          aria-describedby={
            error ? `${idPrefix}-schedule-error` : `${idPrefix}-months-hint`
          }
        >
          <legend className="text-sm font-medium text-[var(--color-text-muted)]">
            Meses de execução *
          </legend>
          <p
            id={`${idPrefix}-months-hint`}
            className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]"
          >
            {expectedCount
              ? `Selecione exatamente ${expectedCount} ${
                  expectedCount === 1 ? 'mês' : 'meses'
                }.`
              : 'Selecione todos os meses em que a rotina deve ser gerada.'}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {monthOptions.map((month) => {
              const checked = selectedMonths.includes(month.value)
              const disabled =
                !checked && selectedMonths.length >= maximumCount

              return (
                <label
                  key={month.value}
                  className={`flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border px-2.5 text-sm font-semibold ${
                    checked
                      ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)] text-[var(--color-text-strong)]'
                      : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)] text-[var(--color-text-muted)]'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${focusRing}`}
                >
                  <input
                    type="checkbox"
                    name={`${idPrefix}-months`}
                    value={month.value}
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      onChange({
                        defaultDueDate: undefined,
                        defaultDueDay: value.defaultDueDay,
                        recurrenceMonths: checked
                          ? selectedMonths.filter(
                              (selectedMonth) =>
                                selectedMonth !== month.value,
                            )
                          : [...selectedMonths, month.value],
                      })
                    }
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  {month.shortLabel}
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>
      <DueDayField
        idPrefix={idPrefix}
        value={value}
        error={error}
        onChange={onChange}
      />
      <div className="self-end pb-2 text-xs font-semibold text-[var(--color-text-muted)]">
        {selectedMonths.length} de {expectedCount ?? 12}{' '}
        {expectedCount ? 'selecionados' : 'meses possíveis'}
      </div>
      <div className="sm:col-span-2">
        <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
      </div>
    </>
  )
}

function DueDayField({
  idPrefix,
  value,
  error,
  onChange,
}: {
  idPrefix: string
  value: RoutineScheduleValue
  error?: string
  onChange: (value: RoutineScheduleValue) => void
}) {
  return (
    <TextField
      id={`${idPrefix}-due-day`}
      label="Dia do mês *"
      type="number"
      inputMode="numeric"
      min="1"
      max="31"
      value={value.defaultDueDay ?? ''}
      onChange={(event) =>
        onChange({
          ...value,
          defaultDueDate: undefined,
          defaultDueDay: event.target.value
            ? Number(event.target.value)
            : undefined,
        })
      }
      placeholder="Ex.: 20"
      required
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${idPrefix}-schedule-error` : undefined}
    />
  )
}

function ScheduleHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
      {children}
    </p>
  )
}

function ScheduleError({ id, error }: { id: string; error?: string }) {
  if (!error) return null

  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-[var(--status-error-text)]">
      {error}
    </p>
  )
}

export default RoutineScheduleFields
