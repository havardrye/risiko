import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Dialog } from './Dialog.tsx'
import { FormField } from './FormField.tsx'

describe('Dialog', () => {
  it('viser ikke innhold når den er lukket', () => {
    render(
      <Dialog open={false} title="Ny risiko" onClose={() => {}}>
        <p>Innhold</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Innhold')).not.toBeInTheDocument()
  })

  it('vises med tittelen som tilgjengelig navn når den er åpen', () => {
    render(
      <Dialog open title="Ny risiko" onClose={() => {}}>
        <p>Innhold</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Ny risiko' })).toBeInTheDocument()
    expect(screen.getByText('Innhold')).toBeInTheDocument()
  })

  it('lukkes og tømmes når open blir false', () => {
    const { rerender } = render(
      <Dialog open title="Ny risiko" onClose={() => {}}>
        <input aria-label="Tittel" defaultValue="" />
      </Dialog>,
    )
    rerender(
      <Dialog open={false} title="Ny risiko" onClose={() => {}}>
        <input aria-label="Tittel" defaultValue="" />
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tittel')).not.toBeInTheDocument()
  })

  it('sier fra når nettleseren lukker den, f.eks. med Escape', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Ny risiko" onClose={onClose}>
        <p>Innhold</p>
      </Dialog>,
    )
    screen.getByRole('dialog').dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  function setup() {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Slette risikoen?"
        confirmLabel="Slett"
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <p>«Brann» blir slettet.</p>
      </ConfirmDialog>,
    )
    return { onConfirm, onCancel, user: userEvent.setup() }
  }

  it('viser spørsmål og forklaring', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Slette risikoen?' })).toBeInTheDocument()
    expect(screen.getByText('«Brann» blir slettet.')).toBeInTheDocument()
  })

  it('bekrefter bare når brukeren velger bekreftelsesknappen', async () => {
    const { onConfirm, onCancel, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Slett' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('avbryter uten å bekrefte', async () => {
    const { onConfirm, onCancel, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('FormField', () => {
  it('kobler ledeteksten til feltet og merker påkrevd felt', () => {
    render(
      <FormField label="Tittel" required>
        {(control) => <input {...control} />}
      </FormField>,
    )
    const input = screen.getByLabelText('Tittel')
    expect(input).toBeRequired()
    expect(input).toBeValid()
  })

  it('merker valgfrie felt i ledeteksten', () => {
    render(<FormField label="Beskrivelse">{(control) => <textarea {...control} />}</FormField>)
    expect(screen.getByLabelText('Beskrivelse (valgfritt)')).not.toBeRequired()
  })

  it('viser feilmelding ved feltet og kobler den til feltet', () => {
    render(
      <FormField label="Tittel" required error="Tittel er påkrevd">
        {(control) => <input {...control} />}
      </FormField>,
    )
    const input = screen.getByLabelText('Tittel')
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Tittel er påkrevd')
  })

  it('kobler både hjelpetekst og feilmelding til feltet', () => {
    render(
      <FormField label="E-post" hint="Brukes bare til visning" error="Ugyldig e-postadresse">
        {(control) => <input {...control} />}
      </FormField>,
    )
    expect(screen.getByLabelText('E-post (valgfritt)')).toHaveAccessibleDescription(
      'Brukes bare til visning Ugyldig e-postadresse',
    )
  })
})
