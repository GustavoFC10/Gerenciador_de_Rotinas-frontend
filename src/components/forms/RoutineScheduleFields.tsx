import type { RoutineRecurrence } from '../../types/domain'
import {
  getCycleOptions,
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
      <div>
        <TextField
          id={`${idPrefix}-due-days`}
          label="Prazo após a criação *"
          type="number"
          inputMode="numeric"
          min="1"
          max="365"
          value={value.defaultDueDays ?? ''}
          onChange={(event) =>
            onChange({
              defaultDueDays: event.target.value
                ? Number(event.target.value)
                : undefined,
              defaultDueDay: undefined,
              recurrenceMonths: undefined,
            })
          }
          placeholder="Ex.: 5"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${idPrefix}-schedule-error` : `${idPrefix}-due-days-hint`
          }
        />
        <p
          id={`${idPrefix}-due-days-hint`}
          className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
        >
          Contado a partir da criação de cada tarefa sob demanda.
        </p>
        <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
      </div>
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
        <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
          Em meses menores, o vencimento será ajustado para o último dia.
        </p>
        <ScheduleError id={`${idPrefix}-schedule-error`} error={error} />
      </div>
    )
  }

  if (recurrence === 'annual') {
    return (
      <>
        <Select
          id={`${idPrefix}-month`}
          label="Mês de execução *"
          value={String(value.recurrenceMonths?.[0] ?? '')}
          onChange={(event) =>
            onChange({
              defaultDueDays: undefined,
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

  const cycleOptions = getCycleOptions(recurrence)
  const selectedMonths = normalizeMonths(value.recurrenceMonths)
  const selectedCycle =
    cycleOptions.find(
      (option) =>
        option.months.length === selectedMonths.length &&
        option.months.every((month, index) => month === selectedMonths[index]),
    )?.value ?? ''

  return (
    <>
      <Select
        id={`${idPrefix}-cycle`}
        label={
          recurrence === 'quarterly'
            ? 'Ciclo trimestral *'
            : 'Ciclo semestral *'
        }
        value={selectedCycle}
        onChange={(event) => {
          const cycle = cycleOptions.find(
            (option) => option.value === event.target.value,
          )
          onChange({
            defaultDueDays: undefined,
            defaultDueDay: value.defaultDueDay,
            recurrenceMonths: cycle?.months ?? [],
          })
        }}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${idPrefix}-schedule-error` : undefined}
      >
        <option value="">Selecione os meses</option>
        {cycleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
          defaultDueDays: undefined,
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

function ScheduleError({ id, error }: { id: string; error?: string }) {
  if (!error) return null

  return (
    <p
      id={id}
      className="mt-1.5 text-sm font-semibold text-[var(--status-error-text)]"
    >
      {error}
    </p>
  )
}

export default RoutineScheduleFields
