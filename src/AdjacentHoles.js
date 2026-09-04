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
    // Track all generated adjacent features for tree and bush clearance
    const allAdjacentFairways = [];
    const allAdjacentGreens = [];
    const allAdjacentBunkers = [];
    const allAdjacentTees = [];

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

    function createAdjacentFairway(waypoints, width = 14.0) {
        const curve = new THREE.CatmullRomCurve3(waypoints);
        const steps = 100;
        const sampled = curve.getPoints(steps);
        const positions = [];
        const uvs = [];
        const indices = [];
        const halfW = width / 2;
        const endPoint = waypoints[waypoints.length - 1];
        allAdjacentFairways.push({ points: sampled, width: width });

        let count = 0;
        for (let i = 0; i <= steps; i++) {
            const curr = sampled[i];

            // Stops drawing the fairway ribbon 10.2 units before the green center
            if (i > 15 && Math.hypot(curr.x - endPoint.x, curr.z - endPoint.z) < 10.2) {
                break;
            }

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
            uvs.push(0, count * 0.2);
            uvs.push(stripeRepetitions, count * 0.2);

            if (count > 0) {
                const r1 = (count - 1) * 2;
                const r2 = count * 2;
                indices.push(r1, r1 + 1, r2);
                indices.push(r1 + 1, r2 + 1, r2);
            }
            count++;
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
        allAdjacentGreens.push({ x: gx, z: gz, r: radius });
    }

    // --- 3. HELPER: SAND BUNKERS ---
    function createAdjacentBunker(bx, bz, rx = 5.0, rz = 4.0) {
        if (isPointInWater(bx, bz, Math.max(rx, rz) + 1.5)) return;
        allAdjacentBunkers.push({ x: bx, z: bz, r: Math.max(rx, rz) });

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
        allAdjacentTees.push({ x: tx, z: tz, r: 3.5 });

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
    // 1. NEIGHBOR HOLE GENERATION (DIFFERENT SIZES & TYPES)
    // =========================================================================

    const isOceanHole = currentHoleConfig && currentHoleConfig.hazards &&
        currentHoleConfig.hazards.some(h => h.type === 'ocean');

    // --- HOLE A: LEFT FLANK RETURNING PAR 4 (Medium ~380 yd) ---
    const teeA_z = Math.min(greenCenterZ - 15, ob.frontOB + 20);
    const teeA_x = ob.getLeftOB(teeA_z) - 35.0;
    const midA1_z = midZ - 20;
    const midA1_x = ob.getLeftOB(midA1_z) - 40.0;
    const midA2_z = midZ + 20;
    const midA2_x = ob.getLeftOB(midA2_z) - 20.0;
    const greenA_z = Math.min(10, ob.backOB - 20);
    const greenA_x = ob.getLeftOB(greenA_z) - 22.0;

    const pathA = [
        new THREE.Vector3(teeA_x, 0, teeA_z),
        new THREE.Vector3(midA1_x, 0, midA1_z),
        new THREE.Vector3(midA2_x, 0, midA2_z),
        new THREE.Vector3(greenA_x, 0, greenA_z)
    ];

    createAdjacentTee(teeA_x, teeA_z, Math.PI);
    createAdjacentFairway(pathA, 14.0);
    createAdjacentBunker(ob.getLeftOB(midA1_z) - 45.0, midA1_z, 5.5, 4.0);
    createAdjacentBunker(greenA_x - 14.5, greenA_z - 4.0, 3.8, 3.2);
    createAdjacentGreen(greenA_x, greenA_z, 9.0);

    // --- HOLE B: RIGHT FLANK PAR 5 (Long ~520 yd - Skipped on ocean holes) ---
    let pathB = null;
    let greenB_x = 0, greenB_z = 0;
    if (!isOceanHole) {
        const teeB_z = Math.min(18, ob.backOB - 15);
        const teeB_x = ob.getRightOB(teeB_z) + 35.0;
        const midB1_z = midZ + 20;
        const midB1_x = ob.getRightOB(midB1_z) + 37.0;
        const midB2_z = midZ - 25;
        const midB2_x = ob.getRightOB(midB2_z) + 35.0;
        greenB_z = Math.max(greenCenterZ - 5, ob.frontOB + 15);
        greenB_x = ob.getRightOB(greenB_z) + 37.0;

        pathB = [
            new THREE.Vector3(teeB_x, 0, teeB_z),
            new THREE.Vector3(midB1_x, 0, midB1_z),
            new THREE.Vector3(midB2_x, 0, midB2_z),
            new THREE.Vector3(greenB_x, 0, greenB_z)
        ];

        createAdjacentTee(teeB_x, teeB_z, 0);
        createAdjacentFairway(pathB, 14.0);
        createAdjacentBunker(ob.getRightOB(midB1_z) + 30.0, midB1_z, 5.0, 3.5);
        createAdjacentBunker(greenB_x - 14.0, greenB_z + 15.0, 4.2, 3.0);
        createAdjacentBunker(greenB_x + 15.5, greenB_z - 4.0, 4.0, 3.2);
        createAdjacentGreen(greenB_x, greenB_z, 9.5);
    }

    // --- HOLE C: BEHIND GREEN DEEP CROSSING ---
    // On ocean/cliff holes (Hole 3): Only renders a crossing fairway ribbon across the plateau (no green/tee)
    // On standard holes: Renders a complete Par 3 with tee, fairway, bunker and green
    const zCross = Math.min(ob.frontOB - 22.0, greenCenterZ - 45.0);
    const leftCX = ob.getLeftOB(zCross) - 15.0;
    const rightCX = isOceanHole ? 15.0 : (ob.getRightOB(zCross) + 15.0);

    const pathC = [
        new THREE.Vector3(leftCX, 0, zCross + 4),
        new THREE.Vector3((leftCX + rightCX) / 2, 0, zCross),
        new THREE.Vector3(rightCX, 0, zCross + (isOceanHole ? 2 : 6))
    ];

    if (isOceanHole) {
        createAdjacentFairway(pathC, 13.0);
    } else {
        createAdjacentTee(leftCX, zCross + 4, Math.PI * 0.45);
        createAdjacentFairway(pathC, 12.0);
        createAdjacentBunker((leftCX + rightCX) / 2 + 10, zCross - 3, 4.5, 3.0);
        createAdjacentGreen(rightCX, zCross + 6, 8.5);
    }

    // --- HOLE D: UPPER RIGHT HORIZONTAL PAR 3 (Fills dry space right of Tee on Hole 3) ---
    const teeD_z = Math.min(18, ob.backOB - 12);
    const teeD_x = Math.max(70.0, ob.getRightOB(teeD_z) + 50.0);
    const greenD_z = teeD_z - 42.0; // ~150 yards out
    const greenD_x = teeD_x + 36.0;

    let pathD = null;
    if (!isInsideActiveHoleOB(teeD_x, teeD_z, 5.0) &&
        !isInsideActiveHoleOB(greenD_x, greenD_z, 5.0) &&
        !isPointInWater(teeD_x, teeD_z, 4.0) &&
        !isPointInWater(greenD_x, greenD_z, 9.5)) {

        pathD = [
            new THREE.Vector3(teeD_x, 0, teeD_z),
            new THREE.Vector3((teeD_x + greenD_x) / 2 + 6, 0, (teeD_z + greenD_z) / 2),
            new THREE.Vector3(greenD_x, 0, greenD_z)
        ];

        createAdjacentTee(teeD_x, teeD_z, -Math.PI * 0.25);
        createAdjacentFairway(pathD, 12.0);
        createAdjacentBunker(greenD_x + 14.0, greenD_z + 4.0, 3.8, 3.0);
        createAdjacentGreen(greenD_x, greenD_z, 8.0);
    }

    // --- HOLE E: UPPER OUTER-LEFT PAR 3 (Fills wide open left space when available) ---
    const teeE_z = Math.min(22, ob.backOB - 10);
    const teeE_x = ob.getLeftOB(teeE_z) - 48.0;
    const greenE_z = teeE_z - 46.0;
    const greenE_x = ob.getLeftOB(greenE_z) - 42.0;

    let pathE = null;
    if (teeE_x > -130 && greenE_x > -130 &&
        !isInsideActiveHoleOB(teeE_x, teeE_z, 5.0) &&
        !isInsideActiveHoleOB(greenE_x, greenE_z, 5.0) &&
        !isPointInWater(teeE_x, teeE_z, 4.0) &&
        !isPointInWater(greenE_x, greenE_z, 9.5)) {

        pathE = [
            new THREE.Vector3(teeE_x, 0, teeE_z),
            new THREE.Vector3((teeE_x + greenE_x) / 2 - 3, 0, (teeE_z + greenE_z) / 2),
            new THREE.Vector3(greenE_x, 0, greenE_z)
        ];

        createAdjacentTee(teeE_x, teeE_z, Math.PI * 0.1);
        createAdjacentFairway(pathE, 11.5);
        createAdjacentBunker(greenE_x - 14.0, greenE_z + 3.0, 3.8, 3.0);
        createAdjacentGreen(greenE_x, greenE_z, 8.0);
    }

    // =========================================================================
    // 2. FILL ALL REMAINING OUTER AREAS OUTSIDE OB (AVOIDING WATER & FAIRWAYS)
    // =========================================================================

    function distToLineSegment(px, pz, x1, z1, x2, z2) {
        const dx = x2 - x1, dz = z2 - z1;
        const l2 = dx * dx + dz * dz;
        if (l2 === 0) return Math.hypot(px - x1, pz - z1);
        let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
    }

    function isNearAnyAdjacentFairway(px, pz) {
        for (let fw of allAdjacentFairways) {
            const pts = fw.points;
            // Accounts for half-width + 7.5 unit maximum tree foliage canopy
            const requiredClearance = (fw.width / 2) + 8.0;
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToLineSegment(px, pz, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z) < requiredClearance) {
                    return true;
                }
            }
        }
        return false;
    }

    function isNearAnyAdjacentGreen(px, pz) {
        for (let g of allAdjacentGreens) {
            // Accounts for green radius + 1.4 fringe + 7.5 tree canopy buffer
            if (Math.hypot(px - g.x, pz - g.z) < (g.r + 9.5)) {
                return true;
            }
        }
        return false;
    }

    function isNearAnyAdjacentBunker(px, pz) {
        for (let b of allAdjacentBunkers) {
            if (Math.hypot(px - b.x, pz - b.z) < (b.r + 7.5)) {
                return true;
            }
        }
        return false;
    }

    function isNearAnyAdjacentTee(px, pz) {
        for (let t of allAdjacentTees) {
            if (Math.hypot(px - t.x, pz - t.z) < (t.r + 7.5)) {
                return true;
            }
        }
        return false;
    }

    function isNearActiveHoleFeatures(px, pz) {
        // 1. Clear active hole green & fringe regardless of shape or position
        const activeGreenX = (holePosition && holePosition.x !== undefined) ? holePosition.x : 0;
        const activeGreenRadius = window.activeGreenRadius || 12.0;
        if (Math.hypot(px - activeGreenX, pz - greenCenterZ) < (activeGreenRadius + 10.0)) {
            return true;
        }

        // 2. Clear active hole fairway spline path
        if (physics && physics.getDistanceToSpline) {
            const activeFW = physics.fairwayWidth || 9.0;
            if (physics.getDistanceToSpline(px, pz) < (activeFW + 8.5)) {
                return true;
            }
        }

        // 3. Clear active hole tee box zone
        if (Math.hypot(px, pz - 10) < 12.0) {
            return true;
        }

        // 4. Clear active hole sand traps
        if (physics && physics.sandTraps) {
            for (let sand of physics.sandTraps) {
                if (sand.userData && sand.userData.isPolygon) {
                    const points = sand.userData.points;
                    for (let pt of points) {
                        if (Math.hypot(px - pt.x, pz - pt.z) < 8.0) return true;
                    }
                } else {
                    const sRadius = (sand.userData && sand.userData.radius) ? sand.userData.radius : 5.0;
                    if (Math.hypot(px - sand.position.x, pz - sand.position.z) < (sRadius + 7.5)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Grid sampling across entire course property (-140 to 140 X, -250 to 45 Z)
    for (let gx = -135; gx <= 135; gx += 22) {
        for (let gz = -245; gz <= 45; gz += 22) {
            const pseudoSeed1 = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453;
            const pseudoSeed2 = Math.cos(gx * 93.9898 + gz * 67.345) * 24634.6345;
            const jitterX = (pseudoSeed1 - Math.floor(pseudoSeed1) - 0.5) * 8.0;
            const jitterZ = (pseudoSeed2 - Math.floor(pseudoSeed2) - 0.5) * 8.0;

            const px = gx + jitterX;
            const pz = gz + jitterZ;

            // 1. Strict Out of Bounds check (7.5 unit margin keeps canopies outside active stakes)
            if (isInsideActiveHoleOB(px, pz, 7.5)) continue;

            // 2. Universal Active Hole Protection (Clears fairway spline, green, tee, and bunkers)
            if (isNearActiveHoleFeatures(px, pz)) continue;

            // 3. Strict Water check (Must clear ocean, lakes, ponds)
            if (isPointInWater(px, pz, 6.0)) continue;

            // 4. Clear fairways of all neighbor holes
            if (isNearAnyAdjacentFairway(px, pz)) continue;

            // 5. Clear greens of all neighbor holes
            if (isNearAnyAdjacentGreen(px, pz)) continue;

            // 6. Clear bunkers of all neighbor holes
            if (isNearAnyAdjacentBunker(px, pz)) continue;

            // 7. Clear tee boxes of all neighbor holes
            if (isNearAnyAdjacentTee(px, pz)) continue;

            // Determine landscape element type based on position & seed
            const roll = Math.abs(pseudoSeed1 - Math.floor(pseudoSeed1));

            if (roll < 0.70) {
                const treeScale = 3.5 + (roll * 2.2);
                const isPine = (roll > 0.40);
                createAdjacentTree(px, pz, treeScale, isPine);
            } else {
                createAdjacentBush(px, pz, 1.2 + roll * 0.8);
            }
        }
    }
}