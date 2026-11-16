import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import Combobox, {
  type ComboboxProps,
} from '../../../src/components/ui/Combobox'
import './review.css'

declare global {
  interface Window {
    JaralCombobox: {
      mount: (host: HTMLElement, settings: ComboboxProps) => () => void
    }
  }
}

export default function ControlledCombobox(settings: ComboboxProps) {
  const [value, setValue] = useState(settings.value)
  return (
    <Combobox
      {...settings}
      className={`jaral-combobox ${settings.className || ''}`}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        settings.onValueChange(next)
      }}
    />
  )
}

window.JaralCombobox = {
  mount(host, settings) {
    const root = createRoot(host)
    // The native dialog's form validation must see the visible input at once.
    flushSync(() => root.render(<ControlledCombobox {...settings} />))
    return () => flushSync(() => root.unmount())
  },
}
