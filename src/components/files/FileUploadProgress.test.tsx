import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import FileUploadProgress from './FileUploadProgress'

describe('FileUploadProgress', () => {
  it('keeps the bar empty while preparing, without reporting a percentage', () => {
    const markup = renderToStaticMarkup(
      <FileUploadProgress state="preparing" progress={null} label="Anexo" />,
    )

    expect(markup).toContain('width:0%')
    expect(markup).toContain('aria-valuetext="Preparando"')
    expect(markup).not.toContain('aria-valuenow')
    expect(markup).not.toContain('file-upload-indeterminate')
  })

  it('shows the measured percentage during the transfer', () => {
    const markup = renderToStaticMarkup(
      <FileUploadProgress state="uploading" progress={68} label="Anexo" />,
    )

    expect(markup).toContain('width:68%')
    expect(markup).toContain('aria-valuenow="68"')
    expect(markup).not.toContain('file-upload-indeterminate')
  })

  it.each(['uploading', 'verifying', 'linking', 'cancelling'] as const)(
    'uses an indeterminate indicator during %s without reporting a percentage',
    (state) => {
      const markup = renderToStaticMarkup(
        <FileUploadProgress state={state} progress={null} label="Anexo" />,
      )

      expect(markup).toContain('file-upload-indeterminate')
      expect(markup).not.toContain('aria-valuenow')
    },
  )
})
