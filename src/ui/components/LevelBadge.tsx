import { levelStyle } from '../../domain/scales.ts'
import type { RiskType } from '../../domain/schema.ts'
import type { Level } from '../../domain/scoring.ts'
import styles from './LevelBadge.module.css'

interface LevelBadgeProps {
  type: RiskType
  level: Level
}

/** Nivå med farge og tekst, aldri bare farge (spec K3, K7). */
export function LevelBadge({ type, level }: LevelBadgeProps) {
  const style = levelStyle(type, level)
  return (
    <span className={styles.badge} style={{ background: style.background, color: style.text }}>
      {style.name}
    </span>
  )
}
