// src/components/BlochSphere/BlochSphere.tsx
import React, { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import SphereScene from './SphereScene'
import styles from './BlochSphere.module.css'

const BASELINE_DIST = Math.sqrt(1.5 * 1.5 + 1.5 * 1.5 + 1.5 * 1.5)  // √6.75 ≈ 2.598

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

  const [zoomMultiplier, setZoomMultiplier] = useState(1)
  const [zoomTarget, setZoomTarget] = useState<number | null>(null)

  const handleCameraChange = useCallback((distance: number) => {
    setZoomMultiplier(BASELINE_DIST / distance)
  }, [])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setZoomMultiplier(v)
    setZoomTarget(BASELINE_DIST / v)
  }, [])

  const handleZoomApplied = useCallback(() => setZoomTarget(null), [])

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
          onCameraChange={handleCameraChange}
          zoomTarget={zoomTarget}
          onZoomApplied={handleZoomApplied}
        />
      </Canvas>
      <div className={styles.presets}>
        <button className={styles.presetBtn} onClick={() => setPreset('top')}>Top</button>
        <button className={styles.presetBtn} onClick={() => setPreset('front')}>Front</button>
        <button className={styles.presetBtn} onClick={() => setPreset('free')}>Free</button>
        <label className={styles.zoomLabel} title="Zoom">
          <span className={styles.zoomIcon}>🔍</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoomMultiplier}
            onChange={handleSliderChange}
            className={styles.zoomSlider}
            aria-label="Zoom level"
          />
        </label>
      </div>
    </div>
  )
}
