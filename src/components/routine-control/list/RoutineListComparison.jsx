import { useMemo } from 'react'

import RoutineListCardOptionOne from './RoutineListCardOptionOne.jsx'
import RoutineListCardOptionThree from './RoutineListCardOptionThree.jsx'
import RoutineListCardOptionTwo from './RoutineListCardOptionTwo.jsx'
import RoutineListSection from './RoutineListSection.jsx'
import { routineListSampleRoutine } from './routineListSample.js'
import { groupRoutineListItemsByStatus } from './routineListUtils.js'

const listComparisonOptions = [
  {
    id: 'compact',
    name: 'Opcao 1',
    title: 'Fila compacta',
    description: 'Pagina densa para varrer muitas empresas rapidamente.',
    Card: RoutineListCardOptionOne,
    sectionVariant: 'compact',
    shellClass: 'bg-white',
    headerClass:
      'border-b border-slate-200 bg-white px-5 py-4 sm:px-6',
    eyebrowClass: 'text-blue-600',
    contentClass: 'space-y-3 bg-slate-100 p-4 sm:p-5',
  },
  {
    id: 'cards',
    name: 'Opcao 2',
    title: 'Painel de acompanhamento',
    description: 'Pagina mais visual, com resumo em destaque e secoes amplas.',
    Card: RoutineListCardOptionTwo,
    sectionVariant: 'cards',
    shellClass: 'bg-blue-50/70',
    headerClass:
      'rounded-t-2xl border border-blue-100 bg-white px-5 py-5 shadow-sm sm:px-6',
    eyebrowClass: 'text-blue-700',
    contentClass:
      'space-y-5 rounded-b-2xl border-x border-b border-blue-100 bg-blue-50/70 p-4 sm:p-6',
  },
  {
    id: 'ledger',
    name: 'Opcao 3',
    title: 'Registro operacional',
    description: 'Pagina com leitura de controle, mais parecida com protocolo.',
    Card: RoutineListCardOptionThree,
    sectionVariant: 'ledger',
    shellClass: 'bg-zinc-50',
    headerClass:
      'border border-zinc-300 bg-white px-5 py-5 text-slate-950 sm:px-6',
    eyebrowClass: 'text-zinc-600',
    contentClass:
      'space-y-0 border-x border-b border-zinc-300 bg-white p-0',
  },
]

function RoutineListComparison({
  selectedOptionId,
  items,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onOptionChange,
}) {
  const groups = useMemo(
    () => groupRoutineListItemsByStatus(items),
    [items],
  )

  const selectedOption =
    listComparisonOptions.find((option) => option.id === selectedOptionId) ??
    listComparisonOptions[0]
  const SelectedCard = selectedOption.Card

  return (
    <section className={`overflow-hidden rounded-2xl ${selectedOption.shellClass}`}>
      <header className={selectedOption.headerClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${selectedOption.eyebrowClass}`}
            >
              Lista operacional
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              {routineListSampleRoutine.name}
            </h2>
            <p
              className={`mt-2 max-w-3xl text-sm ${
                selectedOption.id === 'ledger' ? 'text-zinc-600' : 'text-slate-500'
              }`}
            >
              {selectedOption.title}: {selectedOption.description}
            </p>
          </div>

          <label
            className={`text-sm font-medium ${
              selectedOption.id === 'ledger' ? 'text-zinc-700' : 'text-slate-600'
            }`}
          >
            Display da lista
            <select
              value={selectedOption.id}
              onChange={(event) => onOptionChange?.(event.target.value)}
              className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {listComparisonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className={selectedOption.contentClass}>
        {groups.map((group) => (
          <RoutineListSection
            key={group.status}
            group={group}
            variant={selectedOption.sectionVariant}
          >
            {group.items.map((item) => (
              <SelectedCard
                key={item.id}
                item={item}
                onOpen={onItemOpen}
                onQuickAction={onItemQuickAction}
                onNoteChange={onItemNoteChange}
              />
            ))}
          </RoutineListSection>
        ))}
      </div>
    </section>
  )
}

export default RoutineListComparison
