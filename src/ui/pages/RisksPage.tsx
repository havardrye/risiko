import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DEFAULT_SORT, filterRisks, type RiskSort } from '../../domain/filters.ts'
import type { Risk } from '../../domain/schema.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Dialog, DialogActions } from '../components/Dialog.tsx'
import { RiskFilterBar } from '../components/RiskFilterBar.tsx'
import { RiskForm } from '../components/RiskForm.tsx'
import { RiskTable } from '../components/RiskTable.tsx'
import { OPEN_RISK_PARAM, ROUTES } from '../routes.ts'
import { useFocusRequest } from '../useFocusRequest.ts'
import { usePageTitle } from '../usePageTitle.ts'
import { useRiskFilter } from '../useRiskFilter.ts'
import styles from './RisksPage.module.css'

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; risk: Risk }
  | { type: 'confirmDelete'; risk: Risk }
  | { type: 'missing' }

const CLOSED: DialogState = { type: 'closed' }

function countText(count: number): string {
  return count === 1 ? '1 risiko' : `${count} risikoer`
}

export function RisksPage() {
  usePageTitle(ROUTES.risks.label)
  const { owners, themes, areas, risks } = useAppData()
  const store = useDataStore()
  const [dialog, setDialog] = useState<DialogState>(CLOSED)
  const [sort, setSort] = useState<RiskSort>(DEFAULT_SORT)
  const [deleteError, setDeleteError] = useState<string>()
  const filterState = useRiskFilter()
  const filtered = useMemo(
    () => filterRisks(risks, filterState.filter),
    [risks, filterState.filter],
  )

  const close = () => setDialog(CLOSED)
  const [headingRef, focusHeading] = useFocusRequest<HTMLHeadingElement>()

  // En lenke som «#/?risiko=r1» (f.eks. fra matrisen) åpner risikoen for endring.
  // Parameteren fjernes straks, så dialogen ikke åpnes igjen ved sideoppdatering.
  const [params, setParams] = useSearchParams()
  const openRiskId = params.get(OPEN_RISK_PARAM)
  const [handledOpenId, setHandledOpenId] = useState<string | null>(null)
  if (openRiskId !== handledOpenId) {
    // Nullstilles når parameteren er fjernet, så samme risiko kan åpnes på nytt senere.
    setHandledOpenId(openRiskId)
    const risk = openRiskId ? risks.find((candidate) => candidate.id === openRiskId) : undefined
    if (risk) setDialog({ type: 'edit', risk })
  }
  useEffect(() => {
    if (!openRiskId) return
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(OPEN_RISK_PARAM)
        return next
      },
      { replace: true },
    )
  }, [openRiskId, setParams])

  // En risiko må ha eier, tema og område, så de må finnes før skjemaet kan brukes (K22).
  const missing = [
    { count: owners.length, text: 'minst én risikoeier', route: ROUTES.owners },
    { count: themes.length, text: 'minst ett risikotema', route: ROUTES.themes },
    { count: areas.length, text: 'minst ett risikoområde', route: ROUTES.areas },
  ].filter((item) => item.count === 0)
  const canCreate = missing.length === 0
  const missingList = (
    <ul>
      {missing.map((item) => (
        <li key={item.route.path}>
          {item.text}, under <Link to={item.route.path}>{item.route.label}</Link>
        </li>
      ))}
    </ul>
  )

  async function confirmDelete(risk: Risk) {
    close()
    try {
      await store.deleteRisk(risk.id)
      focusHeading()
    } catch {
      setDeleteError(`Kunne ikke slette «${risk.title}». Prøv igjen.`)
    }
  }

  return (
    <>
      <div className={styles.header}>
        <h1 ref={headingRef} tabIndex={-1}>
          {ROUTES.risks.label}
        </h1>
        {/* Knappen vises alltid, så det er tydelig hvor risikoer legges inn. Mangler
            eier, tema eller område, forklarer den hva som må gjøres først. */}
        <button
          type="button"
          className="button button-primary"
          onClick={() => setDialog({ type: canCreate ? 'create' : 'missing' })}
        >
          Ny risiko
        </button>
      </div>

      {deleteError && <p role="alert">{deleteError}</p>}

      {!canCreate ? (
        <section className={styles.guide} aria-labelledby="kom-i-gang">
          <h2 id="kom-i-gang" className={styles.guideTitle}>
            Kom i gang
          </h2>
          <p>
            Hver risiko har en eier, et tema og et område. Før du kan registrere risikoer må det
            finnes:
          </p>
          {missingList}
        </section>
      ) : risks.length === 0 ? (
        <p className={styles.empty}>
          Ingen risikoer er registrert ennå. Opprett den første med «Ny risiko».
        </p>
      ) : (
        <>
          <RiskFilterBar state={filterState} />
          <p className="muted" aria-live="polite">
            {filterState.active
              ? `Viser ${filtered.length} av ${countText(risks.length)}`
              : countText(risks.length)}
          </p>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>Ingen risikoer passer filteret.</p>
              <button type="button" className="button" onClick={filterState.reset}>
                Nullstill filtre
              </button>
            </div>
          ) : (
            <RiskTable
              risks={filtered}
              sort={sort}
              onSortChange={setSort}
              onEdit={(risk) => setDialog({ type: 'edit', risk })}
              onDelete={(risk) => {
                setDeleteError(undefined)
                setDialog({ type: 'confirmDelete', risk })
              }}
            />
          )}
        </>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        title={dialog.type === 'edit' ? 'Endre risiko' : 'Ny risiko'}
        onClose={close}
      >
        <RiskForm risk={dialog.type === 'edit' ? dialog.risk : undefined} onDone={close} />
      </Dialog>

      <ConfirmDialog
        open={dialog.type === 'confirmDelete'}
        title="Slette risikoen?"
        confirmLabel="Slett"
        danger
        onConfirm={() => {
          if (dialog.type === 'confirmDelete') void confirmDelete(dialog.risk)
        }}
        onCancel={close}
      >
        {dialog.type === 'confirmDelete' && (
          <p>«{dialog.risk.title}» blir slettet. Dette kan ikke angres.</p>
        )}
      </ConfirmDialog>

      <Dialog
        open={dialog.type === 'missing'}
        title="Først trengs eier, tema og område"
        onClose={close}
      >
        <p>Hver risiko har en eier, et tema og et område. Før du kan registrere risikoer må det finnes:</p>
        {missingList}
        <DialogActions>
          <button type="button" className="button button-primary" onClick={close}>
            Lukk
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}
