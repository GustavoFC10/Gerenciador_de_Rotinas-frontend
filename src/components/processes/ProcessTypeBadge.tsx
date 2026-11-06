import type { ProcessCatalog } from '../../types/processes'
import ProcessIcon from './ProcessIcon'
import '../../styles/process-type-badge.css'

const presentation: Record<string, { icon: string; name: string }> = {
  abertura: { icon: 'building', name: 'Abertura' },
  mei: { icon: 'up', name: 'MEI' },
  outro: { icon: 'users', name: 'Outro escritório' },
  outros: { icon: 'list', name: 'Outros' },
  alteracao: { icon: 'pen', name: 'Alteração' },
  inatividade: { icon: 'pause', name: 'Paralisação' },
  inativa: { icon: 'moon', name: 'Inatividade' },
  reativacao: { icon: 'refresh', name: 'Reativação' },
  baixa: { icon: 'box', name: 'Baixa' },
  saida: { icon: 'out', name: 'Saída' },
  exclusao: { icon: 'userx', name: 'Exclusão' },
}

export default function ProcessTypeBadge({
  catalog,
  tipo,
}: {
  catalog: ProcessCatalog
  tipo: string
}) {
  const type = catalog.types.find((item) => item.id === tipo)
  const fallback = presentation[tipo]
  return (
    <span className={`process-type-badge process-type-${tipo}`}>
      <ProcessIcon name={type?.icon ?? fallback?.icon ?? 'list'} size={14} />
      {type?.nome ?? fallback?.name ?? tipo}
    </span>
  )
}
