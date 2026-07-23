import ViewStyleSwitcher from '../../ui/ViewStyleSwitcher.jsx'
import { ROUTINE_LIST_PRESENTATION } from './routineListUtils.js'

const viewOptions = [
  {
    id: ROUTINE_LIST_PRESENTATION.OPERATIONAL,
    label: 'Opção 1',
  },
  {
    id: ROUTINE_LIST_PRESENTATION.TRACKING,
    label: 'Opção 2',
  },
  {
    id: ROUTINE_LIST_PRESENTATION.LEDGER,
    label: 'Opção 3',
  },
]

function RoutineListViewSwitcher({ value, onChange }) {
  return (
    <ViewStyleSwitcher
      value={value}
      options={viewOptions}
      onChange={onChange}
      ariaLabel="Trocar visualização da lista"
      title="Visualização da lista"
    />
  )
}

export default RoutineListViewSwitcher
