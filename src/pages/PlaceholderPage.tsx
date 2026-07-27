import PageHeader from '../layouts/PageHeader'
import EmptyState from '../components/common/EmptyState'

function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <>
      <PageHeader size="compact" title={title} description={description} />
      <EmptyState
        title="Tela planejada"
        description="A estrutura de rota e navegacao ja existe para esta area."
      />
    </>
  )
}

export default PlaceholderPage
