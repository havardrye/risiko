import { screen, within } from '@testing-library/react'
import type { AppData, Risk } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

function risk(overrides: Partial<Risk> & Pick<Risk, 'id' | 'title'>): Risk {
  return {
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 1,
    consequence: 1,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  }
}

function seed(): AppData {
  return {
    schemaVersion: 3,
    owners: [
      { id: 'o1', name: 'Kari Nordmann' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [
      { id: 't1', name: 'Leverandør' },
      { id: 't2', name: 'Sikkerhet' },
    ],
    areas: [
      { id: 'a1', name: 'IT', horizon: '0-3' },
      { id: 'a2', name: 'Økonomi', horizon: '0-3' },
    ],
    risks: [
      risk({
        id: 'r1',
        title: 'Leverandør går konkurs',
        likelihood: 2,
        consequence: 5, // 10, Middels
        updatedAt: '2026-03-10T09:00:00.000Z',
      }),
      risk({
        id: 'r2',
        code: 'R-007',
        title: 'Datainnbrudd',
        ownerId: 'o2',
        themeId: 't2',
        likelihood: 4,
        consequence: 5, // 20, Høy
        updatedAt: '2026-02-01T09:00:00.000Z',
      }),
      risk({
        id: 'r3',
        title: 'Ny støtteordning',
        type: 'opportunity',
        areaId: 'a2',
        likelihood: 3,
        consequence: 5, // 15, Stor
        updatedAt: '2026-04-20T09:00:00.000Z',
      }),
      risk({
        id: 'r4',
        title: 'Ærlig tilbakemelding uteblir',
        likelihood: 1,
        consequence: 4, // 4, men Middels (unntaket i K10)
        updatedAt: '2026-01-15T09:00:00.000Z',
      }),
    ],
  }
}

async function openPage(data: AppData = seed()) {
  const app = renderApp({ route: '/', data })
  await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
  return app
}

/** Titlene i tabellen i rekkefølgen de vises. */
function titles() {
  return within(screen.getByRole('table'))
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)
}

function rowFor(title: string) {
  const row = screen.getByRole('rowheader', { name: title }).closest('tr')
  if (!row) throw new Error(`Fant ikke rad for ${title}`)
  return row
}

/** Synlig tekst i hver celle. Tekst bare for skjermlesere (`visually-hidden`) er utelatt. */
function cellTexts(row: HTMLElement) {
  return Array.from(row.children)
    .slice(0, 9)
    .map((cell) => {
      const copy = cell.cloneNode(true) as HTMLElement
      copy.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove())
      return copy.textContent
    })
}

describe('risikotabell (K3–K5)', () => {
  it('viser veiledning når det ikke finnes risikoer', async () => {
    await openPage({ ...seed(), risks: [] })
    expect(screen.getByText(/Ingen risikoer er registrert ennå/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('viser alle felt med navn i stedet for id, score, nivå og dato', async () => {
    await openPage()
    expect(screen.getByText('4 risikoer')).toBeInTheDocument()
    expect(cellTexts(rowFor('Datainnbrudd'))).toEqual([
      'R-007',
      'Datainnbrudd',
      'Trussel',
      'Ola Åsen',
      'Sikkerhet',
      'IT',
      '4x5=20',
      'Høy',
      '01.02.2026',
    ])
    expect(cellTexts(rowFor('Ny støtteordning'))).toEqual([
      'Mangler ID',
      'Ny støtteordning',
      'Mulighet',
      'Kari Nordmann',
      'Leverandør',
      'Økonomi',
      '3x5=15',
      'Stor',
      '20.04.2026',
    ])
  })

  it('viser nivå fra nivåtabellen, ikke fra scoren', async () => {
    await openPage()
    expect(cellTexts(rowFor('Ærlig tilbakemelding uteblir')).slice(6, 8)).toEqual(['1x4=4', 'Middels'])
  })

  describe('sortering', () => {
    it('sorterer på høyest score først som standard', async () => {
      await openPage()
      expect(titles()).toEqual([
        'Datainnbrudd',
        'Ny støtteordning',
        'Leverandør går konkurs',
        'Ærlig tilbakemelding uteblir',
      ])
      expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
    })

    it('snur retningen ved nytt klikk på samme kolonne', async () => {
      const { user } = await openPage()
      await user.click(screen.getByRole('button', { name: /Score/ }))

      expect(titles()).toEqual([
        'Ærlig tilbakemelding uteblir',
        'Leverandør går konkurs',
        'Ny støtteordning',
        'Datainnbrudd',
      ])
      expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute(
        'aria-sort',
        'ascending',
      )
    })

    it('sorterer på tittel A–Å ved første klikk, med Æ sist', async () => {
      const { user } = await openPage()
      await user.click(screen.getByRole('button', { name: /Tittel/ }))

      expect(titles()).toEqual([
        'Datainnbrudd',
        'Leverandør går konkurs',
        'Ny støtteordning',
        'Ærlig tilbakemelding uteblir',
      ])
      expect(screen.getByRole('columnheader', { name: /Tittel/ })).toHaveAttribute(
        'aria-sort',
        'ascending',
      )
      expect(screen.getByRole('columnheader', { name: /Score/ })).not.toHaveAttribute('aria-sort')
    })

    it('sorterer på sist endret, nyest først', async () => {
      const { user } = await openPage()
      await user.click(screen.getByRole('button', { name: /Sist endret/ }))

      expect(titles()).toEqual([
        'Ny støtteordning',
        'Leverandør går konkurs',
        'Datainnbrudd',
        'Ærlig tilbakemelding uteblir',
      ])
    })

    it('beholder fokus på sorteringsknappen, slik at den kan brukes med tastatur', async () => {
      const { user } = await openPage()
      const button = screen.getByRole('button', { name: /Tittel/ })
      button.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('button', { name: /Tittel/ })).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(titles()[0]).toBe('Ærlig tilbakemelding uteblir')
    })
  })

  describe('endring', () => {
    it('åpner skjemaet med risikoens verdier og lagrer endringen', async () => {
      const { user, repository } = await openPage()
      await user.click(screen.getByRole('button', { name: 'Endre Datainnbrudd' }))

      const dialog = screen.getByRole('dialog', { name: 'Endre risiko' })
      expect(within(dialog).getByLabelText('Tittel')).toHaveValue('Datainnbrudd')
      expect(within(dialog).getByLabelText('ID')).toHaveValue('R-007')
      await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '1 – Svært lav')
      await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(cellTexts(rowFor('Datainnbrudd')).slice(6, 8)).toEqual(['1x5=5', 'Middels'])
      const saved = (await repository.load()).risks.find((r) => r.id === 'r2')
      expect(saved?.likelihood).toBe(1)
      expect(saved?.createdAt).toBe('2026-01-01T09:00:00.000Z')
      expect(saved?.updatedAt).not.toBe('2026-02-01T09:00:00.000Z')
    })
  })

  describe('sletting (K5)', () => {
    it('sletter risikoen etter bekreftelse', async () => {
      const { user, repository } = await openPage()
      await user.click(screen.getByRole('button', { name: 'Slett Datainnbrudd' }))

      const dialog = screen.getByRole('dialog', { name: 'Slette risikoen?' })
      expect(within(dialog).getByText(/«Datainnbrudd» blir slettet/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Slett' }))

      expect(screen.queryByRole('rowheader', { name: 'Datainnbrudd' })).not.toBeInTheDocument()
      expect(screen.getByText('3 risikoer')).toBeInTheDocument()
      expect((await repository.load()).risks.map((r) => r.id)).toEqual(['r1', 'r3', 'r4'])
    })

    it('flytter fokus til sideoverskriften når raden er slettet', async () => {
      const { user } = await openPage()
      await user.click(screen.getByRole('button', { name: 'Slett Datainnbrudd' }))
      await user.click(screen.getByRole('button', { name: 'Slett' }))

      expect(screen.getByRole('heading', { level: 1, name: 'Risikoregister' })).toHaveFocus()
    })

    it('sletter ingenting når brukeren avbryter', async () => {
      const { user, repository } = await openPage()
      await user.click(screen.getByRole('button', { name: 'Slett Datainnbrudd' }))
      await user.click(screen.getByRole('button', { name: 'Avbryt' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('rowheader', { name: 'Datainnbrudd' })).toBeInTheDocument()
      expect((await repository.load()).risks).toHaveLength(4)
    })

    it('viser veiledning når siste risiko er slettet', async () => {
      const only = seed()
      only.risks = only.risks.slice(0, 1)
      const { user } = await openPage(only)
      await user.click(screen.getByRole('button', { name: 'Slett Leverandør går konkurs' }))
      await user.click(screen.getByRole('button', { name: 'Slett' }))

      expect(screen.getByText(/Ingen risikoer er registrert ennå/)).toBeInTheDocument()
    })

    it('frigjør eieren for sletting når risikoen er slettet', async () => {
      const { user } = await openPage()
      await user.click(screen.getByRole('button', { name: 'Slett Datainnbrudd' }))
      await user.click(screen.getByRole('button', { name: 'Slett' }))

      await user.click(screen.getByRole('link', { name: 'Risikoeiere' }))
      await screen.findByRole('heading', { level: 1, name: 'Risikoeiere' })
      expect(cellTexts(rowFor('Ola Åsen')).slice(0, 4)).toEqual(['Mangler ID', 'Ola Åsen', '–', '0'])
    })
  })
})

describe('ID i registeret og matrisen (spec 004, K49)', () => {
  it('viser ID i første kolonne, og «Mangler ID» for risikoer fra før (akseptkriterium)', async () => {
    await openPage()
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('ID')
    expect(cellTexts(rowFor('Datainnbrudd'))[0]).toBe('R-007')
    const missing = within(rowFor('Leverandør går konkurs')).getByText('Mangler ID')
    expect(missing).toHaveClass('muted')
  })
})

describe('søk og sortering på ID (spec 004, K55)', () => {
  function withCodes(): AppData {
    const data = seed()
    const codes: Record<string, string> = { r1: 'R-10', r3: 'R-2' }
    data.risks = data.risks.map((item) => (codes[item.id] ? { ...item, code: codes[item.id] } : item))
    return data
  }

  it('sorterer på ID ved klikk på kolonnen: R-2 før R-10, og uten ID sist (akseptkriterium)', async () => {
    const { user } = renderApp({ route: '/', data: withCodes() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })

    await user.click(screen.getByRole('button', { name: /^ID/ }))
    expect(screen.getByRole('columnheader', { name: /^ID/ })).toHaveAttribute('aria-sort', 'ascending')
    const codes = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.children[0]?.textContent)
    expect(codes()).toEqual(['R-2', 'R-007', 'R-10', 'Mangler ID'])

    await user.click(screen.getByRole('button', { name: /^ID/ }))
    expect(codes()).toEqual(['R-10', 'R-007', 'R-2', 'Mangler ID'])
    expect(screen.getByRole('table')).toHaveAccessibleName('Risikoer, sortert etter ID, synkende')
  })

  it('finner en risiko ved søk på ID (akseptkriterium)', async () => {
    const { user } = renderApp({ route: '/', data: withCodes() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    await user.type(screen.getByLabelText('Søk'), 'R-007')
    expect(titles()).toEqual(['Datainnbrudd'])
  })
})

describe('score som utregning (K56)', () => {
  it('viser «4x5=20» for sannsynlighet 4 og konsekvens 5 (akseptkriterium)', async () => {
    await openPage()
    const cell = rowFor('Datainnbrudd').children[6] as HTMLElement
    expect(within(cell).getByText('4x5=20')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gir skjermlesere utregningen som ord', async () => {
    await openPage()
    const cell = rowFor('Datainnbrudd').children[6] as HTMLElement
    expect(within(cell).getByText('sannsynlighet 4, konsekvens 5, score 20')).toHaveClass('visually-hidden')
  })

  it('sorterer fortsatt på scoren, ikke på teksten', async () => {
    await openPage()
    // Standard er høyest score først: 20, 15, 10, 4. Som tekst ville «1x4=4» og «2x5=10» byttet plass.
    expect(titles()).toEqual([
      'Datainnbrudd',
      'Ny støtteordning',
      'Leverandør går konkurs',
      'Ærlig tilbakemelding uteblir',
    ])
  })
})
