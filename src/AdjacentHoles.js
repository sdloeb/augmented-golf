/**
 * AdjacentHoles.js
 * Generates visible 3D neighbor holes and fills the entire surrounding terrain
 * outside the active hole's OB stakes while avoiding water hazards.
 */

export function generateAdjacentHoles(scene, sceneryObjects, physics, currentHoleConfig, holePosition, greenCenterZ) {
    if (!scene || !physics) return;

    // --- FAIRWAY MOW STRIPE TEXTURE (Matches main course fairway) ---
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 128;
    fCanvas.height = 4;
    const fCtx = fCanvas.getContext('2d');
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, 64, 4);
    fCtx.fillStyle = '#b8b8b8';
    fCtx.fillRect(64, 0, 64, 4);
    const fairwayTexture = new THREE.CanvasTexture(fCanvas);
    fairwayTexture.wrapS = THREE.RepeatWrapping;
    fairwayTexture.wrapT = THREE.RepeatWrapping;
    fairwayTexture.repeat.set(1, 1);

    // --- MATERIALS ---
    const fairwayMat = new THREE.MeshStandardMaterial({
        color: 0x2e8b57,
        roughness: 0.7,
        map: fairwayTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -8
    });

    const greenMat = new THREE.MeshStandardMaterial({
        color: 0x1faa44,
        roughness: 0.8,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -10
    });

    const fringeMat = new THREE.MeshStandardMaterial({
        color: 0x1e6b34,
        roughness: 0.85,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4.5,
        polygonOffsetUnits: -9
    });

    const sandMat = new THREE.MeshStandardMaterial({
        color: 0xd9c59e,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -12
    });

    const flagMat = new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide });
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const teeMat = new THREE.MeshStandardMaterial({ color: 0x3cb371, roughness: 0.5 });
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x144414, roughness: 0.7 });
    const foliageLightMat = new THREE.MeshStandardMaterial({ color: 0x1d5330, roughness: 0.65 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1a521a, roughness: 0.8 });

    const ELEVATION_OFFSET = 0.38;

    // --- WATER HAZARD COLLISION DETECTOR ---
    function isPointInWater(x, z, padding = 4.5) {
        if (physics && physics.waterHazards) {
            for (let water of physics.waterHazards) {
                if (water.userData && water.userData.isRectangular) {
                    if (x > (water.position.x - water.userData.w / 2 - padding) &&
                        x < (water.position.x + water.userData.w / 2 + padding) &&
                        z > (water.position.z - water.userData.l / 2 - padding) &&
                        z < (water.position.z + water.userData.l / 2 + padding)) {
                        return true;
                    }
                } else {
                    const rx = (water.userData.radiusX || water.userData.radius || 15) + padding;
                    const rz = (water.userData.radiusZ || water.userData.radius || 15) + padding;
                    const dx = x - water.position.x;
                    const dz = z - water.position.z;
                    if ((dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) <= 1.0) {
                        return true;
                    }
                }
            }
        }

        if (currentHoleConfig && currentHoleConfig.hazards) {
            for (let hz of currentHoleConfig.hazards) {
                if (hz.type === 'ocean') {
                    if (x > (hz.x - (hz.width || 130) / 2 - padding) &&
                        x < (hz.x + (hz.width || 130) / 2 + padding) &&
                        z > (hz.z - (hz.length || 150) / 2 - padding) &&
                        z < (hz.z + (hz.length || 150) / 2 + padding)) {
                        return true;
                    }
                    if (x > 18.0 - padding && z <= -50.0) {
                        return true;
                    }
                } else if (hz.type === 'lake') {
                    const rx = (hz.radiusX || hz.radius || 15) + padding;
                    const rz = (hz.radiusZ || hz.radius || 15) + padding;
                    const dx = x - hz.x;
                    const dz = z - hz.z;
                    if ((dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) <= 1.0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- 1. HELPER: CONTOURED FAIRWAY RIBBON ---
    function createAdjacentFairway(waypoints, width = 14.0) {
        const curve = new THREE.CatmullRomCurve3(waypoints);
        const steps = 100;
        const sampled = curve.getPoints(steps);
        const positions = [];
        const uvs = [];
        const indices = [];
        const halfW = width / 2;

        for (let i = 0; i <= steps; i++) {
            const curr = sampled[i];
            const prev = sampled[Math.max(0, i - 1)];
            const next = sampled[Math.min(steps, i + 1)];

            let dirX = next.x - prev.x;
            let dirZ = next.z - prev.z;
            const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
            const perpX = -dirZ / len;
            const perpZ = dirX / len;

            const leftX = curr.x + perpX * halfW;
            const leftZ = curr.z + perpZ * halfW;
            const rightX = curr.x - perpX * halfW;
            const rightZ = curr.z - perpZ * halfW;

            if (isPointInWater(curr.x, curr.z, 2.0)) continue;

            const leftY = physics.getGroundHeight(leftX, leftZ) + ELEVATION_OFFSET;
            const rightY = physics.getGroundHeight(rightX, rightZ) + ELEVATION_OFFSET;

            positions.push(leftX, leftY, leftZ);
            positions.push(rightX, rightY, rightZ);

            const stripeRepetitions = width / 5.5;
            uvs.push(0, i * 0.2);
            uvs.push(stripeRepetitions, i * 0.2);

            if (i < steps) {
                const r1 = i * 2;
                const r2 = (i + 1) * 2;
                indices.push(r1, r1 + 1, r2);
                indices.push(r1 + 1, r2 + 1, r2);
            }
        }

        if (positions.length < 6) return;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, fairwayMat);
        scene.add(mesh);
        sceneryObjects.push(mesh);
    }

    // --- 2. HELPER: GREEN COMPLEX & PIN ---
    function createAdjacentGreen(gx, gz, radius = 9.5) {
        if (isPointInWater(gx, gz, radius + 2.0)) return;

        const baseGroundY = physics.getGroundHeight(gx, gz) + ELEVATION_OFFSET;

        const fGeo = new THREE.RingGeometry(radius, radius + 1.4, 32);
        const fMesh = new THREE.Mesh(fGeo, fringeMat);
        fMesh.rotation.x = -Math.PI / 2;
        fMesh.position.set(gx, baseGroundY + 0.01, gz);
        scene.add(fMesh);
        sceneryObjects.push(fMesh);

        const gGeo = new THREE.CircleGeometry(radius, 32);
        const gMesh = new THREE.Mesh(gGeo, greenMat);
        gMesh.rotation.x = -Math.PI / 2;
        gMesh.position.set(gx, baseGroundY + 0.02, gz);
        scene.add(gMesh);
        sceneryObjects.push(gMesh);

        const pinH = 2.6;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, pinH, 6), poleMat);
        pole.position.set(gx, baseGroundY + pinH / 2 + 0.02, gz);
        scene.add(pole);
        sceneryObjects.push(pole);

        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), flagMat);
        flag.position.set(gx + 0.35, baseGroundY + pinH - 0.22, gz);
        scene.add(flag);
        sceneryObjects.push(flag);
    }

    // --- 3. HELPER: SAND BUNKERS ---
    function createAdjacentBunker(bx, bz, rx = 5.0, rz = 4.0) {
        if (isPointInWater(bx, bz, Math.max(rx, rz) + 1.5)) return;

        const bGroundY = physics.getGroundHeight(bx, bz) + ELEVATION_OFFSET;
        const bGeo = new THREE.CircleGeometry(rx, 24);
        const bMesh = new THREE.Mesh(bGeo, sandMat);
        bMesh.rotation.x = -Math.PI / 2;
        bMesh.scale.set(1, rz / rx, 1);
        bMesh.position.set(bx, bGroundY + 0.025, bz);
        scene.add(bMesh);
        sceneryObjects.push(bMesh);
    }

    // --- 4. HELPER: TEE BOX ---
    function createAdjacentTee(tx, tz, angle = 0) {
        if (isPointInWater(tx, tz, 3.5)) return;

        const tGroundY = physics.getGroundHeight(tx, tz) + ELEVATION_OFFSET;
        const tBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.04, 3.5), teeMat);
        tBox.position.set(tx, tGroundY + 0.02, tz);
        tBox.rotation.y = angle;

        const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), markerMat);
        m1.position.set(-2.0, 0.12, 0);
        tBox.add(m1);

        const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), markerMat);
        m2.position.set(2.0, 0.12, 0);
        tBox.add(m2);

        scene.add(tBox);
        sceneryObjects.push(tBox);
    }

    // --- 5. HELPER: TREES ---
    function createAdjacentTree(x, z, scale = 4.0, isPine = false) {
        if (isPointInWater(x, z, scale * 0.8)) return;

        const y = physics.getGroundHeight(x, z);
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.userData = { type: 'tree' };

        const trunkH = 1.1 * scale;
        const trunkR = 0.22 * scale;
        const folR = 1.25 * scale;

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8), trunkMat);
        trunk.position.y = trunkH / 2;
        group.add(trunk);

        if (isPine) {
            const pineMat = new THREE.MeshStandardMaterial({ color: 0x113318, roughness: 0.8 });
            const layers = [
                { bottomH: trunkH * 0.75, radius: folR * 1.05, height: folR * 1.2 },
                { bottomH: trunkH + folR * 0.45, radius: folR * 0.8, height: folR * 1.0 },
                { bottomH: trunkH + folR * 1.05, radius: folR * 0.55, height: folR * 0.85 }
            ];
            layers.forEach(l => {
                const cone = new THREE.Mesh(new THREE.ConeGeometry(l.radius, l.height, 8), pineMat);
                cone.position.y = l.bottomH + l.height / 2;
                group.add(cone);
            });
        } else {
            const activeFolMat = (scale > 4.2) ? foliageMat : foliageLightMat;
            const foliage = new THREE.Mesh(new THREE.SphereGeometry(folR, 10, 10), activeFolMat);
            foliage.position.y = trunkH + folR * 0.55;
            foliage.scale.set(1.1, 0.85, 1.1);
            group.add(foliage);
        }

        scene.add(group);
        sceneryObjects.push(group);
    }

    // --- 6. HELPER: BUSHES ---
    function createAdjacentBush(x, z, radius = 1.4) {
        if (isPointInWater(x, z, radius + 1.0)) return;

        const y = physics.getGroundHeight(x, z);
        const bush = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), bushMat);
        bush.position.set(x, y + radius * 0.45, z);
        bush.scale.set(1.2, 0.7, 1.2);
        scene.add(bush);
        sceneryObjects.push(bush);
    }

    // =========================================================================
    // OB STAKE RESOLVER FOR THE ACTIVE HOLE
    // =========================================================================
    const holeNum = physics.currentHoleNumber || 1;

    function getActiveHoleOB(config, gz, hNum) {
        if (config && config.customOOB) {
            const oob = config.customOOB;
            if (oob.type === 'rectangle') {
                return {
                    getLeftOB: () => oob.minX,
                    getRightOB: () => oob.maxX,
                    frontOB: oob.minZ,
                    backOB: oob.maxZ
                };
            } else if (oob.type === 'stepped') {
                return {
                    getLeftOB: (z) => z < oob.splitZ ? oob.wideMinX : oob.narrowMinX,
                    getRightOB: (z) => z < oob.splitZ ? oob.wideMaxX : oob.narrowMaxX,
                    frontOB: oob.minZ,
                    backOB: oob.maxZ
                };
            } else if (oob.type === 'l_shape') {
                const l1 = oob.leg1;
                const l2 = oob.leg2;
                return {
                    getLeftOB: () => l1.minX,
                    getRightOB: (z) => z <= l2.maxZ ? l2.maxX : l1.maxX,
                    frontOB: Math.min(l1.minZ, l2.minZ),
                    backOB: Math.max(l1.maxZ, l2.maxZ)
                };
            }
        }

        if (hNum === 3) {
            return {
                getLeftOB: (z) => {
                    if (z >= -65) return -70.0;
                    if (z >= -125) {
                        const t = (-65 - z) / 60.0;
                        return -70.0 - 14.0 * t;
                    }
                    const t = (-125 - z) / 55.0;
                    return -84.0 + 11.0 * t;
                },
                getRightOB: () => 20.0,
                frontOB: gz - 35.0,
                backOB: 35.0
            };
        }

        return {
            getLeftOB: () => -70.0,
            getRightOB: () => 70.0,
            frontOB: gz - 40.0,
            backOB: 30.0
        };
    }

    const ob = getActiveHoleOB(currentHoleConfig, greenCenterZ, holeNum);
    const midZ = (10 + greenCenterZ) / 2;

    // Boundary containment validator: Returns true if (x, z) falls inside the real hole's OB stakes
    function isInsideActiveHoleOB(x, z, margin = 4.0) {
        const left = ob.getLeftOB(z) - margin;
        const right = ob.getRightOB(z) + margin;
        const front = ob.frontOB - margin;
        const back = ob.backOB + margin;
        return (x >= left && x <= right && z >= front && z <= back);
    }

    // =========================================================================
    // 1. NEIGHBOR HOLES A, B, AND C
    // =========================================================================

    // --- HOLE A: LEFT FLANK RETURNING PAR 4 ---
    const teeA_z = Math.min(greenCenterZ - 15, ob.frontOB + 20);
    const teeA_x = ob.getLeftOB(teeA_z) - 20.0;

    const midA1_z = midZ - 20;
    const midA1_x = ob.getLeftOB(midA1_z) - 22.0;

    const midA2_z = midZ + 20;
    const midA2_x = ob.getLeftOB(midA2_z) - 20.0;

    const greenA_z = Math.min(10, ob.backOB - 20);
    const greenA_x = ob.getLeftOB(greenA_z) - 22.0;

    createAdjacentTee(teeA_x, teeA_z, Math.PI);
    createAdjacentFairway([
        new THREE.Vector3(teeA_x, 0, teeA_z),
        new THREE.Vector3(midA1_x, 0, midA1_z),
        new THREE.Vector3(midA2_x, 0, midA2_z),
        new THREE.Vector3(greenA_x, 0, greenA_z)
    ], 14.0);

    createAdjacentBunker(ob.getLeftOB(midA1_z) - 30.0, midA1_z, 5.5, 4.0);
    createAdjacentBunker(ob.getLeftOB(greenA_z) - 12.0, greenA_z - 4, 4.5, 3.5);
    createAdjacentGreen(greenA_x, greenA_z, 9.0);

    // --- HOLE B: RIGHT FLANK PAR 5 (Skipped on ocean/cliff holes like Hole 3) ---
    const isOceanHole = currentHoleConfig && currentHoleConfig.hazards &&
        currentHoleConfig.hazards.some(h => h.type === 'ocean');

    if (!isOceanHole) {
        const teeB_z = Math.min(18, ob.backOB - 15);
        const teeB_x = ob.getRightOB(teeB_z) + 20.0;

        const midB1_z = midZ + 20;
        const midB1_x = ob.getRightOB(midB1_z) + 22.0;

        const midB2_z = midZ - 25;
        const midB2_x = ob.getRightOB(midB2_z) + 20.0;

        const greenB_z = Math.max(greenCenterZ - 5, ob.frontOB + 15);
        const greenB_x = ob.getRightOB(greenB_z) + 22.0;

        createAdjacentTee(teeB_x, teeB_z, 0);
        createAdjacentFairway([
            new THREE.Vector3(teeB_x, 0, teeB_z),
            new THREE.Vector3(midB1_x, 0, midB1_z),
            new THREE.Vector3(midB2_x, 0, midB2_z),
            new THREE.Vector3(greenB_x, 0, greenB_z)
        ], 14.0);

        createAdjacentBunker(ob.getRightOB(midB1_z) + 30.0, midB1_z, 5.0, 3.5);
        createAdjacentBunker(ob.getRightOB(greenB_z + 12) + 12.0, greenB_z + 12, 4.5, 3.2);
        createAdjacentBunker(ob.getRightOB(greenB_z) + 31.0, greenB_z - 4, 4.2, 4.0);
        createAdjacentGreen(greenB_x, greenB_z, 9.5);
    }

    // --- HOLE C: DEEP TRANSVERSE CROSSING PAR 3 (Deep beyond Front OB line) ---
    const zCross = Math.min(ob.frontOB - 22.0, greenCenterZ - 45.0);
    const leftCX = ob.getLeftOB(zCross) - 15.0;
    const rightCX = isOceanHole ? 15.0 : (ob.getRightOB(zCross) + 15.0);

    createAdjacentTee(leftCX, zCross + 4, Math.PI * 0.45);
    createAdjacentFairway([
        new THREE.Vector3(leftCX, 0, zCross + 4),
        new THREE.Vector3((leftCX + rightCX) / 2, 0, zCross),
        new THREE.Vector3(rightCX, 0, zCross + 6)
    ], 12.0);
    createAdjacentBunker((leftCX + rightCX) / 2 + 10, zCross - 3, 4.5, 3.0);
    createAdjacentGreen(rightCX, zCross + 6, 8.5);

    // =========================================================================
    // 2. FILL ALL OUTER AREAS OUTSIDE OB (AVOIDING WATER & FAIRWAYS)
    // =========================================================================

    // Grid sampling across entire course property (-140 to 140 X, -250 to 45 Z)
    for (let gx = -135; gx <= 135; gx += 13) {
        for (let gz = -245; gz <= 45; gz += 13) {
            // Pseudo-random organic scatter jitter
            const pseudoSeed1 = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453;
            const pseudoSeed2 = Math.cos(gx * 93.9898 + gz * 67.345) * 24634.6345;
            const jitterX = (pseudoSeed1 - Math.floor(pseudoSeed1) - 0.5) * 8.0;
            const jitterZ = (pseudoSeed2 - Math.floor(pseudoSeed2) - 0.5) * 8.0;

            const px = gx + jitterX;
            const pz = gz + jitterZ;

            // 1. Strict Out of Bounds check (Must be at least 5 units outside active hole stakes)
            if (isInsideActiveHoleOB(px, pz, 5.0)) continue;

            // 2. Strict Water check (Must clear ocean, lakes, ponds by at least 5 units)
            if (isPointInWater(px, pz, 5.0)) continue;

          // 3. Complete fairway & green clearance check (tests full length of all adjacent holes)
            function distToLineSegment(px, pz, x1, z1, x2, z2) {
                const dx = x2 - x1, dz = z2 - z1;
                const l2 = dx * dx + dz * dz;
                if (l2 === 0) return Math.hypot(px - x1, pz - z1);
                let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
                t = Math.max(0, Math.min(1, t));
                return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
            }

            const pathA = [[teeA_x, teeA_z], [midA1_x, midA1_z], [midA2_x, midA2_z], [greenA_x, greenA_z]];
            let dA = Math.min(...pathA.slice(0, -1).map((pt, idx) => distToLineSegment(px, pz, pt[0], pt[1], pathA[idx + 1][0], pathA[idx + 1][1])));
            let distToGreenA = Math.hypot(px - greenA_x, pz - greenA_z);
            if (dA < 11.0 || distToGreenA < 12.5) continue;

            if (!isOceanHole) {
                const pathB = [[teeB_x, teeB_z], [midB1_x, midB1_z], [midB2_x, midB2_z], [greenB_x, greenB_z]];
                let dB = Math.min(...pathB.slice(0, -1).map((pt, idx) => distToLineSegment(px, pz, pt[0], pt[1], pathB[idx + 1][0], pathB[idx + 1][1])));
                let distToGreenB = Math.hypot(px - greenB_x, pz - greenB_z);
                if (dB < 11.0 || distToGreenB < 13.0) continue;
            }

            const pathC = [[leftCX, zCross + 4], [(leftCX + rightCX) / 2, zCross], [rightCX, zCross + 6]];
            let dC = Math.min(...pathC.slice(0, -1).map((pt, idx) => distToLineSegment(px, pz, pt[0], pt[1], pathC[idx + 1][0], pathC[idx + 1][1])));
            let distToGreenC = Math.hypot(px - rightCX, pz - (zCross + 6));
            if (dC < 10.0 || distToGreenC < 12.0) continue;

            // Determine landscape element type based on position & seed
            const roll = Math.abs(pseudoSeed1 - Math.floor(pseudoSeed1));
            const isNearBoundary = Math.abs(px - ob.getLeftOB(pz)) < 16.0 || Math.abs(px - ob.getRightOB(pz)) < 16.0;

        if (roll < 0.70) {
                // Trees: Varied scale, mix of oak and pine
                const treeScale = 3.5 + (roll * 2.2);
                const isPine = (roll > 0.40);
                createAdjacentTree(px, pz, treeScale, isPine);
            } else {
                // Bushes & shrub clusters in rough
                createAdjacentBush(px, pz, 1.2 + roll * 0.8);
            }
        }
    }
}