import { useMemo, useRef, useState } from 'react'

export function useFormState(initialValues) {
  const initialValuesRef = useRef(initialValues)
  const [values, setValues] = useState(initialValuesRef.current)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValuesRef.current),
    [values],
  )

  function setField(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function bindField(name) {
    return {
      name,
      value: values[name] ?? '',
      onChange: (event) => setField(name, event.target.value),
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
