import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function WireIcosahedron({ mouse }) {
  const outer = useRef();
  const inner = useRef();
  const ring = useRef();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (outer.current) {
      outer.current.rotation.x += delta * 0.09;
      outer.current.rotation.y += delta * 0.13;
    }
    if (inner.current) {
      inner.current.rotation.x -= delta * 0.11;
      inner.current.rotation.z += delta * 0.09;
      inner.current.position.y = Math.sin(t * 0.55) * 0.12;
    }
    if (ring.current) {
      ring.current.rotation.z += delta * 0.16;
      ring.current.rotation.x = Math.sin(t * 0.3) * 0.18;
    }

    if (mouse) {
      const target = state.pointer;
      outer.current.rotation.x += target.y * 0.006;
      outer.current.rotation.y += target.x * 0.006;
    }
  });

  return (
    <group>
      <group ref={outer}>
        <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.7}>
          <mesh>
            <icosahedronGeometry args={[1.7, 1]} />
            <meshBasicMaterial
              color="#0066FF"
              wireframe
              transparent
              opacity={0.32}
            />
          </mesh>
          <mesh scale={1.001}>
            <icosahedronGeometry args={[1.7, 1]} />
            <meshStandardMaterial
              color="#0a1428"
              wireframe
              transparent
              opacity={0.08}
              roughness={0.6}
              metalness={0.4}
            />
          </mesh>
        </Float>
      </group>

      <group ref={inner}>
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
          <mesh>
            <octahedronGeometry args={[0.95, 0]} />
            <meshStandardMaterial
              color="#052a6e"
              roughness={0.25}
              metalness={0.7}
              emissive="#0066FF"
              emissiveIntensity={0.14}
            />
          </mesh>
        </Float>
      </group>

      <group ref={ring}>
        <mesh>
          <torusGeometry args={[2.35, 0.012, 12, 120]} />
          <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.7, 0.007, 12, 120]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
        </mesh>
      </group>
    </group>
  );
}

function Particles({ count = 90 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.2 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#3d8bff"
        transparent
        opacity={0.5}
      />
    </points>
  );
}

export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!enabled) return null;

  return (
    <div className="hero-scene" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <pointLight position={[4, 4, 6]} intensity={30} color="#0066FF" />
        <pointLight position={[-4, -2, -4]} intensity={12} color="#ffffff" />
        <WireIcosahedron />
        <Particles />
      </Canvas>
    </div>
  );
}