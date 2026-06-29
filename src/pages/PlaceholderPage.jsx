import PageHeader from '../layouts/PageHeader.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

function PlaceholderPage({ title, description }) {
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
