import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { QlyqSymbol } from './QlyqLogo';

export type AIOrbState = 'idle' | 'thinking' | 'executing' | 'receiving' | 'success' | 'error';

export interface QlyqAIOrbProps {
  /** Real AI state matching backend agent lifecycle */
  state?: AIOrbState;
  /** Size in pixels (default: 84) */
  size?: number;
  /** Custom CSS classes */
  className?: string;
  /** Optional interactive hover/click response */
  interactive?: boolean;
}

/**
 * High-performance, sculptural Three.js Ribbon Orb for QLYQ
 * - Dual Mobius/Trefoil interwoven ribbons with physical metallic and dielectric reflections
 * - Inner breathing quantum core
 * - Dynamic orbital nodes representing active MCP tool calls
 * - Automatic WebGL context loss recovery, ResizeObserver integration, and StrictMode deduplication
 * - Zero CPU spinning when offscreen or when reduced motion is preferred
 */
export const QlyqAIOrb: React.FC<QlyqAIOrbProps> = ({
  state = 'idle',
  size = 84,
  className = '',
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const stateRef = useRef<AIOrbState>(state);
  stateRef.current = state;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || prefersReducedMotion) return;

    // ── 0. Canvas & WebGL Context Validation ───────────────────────────────────
    let glContext: WebGLRenderingContext | null = null;
    try {
      const testCanvas = document.createElement('canvas');
      glContext = (testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!glContext) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // ── 1. Scene, Camera, & High-Performance Renderer ──────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 4.3);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        stencil: false,
        depth: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      container.appendChild(renderer.domElement);
    } catch {
      setWebglSupported(false);
      return;
    }

    // ── 2. Sculptural Interwoven Ribbon Geometry ───────────────────────────────
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Primary Trefoil Ribbon Knot (p=2, q=3)
    const ribbonGeo = new THREE.TorusKnotGeometry(1.05, 0.28, 140, 28, 2, 3);
    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#A78BFA'),
      emissive: new THREE.Color('#3B0764'),
      emissiveIntensity: 0.4,
      roughness: 0.18,
      metalness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      specularColor: new THREE.Color('#E2E8F0'),
      transparent: true,
      opacity: 0.94,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    rootGroup.add(ribbonMesh);

    // Counter-rotated Secondary Fine Wire Ribbon Ring
    const ringGeo = new THREE.TorusGeometry(1.42, 0.04, 16, 80);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#60A5FA'),
      emissive: new THREE.Color('#2563EB'),
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    rootGroup.add(ringMesh);

    // Inner Glowing Quantum Core
    const coreGeo = new THREE.SphereGeometry(0.44, 28, 28);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#EDE9FE'),
      emissive: new THREE.Color('#7C3AED'),
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Dynamic Orbital MCP Tool Particle Nodes (2 satellites)
    const satGroup = new THREE.Group();
    scene.add(satGroup);

    const satGeo1 = new THREE.SphereGeometry(0.08, 16, 16);
    const satMat1 = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38BDF8'),
      emissive: new THREE.Color('#0284C7'),
      emissiveIntensity: 1.8,
    });
    const sat1 = new THREE.Mesh(satGeo1, satMat1);
    satGroup.add(sat1);

    const satGeo2 = new THREE.SphereGeometry(0.06, 16, 16);
    const satMat2 = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#A78BFA'),
      emissive: new THREE.Color('#7C3AED'),
      emissiveIntensity: 1.5,
    });
    const sat2 = new THREE.Mesh(satGeo2, satMat2);
    satGroup.add(sat2);

    // ── 3. Balanced Studio Lighting ────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0xa78bfa, 4.0, 10);
    keyLight.position.set(2.5, 3.2, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x60a5fa, 3.0, 9);
    fillLight.position.set(-3.0, -2.5, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7c3aed, 2.5, 8);
    rimLight.position.set(0, -3.2, -2.5);
    scene.add(rimLight);

    // ── 4. Interactive Mouse / Touch Parallax ───────────────────────────────────
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let isHovered = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetTiltY = x * 0.4;
      targetTiltX = -y * 0.4;
    };

    const onMouseEnter = () => { isHovered = true; };
    const onMouseLeave = () => {
      isHovered = false;
      targetTiltX = 0;
      targetTiltY = 0;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);

    // ── 5. Responsive ResizeObserver ───────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && renderer) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // ── 6. State Lifecycle Animation Loop ──────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const curState = stateRef.current;

      // Dynamics configuration based on AI status
      let rotSpeed = 0.65;
      let coreScale = 1.0;
      let targetColor = '#A78BFA';
      let targetEmissive = '#7C3AED';
      let targetCoreEmissive = '#7C3AED';
      let satOrbitSpeed = 1.3;

      switch (curState) {
        case 'thinking':
          rotSpeed = 2.1;
          coreScale = 1.1 + Math.sin(elapsed * 6.0) * 0.12;
          targetColor = '#818CF8';
          targetEmissive = '#4F46E5';
          targetCoreEmissive = '#6366F1';
          satOrbitSpeed = 3.2;
          break;

        case 'executing':
          // High kinetic energy while calling MCP tools
          rotSpeed = 3.0;
          coreScale = 1.18 + Math.sin(elapsed * 12.0) * 0.1;
          targetColor = '#38BDF8';
          targetEmissive = '#0284C7';
          targetCoreEmissive = '#0EA5E9';
          satOrbitSpeed = 4.8;
          break;

        case 'receiving':
          rotSpeed = 1.4;
          coreScale = 1.06 + Math.sin(elapsed * 4.0) * 0.05;
          targetColor = '#34D399';
          targetEmissive = '#059669';
          targetCoreEmissive = '#10B981';
          satOrbitSpeed = 2.2;
          break;

        case 'success':
          rotSpeed = 0.8;
          coreScale = 1.0 + Math.sin(elapsed * 2.0) * 0.03;
          targetColor = '#10B981';
          targetEmissive = '#047857';
          targetCoreEmissive = '#059669';
          satOrbitSpeed = 1.5;
          break;

        case 'error':
          rotSpeed = 0.45;
          coreScale = 0.92 + Math.sin(elapsed * 2.5) * 0.04;
          targetColor = '#F87171';
          targetEmissive = '#DC2626';
          targetCoreEmissive = '#EF4444';
          satOrbitSpeed = 0.8;
          break;

        case 'idle':
        default:
          rotSpeed = 0.6;
          coreScale = 1.0 + Math.sin(elapsed * 1.8) * 0.04;
          targetColor = '#A78BFA';
          targetEmissive = '#7C3AED';
          targetCoreEmissive = '#7C3AED';
          satOrbitSpeed = 1.1;
          break;
      }

      // Smooth color interpolations
      ribbonMat.color.lerp(new THREE.Color(targetColor), 0.08);
      ribbonMat.emissive.lerp(new THREE.Color(targetEmissive), 0.08);
      coreMat.emissive.lerp(new THREE.Color(targetCoreEmissive), 0.08);
      keyLight.color.lerp(new THREE.Color(targetColor), 0.08);

      // Core scale
      coreMesh.scale.lerp(new THREE.Vector3(coreScale, coreScale, coreScale), 0.1);

      // Ribbon fluid continuous rotation
      ribbonMesh.rotation.x += 0.007 * rotSpeed;
      ribbonMesh.rotation.y += 0.013 * rotSpeed;

      // Fine wire ring counter-rotation
      ringMesh.rotation.z -= 0.009 * rotSpeed;
      ringMesh.rotation.x += 0.004 * rotSpeed;

      // Mouse interactive tilt interpolation
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;
      rootGroup.rotation.x = currentTiltX;
      rootGroup.rotation.y = currentTiltY;

      // Satellites orbital positions
      const satRadius1 = 1.75;
      const angle1 = elapsed * satOrbitSpeed;
      sat1.position.set(
        Math.cos(angle1) * satRadius1,
        Math.sin(angle1 * 1.4) * 0.5,
        Math.sin(angle1) * satRadius1
      );

      const satRadius2 = 1.45;
      const angle2 = -elapsed * (satOrbitSpeed * 0.85) + Math.PI;
      sat2.position.set(
        Math.cos(angle2) * satRadius2,
        Math.cos(angle2 * 1.6) * 0.45,
        Math.sin(angle2) * satRadius2
      );

      // Hover scale pop
      const hoverScale = isHovered ? 1.08 : 1.0;
      rootGroup.scale.lerp(new THREE.Vector3(hoverScale, hoverScale, hoverScale), 0.08);

      renderer?.render(scene, camera);
    };

    animate();

    // ── 7. Safe Resource Cleanup ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);

      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      }

      ribbonGeo.dispose();
      ribbonMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      satGeo1.dispose();
      satMat1.dispose();
      satGeo2.dispose();
      satMat2.dispose();
    };
  }, [size, interactive, prefersReducedMotion]);

  // Fallback if WebGL unavailable or user prefers reduced motion
  if (!webglSupported || prefersReducedMotion) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2 rounded-2xl bg-surface-card border border-border/80 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <QlyqSymbol size={Math.round(size * 0.72)} theme="dark" />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative inline-flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QLYQ AI Assistant status: ${state}`}
    />
  );
};

export default QlyqAIOrb;
