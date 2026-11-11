import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeHeroCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x4e9ad9, 3, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const tealLight = new THREE.PointLight(0x42b3b1, 2, 50);
    tealLight.position.set(-5, -3, 4);
    scene.add(tealLight);

    // Create 3D Escrow Vault Crystalline Cubes & Rings representing secure network
    const group = new THREE.Group();
    scene.add(group);

    // Central Vault Cube
    const cubeGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const cubeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b3658,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const centralCube = new THREE.Mesh(cubeGeo, cubeMat);
    group.add(centralCube);

    // Outer Wireframe & glowing ring
    const ringGeo = new THREE.TorusGeometry(3.2, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4e9ad9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    // Floating particles (Signal Blue & Active Teal spheres)
    const particleCount = 40;
    const particleGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const particleMat1 = new THREE.MeshBasicMaterial({ color: 0x4e9ad9 });
    const particleMat2 = new THREE.MeshBasicMaterial({ color: 0x42b3b1 });

    const particles: { mesh: THREE.Mesh; speed: number; angle: number; radius: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const mat = i % 2 === 0 ? particleMat1 : particleMat2;
      const mesh = new THREE.Mesh(particleGeo, mat);
      const radius = 3.5 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4;

      mesh.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      scene.add(mesh);
      particles.push({ mesh, speed: 0.005 + Math.random() * 0.01, angle, radius });
    }

    // Mouse interactivity
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / container.clientHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      centralCube.rotation.x += 0.004;
      centralCube.rotation.y += 0.007;

      ring.rotation.z += 0.003;

      group.rotation.y += 0.002 + mouseX * 0.05;
      group.rotation.x += mouseY * 0.05;

      // Orbit particles
      particles.forEach(p => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
};
