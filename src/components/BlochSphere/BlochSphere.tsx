// src/components/BlochSphere/BlochSphere.tsx
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import SphereScene from './SphereScene'
import styles from './BlochSphere.module.css'

const VECTOR_COLORS = {
  dark:  { vector: '#00d4ff', label: '#8b949e', grid: '#444c56', wireframe: '#30363d' },
  light: { vector: '#005bb5', label: '#6b5d4a', grid: '#b8a898', wireframe: '#c8bfa8' },
} as const

type Preset = 'top' | 'front' | 'free' | null

type Props = {
  theta: number
  phi: number
  theme: 'dark' | 'light'
}

export default function BlochSphere({ theta, phi, theme }: Props) {
  const [preset, setPreset] = useState<Preset>(null)
  const handlePresetApplied = useCallback(() => setPreset(null), [])

  return (
    <div className={styles.container}>
      <Canvas style={{ position: 'absolute', inset: 0 }} camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
        <SphereScene
          theta={theta}
          phi={phi}
          vectorColor={VECTOR_COLORS[theme].vector}
          labelColor={VECTOR_COLORS[theme].label}
          gridColor={VECTOR_COLORS[theme].grid}
          wireframeColor={VECTOR_COLORS[theme].wireframe}
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
