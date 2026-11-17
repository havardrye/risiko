import type { ReactNode } from 'react'
import { Dialog, DialogActions } from './Dialog.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Forklaring av hva som skjer ved bekreftelse. */
  children: ReactNode
  confirmLabel: string
  /** Markerer bekreftelsen som en handling som ikke kan angres. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Ber brukeren bekrefte før en handling utføres (f.eks. sletting, spec K5). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <div>{children}</div>
      <DialogActions>
        <button type="button" className="button" onClick={onCancel}>
          Avbryt
        </button>
        <button
          type="button"
          className={danger ? 'button button-danger' : 'button button-primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </DialogActions>
    </Dialog>
  )
}
