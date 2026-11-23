import { useId, useRef } from 'react'
import {
  PROCESS_SECTORS,
  type ProcessCatalog,
  type ProcessNoteInput,
} from '../../types/processes'
import ProcessIcon from './ProcessIcon'
import '../../styles/process-observation-fields.css'

export interface ProcessObservationDraft extends ProcessNoteInput {
  id: number
}

export default function ProcessObservationFields({
  sectors,
  value,
  onChange,
  disabled,
}: {
  sectors: ProcessCatalog['sectors']
  value: ProcessObservationDraft[]
  onChange: (notes: ProcessObservationDraft[]) => void
  disabled: boolean
}) {
  const id = useId()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const focusNewNote = useRef<number | null>(null)

  function addNote() {
    const noteId = (value.at(-1)?.id ?? 0) + 1
    focusNewNote.current = noteId
    onChange([...value, { id: noteId, text: '', visibleToSectors: ['com'] }])
  }

  function updateNote(noteId: number, change: Partial<ProcessNoteInput>) {
    onChange(
      value.map((note) => (note.id === noteId ? { ...note, ...change } : note)),
    )
  }

  return (
    <section
      className="process-observation-fields nvals"
      aria-labelledby={`${id}-title`}
      aria-describedby={value.length ? undefined : `${id}-help`}
    >
      <div className="process-observation-header">
        <div className="process-observation-intro">
          <h3 id={`${id}-title`}>Observações</h3>
          {value.length === 0 && (
            <p id={`${id}-help`}>
              A Diretoria vem selecionada por padrão. Ajuste o acesso de cada
              observação.
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn"
          ref={addButtonRef}
          disabled={disabled}
          onClick={addNote}
        >
          <ProcessIcon name="plus" size={15} />
          Adicionar observação
        </button>
      </div>
      {value.map((note, index) => {
        const noteId = `${id}-${note.id}`
        const needsSectors = note.visibleToSectors.length === 0
        return (
          <div className="process-observation-draft" key={note.id}>
            <div className="field">
              <div className="process-observation-header">
                <label htmlFor={noteId}>Observação {index + 1}</label>
                <button
                  type="button"
                  className="btn sm"
                  aria-label={`Remover observação ${index + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    onChange(value.filter((item) => item.id !== note.id))
                    addButtonRef.current?.focus()
                  }}
                >
                  Remover
                </button>
              </div>
              <textarea
                id={noteId}
                ref={(element) => {
                  if (element && focusNewNote.current === note.id) {
                    focusNewNote.current = null
                    element.focus()
                  }
                }}
                className="input"
                rows={2}
                maxLength={5000}
                required
                value={note.text}
                disabled={disabled}
                placeholder="Informe a observação"
                onChange={(event) =>
                  updateNote(note.id, { text: event.target.value })
                }
              />
            </div>
            <fieldset
              className="process-observation-audience"
              aria-describedby={needsSectors ? `${noteId}-hint` : undefined}
            >
              <legend>Quem pode ver</legend>
              <div className="process-observation-sectors">
                {PROCESS_SECTORS.map((sector) => {
                  const selected = note.visibleToSectors.includes(sector)
                  return (
                    <button
                      key={sector}
                      type="button"
                      className={`btn sm process-observation-sector ${sector}`}
                      role="switch"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() =>
                        updateNote(note.id, {
                          visibleToSectors: PROCESS_SECTORS.filter(
                            (candidate) =>
                              candidate === sector
                                ? !selected
                                : note.visibleToSectors.includes(candidate),
                          ),
                        })
                      }
                    >
                      <span className="switch" aria-hidden="true">
                        <span className="knob" />
                      </span>
                      {sectors[sector]}
                    </button>
                  )
                })}
              </div>
              {needsSectors && (
                <p id={`${noteId}-hint`}>Selecione ao menos um departamento.</p>
              )}
            </fieldset>
          </div>
        )
      })}
    </section>
  )
}
