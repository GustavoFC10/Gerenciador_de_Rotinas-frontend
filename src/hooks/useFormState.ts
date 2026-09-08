import { useMemo, useRef, useState, type ChangeEvent } from 'react'

export function useFormState<T extends Record<string, unknown>>(
  initialValues: T,
) {
  const initialValuesRef = useRef(initialValues)
  const [values, setValues] = useState(initialValuesRef.current)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValuesRef.current),
    [values],
  )

  function setField<K extends keyof T>(name: K, value: T[K]) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function bindField<K extends keyof T>(name: K) {
    return {
      name,
      value: String(values[name] ?? ''),
      onChange: (
        event: ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => setField(name, event.target.value as unknown as T[K]),
    }
  }

  function reset() {
    setValues(initialValuesRef.current)
    setError(null)
  }

  return {
    values,
    setValues,
    setField,
    bindField,
    reset,
    isDirty,
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
  }
}
