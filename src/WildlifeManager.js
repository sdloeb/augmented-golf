export class WildlifeManager {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.birds = [];
        this.bugs = [];
        this.birdGroup = new THREE.Group();
        this.bugGroup = new THREE.Group();
        this.scene.add(this.birdGroup);
        this.scene.add(this.bugGroup);
        this.waterfowl = [];
        this.waterfowlGroup = new THREE.Group();
        this.scene.add(this.waterfowlGroup);
    }

    reset(holeConfig, holePosition) {
        this.clear();

        const greenZ = holePosition ? holePosition.z : -60;
        const teeZ = 10;
        const totalSpanZ = Math.abs(greenZ - teeZ);

        // --- 1. BIRDS IN FLIGHT (Flapping 3D wings circling the sky) ---
        const theme = (holeConfig && holeConfig.theme) ? holeConfig.theme : 'standard';
        const baseBirdCount = theme === 'forest' ? 5 : (theme === 'open' ? 2 : 3);
        const birdCount = baseBirdCount + Math.floor(Math.random() * 4);
        const birdMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < birdCount; i++) {
            const bird = new THREE.Group();

            // Aerodynamic body
            const bodyGeo = new THREE.ConeGeometry(0.12, 0.6, 5);
            bodyGeo.rotateX(Math.PI / 2);
            const bodyMesh = new THREE.Mesh(bodyGeo, birdMat);
            bird.add(bodyMesh);

            // Left Wing
            const leftWingGeo = new THREE.PlaneGeometry(0.55, 0.28);
            leftWingGeo.translate(-0.28, 0, 0);
            const leftWing = new THREE.Mesh(leftWingGeo, birdMat);
            leftWing.position.set(-0.05, 0.04, 0);
            bird.add(leftWing);

            // Right Wing
            const rightWingGeo = new THREE.PlaneGeometry(0.55, 0.28);
            rightWingGeo.translate(0.28, 0, 0);
            const rightWing = new THREE.Mesh(rightWingGeo, birdMat);
            rightWing.position.set(0.05, 0.04, 0);
            bird.add(rightWing);

            // Flight paths
            const orbitCenterX = (Math.random() - 0.5) * 60;
            const orbitCenterZ = teeZ - Math.random() * totalSpanZ;
            const orbitRadiusX = 25 + Math.random() * 35;
            const orbitRadiusZ = 30 + Math.random() * 40;
            const altitude = 26 + Math.random() * 14;
            const speed = 0.0002 + Math.random() * 0.00015;
            const phase = Math.random() * Math.PI * 2;
            const flapSpeed = 0.007 + Math.random() * 0.003;

            this.birds.push({
                group: bird,
                leftWing: leftWing,
                rightWing: rightWing,
                centerX: orbitCenterX,
                centerZ: orbitCenterZ,
                radiusX: orbitRadiusX,
                radiusZ: orbitRadiusZ,
                altitude: altitude,
                speed: speed,
                phase: phase,
                flapSpeed: flapSpeed,
                direction: Math.random() > 0.5 ? 1 : -1,
                glideOffset: Math.random() * 100,
                swoopAmp: 2.0 + Math.random() * 3.5
            });

            this.birdGroup.add(bird);
        }

   
      // --- 2. AMBIENT BUGS & BUTTERFLIES (Contextual spawns) ---
        const bugCount = 3 + Math.floor(Math.random() * 10);
        const bugColors = [0xffffff, 0xfad02c, 0x4fc3f7, 0xd4e157, 0xff8a65];

        for (let i = 0; i < bugCount; i++) {
            const isButterfly = Math.random() < 0.45;
            const color = isButterfly 
                ? bugColors[Math.floor(Math.random() * bugColors.length)]
                : 0xd4e157;

            const bugMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: isButterfly ? 0.95 : 0.65
            });

            const bugGeo = isButterfly 
                ? new THREE.BoxGeometry(0.14, 0.02, 0.12)
                : new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const bugMesh = new THREE.Mesh(bugGeo, bugMat);

            // Anchor selection: 35% near water/hazards, 35% near trees/rough, 30% near tee/fairway
            let anchorX = (Math.random() - 0.5) * 40;
            let anchorZ = teeZ - Math.random() * (totalSpanZ * 0.5);

            if (this.physics && this.physics.waterHazards && this.physics.waterHazards.length > 0 && Math.random() < 0.35) {
                const w = this.physics.waterHazards[Math.floor(Math.random() * this.physics.waterHazards.length)];
                anchorX = w.position.x + (Math.random() - 0.5) * 10;
                anchorZ = w.position.z + (Math.random() - 0.5) * 10;
            } else if (this.physics && this.physics.obstacles && this.physics.obstacles.length > 0 && Math.random() < 0.35) {
                const obs = this.physics.obstacles[Math.floor(Math.random() * this.physics.obstacles.length)];
                anchorX = obs.x + (Math.random() - 0.5) * 6;
                anchorZ = obs.z + (Math.random() - 0.5) * 6;
            }
            const hoverHeight = 0.8 + Math.random() * 2.2;
            const wanderSpeed = 0.002 + Math.random() * 0.003;
            const wanderRadius = 1.5 + Math.random() * 3.0;

            this.bugs.push({
                mesh: bugMesh,
                anchorX: anchorX,
                anchorZ: anchorZ,
                hoverHeight: isButterfly ? (0.4 + Math.random() * 0.9) : (0.8 + Math.random() * 2.0),
                wanderSpeed: isButterfly ? (0.0012 + Math.random() * 0.001) : (0.003 + Math.random() * 0.004),
                wanderRadius: isButterfly ? (2.5 + Math.random() * 4.0) : (0.8 + Math.random() * 1.5),
                phase: Math.random() * Math.PI * 2,
                noiseOffset: Math.random() * 100,
                isButterfly: isButterfly
            });

            this.bugGroup.add(bugMesh);
        }
        // --- 3. DUCKS & GEESE ON WATER HAZARDS ---
        if (this.physics && this.physics.waterHazards && this.physics.waterHazards.length > 0) {
            // 70% chance to spawn waterfowl whenever water hazards exist on the hole
            if (Math.random() < 0.85) {
                const lakes = this.physics.waterHazards.filter(w => !w.userData || !w.userData.isRectangular);
                if (lakes.length > 0) {
                    const targetLake = lakes[Math.floor(Math.random() * lakes.length)];
                    const rx = targetLake.userData.radiusX || targetLake.userData.radius || 10;
                    const rz = targetLake.userData.radiusZ || targetLake.userData.radius || 10;
                    const waterSurfaceY = targetLake.position.y + 0.02;

                    const fowlCount = 2 + Math.floor(Math.random() * 3); // 2 to 4 birds

                    for (let f = 0; f < fowlCount; f++) {
                        const isGoose = Math.random() > 0.5; // Mix of mallard ducks and Canada geese
                        const birdGroup = new THREE.Group();

                        if (isGoose) {
                            // --- CANADA GOOSE ---
                            const scale = 0.65 + Math.random() * 0.15;
                            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a534c, roughness: 0.8 });
                            const neckMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
                            const whitePatchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
                            const billMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

                            // Body
                            const bodyGeo = new THREE.SphereGeometry(0.32 * scale, 8, 8);
                            bodyGeo.scale(0.85, 0.75, 1.4);
                            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                            bodyMesh.position.set(0, 0.12 * scale, 0);
                            birdGroup.add(bodyMesh);

                            // Tall neck
                            const neckGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.38 * scale, 6);
                            const neckMesh = new THREE.Mesh(neckGeo, neckMat);
                            neckMesh.position.set(0, 0.32 * scale, 0.24 * scale);
                            neckMesh.rotation.x = 0.3;
                            birdGroup.add(neckMesh);

                            // Head
                            const headGeo = new THREE.SphereGeometry(0.10 * scale, 6, 6);
                            const headMesh = new THREE.Mesh(headGeo, neckMat);
                            headMesh.position.set(0, 0.48 * scale, 0.32 * scale);
                            birdGroup.add(headMesh);

                            // White cheek patch
                            const patchGeo = new THREE.BoxGeometry(0.21 * scale, 0.08 * scale, 0.08 * scale);
                            const patchMesh = new THREE.Mesh(patchGeo, whitePatchMat);
                            patchMesh.position.set(0, 0.48 * scale, 0.30 * scale);
                            birdGroup.add(patchMesh);

                            // Bill
                            const billGeo = new THREE.ConeGeometry(0.04 * scale, 0.12 * scale, 4);
                            billGeo.rotateX(Math.PI / 2);
                            const billMesh = new THREE.Mesh(billGeo, billMat);
                            billMesh.position.set(0, 0.46 * scale, 0.44 * scale);
                            birdGroup.add(billMesh);
                        } else {
                            // --- MALLARD DUCK ---
                            const scale = 0.42 + Math.random() * 0.10;
                            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6e5239, roughness: 0.8 });
                            const headMat = new THREE.MeshStandardMaterial({ color: 0x095228, roughness: 0.4, metalness: 0.2 });
                            const billMat = new THREE.MeshStandardMaterial({ color: 0xe5b217, roughness: 0.4 });
                            const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

                            // Body
                            const bodyGeo = new THREE.SphereGeometry(0.26 * scale, 8, 8);
                            bodyGeo.scale(0.85, 0.70, 1.3);
                            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                            bodyMesh.position.set(0, 0.10 * scale, 0);
                            birdGroup.add(bodyMesh);

                            // White neck collar
                            const collarGeo = new THREE.CylinderGeometry(0.075 * scale, 0.085 * scale, 0.05 * scale, 6);
                            const collarMesh = new THREE.Mesh(collarGeo, collarMat);
                            collarMesh.position.set(0, 0.21 * scale, 0.18 * scale);
                            collarMesh.rotation.x = 0.2;
                            birdGroup.add(collarMesh);

                            // Emerald head
                            const headGeo = new THREE.SphereGeometry(0.11 * scale, 6, 6);
                            const headMesh = new THREE.Mesh(headGeo, headMat);
                            headMesh.position.set(0, 0.28 * scale, 0.22 * scale);
                            birdGroup.add(headMesh);

                            // Yellow bill
                            const billGeo = new THREE.BoxGeometry(0.06 * scale, 0.03 * scale, 0.11 * scale);
                            const billMesh = new THREE.Mesh(billGeo, billMat);
                            billMesh.position.set(0, 0.27 * scale, 0.33 * scale);
                            birdGroup.add(billMesh);
                        }

                        // Keep birds floating inside safe water margins (30% to 70% of radius from center)
                        const spawnAngle = (f / fowlCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
                        const spawnDistFactor = 0.30 + Math.random() * 0.40;

                        const orbitRadiusX = rx * spawnDistFactor;
                        const orbitRadiusZ = rz * spawnDistFactor;

                        this.waterfowl.push({
                            group: birdGroup,
                            lakeX: targetLake.position.x,
                            lakeZ: targetLake.position.z,
                            waterY: waterSurfaceY,
                            radiusX: orbitRadiusX,
                            radiusZ: orbitRadiusZ,
                            angle: spawnAngle,
                            speed: (0.0003 + Math.random() * 0.0002) * (Math.random() > 0.5 ? 1 : -1),
                            bobPhase: Math.random() * Math.PI * 2
                        });

                        this.waterfowlGroup.add(birdGroup);
                    }
                }
            }
        }
    }

    update(time, isRaining) {
        // --- 1. UPDATE BIRDS ---
        for (let i = 0; i < this.birds.length; i++) {
            const b = this.birds[i];
            if (isRaining) {
                b.group.visible = false;
                continue;
            }
            b.group.visible = true;

            const t = (time * b.speed * b.direction) + b.phase;
            const x = b.centerX + Math.sin(t) * b.radiusX;
            const z = b.centerZ + Math.cos(t) * b.radiusZ;
            const y = b.altitude + Math.sin(t * 2.0) * 2.5;

            const nextT = t + 0.01 * b.direction;
            const nextX = b.centerX + Math.sin(nextT) * b.radiusX;
            const nextZ = b.centerZ + Math.cos(nextT) * b.radiusZ;
            const nextY = b.altitude + Math.sin(nextT * 2.0) * 2.5;

            b.group.position.set(x, y, z);
            b.group.lookAt(nextX, nextY, nextZ);

            // Periodic glide where flapping pauses
            const glideCycle = Math.sin(time * 0.0015 + b.glideOffset);
            const isGliding = glideCycle > 0.45;
            const flapAngle = isGliding ? 0.08 : Math.sin(time * b.flapSpeed) * 0.65;
            b.leftWing.rotation.z = flapAngle;
            b.rightWing.rotation.z = -flapAngle;
        }

        // --- 2. UPDATE BUGS ---
        for (let i = 0; i < this.bugs.length; i++) {
            const bg = this.bugs[i];
            if (isRaining) {
                bg.mesh.visible = false;
                continue;
            }
            bg.mesh.visible = true;

            const t = (time * bg.wanderSpeed) + bg.phase;
            const currentX = bg.anchorX + Math.sin(t) * bg.wanderRadius + Math.sin(time * 0.008 + bg.noiseOffset) * 0.4;
            const currentZ = bg.anchorZ + Math.cos(t * 0.8) * bg.wanderRadius + Math.cos(time * 0.007 + bg.noiseOffset) * 0.4;

            const groundY = this.physics ? this.physics.getGroundHeight(currentX, currentZ) : 0;
            const currentY = groundY + bg.hoverHeight + Math.sin(time * 0.005 + bg.noiseOffset) * 0.35;

            bg.mesh.position.set(currentX, currentY, currentZ);

           if (bg.isButterfly) {
                // Quick wing clap rotation + erratic flutter
                const flap = Math.sin(time * 0.035 + bg.noiseOffset);
                bg.mesh.scale.set(0.7 + Math.abs(flap) * 0.5, 1.0, 0.9);
                bg.mesh.rotation.y += 0.04;
            } else {
                const flutter = 0.8 + Math.sin(time * 0.03 + bg.noiseOffset) * 0.3;
                bg.mesh.scale.set(flutter, flutter, flutter);

            }
        }
        // --- 3. UPDATE WATERFOWL (Paddle & water ripple bobbing) ---
        for (let i = 0; i < this.waterfowl.length; i++) {
            const wf = this.waterfowl[i];
            wf.angle += wf.speed;

            const posX = wf.lakeX + Math.cos(wf.angle) * wf.radiusX;
            const posZ = wf.lakeZ + Math.sin(wf.angle) * wf.radiusZ;

            // Subtle vertical ripple bobbing
            const bob = Math.sin(time * 0.003 + wf.bobPhase) * 0.015;
            const posY = wf.waterY + bob;

            wf.group.position.set(posX, posY, posZ);

            // Orient head forward along the swimming path
            const nextAngle = wf.angle + wf.speed * 10;
            const nextX = wf.lakeX + Math.cos(nextAngle) * wf.radiusX;
            const nextZ = wf.lakeZ + Math.sin(nextAngle) * wf.radiusZ;
            wf.group.lookAt(nextX, posY, nextZ);
        }
    }

    clear() {
        while (this.birdGroup.children.length > 0) {
            const obj = this.birdGroup.children[0];
            this.birdGroup.remove(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        while (this.bugGroup.children.length > 0) {
            const obj = this.bugGroup.children[0];
            this.bugGroup.remove(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        this.birds = [];
        this.bugs = [];
        while (this.waterfowlGroup.children.length > 0) {
            const obj = this.waterfowlGroup.children[0];
            this.waterfowlGroup.remove(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        this.waterfowl = [];
    }
}