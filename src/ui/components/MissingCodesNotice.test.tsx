import { screen, within } from '@testing-library/react'
import axe from 'axe-core'
import type { AppData, Risk } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

const T = '2026-11-18T08:00:00.000Z'

function risk(id: string, title: string, code?: string): Risk {
  return {
    id,
    ...(code ? { code } : {}),
    title,
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 2,
    consequence: 3,
    createdAt: T,
    updatedAt: T,
  }
}

/** Alt har ID. Testene fjerner ID der de trenger det. */
function complete(): AppData {
  return {
    schemaVersion: 5,
    owners: [
      { id: 'o1', code: 'E-1', name: 'Kari Nordmann' },
      { id: 'o2', code: 'E-2', name: 'Ola Åsen' },
    ],
    themes: [
      { id: 't1', code: 'T-1', name: 'Leverandør' },
      { id: 't2', code: 'T-2', name: 'Sikkerhet' },
    ],
    areas: [{ id: 'a1', code: 'O-1', name: 'IT' }],
    risks: [risk('r1', 'Leverandør går konkurs', 'R-1'), risk('r2', 'Datainnbrudd', 'R-2'), risk('r3', 'Phishing', 'R-3')],
  }
}

function withoutCodes<T extends { id: string; code?: string }>(items: T[], ids: string[]): T[] {
  return items.map((item) => {
    if (!ids.includes(item.id)) return item
    const { code: _code, ...rest } = item
    return rest as T
  })
}

async function open(data: AppData, route = '/') {
  const app = renderApp({ route, data })
  await screen.findByRole('heading', { level: 1 })
  return app
}

function notice() {
  return screen.getByRole('region', { name: 'Elementer uten ID' })
}

describe('varsel om elementer uten ID (spec 004, K54)', () => {
  it('vises ikke når alt har ID', async () => {
    await open(complete())
    expect(screen.queryByRole('region', { name: 'Elementer uten ID' })).not.toBeInTheDocument()
  })

  type MissingIds = Partial<Record<'risks' | 'owners' | 'themes' | 'areas', string[]>>
  it.each<[MissingIds, string]>([
    [{ risks: ['r1', 'r2', 'r3'], owners: ['o2'] }, '3 risikoer og 1 eier mangler ID.'],
    [{ risks: ['r1'] }, '1 risiko mangler ID.'],
    [{ owners: ['o1', 'o2'] }, '2 eiere mangler ID.'],
    [{ risks: ['r2'], themes: ['t1', 't2'], areas: ['a1'] }, '1 risiko, 2 temaer og 1 område mangler ID.'],
    [{ themes: ['t1'], areas: ['a1'] }, '1 tema og 1 område mangler ID.'],
  ])('teller riktig med entall og flertall: %j', async (ids, text) => {
    const data = complete()
    data.risks = withoutCodes(data.risks, ids.risks ?? [])
    data.owners = withoutCodes(data.owners, ids.owners ?? [])
    data.themes = withoutCodes(data.themes, ids.themes ?? [])
    data.areas = withoutCodes(data.areas, ids.areas ?? [])
    await open(data)
    expect(within(notice()).getByText(text)).toBeInTheDocument()
  })

  it('viser lenker til hvert element når man trykker «Vis»', async () => {
    const data = complete()
    data.risks = withoutCodes(data.risks, ['r2'])
    data.owners = withoutCodes(data.owners, ['o2'])
    const { user } = await open(data)

    const toggle = within(notice()).getByRole('button', { name: 'Vis' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(notice()).queryByRole('link')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(within(notice()).getByRole('button', { name: 'Skjul' })).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(notice())
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Risiko: Datainnbrudd', 'Eier: Ola Åsen'])
    expect(within(notice()).getByRole('link', { name: 'Datainnbrudd' })).toHaveAttribute('href', '/?risiko=r2')
    expect(within(notice()).getByRole('link', { name: 'Ola Åsen' })).toHaveAttribute('href', '/eiere?rediger=o2')
  })

  it('åpner risikoen fra lenken', async () => {
    const data = complete()
    data.risks = withoutCodes(data.risks, ['r2'])
    const { user } = await open(data, '/matrise')
    await user.click(within(notice()).getByRole('button', { name: 'Vis' }))
    await user.click(within(notice()).getByRole('link', { name: 'Datainnbrudd' }))

    const dialog = await screen.findByRole('dialog', { name: 'Endre risiko' })
    expect(within(dialog).getByLabelText('Tittel')).toHaveValue('Datainnbrudd')
  })

  it('forsvinner når siste element har fått ID', async () => {
    const data = complete()
    data.owners = withoutCodes(data.owners, ['o2'])
    const { user } = await open(data)
    await user.click(within(notice()).getByRole('button', { name: 'Vis' }))
    await user.click(within(notice()).getByRole('link', { name: 'Ola Åsen' }))

    const dialog = await screen.findByRole('dialog', { name: 'Endre risikoeier' })
    await user.type(within(dialog).getByLabelText('ID'), 'E-3')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Elementer uten ID' })).not.toBeInTheDocument()
  })

  it('har ingen brudd på tilgjengelighet, sammenslått og utvidet (axe)', async () => {
    const data = complete()
    data.risks = withoutCodes(data.risks, ['r1', 'r3'])
    data.areas = withoutCodes(data.areas, ['a1'])
    const { user } = await open(data)
    const run = async () =>
      (
        await axe.run(notice(), { rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] })
      ).violations.map((violation) => violation.id)

    expect(await run()).toEqual([])
    await user.click(within(notice()).getByRole('button', { name: 'Vis' }))
    expect(await run()).toEqual([])
  })
})
