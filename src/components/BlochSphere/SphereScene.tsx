// src/components/BlochSphere/SphereScene.tsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type Props = {
  theta: number
  phi: number
  vectorColor: string
  labelColor: string
  gridColor: string
  wireframeColor: string
  cameraPreset: 'top' | 'front' | 'free' | null
  onPresetApplied: () => void
}

// Convert Bloch sphere angles to Cartesian point on unit sphere.
// theta=0 → north pole (Y=1), theta=π → south pole (Y=-1).
// phi is the azimuthal angle in the XZ plane.
function blochToCartesian(theta: number, phi: number): [number, number, number] {
  return [
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),                  // Y is up in Three.js
    Math.sin(theta) * Math.sin(phi),
  ]
}

export default function SphereScene({ theta, phi, vectorColor, labelColor, gridColor, wireframeColor, cameraPreset, onPresetApplied }: Props) {
  const arrowGroupRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Animated display angles (GSAP tweens these)
  const displayRef = useRef({ theta, phi })

  // When theta/phi change, tween to new value
  useEffect(() => {
    gsap.killTweensOf(displayRef.current)
    // Normalize phi delta to [-π, π] so the arrow always takes the short arc
    const deltaPhi = ((phi - displayRef.current.phi + Math.PI) % (2 * Math.PI)) - Math.PI
    const targetPhi = displayRef.current.phi + deltaPhi
    gsap.to(displayRef.current, {
      theta,
      phi: targetPhi,
      duration: 0.4,
      ease: 'power2.inOut',
    })
  }, [theta, phi])

  // Camera preset handler
  useEffect(() => {
    if (!cameraPreset || !cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const controls = controlsRef.current

    if (cameraPreset === 'top') {
      gsap.to(cam.position, { x: 0, y: 3, z: 0.001, duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update() })
    } else if (cameraPreset === 'front') {
      gsap.to(cam.position, { x: 0, y: 0, z: 3, duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update() })
    } else if (cameraPreset === 'free') {
      gsap.to(cam.position, {
        x: 1.5, y: 1.5, z: 1.5,
        duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
    }
    onPresetApplied()
  }, [cameraPreset, onPresetApplied])

  // Per-frame: update arrow group rotation to point toward the animated Bloch position.
  // Three.js lookAt points the object's local +Z toward the target.
  // The shaft/cone are built along the local +Z axis so this works directly.
  useFrame(({ camera }) => {
    cameraRef.current = camera
    if (!arrowGroupRef.current) return
    const { theta: t, phi: p } = displayRef.current
    const [x, y, z] = blochToCartesian(t, p)
    arrowGroupRef.current.up.set(0, 0, 1)
    arrowGroupRef.current.lookAt(x, y, z)
  })

  // One Line per axis; Z axis gets two labels (one at each pole)
  const axes: Array<{
    points: [[number,number,number],[number,number,number]]
    labels: Array<{ text: string; pos: [number,number,number] }>
  }> = [
    {
      points: [[0, -1.3, 0], [0, 1.3, 0]],
      labels: [
        { text: '+Z / |0⟩', pos: [0,  1.55, 0] },
        { text: '−Z / |1⟩', pos: [0, -1.65, 0] },
      ],
    },
    {
      points: [[-1.3, 0, 0], [1.3, 0, 0]],
      labels: [{ text: '+X / |+⟩', pos: [1.65, 0, 0] }],
    },
    {
      points: [[0, 0, -1.3], [0, 0, 1.3]],
      labels: [{ text: '+Y / |i⟩', pos: [0, 0, 1.65] }],
    },
  ]

  // Equator ring geometry
  const equatorPoints = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
  })

  return (
    <>
      <OrbitControls ref={controlsRef as React.RefObject<OrbitControlsImpl>} enablePan={false} />
      <ambientLight intensity={0.5} />

      {/* Sphere — ghost outline at 15% opacity */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#58a6ff"
          transparent
          opacity={0.15}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={wireframeColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Axes — one Line per axis, labels at each end */}
      {axes.map((axis, i) => (
        <group key={i}>
          <Line points={axis.points} color={gridColor} lineWidth={2} />
          {axis.labels.map(lbl => (
            <Html key={lbl.text} position={lbl.pos} center>
              <span style={{ color: labelColor, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'nowrap', fontWeight: 'bold', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                {lbl.text}
              </span>
            </Html>
          ))}
        </group>
      ))}

      {/* Equator ring */}
      <Line points={equatorPoints} color={gridColor} lineWidth={1} />

      {/* State vector arrow — shaft + cone arrowhead along local +Z axis.
          lookAt() points the group's +Z toward the Bloch surface point.
          CylinderGeometry and ConeGeometry are natively Y-aligned, so we
          rotate each mesh by -π/2 around X to align with +Z.
          Shaft center at z=0.45 (spans 0..0.9), cone center at z=0.975
          (tip reaches z≈1.05 ≈ sphere surface). */}
      <group ref={arrowGroupRef}>
        {/* Shaft */}
        <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
          <meshStandardMaterial color={vectorColor} />
        </mesh>
        {/* Arrowhead cone — tip points in +Z direction (cone apex is at +Y in local frame,
            which after the -π/2 X rotation maps to +Z) */}
        <mesh position={[0, 0, 0.975]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.07, 0.15, 8]} />
          <meshStandardMaterial color={vectorColor} />
        </mesh>
      </group>
    </>
  )
}
