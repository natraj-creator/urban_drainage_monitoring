import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const STATUS_COLORS = {
  NORMAL: 0x10b981,
  WARNING: 0xf59e0b,
  HIGH_RISK: 0xf97316,
  CRITICAL: 0xef4444,
  POSSIBLE_BLOCKAGE: 0x06b6d4,
  UNKNOWN: 0x94a3b8,
};

function createBox(scene, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  scene.add(mesh);
  return mesh;
}

export default function DrainScene({ level, rainfall, status, isConnected, blockage }) {
  const containerRef = useRef(null);
  const liveDataRef = useRef({ level, rainfall, status, isConnected, blockage });

  useEffect(() => {
    liveDataRef.current = { level, rainfall, status, isConnected, blockage };
  }, [level, rainfall, status, isConnected, blockage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Animated 3D cutaway of the live monitored drain');
    renderer.domElement.setAttribute('role', 'img');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10212c);
    scene.fog = new THREE.Fog(0x10212c, 13, 28);

    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.set(7.8, 6.2, 10.5);
    camera.lookAt(0, 0.15, 0);

    scene.add(new THREE.HemisphereLight(0xdaf5ff, 0x334155, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const tealLight = new THREE.PointLight(0x2dd4bf, 22, 15);
    tealLight.position.set(-4, 3, 1);
    scene.add(tealLight);

    const concrete = new THREE.MeshStandardMaterial({ color: 0x87939c, roughness: 0.88 });
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x25323c, roughness: 0.94 });
    const soil = new THREE.MeshStandardMaterial({ color: 0x55493c, roughness: 1 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8495a0, metalness: 0.82, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 1 });
    const glassWall = new THREE.MeshPhysicalMaterial({
      color: 0x9ed5e6,
      transparent: true,
      opacity: 0.16,
      roughness: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x288bd0,
      emissive: 0x063353,
      emissiveIntensity: 0.38,
      transparent: true,
      opacity: 0.8,
      roughness: 0.14,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    createBox(scene, new THREE.BoxGeometry(11, 0.35, 6), soil, [0, -2.34, 0]);
    createBox(scene, new THREE.BoxGeometry(3.3, 0.2, 3.1), concrete, [0, -2.05, 0]);
    createBox(scene, new THREE.BoxGeometry(3.15, 0.13, 3), concrete, [0, 1.93, 0]);
    createBox(scene, new THREE.BoxGeometry(0.18, 4, 3), glassWall, [-1.58, -0.02, 0]);
    createBox(scene, new THREE.BoxGeometry(0.18, 4, 3), glassWall, [1.58, -0.02, 0]);
    createBox(scene, new THREE.BoxGeometry(3.3, 4, 0.16), glassWall, [0, -0.02, -1.5]);
    createBox(scene, new THREE.BoxGeometry(0.18, 4, 3), soil, [-2.5, -0.02, 0]);
    createBox(scene, new THREE.BoxGeometry(0.18, 4, 3), soil, [2.5, -0.02, 0]);
    createBox(scene, new THREE.BoxGeometry(3.1, 0.22, 1.1), asphalt, [-3.6, 2.06, 0]);
    createBox(scene, new THREE.BoxGeometry(3.1, 0.22, 1.1), asphalt, [3.6, 2.06, 0]);
    createBox(scene, new THREE.BoxGeometry(1.25, 0.22, 0.7), asphalt, [0, 2.06, -1.15]);
    createBox(scene, new THREE.BoxGeometry(1.25, 0.22, 0.7), asphalt, [0, 2.06, 1.15]);
    createBox(scene, new THREE.BoxGeometry(11, 0.08, 0.3), asphalt, [0, 1.91, -2.15]);

    for (let index = 0; index < 9; index += 1) {
      createBox(scene, new THREE.BoxGeometry(0.065, 0.13, 1.5), steel, [-0.72 + index * 0.18, 2.12, 0]);
    }

    const inlet = createBox(scene, new THREE.CylinderGeometry(0.43, 0.43, 0.18, 32), dark, [-1.48, 0.9, 0], [0, 0, Math.PI / 2]);
    inlet.castShadow = true;
    const outlet = createBox(scene, new THREE.CylinderGeometry(0.48, 0.48, 0.18, 32), dark, [1.48, -1.45, 0], [0, 0, Math.PI / 2]);
    outlet.castShadow = true;
    for (const [x, y, radius] of [[-1.48, 0.9, 0.43], [1.48, -1.45, 0.48]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 10, 36), steel);
      ring.position.set(x, y, 0);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      scene.add(ring);
    }

    const thresholdLines = [];
    for (const [threshold, color] of [[60, 0xf59e0b], [80, 0xf97316], [95, 0xef4444]]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(2.95, 0.035, 0.025),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }),
      );
      line.position.set(0, -2 + (threshold / 100) * 4, -1.39);
      scene.add(line);
      thresholdLines.push({ mesh: line, threshold });
    }

    const waterBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.96, 1, 2.85),
      [waterMaterial, waterMaterial, new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshBasicMaterial({ visible: false }), waterMaterial, waterMaterial],
    );
    waterBody.position.z = 0.04;
    scene.add(waterBody);
    const surfaceGeometry = new THREE.PlaneGeometry(2.96, 2.85, 26, 22);
    surfaceGeometry.rotateX(-Math.PI / 2);
    const originalSurface = Float32Array.from(surfaceGeometry.attributes.position.array);
    const waterSurface = new THREE.Mesh(surfaceGeometry, waterMaterial);
    waterSurface.position.z = 0.04;
    scene.add(waterSurface);

    const silt = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 0.42, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 1 }),
    );
    silt.position.set(0, -1.8, 0.04);
    silt.scale.y = 0.01;
    scene.add(silt);
    const debris = new THREE.Group();
    const debrisMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.86 }),
      new THREE.MeshStandardMaterial({ color: 0x4b6659, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 1 }),
    ];
    for (let index = 0; index < 18; index += 1) {
      const geometry = index % 3 === 0
        ? new THREE.BoxGeometry(0.2, 0.06, 0.16)
        : index % 3 === 1
          ? new THREE.CylinderGeometry(0.045, 0.05, 0.24, 8)
          : new THREE.DodecahedronGeometry(0.11);
      const piece = new THREE.Mesh(geometry, debrisMaterials[index % debrisMaterials.length]);
      piece.position.set(0.72 + Math.random() * 0.68, -1.88 + Math.random() * 0.68, (Math.random() - 0.5) * 1.25);
      piece.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      debris.add(piece);
    }
    debris.scale.setScalar(0.01);
    scene.add(debris);

    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.5), steel);
    sensor.position.set(0, 1.65, 0);
    sensor.castShadow = true;
    scene.add(sensor);
    const sensorLedMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2,
    });
    const sensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), sensorLedMaterial);
    sensorLed.position.set(0, 1.62, 0.3);
    scene.add(sensorLed);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    scene.add(beam);

    createBox(scene, new THREE.BoxGeometry(0.12, 1.4, 0.12), steel, [3.45, 2.9, -1.25]);
    createBox(scene, new THREE.BoxGeometry(0.7, 0.75, 0.48), concrete, [3.45, 3.4, -1.08]);
    const solarPanel = createBox(scene, new THREE.BoxGeometry(1.15, 0.07, 0.75), dark, [3.45, 4.02, -1.25], [-0.4, 0, 0]);
    solarPanel.material = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.35, roughness: 0.3 });
    const radioRings = [];
    for (let index = 0; index < 3; index += 1) {
      const radioRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.012, 6, 32),
        new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true }),
      );
      radioRing.position.set(3.1, 4.35, -1.25);
      scene.add(radioRing);
      radioRings.push(radioRing);
    }

    const rainCount = 360;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let index = 0; index < rainCount; index += 1) {
      rainPositions[index * 3] = (Math.random() - 0.5) * 10;
      rainPositions[index * 3 + 1] = 2.3 + Math.random() * 6;
      rainPositions[index * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.055, transparent: true, opacity: 0.55 });
    const rainPoints = new THREE.Points(rainGeometry, rainMaterial);
    rainPoints.frustumCulled = false;
    scene.add(rainPoints);

    const overflow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 2.4).rotateX(-Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0x2f8fe6, transparent: true, opacity: 0.48, roughness: 0.08 }),
    );
    overflow.position.set(0, 2.18, -0.2);
    overflow.scale.set(0.01, 1, 0.01);
    scene.add(overflow);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x101923, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.55;
    ground.receiveShadow = true;
    scene.add(ground);

    let frameId = 0;
    let lastFrame = 0;
    let rotationY = -0.42;
    let rotationX = 0.12;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;

    const onPointerDown = (event) => {
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
      if (!dragging) return;
      rotationY += (event.clientX - pointerX) * 0.009;
      rotationX = THREE.MathUtils.clamp(rotationX + (event.clientY - pointerY) * 0.005, -0.1, 0.5);
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    const animate = (time) => {
      frameId = window.requestAnimationFrame(animate);
      const delta = Math.min(0.05, lastFrame ? (time - lastFrame) / 1000 : 0.016);
      lastFrame = time;
      const data = liveDataRef.current;
      const waterLevel = THREE.MathUtils.clamp(Number(data.level) || 0, 0, 100);
      const waterHeight = Math.max(0.02, (waterLevel / 100) * 4);
      const waterY = -2 + waterHeight;
      const rainIntensity = THREE.MathUtils.clamp((Number(data.rainfall) || 0) / 10, 0, 1);
      const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.UNKNOWN;
      const blockageAmount = data.blockage ? 1 : 0.01;

      waterBody.scale.y += (waterHeight - waterBody.scale.y) * Math.min(1, delta * 3);
      waterBody.position.y = -2 + waterBody.scale.y / 2;
      waterSurface.position.y += (waterY - waterSurface.position.y) * Math.min(1, delta * 3);
      waterMaterial.color.lerp(new THREE.Color(data.blockage ? 0x3a74a6 : 0x2f8fe6), Math.min(1, delta * 1.5));
      const waveAmount = 0.008 + rainIntensity * 0.035;
      const surfacePositions = waterSurface.geometry.attributes.position;
      for (let index = 0; index < surfacePositions.count; index += 1) {
        surfacePositions.setY(
          index,
          Math.sin(originalSurface[index * 3] * 3 + time * 0.0018) * waveAmount
            + Math.cos(originalSurface[index * 3 + 2] * 2.6 + time * 0.0015) * waveAmount * 0.75,
        );
      }
      surfacePositions.needsUpdate = true;
      waterSurface.geometry.computeVertexNormals();
      silt.visible = silt.scale.y > 0.02 || data.blockage;
      silt.scale.y += (blockageAmount - silt.scale.y) * Math.min(1, delta * 0.5);
      silt.position.y = -2 + 0.21 * silt.scale.y;
      const debrisScale = data.blockage ? 1 : 0.01;
      debris.scale.setScalar(debris.scale.x + (debrisScale - debris.scale.x) * Math.min(1, delta * 1.2));

      thresholdLines.forEach(({ mesh, threshold }) => {
        mesh.material.opacity = waterLevel >= threshold ? 0.95 : 0.35;
      });
      sensorLedMaterial.color.setHex(data.isConnected ? statusColor : 0xef4444);
      sensorLedMaterial.emissive.setHex(data.isConnected ? statusColor : 0xef4444);
      const beamLength = Math.max(0.05, 1.53 - waterY);
      beam.scale.set(1, beamLength, 1);
      beam.position.y = 1.53 - beamLength / 2;
      beam.visible = data.isConnected;
      radioRings.forEach((ring, index) => {
        const phase = ((time / 2000) + index / radioRings.length) % 1;
        ring.scale.setScalar(1 + phase * 8);
        ring.material.opacity = data.isConnected ? (1 - phase) * 0.65 : 0;
      });
      rainPoints.visible = rainIntensity > 0.05;
      rainGeometry.setDrawRange(0, Math.round(rainCount * rainIntensity));
      const positions = rainGeometry.attributes.position;
      for (let index = 0; index < rainCount; index += 1) {
        let y = positions.getY(index) - (2 + rainIntensity * 5) * delta;
        if (y < 2.2) y = 8.3;
        positions.setY(index, y);
      }
      positions.needsUpdate = true;
      const overflowScale = waterLevel > 95.5 ? 1 : 0.01;
      overflow.scale.x += (overflowScale - overflow.scale.x) * Math.min(1, delta * 0.7);
      overflow.scale.z += (overflowScale - overflow.scale.z) * Math.min(1, delta * 0.7);
      overflow.visible = overflow.scale.x > 0.02;

      scene.rotation.y += ((rotationY + (dragging ? 0 : Math.sin(time * 0.00035) * 0.09)) - scene.rotation.y) * 0.08;
      scene.rotation.x += (rotationX - scene.rotation.x) * 0.08;
      renderer.render(scene, camera);
    };
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section className="drain-scene-panel" aria-label="Live 3D drain model">
      <div className="drain-scene-canvas" ref={containerRef} />
      <div className="drain-scene-label">
        <strong>Live 3D drain model</strong>
        <span>{isConnected ? 'LoRa link active' : 'No recent sensor signal'}</span>
      </div>
      <div className="drain-scene-level">{Number(level).toFixed(1)}% water level</div>
      <div className="drain-scene-thresholds" aria-label="Water level thresholds">
        <span><i className="threshold-60" />60%</span>
        <span><i className="threshold-80" />80%</span>
        <span><i className="threshold-95" />95%</span>
      </div>
      <span className="drain-scene-hint">Drag to rotate</span>
    </section>
  );
}
