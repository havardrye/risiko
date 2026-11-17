import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  title: string
  /** Kalles når dialogen lukkes, også med Escape. */
  onClose: () => void
  children: ReactNode
}

/**
 * Modal dialog bygget på nettleserens <dialog>, som selv holder fokus inne
 * i dialogen, lukker på Escape og setter fokus tilbake når den lukkes.
 * Innholdet finnes bare mens dialogen er åpen, slik at skjemaer starter blanke.
 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {children}
        </>
      )}
    </dialog>
  )
}

interface DialogActionsProps {
  children: ReactNode
}

/** Knapperaden nederst i en dialog. */
export function DialogActions({ children }: DialogActionsProps) {
  return <div className={styles.actions}>{children}</div>
}
