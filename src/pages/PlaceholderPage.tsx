import EmptyState from '../components/common/EmptyState'
import WorkspaceBar from '../layouts/WorkspaceBar'

function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <>
      <WorkspaceBar title={title} />
      <EmptyState title="Área em desenvolvimento" description={description} />
    </>
  )
}

export default PlaceholderPage
