import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Button from '../../../src/components/ui/Button'
import Dialog from '../../../src/components/ui/Dialog'
import Select from '../../../src/components/ui/Select'
import Textarea from '../../../src/components/ui/Textarea'
import TextField from '../../../src/components/ui/TextField'
import '../../../src/styles/index.css'

// eslint-disable-next-line react-refresh/only-export-components -- Entrada isolada para captura.
function TaskDialogStudy() {
  const [isOpen, setOpen] = useState(true)
  const close = () => setOpen(false)

  return (
    <main className="p-8">
      <Button tone="primary" onClick={() => setOpen(true)}>
        Nova tarefa
      </Button>
      <Dialog
        title="Adicionar tarefa avulsa"
        open={isOpen}
        onClose={close}
        footer={
          <>
            <Button onClick={close}>Cancelar</Button>
            <Button tone="primary" form="task-study" type="submit">
              Criar tarefa
            </Button>
          </>
        }
      >
        <form
          id="task-study"
          className="grid gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField label="Título" required />
            <TextField label="Prazo" type="date" />
          </div>
          <Textarea
            label="Descrição"
            rows={4}
            placeholder="Detalhe o que precisa ser feito."
          />
          <details className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-3">
            <summary className="cursor-pointer font-semibold">
              Relações e observação
              <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                Departamento é obrigatório. Empresa e rotina são opcionais.
              </span>
            </summary>
            <div className="mt-3 grid gap-3">
              <Select label="Departamento">
                <option>Fiscal</option>
              </Select>
              <Select label="Empresa">
                <option>Sem empresa</option>
              </Select>
              <Select label="Rotina">
                <option>Sem rotina</option>
              </Select>
              <Textarea label="Observação" rows={2} />
            </div>
          </details>
        </form>
      </Dialog>
    </main>
  )
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<TaskDialogStudy />)
