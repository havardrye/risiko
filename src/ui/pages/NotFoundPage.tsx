import { Link } from 'react-router-dom'
import { ROUTES } from '../routes.ts'
import { usePageTitle } from '../usePageTitle.ts'

export function NotFoundPage() {
  usePageTitle('Fant ikke siden')
  return (
    <>
      <h1>Fant ikke siden</h1>
      <p>
        Adressen finnes ikke. Gå til <Link to={ROUTES.risks.path}>risikoregisteret</Link>.
      </p>
    </>
  )
}
