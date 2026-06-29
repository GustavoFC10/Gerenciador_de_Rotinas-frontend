import Button from '../ui/Button.jsx'

function FormActions({
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  isSubmitting = false,
  onCancel,
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-divider)] pt-4">
      {onCancel && (
        <Button type="button" tone="neutral" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" tone="primary" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </Button>
    </div>
  )
}

export default FormActions
