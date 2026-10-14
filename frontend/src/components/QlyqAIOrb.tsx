import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { QlyqSymbol } from './QlyqLogo';

export type AIOrbState = 'idle' | 'thinking' | 'executing' | 'receiving' | 'success' | 'error';

export interface QlyqAIOrbProps {
  /** Real AI state matching backend agent lifecycle */
  state?: AIOrbState;
  /** Size in pixels (e.g. 120 for hero/header, 48 for compact indicator) */
  size?: number;
  /** Custom CSS classes */
  className?: string;
  /** Optional interactive hover/click response */
  interactive?: boolean;
}

/**
 * Signature QLYQ AI Orb
 * Built with Three.js — Sculptural interwoven ribbon Mobius geometry with translucent
 * physical glass materials, dynamic lighting responding to real AI/MCP agent states,
 * and automatic fallback when WebGL or reduced-motion is requested.
 */
export const QlyqAIOrb: React.FC<QlyqAIOrbProps> = ({
  state = 'idle',
  size = 120,
  className = '',
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // References to dynamic Three.js objects
  const stateRef = useRef<AIOrbState>(state);
  stateRef.current = state;

  useEffect(() => {
    // Check reduced motion media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || prefersReducedMotion) return;

    // Detect WebGL support safely
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // ── 1. Scene & Camera Setup ─────────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size, size);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      container.appendChild(renderer.domElement);
    } catch {
      setWebglSupported(false);
      return;
    }

    // ── 2. Sculptural Interwoven Ribbon Geometry (Mobius Torus Knot) ─────────
    // Inspired by QLYQ's interwoven ribbon brand symbol
    const group = new THREE.Group();
    scene.add(group);

    // Torus knot with (p=2, q=3) forms a clean trefoil ribbon knot
    const ribbonGeo = new THREE.TorusKnotGeometry(1.0, 0.32, 128, 32, 2, 3);

    // Outer Translucent Glass/Ceramic Material
    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#A78BFA'),
      emissive: new THREE.Color('#3B0764'),
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.75, // Glass translucent transmission
      thickness: 1.2,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#E2E8F0'),
      transparent: true,
      opacity: 0.92,
    });

    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    group.add(ribbonMesh);

    // Inner Glowing Core Sphere
    const coreGeo = new THREE.SphereGeometry(0.48, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#EDE9FE'),
      emissive: new THREE.Color('#7C3AED'),
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Subtle Satellite Orb Particle (representing intelligent tool dispatch)
    const satGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const satMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#60A5FA'),
      emissive: new THREE.Color('#38BDF8'),
      emissiveIntensity: 1.5,
    });
    const satelliteMesh = new THREE.Mesh(satGeo, satMat);
    scene.add(satelliteMesh);

    // ── 3. Lighting Setup ───────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0xa78bfa, 3.5, 12);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x60a5fa, 2.5, 10);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7c3aed, 3.0, 8);
    rimLight.position.set(0, -3, -2);
    scene.add(rimLight);

    // ── 4. Mouse / Touch Parallax Interaction ───────────────────────────────
    let targetRotX = 0;
    let targetRotY = 0;
    let isHovered = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.45;
      targetRotX = -y * 0.45;
    };

    const handleMouseEnter = () => { isHovered = true; };
    const handleMouseLeave = () => {
      isHovered = false;
      targetRotX = 0;
      targetRotY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // ── 5. Real-Time State Animation Loop ───────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Base rotation speeds calibrated per state
      let speedFactor = 0.55;
      let corePulseSpeed = 2.0;
      let targetColor = '#A78BFA';
      let targetEmissive = '#7C3AED';
      let targetCoreScale = 1.0;
      let satOrbitSpeed = 1.2;

      switch (currentState) {
        case 'thinking':
          speedFactor = 1.8;
          corePulseSpeed = 5.0;
          targetColor = '#818CF8';
          targetEmissive = '#6366F1';
          targetCoreScale = 1.0 + Math.sin(elapsed * corePulseSpeed) * 0.12;
          satOrbitSpeed = 2.8;
          break;

        case 'executing':
          // High intensity ripple when calling MCP tools
          speedFactor = 2.6;
          corePulseSpeed = 8.0;
          targetColor = '#38BDF8';
          targetEmissive = '#0284C7';
          targetCoreScale = 1.15 + Math.sin(elapsed * 10.0) * 0.08;
          satOrbitSpeed = 4.2;
          break;

        case 'receiving':
          speedFactor = 1.2;
          targetColor = '#34D399';
          targetEmissive = '#059669';
          targetCoreScale = 1.05;
          satOrbitSpeed = 2.0;
          break;

        case 'success':
          speedFactor = 0.7;
          targetColor = '#10B981';
          targetEmissive = '#047857';
          targetCoreScale = 1.0;
          satOrbitSpeed = 1.4;
          break;

        case 'error':
          speedFactor = 0.4;
          corePulseSpeed = 2.0;
          targetColor = '#F87171';
          targetEmissive = '#DC2626';
          targetCoreScale = 0.95 + Math.sin(elapsed * 3.0) * 0.05;
          satOrbitSpeed = 0.6;
          break;

        case 'idle':
        default:
          speedFactor = 0.5;
          corePulseSpeed = 1.5;
          targetColor = '#A78BFA';
          targetEmissive = '#7C3AED';
          targetCoreScale = 1.0 + Math.sin(elapsed * corePulseSpeed) * 0.04;
          satOrbitSpeed = 1.0;
          break;
      }

      // Smooth color transitions
      ribbonMat.color.lerp(new THREE.Color(targetColor), 0.08);
      coreMat.emissive.lerp(new THREE.Color(targetEmissive), 0.08);
      keyLight.color.lerp(new THREE.Color(targetColor), 0.08);

      // Core scale animation
      coreMesh.scale.lerp(
        new THREE.Vector3(targetCoreScale, targetCoreScale, targetCoreScale),
        0.1
      );

      // Ribbon fluid continuous rotation
      group.rotation.x += 0.006 * speedFactor;
      group.rotation.y += 0.012 * speedFactor;

      // Mouse interactive tilt interpolation
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.05;

      // Satellite particle orbit
      const satRadius = 1.85;
      const satAngle = elapsed * satOrbitSpeed;
      satelliteMesh.position.set(
        Math.cos(satAngle) * satRadius,
        Math.sin(satAngle * 1.5) * 0.6,
        Math.sin(satAngle) * satRadius
      );

      // Breathing scale when hovered
      const hoverScale = isHovered ? 1.08 : 1.0;
      group.scale.lerp(new THREE.Vector3(hoverScale, hoverScale, hoverScale), 0.1);

      renderer?.render(scene, camera);
    };

    renderLoop();

    // ── 6. Cleanup & Memory Disposal ────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      }

      ribbonGeo.dispose();
      ribbonMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      satGeo.dispose();
      satMat.dispose();
    };
  }, [size, interactive, prefersReducedMotion]);

  // Fallback if WebGL unavailable or user prefers reduced motion
  if (!webglSupported || prefersReducedMotion) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2 rounded-2xl bg-surface-card border border-border/80 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <QlyqSymbol size={Math.round(size * 0.75)} theme="dark" />
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
