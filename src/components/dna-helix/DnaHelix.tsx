import type { CSSProperties } from 'react'
import PointDNAHelix from './point-dna-helix-custom-style'

type DnaHelixProps = {
  /** Page colour behind the helix. */
  background?: string
  /** Extra spin (radians) per viewport height the page scrolls. 0 = off. */
  scrollSpin?: number
  className?: string
  style?: CSSProperties
}

/**
 * The tuned DNA helix with all settings baked in. It fills its parent, so give
 * the parent a size (e.g. `height: 100vh`).
 */
export default function DnaHelix({
  background = '#0C2342',
  scrollSpin = 0,
  className,
  style,
}: DnaHelixProps) {
  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', background, ...style }}
    >
      <PointDNAHelix
        background="transparent"
        baseColor="#5EF2E6"
        accentColor="#B48CFF"
        accentMix={90}
        glow=""
        // 130 ≈ 128,700 points, just under the component's 130,000 cap.
        density={130}
        dotSize={212}
        speed={50}
        zoom={30}
        hover={0}
        scrollSpin={scrollSpin}
        tilt={{ x: -5, y: 87 }}
        // Low pulse and a faint halo keep the shimmer calm.
        helix={{ turns: 1, thickness: 11, pulse: 12 }}
        // Neon halo that follows the helix's shape (the canvas is transparent).
        style={{
          filter:
            'drop-shadow(0 0 2px rgba(94, 242, 230, 0.18)) drop-shadow(0 0 6px rgba(180, 140, 255, 0.08))',
        }}
      />
    </div>
  )
}
