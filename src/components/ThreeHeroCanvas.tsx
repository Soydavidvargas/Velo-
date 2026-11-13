import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeHeroCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
    camera.position.z = 7.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Soft bright lighting aligned with cord.com palette
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x4e9ad9, 2.8, 50);
    blueLight.position.set(5, 4, 6);
    scene.add(blueLight);

    const tealLight = new THREE.PointLight(0x42b3b1, 2.2, 50);
    tealLight.position.set(-5, -4, 5);
    scene.add(tealLight);

    const group = new THREE.Group();
    scene.add(group);

    // Translucent ice-blue central polyhedron (light & airy so centered dark typography stays crystal clear)
    const coreGeo = new THREE.IcosahedronGeometry(1.85, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6f1fa,
      emissive: 0x4e9ad9,
      emissiveIntensity: 0.12,
      metalness: 0.08,
      roughness: 0.25,
      transparent: true,
      opacity: 0.55,
    });
    const centralVault = new THREE.Mesh(coreGeo, coreMat);
    group.add(centralVault);

    // Crisp architectural wireframe shell representing connected home structure
    const wireGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.15, 1));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x4e9ad9,
      transparent: true,
      opacity: 0.42,
    });
    const wireShell = new THREE.LineSegments(wireGeo, wireMat);
    group.add(wireShell);

    // Primary & secondary orbital connectivity rings
    const ringGeo = new THREE.TorusGeometry(3.45, 0.028, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4e9ad9,
      transparent: true,
      opacity: 0.48,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.y = Math.PI / 8;
    group.add(ring);

    const innerRingGeo = new THREE.TorusGeometry(2.75, 0.02, 16, 100);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x42b3b1,
      transparent: true,
      opacity: 0.4,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 3.2;
    innerRing.rotation.z = Math.PI / 5;
    group.add(innerRing);

    // Floating network nodes (Signal Blue & Active Teal)
    const particleCount = 38;
    const particleGeo = new THREE.SphereGeometry(0.065, 14, 14);
    const particleMat1 = new THREE.MeshBasicMaterial({
      color: 0x4e9ad9,
      transparent: true,
      opacity: 0.72,
    });
    const particleMat2 = new THREE.MeshBasicMaterial({
      color: 0x42b3b1,
      transparent: true,
      opacity: 0.72,
    });

    const particles: {
      mesh: THREE.Mesh;
      speed: number;
      angle: number;
      radius: number;
      yBase: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const mat = i % 2 === 0 ? particleMat1 : particleMat2;
      const mesh = new THREE.Mesh(particleGeo, mat);
      const radius = 3.2 + Math.random() * 3.4;
      const angle = Math.random() * Math.PI * 2;
      const yBase = (Math.random() - 0.5) * 4.2;

      mesh.position.set(Math.cos(angle) * radius, yBase, Math.sin(angle) * radius);
      scene.add(mesh);
      particles.push({ mesh, speed: 0.003 + Math.random() * 0.006, angle, radius, yBase });
    }

    let mouseX = 0;
    let mouseY = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        centralVault.rotation.x += 0.0025;
        centralVault.rotation.y += 0.004;
        wireShell.rotation.y -= 0.002;
        wireShell.rotation.z += 0.0015;
        ring.rotation.z += 0.0025;
        innerRing.rotation.y -= 0.003;

        group.rotation.y += (mouseX * 0.28 - group.rotation.y) * 0.03;
        group.rotation.x += (mouseY * 0.18 - group.rotation.x) * 0.03;

        particles.forEach((p, idx) => {
          p.angle += p.speed;
          p.mesh.position.x = Math.cos(p.angle) * p.radius;
          p.mesh.position.z = Math.sin(p.angle) * p.radius;
          p.mesh.position.y = p.yBase + Math.sin(p.angle * 2 + idx) * 0.18;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
};
