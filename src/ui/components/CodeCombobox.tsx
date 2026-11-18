import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { findByCode } from '../../domain/rules.ts'
import { suggestionsFor, type CodeOption } from '../codeSuggestions.ts'
import type { FieldControlProps } from './FormField.tsx'
import styles from './CodeCombobox.module.css'

interface CodeComboboxProps {
  /** Attributtene fra `FormField`: id, ledetekst, feilmelding. */
  control: FieldControlProps
  value: string
  onChange: (value: string) => void
  options: readonly CodeOption[]
  /**
   * Marker all tekst når feltet får fokus, slik at den erstattes når man
   * skriver. Brukes for «Navn (mangler ID)» (K59), som ikke er en ID.
   */
  selectOnFocus?: boolean
}

/**
 * Tekstfelt for en ID med forslagsliste (spec 005, K57, K58). Følger
 * WAI-ARIA-mønsteret «Combobox with listbox popup», liste uten automatisk
 * valg: piltastene markerer, Enter velger, Escape lukker, Tab går videre.
 * Navnet til elementet som passer ID-en, står under feltet.
 */
export function CodeCombobox({ control, value, onChange, options, selectOnFocus = false }: CodeComboboxProps) {
  const listId = useId()
  const nameId = `${listId}-name`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const suggestions = useMemo(() => suggestionsFor(options, value), [options, value])
  const match = findByCode(options, value)
  const expanded = open && suggestions.length > 0

  function close() {
    setOpen(false)
    setActive(-1)
  }

  function choose(option: CodeOption) {
    onChange(option.code ?? '')
    close()
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = suggestions.length
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (count === 0) return
        setOpen(true)
        setActive((current) => (expanded ? (current + 1) % count : 0))
        return
      case 'ArrowUp':
        event.preventDefault()
        if (count === 0) return
        setOpen(true)
        setActive((current) => (expanded && current > 0 ? current - 1 : count - 1))
        return
      case 'Enter':
        // Velger markert forslag i stedet for å sende skjemaet.
        if (expanded && active >= 0 && suggestions[active]) {
          event.preventDefault()
          choose(suggestions[active])
        }
        return
      case 'Escape':
        // Lukker listen uten å lukke dialogen rundt. Er listen lukket, får dialogen Escape.
        if (expanded) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        return
      case 'Tab':
        close()
        return
    }
  }

  const describedBy = [control['aria-describedby'], match ? nameId : null].filter(Boolean).join(' ')

  return (
    <div className={styles.combobox}>
      <input
        {...control}
        aria-describedby={describedBy || undefined}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={keyDown}
        onFocus={selectOnFocus ? (event) => event.target.select() : undefined}
        onBlur={close}
      />
      <ul id={listId} role="listbox" className={styles.listbox} hidden={!expanded}>
        {suggestions.map((option, index) => (
          <li
            key={option.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? `${styles.option} ${styles.active}` : styles.option}
            // Musen skal ikke ta fokus fra feltet før valget er gjort.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
          >
            <span className={styles.code}>{option.code}</span> – {option.name}
          </li>
        ))}
      </ul>
      {match && (
        <p id={nameId} className={styles.name}>
          {match.name}
        </p>
      )}
    </div>
  )
}
