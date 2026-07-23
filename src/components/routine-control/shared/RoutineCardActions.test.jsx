import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RoutineAttachmentsPanel } from './RoutineCardActions.jsx'

const previewTypes = [
  ['pdf', 'guia.pdf'],
  ['spreadsheet', 'calculo.xlsx'],
  ['xml', 'retorno.xml'],
  ['image', 'comprovante.png'],
  ['document', 'relatorio.docx'],
]

describe('RoutineAttachmentsPanel previews', () => {
  it('renders a representative preview for each saved file type', () => {
    const task = {
      id: 'task-preview',
      attachments: previewTypes.map(([previewType, name], index) => ({
        id: `file-${index}`,
        name,
        previewType,
        sizeLabel: `${index + 1}00 KB`,
      })),
      indicators: { attachments: previewTypes.length },
    }

    const markup = renderToStaticMarkup(
      <RoutineAttachmentsPanel
        task={task}
        variant="preview"
        onAttachmentRemove={() => {}}
      />,
    )

    previewTypes.forEach(([previewType, name]) => {
      expect(markup).toContain(`data-attachment-kind="${previewType}"`)
      expect(markup).toContain(name)
    })

    expect(markup).toContain('Prévia de PDF')
    expect(markup).toContain('Prévia de planilha')
    expect(markup).toContain('Prévia de XML')
    expect(markup).toContain('Prévia de imagem')
    expect(markup).toContain('Prévia de documento')
    expect(markup).toContain('data-attachment-layout="single-row"')
    expect(markup).toContain('aria-label="Excluir guia.pdf"')
    expect(markup).toContain('overflow-y-hidden')
    expect(markup).toContain('h-52')
    expect(markup).toContain('pb-4')
  })

  it('uses stable row limits for the three card options', () => {
    const task = {
      id: 'task-layout',
      attachments: previewTypes.map(([previewType, name], index) => ({
        id: `layout-file-${index}`,
        name,
        previewType,
      })),
      indicators: { attachments: previewTypes.length },
    }

    const layouts = [
      ['preview', 'single-row'],
      ['embedded', 'fixed-three-rows'],
      ['gallery', 'vertical-two-rows'],
    ]

    layouts.forEach(([variant, layout]) => {
      const markup = renderToStaticMarkup(
        <RoutineAttachmentsPanel task={task} variant={variant} />,
      )

      expect(markup).toContain(`data-attachment-layout="${layout}"`)
    })

    const galleryMarkup = renderToStaticMarkup(
      <RoutineAttachmentsPanel task={task} variant="gallery" />,
    )

    expect(galleryMarkup).toContain('data-scroll-owner="attachments"')
  })
})
