// src/components/BlochSphere/BlochSphere.tsx
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import SphereScene from './SphereScene'
import styles from './BlochSphere.module.css'

type Preset = 'top' | 'front' | 'free' | null

type Props = {
  theta: number
  phi: number
}

export default function BlochSphere({ theta, phi }: Props) {
  const [preset, setPreset] = useState<Preset>(null)
  const handlePresetApplied = useCallback(() => setPreset(null), [])

  return (
    <div className={styles.container}>
      <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
        <SphereScene
          theta={theta}
          phi={phi}
          cameraPreset={preset}
          onPresetApplied={handlePresetApplied}
        />
      </Canvas>
      <div className={styles.presets}>
        <button className={styles.presetBtn} onClick={() => setPreset('top')}>Top</button>
        <button className={styles.presetBtn} onClick={() => setPreset('front')}>Front</button>
        <button className={styles.presetBtn} onClick={() => setPreset('free')}>Free</button>
      </div>
    </div>
  )
}
