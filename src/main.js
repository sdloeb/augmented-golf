import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { SoundManager } from './SoundManager.js';

// NEW: Global 3D Particle System for Sand Spray Animations
let sandParticles = [];
// NEW: High-Velocity 3D Particle System for Deep Pot Bunker Eruptions
window.triggerSandSpray = function (x, y, z, count = 30, force = 1.0) { // Increased default particle density
    for (let i = 0; i < count; i++) {
        const pGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07); // Slightly more visible grain sizes
        const pMat = new THREE.MeshBasicMaterial({ color: 0xe3d1b1, transparent: true, opacity: 0.95 });
        const pMesh = new THREE.Mesh(pGeo, pMat);

        pMesh.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.05, z + (Math.random() - 0.5) * 0.2);
        scene.add(pMesh);

        const angle = Math.random() * Math.PI * 2;
        const horizSpeed = (0.02 + Math.random() * 0.05) * force; // Wider outward blast radius

        sandParticles.push({
            mesh: pMesh,
            vx: Math.cos(angle) * horizSpeed,
            // FIXED: Massive upward velocity boost so particles easily clear 2.6-unit deep pot bunker lips!
            vy: (0.14 + Math.random() * 0.16) * force,
            vz: Math.sin(angle) * horizSpeed,
            life: 1.0,
            // FIXED: Slower decay lets the particles live longer to display a full, gorgeous ballistic arc path
            decay: 0.012 + Math.random() * 0.012
        });
    }
};

// Add this block: Centralized Modular Hole & Waypoint Blueprint Definition
const HOLES_CONFIG = {
    1: { // Straight Fairway Tutorial Hole
        par: 4,
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -55)
        ]
    },
    2: { // 327 Yard Downhill Drive + 87 Yard Approach Dogleg Right
        par: 4,
        fairwayWidth: 9.5,
        greenRadius: 9.0,
        waypoints: [
            new THREE.Vector3(0, 0, 10),     // High Tee Box Point
            new THREE.Vector3(0, 0, -118),   // Modify this line: Pushes the turn further down the line
            new THREE.Vector3(11, 0, -139)   // 87 Yard Approach Green Center
        ],
        // The 4 distinct bunkers matching your description and map positions
        // The 4 distinct bunkers matching your description and map positions
        hazards: [
            { type: 'sand', x: -11.0, z: -124.0, radius: 3.5, depth: 0.6 }, // Modify this line: Moved further out into left rough
            { type: 'sand', x: 22.5, z: -126.0, radius: 3.8, depth: 0.6 }, // Keep this line
            { type: 'sand', x: -1.0, z: -147.0, radius: 3.4, depth: 0.5 }, // Keep this line
            { type: 'sand', x: 24.5, z: -146.0, radius: 3.6, depth: 0.5 }  // Keep this line
        ]
    },

    3: { // Long S-Curve Double Dogleg Hole
        par: 5,
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(-20, 0, -50),
            new THREE.Vector3(20, 0, -110),
            new THREE.Vector3(0, 0, -170)
        ]
    },
    4: { // Sharp 90-Degree Dogleg Right Hole
        par: 4,
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -85),   // Modify this line: Drives straight down further
            new THREE.Vector3(45, 0, -85),  // Modify this line: Extends elbow outward
            new THREE.Vector3(85, 0, -85)   // Modify this line: Safe Par 4 distance (~355 yards away)
        ]
    }, // Add this block
    5: { // Sharp 90-Degree Dogleg Left Hole
        par: 4,
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -85),   // Modify this line
            new THREE.Vector3(-45, 0, -85), // Modify this line
            new THREE.Vector3(-85, 0, -85)  // Modify this line
        ]
    } // Add this block
};

let scene, camera, renderer, ball, physics, input, teeBox, currentWindAngle = 0, sounds, golfTee; // Modify this line
let green, pin, flag, holeCup, fairway, floor, greenFringe;
let clubLandingRing;
let clubLandingBeacon;
let ballTracer, tracerPoints = [];
let slopeX = 0, slopeZ = 0, greenGrid, gridTexture, gridCanvas, greenCenterZ;

let sandTraps = [];
let waterHazards = [];
let waterShores = [];
let sceneryObjects = [];
let currentHoleNumber = 2;
let currentHoleConfig = null;
let currentPar = 4;
let currentWindSpeed = 0;
let lastTime = performance.now();
let physicsAccumulator = 0;
const FIXED_TIMESTEP = 1000 / 60

// Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;
let overheadTimeout = null;
let isOverheadActive = false;
let previewProgress = 0;

// NEW CAMERA FLIGHT TRACKERS
let shotStartTime = 0;
let isLongShot = false;

let ballTargetScale = 1.0;

let strokeCount = 0;
let holePosition = new THREE.Vector3(0, 0.25, -55); // Center of the green target

// NEW: Animation state tracker to let the ball physically drop into the cup
let isSinking = false;

const GREEN_RADIUS = 12.0;

// --- UTILITY FUNCTIONS ---

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect; // Change this line
    camera.fov = aspect < 1 ? 72 : 65;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.documentElement.style.setProperty('--club-scale', window.innerHeight / 1080);
}

function updateDistanceDisplay() {
    const dx = ball.position.x - holePosition.x;
    const dz = ball.position.z - holePosition.z;
    const gameDistance = Math.sqrt(dx * dx + dz * dz);

    const distanceText = document.getElementById('distanceText');
    const unitText = document.getElementById('unitText');

    if (distanceText && unitText) {
        // FIXED: Check if the ball is on the green surface container footprint instead of clamping to a raw radius proximity
        const greenCheckX = ball.position.x - (green ? green.position.x : 0);
        const greenCheckZ = ball.position.z - greenCenterZ;
        const activeR = window.activeGreenRadius || GREEN_RADIUS; // Add this line
        const isOnGreenSurface = Math.sqrt(greenCheckX * greenCheckX + greenCheckZ * greenCheckZ) < activeR; // Modify this line

        if (isOnGreenSurface) {
            const feet = Math.round(gameDistance * 1.50);
            distanceText.innerText = feet;
            unitText.innerText = "feet";
        } else {
            const yards = Math.round(gameDistance * 2.76923); // Precise starting scale multiplier
            distanceText.innerText = yards;
            unitText.innerText = "yards";
        }
    }

    const clubText = document.getElementById('clubText');
    if (clubText && input) {
        const club = input.getClubInfo();
        // CHANGED: Appends the max yards capacity directly after the club name string
        clubText.innerText = `${club.name} (${club.maxYards} yds)`;
    }

    // --- DYNAMIC CLUB OPTIONS SELECTION GENERATOR ---
    const container = document.getElementById('clubOptionsContainer');
    if (container && input) {
        container.innerHTML = ''; // Wipe out old button listings

        // Hide panel if the ball is currently moving through physical trajectory or sinking out of view
        if ((physics && physics.isMoving) || isSinking) {
            return;
        }

        // FIXED: Check distance to the green's center instead of the hole cup
        const greenCheckX = ball.position.x - (green ? green.position.x : 0);
        const greenCheckZ = ball.position.z - greenCenterZ;
        const activeR = window.activeGreenRadius || GREEN_RADIUS; // Add this line
        const isOnGreen = Math.sqrt(greenCheckX * greenCheckX + greenCheckZ * greenCheckZ) < activeR; // Modify this line

        // On the putting green, lock to the putter with no extra layout elements
        if (isOnGreen) {
            return;
        }

        const defaultIdx = input.getDefaultClubIndex();
        const activeClub = input.getClubInfo();
        const clubList = input.getClubList();

        // Reconfigure the container style from vertical column to horizontal row row
        const isMobileScreen = window.innerWidth / window.innerHeight < 1 || window.innerWidth <= 768; // Add this line
        container.style.flexDirection = 'row';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center'; // CHANGED: Centers the arrows horizontally
        container.style.gap = isMobileScreen ? '10px' : '20px'; // Modify this line: Tightens layout footprint on mobile screens
        container.style.flexWrap = 'wrap'; // Add this line: Safely wraps the buttons instead of breaking outer layout bounds

        // Calculate what index is currently highlighted
        let currentIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;

        // 1. BUILD THE LEFT SCROLL ARROW (Goes to longer distance clubs)
        const leftBtn = document.createElement('button');
        leftBtn.className = 'club-option';
        leftBtn.innerText = '◀';

        // Disable the arrow if we are already holding the longest club (Driver at index 0)
        if (currentIdx === clubList.length - 1) { // Modify this line: Change 0 to clubList.length - 1
            leftBtn.style.opacity = '0.3';
            leftBtn.style.pointerEvents = 'none';
        }
        leftBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let cIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;
            if (cIdx < clubList.length - 1) { // Modify this line: Change > 0 to < clubList.length - 1
                input.chosenClubIndex = cIdx + 1; // Modify this line: Change cIdx - 1 to cIdx + 1
                updateDistanceDisplay(); // Refresh UI layout positions instantly
            }
        });

        // 3. BUILD THE RIGHT SCROLL ARROW (Goes to longer distance clubs)
        const rightBtn = document.createElement('button');
        rightBtn.className = 'club-option';
        rightBtn.innerText = '▶';

        // Disable the arrow if we are already holding the longest club (Driver at index 0)
        if (currentIdx === 0) { // Modify this line: Check against index 0 limit
            rightBtn.style.opacity = '0.3';
            rightBtn.style.pointerEvents = 'none';
        }
        rightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let cIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;
            if (cIdx > 0) { // Modify this line: Decrement index to select longer clubs
                input.chosenClubIndex = cIdx - 1;
                updateDistanceDisplay(); // Refresh UI layout positions instantly
            }
        });

        // Append all three nodes to create the smooth inline selection row
        container.appendChild(leftBtn);
        container.appendChild(rightBtn);
    }
}

function generateNewWind() {
    // RESTORED: Re-randomize the wind angle on every generation so wind direction varies completely!
    currentWindAngle = Math.random() * Math.PI * 2;

    let windSpeed = 0;

    // 33% chance to trigger high winds (13 to 20 mph)
    if (Math.random() < 0.33) {
        windSpeed = 13 + Math.floor(Math.random() * 8); // Picks an integer from 13 up to 20
    }
    // 67% chance to trigger low/moderate winds (0 to 12 mph)
    else {
        windSpeed = Math.floor(Math.random() * 13); // Picks an integer from 0 up to 12
    }

    currentWindSpeed = windSpeed;

    const text = document.getElementById('windText');
    if (text) {
        text.innerText = `${windSpeed} mph`;
    }

    const windScale = 0.00006;
    physics.wind.set(
        Math.sin(currentWindAngle) * windSpeed * windScale,
        0,
        -Math.cos(currentWindAngle) * windSpeed * windScale
    );
}

function generateHazards() {
    sandTraps.forEach(mesh => scene.remove(mesh));
    waterHazards.forEach(mesh => scene.remove(mesh));
    waterShores.forEach(mesh => scene.remove(mesh));
    sandTraps.length = 0;
    waterHazards.length = 0;
    waterShores.length = 0;

    // NEW: Clear physics engine hazard arrays immediately so that getGroundHeight queries 
    // inside this generation loop reflect clean terrain without old hole artifacts.
    if (physics) {
        physics.sandTraps = [];
        physics.waterHazards = [];
    }

    const numWater = 1 + Math.floor(Math.random() * 2);
    const numSand = Math.floor(Math.random() * 4);  // 0 to 3

    const checkOverlap = (x, z, r, list, padding = 0) => {
        return list.some(mesh => {
            const dx = x - mesh.position.x;
            const dz = z - mesh.position.z;
            const meshRadius = mesh.userData && mesh.userData.radius !== undefined ? mesh.userData.radius : (mesh.geometry.parameters.radius || 0); // Add this line
            return Math.sqrt(dx * dx + dz * dz) < (r + meshRadius + padding);
        });
    };

    // Use a safe fallback if green hasn't initialized yet
    const targetGreenZ = green ? green.position.z : -55;
    const targetGreenX = green ? green.position.x : 0;

    for (let i = 0; i < numWater; i++) {
        let x, z, r = 7.0 + Math.random() * 4.5;
        let waterAttempts = 0; // Add this line
        do {
            x = (Math.random() - 0.5) * 160; // Modify this line: Spans wide enough for doglegs
            z = (targetGreenZ - 20) + Math.random() * (26 - targetGreenZ);
            waterAttempts++; // Add this line
            if (waterAttempts > 50) break;
        } while (
            checkOverlap(x, z, r, waterHazards, 3.0) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt((x - targetGreenX) * (x - targetGreenX) + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r + 8.0) || // Modify this line: Checks true green center
            (physics && (physics.getDistanceToSpline(x, z) < (9.0 + r + 0.5) || physics.getDistanceToSpline(x, z) > (9.0 + r + 2.0))) || // Modify this line: Set min distance to 0.5 and clamped max distance to 18.0
            (z > -15 && Math.abs(x) < 15)
        );
        if (waterAttempts > 50) continue;

        let currentWaterGroundY = physics.getGroundHeight(x, z);

        if (z >= targetGreenZ && z <= 8 && Math.abs(x) <= 9.0) {
            currentWaterGroundY += 0.035;
        }

        const waterGeo = new THREE.PlaneGeometry(r * 2, r * 2, 24, 24);
        const waterGeoPos = waterGeo.attributes.position;
        for (let j = 0; j < waterGeoPos.count; j++) {
            let pX = waterGeoPos.getX(j);
            let pY = waterGeoPos.getY(j);
            let pDist = Math.sqrt(pX * pX + pY * pY);
            if (pDist > r) {
                waterGeoPos.setX(j, (pX / pDist) * r);
                waterGeoPos.setY(j, (pY / pDist) * r);
            }
        }
        waterGeo.computeVertexNormals();

        const waterMesh = new THREE.Mesh(
            waterGeo, // Update this line: Swapped from CircleGeometry to our custom grid geometry
            new THREE.MeshPhongMaterial({
                color: 0x0000ff,                         // Update this line: Vibrant deep lake blue
                specular: 0xffffff,                     // Add this line: Gives it crisp white sun-glint highlights
                shininess: 150,                         // Add this line: Increases gloss factor for high contrast
                flatShading: true,                      // Keep this line
                polygonOffset: true,                    // Keep this line
                polygonOffsetFactor: -1,                // Keep this line
                polygonOffsetUnits: -4                  // Keep this line
            })
        );
        waterMesh.rotation.x = -Math.PI / 2;
        // FIXED: Lowered from +0.06 to +0.01 to snap the water surface flush against the terrain hills
        waterMesh.position.set(x, currentWaterGroundY + 0.01, z);
        waterMesh.userData = { radius: r };
        scene.add(waterMesh);
        waterHazards.push(waterMesh);

        const shoreMesh = new THREE.Mesh(
            new THREE.RingGeometry(r - 0.05, r + 0.6, 64), // Blends slightly into water, extends 0.6 units out
            new THREE.MeshStandardMaterial({
                color: 0x655545,             // Natural rock/dirt brownish-gray
                roughness: 0.95,             // Flat, matte finish for earth texture
                metalness: 0.1
            })
        );
        shoreMesh.rotation.x = -Math.PI / 2;
        // FIXED: Lowered from +0.07 to +0.015 to securely bind the shore ring down to the grass without floating disc artifacts
        shoreMesh.position.set(x, currentWaterGroundY + 0.015, z);
        scene.add(shoreMesh);
        waterShores.push(shoreMesh);
        // Create a vertical dirt/rock cylinder wall that extends down into the dug trench to hide the map void
        const wallGeo = new THREE.CylinderGeometry(r + 0.58, r + 0.58, 2.0, 64, 1, true); // Add this line
        const wallMesh = new THREE.Mesh( // Add this line
            wallGeo, // Add this line
            new THREE.MeshStandardMaterial({ // Add this line
                color: 0x655545, // Add this line
                roughness: 0.95,
                metalness: 0.1,
                side: THREE.DoubleSide
            })
        );

        // FIXED: Shifted down to match the new 0.015 shore reference line perfectly
        wallMesh.position.set(x, currentWaterGroundY + 0.015 - 1.0, z);
        scene.add(wallMesh);
        waterShores.push(wallMesh);

    }

    for (let i = 0; i < numSand; i++) {
        let x, z, r = 4.5 + Math.random() * 2.5;
        let sandAttempts = 0;
        do {
            if (Math.random() > 0.3 && physics.fairwayPoints && physics.fairwayPoints.length > 0) {
                const basePt = physics.fairwayPoints[Math.floor(Math.random() * physics.fairwayPoints.length)];
                const angle = Math.random() * Math.PI * 2;
                const offsetDist = 9.0 + r + 0.5 + Math.random() * 4.0;
                x = basePt.x + Math.cos(angle) * offsetDist;
                z = basePt.z + Math.sin(angle) * offsetDist;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const offsetDist = 12.0 + r + 0.5 + Math.random() * 4.0;
                x = targetGreenX + Math.cos(angle) * offsetDist;
                z = targetGreenZ + Math.sin(angle) * offsetDist;
            }
            sandAttempts++;
            if (sandAttempts > 100) break;
        } while (
            checkOverlap(x, z, r, waterHazards, 3.0) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt((x - targetGreenX) * (x - targetGreenX) + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r + 0.5) ||
            (physics && physics.getDistanceToSpline(x, z) < (9.0 + r + 0.5)) ||
            (z > -15 && Math.abs(x) < 15)
        );

        if (sandAttempts > 100) continue;

        let currentSandGroundY = physics.getGroundHeight(x, z);
        if (z >= targetGreenZ && z <= 8 && Math.abs(x) <= 9.0) {
            currentSandGroundY += 0.035;
        }

        // NEW: Select a variable depth profile between a shallow bunker (0.4) and a deep pot trap (1.0)
        const sandDepth = 0.5 + Math.random() * 2.6;

        const sandMesh = new THREE.Mesh(
            // FIXED: Changed to RingGeometry(0, ...) to give the mesh interior rows to bend over slopes!
            new THREE.RingGeometry(0, r, 32, 6),
            new THREE.MeshStandardMaterial({
                color: 0xd9c59e, // Clean realistic sand coloring
                roughness: 0.95,
                metalness: 0.0,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -4
            })
        );
        sandMesh.rotation.x = -Math.PI / 2;

        // FIXED: Set position.y to 0 so absolute heights don't double-stack and float over hills
        sandMesh.position.set(x, 0, z);
        sandMesh.userData = { radius: r, depth: sandDepth };
        scene.add(sandMesh);
        sandTraps.push(sandMesh);
    }

    if (physics) {
        physics.sandTraps = sandTraps;
        physics.waterHazards = waterHazards;
    }
}



function updateWindArrowDisplay() {
    const arrow = document.getElementById('windArrow');
    if (!arrow || !camera) return;
    if (physics && physics.isMoving) return;

    // Get the horizontal direction vector between our stable camera look targets
    const stableForward = new THREE.Vector3().subVectors(cameraLookAt, cameraTargetPos); // Add this line

    // Calculate the camera's heading angle in radians using our stable target vectors
    const cameraAngle = Math.atan2(stableForward.x, -stableForward.z); // Modify this line

    // Wind direction relative to the camera's perspective
    const relativeAngle = currentWindAngle - cameraAngle;
    const degrees = (relativeAngle * 180) / Math.PI;

    arrow.style.transform = `rotate(${degrees}deg)`;
}

function resetEntireGame(advanceHole = false) {
    if (advanceHole) {
        currentHoleNumber++;
    }

    strokeCount = 0;
    document.getElementById('strokeText').innerText = strokeCount;

    tracerPoints = [];
    if (ballTracer) ballTracer.geometry.setFromPoints([]);

    // Pull the piece-by-piece blueprint configuration if it exists
    let holeConfig = HOLES_CONFIG[currentHoleNumber] || null;

    // Championship Procedural Generator fallback: runs only if no manual config exists
    if (!holeConfig) {
        const UNIT_YARDS = 2.76923; // Fixed spatial engine multiplier matching game scaling
        const parRoll = Math.random();

        if (parRoll < 0.20) {
            // Archetype 1: Real Par 3 (140 to 220 yards)
            const yards = 140 + Math.random() * 80;
            const totalUnits = yards / UNIT_YARDS;

            holeConfig = {
                par: 3,
                waypoints: [
                    new THREE.Vector3(0, 0, 10),
                    new THREE.Vector3(0, 0, 10 - totalUnits)
                ]
            };
        }
        else if (parRoll < 0.75) {
            // Archetype 2: Real Par 4 (360 to 460 yards)
            const isDogleg = Math.random() > 0.35; // 65% chance of a strategic dogleg layout

            if (!isDogleg) {
                // Straight Challenging Par 4
                const yards = 360 + Math.random() * 100;
                const totalUnits = yards / UNIT_YARDS;
                holeConfig = {
                    par: 4,
                    waypoints: [
                        new THREE.Vector3(0, 0, 10),
                        new THREE.Vector3(0, 0, 10 - totalUnits)
                    ]
                };
            } else {
                // Dogleg Left or Right Par 4
                const sideDir = Math.random() > 0.5 ? 1 : -1;
                const driveYards = 240 + Math.random() * 40;    // 240-280 yard drive to landing zone
                const approachYards = 120 + Math.random() * 40; // 120-160 yard secondary approach shot

                const driveUnits = driveYards / UNIT_YARDS;
                const approachUnits = approachYards / UNIT_YARDS;

                // Calculate a realistic 35-degree dogleg break angle
                const angle = (30 + Math.random() * 10) * Math.PI / 180;
                const elbowZ = 10 - driveUnits;
                const greenX = sideDir * (Math.sin(angle) * approachUnits);
                const greenZ = elbowZ - (Math.cos(angle) * approachUnits);

                holeConfig = {
                    par: 4,
                    waypoints: [
                        new THREE.Vector3(0, 0, 10),
                        new THREE.Vector3(0, 0, elbowZ), // Keeps initial drive line completely straight
                        new THREE.Vector3(greenX, 0, greenZ)
                    ]
                };
            }
        }
        else {
            // Archetype 3: Real Par 5 (500 to 580 yards) - True 3-Shot Strategy Hole
            const sideDir = Math.random() > 0.5 ? 1 : -1;
            const driveYards = 250 + Math.random() * 30;    // 250-280 yard tee shot landing zone
            const secondYards = 160 + Math.random() * 30;   // 160-190 yard layup area
            const approachYards = 90 + Math.random() * 30;  // 90-120 yard wedge shot into the green

            const driveUnits = driveYards / UNIT_YARDS;
            const secondUnits = secondYards / UNIT_YARDS;
            const approachUnits = approachYards / UNIT_YARDS;

            const elbowZ1 = 10 - driveUnits;

            // First turn out into the dogleg lane
            const angle1 = (25 + Math.random() * 10) * Math.PI / 180;
            const elbowX2 = sideDir * (Math.sin(angle1) * secondUnits);
            const elbowZ2 = elbowZ1 - (Math.cos(angle1) * secondUnits);

            // S-Curve turn back around the corner toward the green pin
            const angle2 = (15 + Math.random() * 10) * Math.PI / 180;
            const greenX = elbowX2 - sideDir * (Math.sin(angle2) * approachUnits);
            const greenZ = elbowZ2 - (Math.cos(angle2) * approachUnits);

            holeConfig = {
                par: 5,
                waypoints: [
                    new THREE.Vector3(0, 0, 10),
                    new THREE.Vector3(0, 0, elbowZ1),
                    new THREE.Vector3(elbowX2, 0, elbowZ2),
                    new THREE.Vector3(greenX, 0, greenZ)
                ]
            };
        }
    }

    currentHoleConfig = holeConfig; // 
    window.activeGreenRadius = (holeConfig && holeConfig.greenRadius) ? holeConfig.greenRadius : 12.0;

    // Scale the visual 3D geometries to snap perfectly to the custom radius
    const visualScaleFactor = window.activeGreenRadius / 12.0;
    if (green) green.scale.set(visualScaleFactor, visualScaleFactor, 1);
    if (greenGrid) greenGrid.scale.set(visualScaleFactor, visualScaleFactor, 1);
    if (greenFringe) greenFringe.scale.set(visualScaleFactor, visualScaleFactor, 1);

    const themeRoll = Math.random();
    if (themeRoll < 0.25) {
        currentHoleConfig.theme = 'open';    // Clean links-style course
    } else if (themeRoll < 0.65) {
        currentHoleConfig.theme = 'standard';// Balanced layout
    } else {
        currentHoleConfig.theme = 'forest';  // Heavily wooded tree-lined layout
    }

    currentPar = holeConfig.par;    // Keep this single instance of the assignment

    // Update the Wood Placard Map Dashboard display readings
    const mapTitleElement = document.getElementById('holeMapTitle');
    const mapParElement = document.getElementById('holeMapPar');
    if (mapTitleElement) mapTitleElement.innerText = `HOLE ${currentHoleNumber}`;
    if (mapParElement) mapParElement.innerText = `PAR ${currentPar}`;

    // Generate the mathematical Catmull-Rom spline curve from the waypoints
    const fairwaySpline = new THREE.CatmullRomCurve3(holeConfig.waypoints);
    physics.fairwayPoints = fairwaySpline.getPoints(200); // Extract 200 spatial resolution check nodes

    // The green centers itself perfectly on the final waypoint point of the path
    const greenEndpoint = holeConfig.waypoints[holeConfig.waypoints.length - 1];
    greenCenterZ = greenEndpoint.z;

    // Shift the pin location slightly inside the green boundaries
    const pinAngle = Math.random() * Math.PI * 2;
    const pinRadius = Math.random() * (GREEN_RADIUS - 3.0);
    holePosition.x = greenEndpoint.x + Math.cos(pinAngle) * pinRadius;
    holePosition.z = greenCenterZ + Math.sin(pinAngle) * pinRadius;

    // The circular putting green and its helper grid map layer align centered with the course layout track
    if (green) {
        green.position.x = greenEndpoint.x;
        green.position.z = greenCenterZ;
    }
    if (greenGrid) {
        greenGrid.position.x = greenEndpoint.x;
        greenGrid.position.z = greenCenterZ;
    }
    if (greenFringe) {
        greenFringe.position.x = greenEndpoint.x;
        greenFringe.position.z = greenCenterZ;
    } // Add this line

    // Set up the horizontal profiles matrix (Flat, Left-to-Right, Right-to-Left)
    const horizontalOptions = [0.0, 0.05, -0.05];

    // Shuffle the array so the horizontal options map randomly to Front, Mid, or Back tiers
    for (let i = horizontalOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [horizontalOptions[i], horizontalOptions[j]] = [horizontalOptions[j], horizontalOptions[i]];
    }

    const verticalOptions = [0.03, -0.03, 0.0];

    // Build the 3 distinct randomized tier zones configuration blocks
    const backZoneProfile = { rx: horizontalOptions[0], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    const midZoneProfile = { rx: horizontalOptions[1], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    const frontZoneProfile = { rx: horizontalOptions[2], rz: verticalOptions[Math.floor(Math.random() * 3)] };

    // Pass the full contoured landscape configurations down to the physics machine instance
    if (physics) {
        const generatedWidth = (holeConfig && holeConfig.fairwayWidth) ? holeConfig.fairwayWidth : (8.5 + Math.random() * 20); // Modify this line
        physics.setGreenContours(backZoneProfile, midZoneProfile, frontZoneProfile, greenEndpoint.x, greenCenterZ, generatedWidth);
        // Add these lines: Calculates and stores the normalized final approach direction vector
        const prevEndpoint = holeConfig.waypoints[holeConfig.waypoints.length - 2];
        const appX = greenEndpoint.x - prevEndpoint.x;
        const appZ = greenEndpoint.z - prevEndpoint.z;
        const appLen = Math.sqrt(appX * appX + appZ * appZ) || 1;
        physics.approachDirX = appX / appLen;
        physics.approachDirZ = appZ / appLen;
    }

    // If our hole template defines custom manual hazards, we will build them shortly.
    // Otherwise, run the random hazard placement algorithm automatically.
    if (!holeConfig || !holeConfig.hazards) {
        generateHazards();
    } else {
        // Clear old visual components from the previous hole
        sandTraps.forEach(mesh => scene.remove(mesh));
        waterHazards.forEach(mesh => scene.remove(mesh));
        waterShores.forEach(mesh => scene.remove(mesh));
        sandTraps.length = 0;
        waterHazards.length = 0;
        waterShores.length = 0;

        // Loop through and build your manual custom hazards list
        holeConfig.hazards.forEach(hz => {
            const x = hz.x;
            const z = hz.z;
            const r = hz.radius || 5.0;

            if (hz.type === 'sand') {
                const sandDepth = hz.depth || 0.6;
                const sandMesh = new THREE.Mesh(
                    new THREE.RingGeometry(0, r, 32, 6),
                    new THREE.MeshStandardMaterial({
                        color: 0xd9c59e,
                        roughness: 0.95,
                        metalness: 0.0,
                        polygonOffset: true,
                        polygonOffsetFactor: -1,
                        polygonOffsetUnits: -4
                    })
                );
                sandMesh.rotation.x = -Math.PI / 2;
                sandMesh.position.set(x, 0, z);
                sandMesh.userData = { radius: r, depth: sandDepth };
                scene.add(sandMesh);
                sandTraps.push(sandMesh);
            }
        });

        if (physics) {
            physics.sandTraps = sandTraps;
            physics.waterHazards = waterHazards;
        }
    }

    // Calculate the dynamic 3D ground level height exactly where the random pin cup is spawned


    // Calculate the dynamic 3D ground level height exactly where the random pin cup is spawned
    const specificPinCupY = physics.getGreenHeight(holePosition.x, holePosition.z);

    // Pin the visual flagstick elements seamlessly onto the new 3D elevation slopes coordinate
    if (pin) pin.position.set(holePosition.x, 1.5 + specificPinCupY, holePosition.z);
    if (flag) flag.position.set(holePosition.x + 0.4, 2.75 + specificPinCupY, holePosition.z);
    if (holeCup) { // Change this line
        const cupDelta = 0.1; // Add this line: Resolution boundary for sampling local slopes
        const cL = physics.getGreenHeight(holePosition.x - cupDelta, holePosition.z); // Add this line
        const cR = physics.getGreenHeight(holePosition.x + cupDelta, holePosition.z); // Add this line
        const cB = physics.getGreenHeight(holePosition.x, holePosition.z - cupDelta); // Add this line
        const cF = physics.getGreenHeight(holePosition.x, holePosition.z + cupDelta); // Add this line
        const cupSlopeX = (cL - cR) / (2 * cupDelta); // Add this line
        const cupSlopeZ = (cB - cF) / (2 * cupDelta); // Add this line

        holeCup.position.set(holePosition.x, 0.042 + specificPinCupY, holePosition.z); // Change this line
        holeCup.rotation.set(Math.atan2(cupSlopeZ, 1), 0, -Math.atan2(cupSlopeX, 1)); // Add this line: Slopes cup flush to terrain
    } // Change this line

    // Deform the visual green mesh geometries to create real 3D ridges and valleys
    const deformVisualGreenMesh = (targetMesh) => {
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            // Map local plane points to true world spaces, respecting the dynamic mesh scales
            const worldX = localX * targetMesh.scale.x + targetMesh.position.x;
            const worldZ = -localY * targetMesh.scale.y + targetMesh.position.z;

            // Fringe mesh collar sits outside the main green mound, so it should follow the ground height directly
            let calculatedHeight = (targetMesh === greenFringe)
                ? physics.getGroundHeight(worldX, worldZ)
                : physics.getGreenHeight(worldX, worldZ);

            // Removed the old sand check block here to stop bunkers from eating cuts out of the green edges
            if (targetMesh === green) calculatedHeight += 0.02;
            if (targetMesh === greenGrid) calculatedHeight += 0.03;
            if (targetMesh === greenFringe) calculatedHeight += 0.018;

            posAttr.setZ(i, calculatedHeight);
        }
        posAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals(); // Forces Three.js to re-render lighting shadows smoothly
    };

    const deformCourseMesh = (targetMesh, useScale = false) => {
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        const scaleX = useScale ? targetMesh.scale.x : 1;
        const scaleY = useScale ? targetMesh.scale.y : 1;
        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            // Map local plane points to true world spaces, respecting dynamic mesh scales
            const worldX = localX * scaleX + targetMesh.position.x;
            const worldZ = -localY * scaleY + targetMesh.position.z;

            // Gather the pre-calculated, unified terrain height from the physics engine
            let calculatedHeight = physics.getGroundHeight(worldX, worldZ);

            // Scan if this vertex falls inside any active water hazard perimeter shelf
            let insideWaterZone = false;
            waterHazards.forEach(water => {
                const dxW = worldX - water.position.x;
                const dzW = worldZ - water.position.z;
                const distToWater = Math.sqrt(dxW * dxW + dzW * dzW);
                const lakeRadius = water.userData.radius || 5;
                if (distToWater < lakeRadius + 0.6) {
                    insideWaterZone = true;
                }
            });

            // Scan active sand trap footprint borders using correct userData properties
            let insideSandZone = false;
            let activeSandDepth = 0;
            sandTraps.forEach(sand => {
                const dxS = worldX - sand.position.x;
                const dzS = worldZ - sand.position.z;
                let distToSand = Math.sqrt(dxS * dxS + dzS * dzS); // Keep this line

                // Add these lines below to distort the visual border based on the angle
                const angle = Math.atan2(dzS, dxS);
                const shapeWarp = 1.0 + Math.sin(angle * 3) * 0.25 + Math.cos(angle * 1.5) * 0.15;
                const padding = (targetMesh === floor || targetMesh === fairway) ? 1.6 : 0.0; // Add this line
                const sandRadius = ((sand.userData && sand.userData.radius ? sand.userData.radius : 5) + padding) * shapeWarp; // Modify this line

                if (distToSand < sandRadius) {
                    insideSandZone = true;
                    const depth = sand.userData && sand.userData.depth ? sand.userData.depth : 0.6;
                    if (depth > activeSandDepth) activeSandDepth = depth;
                }
            });

            // Around Line 829 in src/main.js
            const gX = worldX - (green ? green.position.x : 0);
            const gZ = worldZ - greenCenterZ;
            const distToGreen = Math.sqrt(gX * gX + gZ * gZ);

            const activeR = window.activeGreenRadius || 12.0;
            const fringeOuterR = activeR * (13.0 / 12.0); // Dynamic outer edge of the scaled fringe mesh

            // Soft gradient ramp around the green replaces the harsh cliff cutoff to avoid mesh jaggedness
            if (distToGreen < activeR) {
                calculatedHeight -= 0.0;
            } else if (distToGreen < activeR + 3.5) {
                const greenT = (distToGreen - activeR) / 3.5;
                const smoothGreenT = THREE.MathUtils.smoothstep(greenT, 0, 1);
                calculatedHeight -= THREE.MathUtils.lerp(0.0, 0.0, smoothGreenT);
            }

            if (!insideWaterZone) {
                const distanceToPath = physics.getDistanceToSpline(worldX, worldZ); // Add this line
                let fW = physics.fairwayWidth; // Add this line

                const fWEdge = fW + 3.5; // Keep this line

                const relX = worldX - (green ? green.position.x : 0);
                const relZ = worldZ - greenCenterZ;
                const distToGreenCenter = Math.sqrt(relX * relX + relZ * relZ);
                const approachDot = (physics.approachDirX !== undefined) ? (relX * physics.approachDirX + relZ * physics.approachDirZ) : -999;
                const isPastFairway = (distToGreenCenter < fringeOuterR) || (approachDot > 0);

                // 1. Calculate exactly where the rough floor mesh sits at this coordinate
                let floorHeight = calculatedHeight;
                if (distanceToPath <= fW && !isPastFairway) {
                    floorHeight -= 0.04;
                } else if (distanceToPath <= fWEdge && !isPastFairway) {
                    const t = (distanceToPath - fW) / 3.5;
                    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
                    floorHeight -= THREE.MathUtils.lerp(0.04, 0.0, smoothT);
                }

                // Render the rough floor geometry
                if (targetMesh === floor) {
                    calculatedHeight = floorHeight;
                    // NEW: Bury the rough floor mesh underground inside the fringe radius to eliminate Z-fighting gaps
                    if (distToGreen < fringeOuterR) {
                        calculatedHeight -= 1.5;
                    }
                    // FIXED: Clearance cushion automatically scales deeper to completely neutralize triangle bridging
                    if (insideSandZone) {
                        calculatedHeight -= (0.15 + activeSandDepth * 0.35);
                    }
                }

                // 2. Fairway Elevation Cushion (applies ONLY to the fairway mesh)
                if (targetMesh === fairway) {
                    // FIXED: Uses global currentHoleConfig to avoid ReferenceError crashes
                    const isCustomHole = currentHoleConfig && currentHoleConfig.waypoints;
                    const activeR = window.activeGreenRadius || GREEN_RADIUS;

                    // Forces the fairway to stop in a clean straight cut right at the green entrance line
                    const shouldHide = (!isCustomHole && worldZ > -8.0) ||
                        (!isCustomHole && isPastFairway) ||
                        (isCustomHole && distToGreenCenter < fringeOuterR) || // Modify this line: Cut to the circular green instead of a straight line
                        (isCustomHole && currentHoleNumber === 2 && worldZ > -60) ||
                        insideSandZone ||
                        (distanceToPath > fWEdge);

                    if (shouldHide) {
                        // FIXED: Automatically pulls hidden cuts deeper underground (-1.5) to neutralize triangle bleeding
                        calculatedHeight = insideSandZone ? (physics.getGroundHeight(worldX, worldZ) - (0.17 + activeSandDepth * 0.35)) : (floorHeight - 1.5);
                    } else if (distanceToPath <= fW) {
                        // Add these lines: Smoothly dips the fairway height under the green fringe level
                        let cushion = 0.06;
                        if (isCustomHole && distToGreenCenter < fringeOuterR + 3.0) {
                            let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                            cushion = THREE.MathUtils.lerp(-0.02, 0.06, Math.max(0, Math.min(1, tFade)));
                        }
                        calculatedHeight += cushion; // Modify this line
                    } else {
                        const t = (distanceToPath - fW) / 3.5;
                        const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);

                        // Add these lines: Mirror the dip for outer blended edges
                        let cushion = 0.06;
                        if (isCustomHole && distToGreenCenter < fringeOuterR + 3.0) {
                            let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                            cushion = THREE.MathUtils.lerp(-0.02, 0.06, Math.max(0, Math.min(1, tFade)));
                        }

                        const visibleHeight = calculatedHeight + cushion; // Modify this line
                        const hiddenHeight = insideSandZone ? (physics.getGroundHeight(worldX, worldZ) - (0.17 + activeSandDepth * 0.35)) : (floorHeight - 1.5);

                        calculatedHeight = THREE.MathUtils.lerp(visibleHeight, hiddenHeight, smoothT);
                    }

                }
            } // This bracket ends the insideWaterZone check clean

            // NEW: If deforming a sand trap mesh itself, add a tiny positive offset cushion to prevent z-fighting clips
            if (sandTraps.includes(targetMesh)) {
                calculatedHeight += 0.02;
            }

            // Write the finalized calculated height to the current vertex
            posAttr.setZ(i, calculatedHeight);
        }

        // Notify the GPU to refresh the coordinates and re-render lighting highlights
        posAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals();
    };

    // Run deforming treatments over both the putting grass surface and its alignment grid layer mesh
    deformVisualGreenMesh(green);
    deformVisualGreenMesh(greenGrid);
    deformVisualGreenMesh(greenFringe);


    deformCourseMesh(floor, false);
    deformCourseMesh(fairway, true);
    sandTraps.forEach(sand => deformCourseMesh(sand, false));

    // Randomize the Tee Box horizontal offset left or right to vary the shot angles
    const teeBoxX = (Math.random() - 0.5) * 7.0;
    if (teeBox) {
        teeBox.position.set(teeBoxX, physics.getGroundHeight(teeBoxX, 10) + 0.072, 10);
        teeBox.visible = true;

        // Add these lines: Automatically rotates the tee box and markers down the first fairway segment
        const firstTarget = holeConfig.waypoints[1];
        teeBox.lookAt(new THREE.Vector3(firstTarget.x, teeBox.position.y, firstTarget.z)); // Modify this line
    }

    // Fetch the true 3D hill peak height at the tee location
    const currentTeeBoxY = physics.getGroundHeight(teeBoxX, 10) + 0.071;

    // Snap the ball and plastic tee directly to the top of the hill elevation
    ball.position.set(teeBoxX, currentTeeBoxY + 0.37, 10);
    if (golfTee) {
        golfTee.position.set(teeBoxX, currentTeeBoxY + 0.06, 10);
        golfTee.visible = true;
    }

    physics.velocity.set(0, 0, 0);
    physics.isMoving = false;
    wasMoving = false;
    if (input) { input.aimAngleOffset = 0; input.isAimMode = false; }
    isSinking = false;
    isOverheadActive = false;
    ballTargetScale = 1.0;
    ball.scale.set(1, 1, 1);

    // Calculate the precise target-line vector between the randomized tee and the first fairway waypoint
    const firstTarget = holeConfig.waypoints[1]; // Add this line
    const startDirX = firstTarget.x - teeBoxX;    // Modify this line: Points camera down the initial straightaway
    const startDirZ = firstTarget.z - 10;          // Modify this line: Points camera down the initial straightaway
    const startLength = Math.sqrt(startDirX * startDirX + startDirZ * startDirZ);

    // Position the camera exactly 5.5 units backward along the true ball-to-hole line of sight
    const startBackX = -(startDirX / startLength) * 5.5;
    const startBackZ = -(startDirZ / startLength) * 5.5;

    cameraTargetPos.set(teeBoxX + startBackX, ball.position.y + 1.8, 10 + startBackZ);
    // NEW: Look at a fixed target point 12 units directly ahead of the ball instead of tilting down to the hole
    const startForwardX = startDirX / startLength;
    const startForwardZ = startDirZ / startLength;
    cameraLookAt.set(ball.position.x + startForwardX * 12, ball.position.y, ball.position.z + startForwardZ * 12);
    currentLookAt.copy(cameraLookAt);

    sceneryObjects.forEach(obj => scene.remove(obj));
    sceneryObjects = [];

    // Materials for the scenery elements
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1d5330, roughness: 0.6 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.5 });

    // Generate 35 pieces of random scenery scattered along the edges
    for (let i = 0; i < 65; i++) { // Modify this line: increased count to account for skips
        const isHouse = currentHoleNumber === 2 ? false : (Math.random() <= 0.4); // Modify this line: No houses on Green Lakes hole
        if (currentHoleNumber === 2 && !isHouse) {
            continue;
        }
        const x = isHouse ? ((Math.random() > 0.5 ? 1 : -1) * (102 + Math.random() * 13)) : ((Math.random() - 0.5) * 220);
        const z = 15 - Math.random() * (25 + Math.abs(holePosition.z));

        // FIXED: Replaced the hardcoded 18.0 with a dynamic check relative to fairway width and transition zones
        if (physics && physics.getDistanceToSpline(x, z) < (physics.fairwayWidth + 4.5)) {
            continue;
        }

        // Prevent background scenery from spawning inside water hazards (+1.5 unit buffer padding)
        let insideWater = waterHazards.some(waterMesh => {
            let dxW = x - waterMesh.position.x;
            let dzW = z - waterMesh.position.z;
            let waterRadius = waterMesh.userData && waterMesh.userData.radius ? waterMesh.userData.radius : 5;
            return Math.sqrt(dxW * dxW + dzW * dzW) < (waterRadius + 1.5);
        });
        if (insideWater) continue;

        // Prevent background scenery from spawning inside sand traps (+1.5 unit buffer padding)
        let insideSand = sandTraps.some(sandMesh => {
            let dxS = x - sandMesh.position.x;
            let dzS = z - sandMesh.position.z;
            let sandRadius = sandMesh.userData && sandMesh.userData.radius ? sandMesh.userData.radius : 5;
            return Math.sqrt(dxS * dxS + dzS * dzS) < (sandRadius + 1.5);
        });
        if (insideSand) continue;

        const sceneryGroup = new THREE.Group(); // Keep this line
        const courseHeight = physics.getGroundHeight(x, z); // Keep this line
        sceneryGroup.position.set(x, courseHeight, z);

        if (!isHouse) {
            // BUILD A PROCEDURAL TREE
            const treeHeight = 1.5;
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, treeHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = treeHeight / 2;
            sceneryGroup.add(trunk);

            const leavesHeight = 2.5;
            const leavesGeo = new THREE.ConeGeometry(1.2, leavesHeight, 8);
            const leaves = new THREE.Mesh(leavesGeo, foliageMat);
            leaves.position.y = treeHeight + (leavesHeight / 2);
            sceneryGroup.add(leaves);
        } else {
            // BUILD A PROCEDURAL HOUSE
            const houseWidth = 2.0 + Math.random() * 1.5;
            const houseHeight = 1.5 + Math.random() * 1.0;

            const baseGeo = new THREE.BoxGeometry(houseWidth, houseHeight, houseWidth);
            const base = new THREE.Mesh(baseGeo, wallMat);
            base.position.y = houseHeight / 2;
            sceneryGroup.add(base);

            // Give it a pointed triangular roof
            const roofGeo = new THREE.ConeGeometry(houseWidth * 0.8, 1.2, 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = houseHeight + 0.6;
            roof.rotation.y = Math.PI / 4;
            sceneryGroup.add(roof);
        }

        scene.add(sceneryGroup);
        sceneryObjects.push(sceneryGroup);
    }

    // --- NEW: GENERATE INTERACTIVE FAIRYWAY & ROUGH OBSTACLES ---
    if (physics) physics.obstacles = [];

    let obstacleAttempts = currentHoleConfig.theme === 'open' ? 12 : (currentHoleConfig.theme === 'forest' ? 145 : 45);

    // Add this block: 50% chance to turn the rough into a dense forest barrier forcing precise fairway play
    if (Math.random() < 0.5) {
        obstacleAttempts = 275;
    }

    if (currentHoleNumber === 2) obstacleAttempts = 320;

    for (let i = 0; i < obstacleAttempts; i++) { // Modify this line: Replaced 45 with dynamic attempts counter
        let sampleX = (Math.random() - 0.5) * 220;
        if (currentHoleNumber === 2 && sampleX > 0) {
            sampleX += 35.0; // Pushes right-side trees/bushes further right
        }
        let sampleZ = greenCenterZ + Math.random() * (10 - greenCenterZ);

        // 1. 25-Yard Safe Zone Check from both Tee box and Hole Pin
        let distanceToTee = Math.sqrt((sampleX - teeBoxX) * (sampleX - teeBoxX) + (sampleZ - 10) * (sampleZ - 10));
        let distanceToHole = Math.sqrt((sampleX - holePosition.x) * (sampleX - holePosition.x) + (sampleZ - holePosition.z) * (sampleZ - holePosition.z));
        if (distanceToTee < 9.03 || distanceToHole < 9.03) {
            continue;
        }

        // Prevent spawning on or overlapping the putting green (12.0 radius + 3.0 branch buffer)
        let distanceToGreenCenter = Math.sqrt((sampleX - greenEndpoint.x) * (sampleX - greenEndpoint.x) + (sampleZ - greenCenterZ) * (sampleZ - greenCenterZ)); // Modify this line: Swapped to greenEndpoint.x
        if (distanceToGreenCenter < 15.0) { // Keep this line
            continue; // Keep this line
        } // Keep this line

        // Prevent spawning inside sand traps (+1.0 unit buffer padding)
        let insideSandTrap = sandTraps.some(sandMesh => { // Add this line
            let dxS = sampleX - sandMesh.position.x; // Add this line
            let dzS = sampleZ - sandMesh.position.z; // Add this line
            // FIXED: Look up our live userData radius property, and add a +1.5 buffer cushion to clear foliage limbs
            let sandRadius = (sandMesh.userData && sandMesh.userData.radius ? sandMesh.userData.radius : 5) + 1.5; return Math.sqrt(dxS * dxS + dzS * dzS) < (sandRadius + 1.0); // Add this line
        }); // Add this line
        if (insideSandTrap) continue; // Add this line

        // Prevent spawning inside water hazards (+1.5 unit buffer padding)
        let insideWaterHazard = waterHazards.some(waterMesh => {
            let dxW = sampleX - waterMesh.position.x;
            let dzW = sampleZ - waterMesh.position.z;
            let waterRadius = waterMesh.userData.radius || 0;
            return Math.sqrt(dxW * dxW + dzW * dzW) < (waterRadius + 1.5);
        });
        if (insideWaterHazard) continue;

        // Evaluate Course Boundaries: Keep play-space obstacles securely grouped near the fairway lane
        let fairwayDistance = physics.getDistanceToSpline(sampleX, sampleZ);

        // Allow trees to extend much further out on the right side to climb the new hillside ridge
        let maxTreeDist = (currentHoleNumber === 2 && sampleX > 0) ? 55.0 : 35.0;
        let minTreeDist = (currentHoleNumber === 2 && sampleX > 0) ? (physics.fairwayWidth + 14.5) : (physics.fairwayWidth + 6.8); // Add this line: Shifts trees further right on Hole 2

        // FIXED: Expanded clearance cushion to clear the smooth transition grass and prevent branches from overlapping the fairway
        if (fairwayDistance <= minTreeDist || fairwayDistance > maxTreeDist) { // Modify this line: Changed clearance to use our new minTreeDist variable
            continue;
        }

        const sceneryGroup = new THREE.Group();
        const courseHeight = physics.getGroundHeight(sampleX, sampleZ);
        sceneryGroup.position.set(sampleX, courseHeight, sampleZ);

        let generateAsTree = currentHoleNumber === 2 ? (Math.random() < 0.95) : (Math.random() < 0.6); // Modify this line: 95% trees for Green Lakes look
        if (generateAsTree) {
            let randomScale = 3.5 + Math.random() * 1.3;
            let calculatedTrunkRad = 0.25 * randomScale;
            let calculatedTrunkH = 1.4 * randomScale;
            let calculatedFoliageRad = 1.1 * randomScale;

            /// Pick a completely random look layout: 0 = Wide Oak, 1 = Tall Fork, 2 = Wind Leaning
            let treeVersion = currentHoleNumber === 2 ? 3 : Math.floor(Math.random() * 3); // Modify this line: Force towering pine trees for Hole 2

            // Core trunk base used by all tree archetypes
            let trunkGeo = new THREE.CylinderGeometry(calculatedTrunkRad * 0.7, calculatedTrunkRad, calculatedTrunkH, 8);
            let trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
            trunkMesh.position.y = calculatedTrunkH / 2;
            sceneryGroup.add(trunkMesh);

            let finalizedFoliageRadius = calculatedFoliageRad * 0.9;
            let finalizedTotalHeight = calculatedTrunkH + (finalizedFoliageRadius * 1.4);

            // ==========================================
            // VERSION 0: CLASSIC WIDE OAK TREE (BALANCED CANOPY)
            // ==========================================
            if (treeVersion === 0) {
                // Left structural accent branch
                let branchGeoL = new THREE.CylinderGeometry(calculatedTrunkRad * 0.4, calculatedTrunkRad * 0.6, calculatedTrunkH * 0.5, 8);
                let branchL = new THREE.Mesh(branchGeoL, trunkMat);
                branchL.position.set(-finalizedFoliageRadius * 0.2, calculatedTrunkH * 0.8, 0);
                branchL.rotation.z = 0.6; // Angle out left
                sceneryGroup.add(branchL);

                // Right structural accent branch
                let branchGeoR = new THREE.CylinderGeometry(calculatedTrunkRad * 0.4, calculatedTrunkRad * 0.6, calculatedTrunkH * 0.5, 8);
                let branchR = new THREE.Mesh(branchGeoR, trunkMat);
                branchR.position.set(finalizedFoliageRadius * 0.2, calculatedTrunkH * 0.8, 0);
                branchR.rotation.z = -0.6; // Angle out right
                sceneryGroup.add(branchR);

                // Left twig extending deep into the left foliage puff
                let twigGeoL = new THREE.CylinderGeometry(calculatedTrunkRad * 0.15, calculatedTrunkRad * 0.3, finalizedFoliageRadius * 0.8, 8);
                let twigL = new THREE.Mesh(twigGeoL, trunkMat);
                twigL.position.set(-finalizedFoliageRadius * 0.4, calculatedTrunkH + finalizedFoliageRadius * 0.3, 0.1);
                twigL.rotation.z = 0.8;
                sceneryGroup.add(twigL);

                // Right twig extending deep into the right foliage puff
                let twigGeoR = new THREE.CylinderGeometry(calculatedTrunkRad * 0.15, calculatedTrunkRad * 0.3, finalizedFoliageRadius * 0.8, 8);
                let twigR = new THREE.Mesh(twigGeoR, trunkMat);
                twigR.position.set(finalizedFoliageRadius * 0.4, calculatedTrunkH + finalizedFoliageRadius * 0.3, 0.1);
                twigR.rotation.z = -0.8;
                sceneryGroup.add(twigR);

                // Overlapping full foliage puffs
                let positions = [
                    [0, calculatedTrunkH + finalizedFoliageRadius * 0.7, 0, 0.7],          // Center Crown
                    [-finalizedFoliageRadius * 0.5, calculatedTrunkH + finalizedFoliageRadius * 0.4, 0, 0.55], // Left Flank
                    [finalizedFoliageRadius * 0.5, calculatedTrunkH + finalizedFoliageRadius * 0.4, 0, 0.55],  // Right Flank
                    [0, calculatedTrunkH + finalizedFoliageRadius * 0.5, -finalizedFoliageRadius * 0.4, 0.45], // Rear
                    [0, calculatedTrunkH + finalizedFoliageRadius * 0.5, finalizedFoliageRadius * 0.4, 0.45]   // Foreground
                ];

                positions.forEach(p => {
                    let leafGeo = new THREE.SphereGeometry(finalizedFoliageRadius * p[3], 8, 8);
                    let leafMesh = new THREE.Mesh(leafGeo, foliageMat);
                    leafMesh.position.set(p[0], p[1], p[2]);
                    sceneryGroup.add(leafMesh);
                });
            }

            // ==========================================
            // VERSION 1: TALL FORK TREE (Y-SPLIT CANOPY)
            // ==========================================
            else if (treeVersion === 1) {
                // Left main split fork extension limb
                let forkGeoL = new THREE.CylinderGeometry(calculatedTrunkRad * 0.4, calculatedTrunkRad * 0.6, calculatedTrunkH * 0.7, 8);
                let forkL = new THREE.Mesh(forkGeoL, trunkMat);
                forkL.position.set(-calculatedFoliageRad * 0.25, calculatedTrunkH + calculatedTrunkH * 0.2, 0);
                forkL.rotation.z = 0.35;
                sceneryGroup.add(forkL);

                // Right main split fork extension limb
                let forkGeoR = new THREE.CylinderGeometry(calculatedTrunkRad * 0.4, calculatedTrunkRad * 0.6, calculatedTrunkH * 0.7, 8);
                let forkR = new THREE.Mesh(forkGeoR, trunkMat);
                forkR.position.set(calculatedFoliageRad * 0.25, calculatedTrunkH + calculatedTrunkH * 0.2, 0);
                forkR.rotation.z = -0.35;
                sceneryGroup.add(forkR);

                // Center fork branch sticking up through the middle canopy gap
                let forkCenterGeo = new THREE.CylinderGeometry(calculatedTrunkRad * 0.15, calculatedTrunkRad * 0.3, calculatedFoliageRad * 0.9, 8);
                let forkCenter = new THREE.Mesh(forkCenterGeo, trunkMat);
                forkCenter.position.set(0, calculatedTrunkH + calculatedTrunkH * 0.4, 0.1);
                forkCenter.rotation.x = 0.2; // Leans slightly forward to look natural
                sceneryGroup.add(forkCenter);

                // Twin high separated leaf cloud systems sitting on top of the fork limbs
                let positions = [
                    [-calculatedFoliageRad * 0.5, calculatedTrunkH + calculatedTrunkH * 0.5, 0, 0.6], // Left Crown
                    [calculatedFoliageRad * 0.5, calculatedTrunkH + calculatedTrunkH * 0.5, 0, 0.6],  // Right Crown
                    [0, calculatedTrunkH + calculatedTrunkH * 0.7, 0, 0.45]                           // Bridging puff
                ];

                positions.forEach(p => {
                    let leafGeo = new THREE.SphereGeometry(calculatedFoliageRad * p[3], 8, 8);
                    let leafMesh = new THREE.Mesh(leafGeo, foliageMat);
                    leafMesh.position.set(p[0], p[1], p[2]);
                    sceneryGroup.add(leafMesh);
                });

                finalizedFoliageRadius = calculatedFoliageRad * 1.1; // Expands check for wider fork
                finalizedTotalHeight = calculatedTrunkH + (calculatedTrunkH * 0.5) + (calculatedFoliageRad * 0.6); // Adjusts total elevation check
            }

            // ==========================================
            // VERSION 2: ASYMMETRIC BENT TREE (WINDSWEPT CANOPY)
            // ==========================================
            else if (treeVersion === 2) { // Change this line from "else {" to "else if (treeVersion === 2) {"
                // Massive horizontal crooked side limb reaching out far right
                let heavyLimbGeo = new THREE.CylinderGeometry(calculatedTrunkRad * 0.3, calculatedTrunkRad * 0.5, calculatedTrunkH * 0.8, 8);
                let heavyLimb = new THREE.Mesh(heavyLimbGeo, trunkMat);
                heavyLimb.position.set(calculatedFoliageRad * 0.4, calculatedTrunkH * 0.9, 0);
                heavyLimb.rotation.z = -1.1; // Heavy lean angle
                sceneryGroup.add(heavyLimb);

                // Offshoot twig reaching upwards into the main right foliage puff
                let leanTwigGeo = new THREE.CylinderGeometry(calculatedTrunkRad * 0.12, calculatedTrunkRad * 0.25, calculatedFoliageRad * 0.7, 8);
                let leanTwig = new THREE.Mesh(leanTwigGeo, trunkMat);
                leanTwig.position.set(calculatedFoliageRad * 0.6, calculatedTrunkH * 1.2, 0.1);
                leanTwig.rotation.z = -0.4; // Points straighter up into the leaves
                sceneryGroup.add(leanTwig);

                // Foliage cloud layout heavily prioritized over the stretching limb side
                let positions = [
                    [0, calculatedTrunkH + calculatedFoliageRad * 0.6, 0, 0.55],         // Center Top
                    [calculatedFoliageRad * 0.7, calculatedTrunkH + calculatedFoliageRad * 0.4, 0, 0.65], // Massive Right Flank Puff
                    [calculatedFoliageRad * 0.4, calculatedTrunkH + calculatedFoliageRad * 0.5, -calculatedFoliageRad * 0.3, 0.45],
                    [calculatedFoliageRad * 0.4, calculatedTrunkH + calculatedFoliageRad * 0.5, calculatedFoliageRad * 0.3, 0.45]
                ];

                positions.forEach(p => {
                    let leafGeo = new THREE.SphereGeometry(calculatedFoliageRad * p[3], 8, 8);
                    let leafMesh = new THREE.Mesh(leafGeo, foliageMat);
                    leafMesh.position.set(p[0], p[1], p[2]);
                    sceneryGroup.add(leafMesh);
                });

                finalizedFoliageRadius = calculatedFoliageRad * 1.2; // Wider footprint due to heavy leaning limb
            } else if (treeVersion === 3) { // Add this block 
                let pineLayers = [
                    { bottomH: calculatedTrunkH * 0.9, radius: calculatedFoliageRad * 1.1, height: calculatedFoliageRad * 1.3 },
                    { bottomH: calculatedTrunkH + calculatedFoliageRad * 0.6, radius: calculatedFoliageRad * 0.85, height: calculatedFoliageRad * 1.1 },
                    { bottomH: calculatedTrunkH + calculatedFoliageRad * 1.2, radius: calculatedFoliageRad * 0.6, height: calculatedFoliageRad * 0.9 }
                ];
                const evergreenMat = new THREE.MeshStandardMaterial({ color: 0x113318, roughness: 0.8 });
                pineLayers.forEach(layer => {
                    let coneGeo = new THREE.ConeGeometry(layer.radius, layer.height, 8);
                    let coneMesh = new THREE.Mesh(coneGeo, evergreenMat);
                    coneMesh.position.y = layer.bottomH + (layer.height / 2);
                    sceneryGroup.add(coneMesh);
                });
                finalizedFoliageRadius = calculatedFoliageRad * 1.1;
                finalizedTotalHeight = calculatedTrunkH + calculatedFoliageRad * 2.1;
            } // Add this block





            // Push the customized boundary data values down to the collision tracker matrix cleanly
            physics.obstacles.push({
                type: 'tree',
                x: sampleX,
                z: sampleZ,
                trunkRadius: calculatedTrunkRad,
                trunkHeight: calculatedTrunkH,
                foliageRadius: finalizedFoliageRadius,
                totalHeight: finalizedTotalHeight
            });

        } else {
            let randomBushRad = 0.7 + Math.random() * 1.2;
            let bushGeo = new THREE.SphereGeometry(randomBushRad, 8, 8);
            let customBushMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
            let bushMesh = new THREE.Mesh(bushGeo, customBushMat);
            bushMesh.position.y = randomBushRad * 0.2;
            sceneryGroup.add(bushMesh);

            physics.obstacles.push({
                type: 'bush',
                x: sampleX,
                z: sampleZ,
                radius: randomBushRad
            });
        }

        scene.add(sceneryGroup);
        sceneryObjects.push(sceneryGroup);
    }

    generateNewWind();
    updateDistanceDisplay();
}

function animate() {
    requestAnimationFrame(animate);
    if (input) input.isOverheadActive = isOverheadActive;

    // Calculate elapsed real-world delta time
    const currentTime = performance.now();
    let frameDelta = currentTime - lastTime;
    if (frameDelta > 100) frameDelta = 100; // Cap to prevent infinite evaluation spirals when alert modals freeze execution
    lastTime = currentTime;

    physicsAccumulator += frameDelta;

    // Step through physics at a fixed internal simulation speed
    while (physicsAccumulator >= FIXED_TIMESTEP) {
        if (physics && !isSinking) {
            physics.update();

            // Rotate the dimpled texture based on the ball's rolling speed and direction
            if (physics.isMoving) {
                const vx = physics.velocity.x;
                const vz = physics.velocity.z;
                const speed = Math.sqrt(vx * vx + vz * vz);

                if (speed > 0.0001) {
                    // FIXED: Generate a single true world-space axle vector perpendicular to current motion
                    const axle = new THREE.Vector3(vz, 0, -vx).normalize();
                    // Determine rotation angle proportional to distance traveled (speed / ball radius 0.25)
                    const angle = speed / 0.25;

                    // Rotate directly on the world-space axis to prevent wobbly Euler angle loops
                    ball.rotateOnWorldAxis(axle, angle);
                }
            }

            // --- NEW: INTERCEPT BUSH TRAP PENALTIES ---
            if (physics && physics.isStuckInBush) {
                physics.isStuckInBush = false;
                strokeCount++;
                document.getElementById('strokeText').innerText = strokeCount;

                setTimeout(() => {
                    alert("One stroke penalty! 🍃 Your ball got stuck in a bush.");

                    ball.position.x = physics.bushResetX;
                    ball.position.z = physics.bushResetZ;
                    ball.position.y = physics.getGroundHeight(ball.position.x, ball.position.z) + 0.25;
                    ball.visible = true;

                    const dirX = holePosition.x - ball.position.x;
                    const dirZ = holePosition.z - ball.position.z;
                    const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
                    const backX = -(dirX / length) * 7.5;
                    const backZ = -(dirZ / length) * 7.5;
                    cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ);
                    cameraLookAt.set(ball.position.x + (dirX / length) * 12.0, ball.position.y, ball.position.z + (dirZ / length) * 12.0);

                    updateDistanceDisplay();
                }, 30);
            }
        }
        physicsAccumulator -= FIXED_TIMESTEP;
    }

    // FIXED: Re-added your Out of Bounds course boundary tracking check
    if (Math.abs(ball.position.x) > 120 || ball.position.z < holePosition.z - 40) {
        alert(`Out of Bounds! Ball flew off the course.`);
        resetEntireGame(false);
        return;
    }

    // FIXED: Re-added your Water Hazard tracker check
    if (physics && physics.hitWater) {
        physics.hitWater = false;
        strokeCount++; // Add this line: Assess the 1-stroke penalty
        document.getElementById('strokeText').innerText = strokeCount; // Add this line: Update the UI text display

        setTimeout(() => { // Add this line
            alert(`Water Hazard! 🌊 One stroke penalty. Dropping back where you last hit.`); // Modify this line

            // Reset ball position directly to where this shot was struck from
            ball.position.x = window.shotStartX !== undefined ? window.shotStartX : 0; // Add this line
            ball.position.z = window.shotStartZ !== undefined ? window.shotStartZ : 10; // Add this line
            ball.position.y = physics.getGroundHeight(ball.position.x, ball.position.z) + 0.25; // Add this line
            ball.visible = true; // Add this line

            // Re-align the camera safely behind the ball looking toward the hole cup
            const dirX = holePosition.x - ball.position.x; // Add this line
            const dirZ = holePosition.z - ball.position.z; // Add this line
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1; // Add this line
            const backX = -(dirX / length) * 7.5; // Add this line
            const backZ = -(dirZ / length) * 7.5; // Add this line
            cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ); // Add this line
            cameraLookAt.set(ball.position.x + (dirX / length) * 12.0, ball.position.y, ball.position.z + (dirZ / length) * 12.0); // Add this line

            updateDistanceDisplay(); // Add this line
        }, 30); // Add this line
        return;
    }

    // 2. CONTINUOUS HOLE COLLISION & SMOOTH SINKING ANIMATION
    if (!isSinking) {
        const dx = ball.position.x - holePosition.x;
        const dz = ball.position.z - holePosition.z;
        const distanceToHole = Math.sqrt(dx * dx + dz * dz);

        // NEW: Dynamically expand capture radius if the ball comes to rest or rolls slowly, preventing it from balancing on the lip
        const dynamicCaptureRadius = (!physics.isMoving || physics.velocity.length() < 0.05) ? 0.32 : 0.22;

        // FIXED: Added a +0.15 vertical tolerance cushion to ensure the ball triggers capture 
        // even with minor floating-point variations or light bounces on the 3D mound
        if (distanceToHole < dynamicCaptureRadius && ball.position.y <= (0.25 + physics.getGroundHeight(ball.position.x, ball.position.z) + 0.15)) {
            const rawSpeed = physics.velocity.length();

            // Calculate true world speed translation based on internal engine time scaling profiles
            const currentScale = (physics && physics.isPutting) ? 0.70 : 1.0;
            const trueWorldSpeed = rawSpeed * currentScale;

            // A uniform physical threshold standard (0.24) applied equally to both chips and putts
            const maxWorldSinkSpeed = 0.24;

            // Realism Lip-out simulation based on true physical ground speed limits
            if (trueWorldSpeed > maxWorldSinkSpeed) {
                if (trueWorldSpeed > 0.48) return; // Add this line: Smashed putts roll straight over the cup

                const perpX = -dz / distanceToHole;
                const perpZ = dx / distanceToHole;

                // Centripetal sling wraps the ball around the lip edge based on velocity
                const slingX = (physics.velocity.x * 0.4) + (perpX * rawSpeed * 0.6); // Add this line
                const slingZ = (physics.velocity.z * 0.4) + (perpZ * rawSpeed * 0.6); // Add this line
                const slingLen = Math.sqrt(slingX * slingX + slingZ * slingZ) || 1; // Add this line

                physics.velocity.x = (slingX / slingLen) * rawSpeed; // Modify this line: Maintains full ball speed
                physics.velocity.z = (slingZ / slingLen) * rawSpeed; // Modify this line: Maintains full ball speed
                return;
            }
            isSinking = true;
            physics.velocity.set(0, 0, 0);
            physics.isMoving = false;
            wasMoving = false;

            ball.position.x = holePosition.x;
            ball.position.z = holePosition.z;
        }
    }

    if (isSinking) {
        // Linearly drop the ball downward beneath the flat ground plane layout
        ball.position.y -= 0.015;

        // Once it drops safely inside the hole depth out of sight (Y <= -0.15)
        if (ball.position.y <= -0.15 && ball.position.y > -900) {
            ball.position.y = -999;
            if (sounds) sounds.play('sink');

            // NEW: Calculate the descriptive contextual score terminology card
            const scoreDifferential = strokeCount - currentPar;
            let standardTermCelebration = `Finished in ${strokeCount} strokes.`;

            if (strokeCount === 1) {
                standardTermCelebration = `HOLE-IN-ONE! 👑 Absolute legendary shot!`;
            } else if (scoreDifferential === -2) {
                standardTermCelebration = `EAGLE! 🦅 Incredible performance!`;
            } else if (scoreDifferential === -1) {
                standardTermCelebration = `BIRDIE! 🐤 Under par! Brilliant job!`;
            } else if (scoreDifferential === 0) {
                standardTermCelebration = `PAR! 🎯 Even score, perfectly executed!`;
            } else if (scoreDifferential === 1) {
                standardTermCelebration = `Bogey. 🪵 Just over par. You'll get it next time!`;
            } else if (scoreDifferential >= 2) {
                standardTermCelebration = `Double Bogey (+${scoreDifferential}). ❌ Shrug it off!`;
            }

            // Give the browser 30ms to fully render the final subterranean frame before alerting
            setTimeout(() => {
                alert(`Sunk it! 🎉 ${standardTermCelebration}`);
                resetEntireGame(true); // Advance layout tracking systems to the next hole number configuration
            }, 30);
            return;
        }
    }

    // 3. DYNAMIC CAMERA CONTROLLER


    // 3. DYNAMIC CAMERA CONTROLLER



    if (physics.isMoving) {
        if (!wasMoving) {
            wasMoving = true;
            shotStartTime = performance.now(); // Record launch timestamp

            // Add these two lines: Records where this specific shot was struck from
            window.shotStartX = ball.position.x;
            window.shotStartZ = ball.position.z;

            // Calculate initial distance to the hole pin in true game yards
            const dxHole = ball.position.x - holePosition.x;
            const dzHole = ball.position.z - holePosition.z;
            const initialYards = Math.sqrt(dxHole * dxHole + dzHole * dzHole) * 2.76923;

            // Modify this line: Raised from 30 to 90 so intermediate approach shots stay stationary
            isLongShot = initialYards > 90;

            window.cameraDelayTime = initialYards > 100 ? 2000 : 300;

            // NEW: Capture exact visual scale baseline at moment of launch to prevent sudden size pops
            const screenAspectRatio = window.innerWidth / window.innerHeight;
            const isCurrentMobile = window.innerWidth <= 768 || screenAspectRatio < 1;
            const launchGreenX = ball.position.x - (green ? green.position.x : 0);
            const launchGreenZ = ball.position.z - greenCenterZ;
            const launchedFromGreenSurface = Math.sqrt(launchGreenX * launchGreenX + launchGreenZ * launchGreenZ) < GREEN_RADIUS;

            if (teeBox && teeBox.visible) {
                window.shotStartScale = isCurrentMobile ? 0.9 : 1.0;
            } else if (launchedFromGreenSurface) {
                window.shotStartScale = 0.30;
            } else {
                window.shotStartScale = isCurrentMobile ? 0.75 : 0.70;
            }
        }
        updateDistanceDisplay();

        tracerPoints.push(ball.position.clone());
        if (ballTracer) ballTracer.geometry.setFromPoints(tracerPoints);
        ballTracer.geometry.computeBoundingSphere();

        // --- REPLACE THE Y-AXIS SHRINKING WITH THIS DISTANCE-BASED BLOCK ---
        // Unified seamless transition: base scale calculation on active shot origin size
        const startX = window.shotStartX !== undefined ? window.shotStartX : 0;
        const startZ = window.shotStartZ !== undefined ? window.shotStartZ : 10;
        const dx = ball.position.x - startX;
        const dz = ball.position.z - startZ;
        const distanceTraveled = Math.sqrt(dx * dx + dz * dz);

        const currentActiveClub = input ? input.getClubInfo() : null;
        const isPuttingStroke = currentActiveClub && currentActiveClub.name === 'Putter';
        const activeLaunchScale = window.shotStartScale !== undefined ? window.shotStartScale : 0.70;

        if (isPuttingStroke || activeLaunchScale === 0.30) {
            ballTargetScale = 0.30; // Keep putts and green side rolling completely stable
        } else {
            // Scale down smoothly from the true starting lie scale instead of inflating to 1.0
            ballTargetScale = Math.max(0.30, activeLaunchScale - (distanceTraveled * 0.0035));
        }
        if (isLongShot) {
            if ((performance.now() - shotStartTime > (window.cameraDelayTime || 2000)) && !isOverheadActive) {
                const dirX = holePosition.x - ball.position.x;
                const dirZ = holePosition.z - ball.position.z;
                const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

                // Target coordinates 5.5 units horizontally behind the ball's moving flight path
                const backX = -(dirX / length) * 5.5;
                const backZ = -(dirZ / length) * 5.5;

                // Smoothly tracks target positioning vectors forward through 3D space
                cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ);
                cameraLookAt.set(ball.position.x + (dirX / length) * 12.0, ball.position.y, ball.position.z + (dirZ / length) * 12.0);
            }
        } else if (!isOverheadActive) {
            // NEW: Continuous short-shot follow camera tracking out in the open field
            const activeClub = input ? input.getClubInfo() : null;
            if (activeClub === null || activeClub.name !== 'Putter') {
                const dirX = holePosition.x - ball.position.x;
                const dirZ = holePosition.z - ball.position.z;
                const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

                // Back away 8.2 units and elevate 3.5 units to open up the view and keep ball size beautifully proportional
                const shortCamDist = 8.2;
                const shortCamHeight = 3.5;

                cameraTargetPos.set(
                    ball.position.x - (dirX / length) * shortCamDist,
                    ball.position.y + shortCamHeight,
                    ball.position.z - (dirZ / length) * shortCamDist
                );
                cameraLookAt.set(
                    ball.position.x + (dirX / length) * 6.0,
                    ball.position.y - 0.10,
                    ball.position.z + (dirZ / length) * 6.0
                );
            }
        }
    } else {
        if (wasMoving) {
            wasMoving = false;
            tracerPoints = []; // Add this line: Empties the line point rendering path history array
            if (ballTracer) ballTracer.geometry.setFromPoints([]); // Add this line: Erases the path geometry line visually from screen
            updateDistanceDisplay();
        }

        const activeR = window.activeGreenRadius || GREEN_RADIUS; // Add this line
        const onGreen = Math.sqrt((ball.position.x - (green ? green.position.x : 0)) * (ball.position.x - (green ? green.position.x : 0)) + (ball.position.z - greenCenterZ) * (ball.position.z - greenCenterZ)) < activeR; // Modify this line

        // Detect if screen width is mobile or portrait orientation at top of block
        // Detect if screen width is mobile or portrait orientation at top of block
        const isMobile = window.innerWidth <= 768 || window.innerWidth / window.innerHeight < 1;

        if (teeBox && teeBox.visible) {
            // NEW: Separate mobile and desktop sizing for the Tee
            ballTargetScale = isMobile ? 0.9 : 1.0; // Change first number for mobile, second for desktop
        } else if (onGreen) {
            ballTargetScale = 0.30;  // Change this number to adjust size when Putting
        } else {
            ballTargetScale = isMobile ? 0.75 : 0.70; // Fairway, rough, and sand size
        }

        const camDist = onGreen ? 2.5 : 7.5;
        const camHeight = onGreen ? 1.0 : 2.2;
        const lookDist = onGreen ? 6.0 : 15.0;
        if (!isOverheadActive) {
            let baseTargetX = holePosition.x;
            let baseTargetZ = holePosition.z;
            if (teeBox && teeBox.visible && currentHoleConfig) { // Modify this line
                const firstLeg = currentHoleConfig.waypoints[1]; // Modify this line
                if (firstLeg) { baseTargetX = firstLeg.x; baseTargetZ = firstLeg.z; }
            }
            const dX = baseTargetX - ball.position.x;
            const dZ = baseTargetZ - ball.position.z;
            let angle = Math.atan2(dX, dZ);
            if (input && input.aimAngleOffset) angle += input.aimAngleOffset; // Adjusts camera base angle by dragging offset

            const aimDirX = Math.sin(angle);
            const aimDirZ = Math.cos(angle);
            cameraTargetPos.set(ball.position.x - aimDirX * camDist, ball.position.y + camHeight, ball.position.z - aimDirZ * camDist);
            cameraLookAt.set(ball.position.x + aimDirX * lookDist, ball.position.y + (onGreen ? 0.35 : 0.0), ball.position.z + aimDirZ * lookDist);
        }
    }


    // <-- This brace closes the entire "ball is not moving" section

    const ballGreenX = ball.position.x - (green ? green.position.x : 0);
    const ballGreenZ = ball.position.z - greenCenterZ;

    // NEW: Ensure green surface state only activates when the ball is low to the ground or has landed
    const isBallInGreenCircle = Math.sqrt(ballGreenX * ballGreenX + ballGreenZ * ballGreenZ) < GREEN_RADIUS;
    const isCamOnGreen = isBallInGreenCircle && (ball.position.y <= physics.getGroundHeight(ball.position.x, ball.position.z) + 0.5);

    // 1. DEFAULT SPEED: Keep it crisp at 0.05 for normal address tracking, short shots, and hole resets
    let activeCameraSpeed = isCamOnGreen ? 0.05 : 0.05;

    // 2. ISOLATED CHASE SPEED: Only slow the camera to 0.01 if a long shot is actively airborne and past its 2-second wait window
    if (physics.isMoving && isLongShot && (performance.now() - shotStartTime > 2000) && !isOverheadActive) {
        activeCameraSpeed = 0.005;
    }



    // Hole preview path fly-through logic
    if (isOverheadActive) {
        previewProgress += 0.002;
        if (previewProgress > 1) previewProgress = 1;

        // Calculate the base alignment heading vector matching the player's current aim
        let baseTargetX = holePosition.x;
        let baseTargetZ = holePosition.z;
        if (teeBox && teeBox.visible && currentHoleConfig) {
            const firstLeg = currentHoleConfig.waypoints[1];
            if (firstLeg) { baseTargetX = firstLeg.x; baseTargetZ = firstLeg.z; }
        }
        const dX = baseTargetX - ball.position.x;
        const dZ = baseTargetZ - ball.position.z;
        let angle = Math.atan2(dX, dZ);
        if (input && input.aimAngleOffset) angle += input.aimAngleOffset;

        const aimDirX = Math.sin(angle);
        const aimDirZ = Math.cos(angle);

        // CHANGED: Query your active club details to cap the flight trajectory right at the yellow target circle range
        const club = input ? input.getClubInfo() : null;
        const ringDist = (club && !club.isGreen) ? (club.maxYards / 2.76923) : Math.sqrt(dX * dX + dZ * dZ);

        // Projected target point straight down the custom aim line capped at your club ring distance
        const targetX = ball.position.x + aimDirX * ringDist;
        const targetZ = ball.position.z + aimDirZ * ringDist;

        // Stage 1: Starting positions pulled back to 14 units behind the ball so you can see the aim point clearly
        const startCamX = ball.position.x - aimDirX * 14.0;
        const startCamZ = ball.position.z - aimDirZ * 14.0;
        const startCamY = physics.getGroundHeight(ball.position.x, ball.position.z) + 6.5;

        // Stage 2: Middle point at your custom landing zone/elbow
        const midCamX = targetX - aimDirX * 12.0; // Modify this line: Changed from 5.0 to 12.0
        const midCamZ = targetZ - aimDirZ * 12.0; // Modify this line: Changed from 5.0 to 12.0
        const midCamY = physics.getGroundHeight(targetX, targetZ) + 11.0;

        // Stage 3: Final destination safely overlooking the actual green hole cup
        const holeDirX = holePosition.x - targetX;
        const holeDirZ = holePosition.z - targetZ;
        const holeLen = Math.sqrt(holeDirX * holeDirX + holeDirZ * holeDirZ) || 1;
        const endCamX = holePosition.x - (holeDirX / holeLen) * 12.0; // Modify this line: Changed from 5.0 to 12.0
        const endCamZ = holePosition.z - (holeDirZ / holeLen) * 12.0; // Modify this line: Changed from 5.0 to 12.0
        const endCamY = physics.getGroundHeight(holePosition.x, holePosition.z) + 11.0;

        let currentX, currentZ, currentY;
        let currentLookX, currentLookZ, currentLookY; // Modify this line
        const targetGroundY = physics.getGroundHeight(targetX, targetZ); // Add this line
        const holeGroundY = physics.getGroundHeight(holePosition.x, holePosition.z);

        if (previewProgress < 0.5) {
            // PART 1: Fly from Tee Box to your custom Aim Point
            const t = previewProgress * 2; // Scales local segment progress from 0 to 1
            currentX = THREE.MathUtils.lerp(startCamX, midCamX, t);
            currentZ = THREE.MathUtils.lerp(startCamZ, midCamZ, t);

            const heightArc = Math.sin(t * Math.PI) * 4.0;
            currentY = THREE.MathUtils.lerp(startCamY, midCamY, t) + heightArc;

            // CHANGED: Keeps the camera lens locked down facing directly toward the aim circle marker on the ground
            currentLookX = targetX;
            currentLookZ = targetZ;
            currentLookY = targetGroundY + 2.0; // Add this line
        } else {
            // PART 2: Fly from your custom Aim Point around the corner directly to the Green
            const t = (previewProgress - 0.5) * 2; // Scales local segment progress from 0 to 1
            currentX = THREE.MathUtils.lerp(midCamX, endCamX, t);
            currentZ = THREE.MathUtils.lerp(midCamZ, endCamZ, t);

            const heightArc = Math.sin(t * Math.PI) * 4.0;
            currentY = THREE.MathUtils.lerp(midCamY, endCamY, t) + heightArc;

            // CHANGED: Locks the lens focus straight on the hole pin immediately upon turning the corner
            currentLookX = holePosition.x; // Modify this line: Lock directly to the hole
            currentLookZ = holePosition.z; // Modify this line: Lock directly to the hole
            currentLookY = holeGroundY + 2.0; // Modify this line: Lock directly to the hole height
        }

        const lookGroundY = physics.getGroundHeight(currentLookX, currentLookZ);
        const localGroundY = physics.getGroundHeight(currentX, currentZ); // Restored this line: Safe height calculations on every tick

        cameraTargetPos.set(currentX, Math.max(localGroundY + 3.0, currentY), currentZ);
        cameraLookAt.set(currentLookX, currentLookY, currentLookZ); // Modify this line
        activeCameraSpeed = 0.08;

        // Automatically snap back behind the ball once the full camera flight completes
        if (previewProgress >= 1) {
            isOverheadActive = false;
            const onGreen = Math.sqrt(ball.position.x * ball.position.x + (ball.position.z - greenCenterZ) * (ball.position.z - greenCenterZ)) < GREEN_RADIUS;
            const camDist = onGreen ? 2.5 : 5.5;
            const camHeight = onGreen ? 1.0 : 1.8;
            const lookDist = onGreen ? 6.0 : 12.0;

            cameraTargetPos.set(ball.position.x - aimDirX * camDist, ball.position.y + camHeight, ball.position.z - aimDirZ * camDist);
            cameraLookAt.set(ball.position.x + aimDirX * lookDist, ball.position.y + (onGreen ? 0.35 : 0.0), ball.position.z + aimDirZ * lookDist);
            activeCameraSpeed = 0.02;
        }

    }

    // --- QUICK PUTTING VIEW CAMERA INTERCEPTOR ---
    const checkX = ball.position.x - (green ? green.position.x : 0);
    const checkZ = ball.position.z - greenCenterZ;
    const activeR = window.activeGreenRadius || GREEN_RADIUS; // Add this line

    if (Math.sqrt(checkX * checkX + checkZ * checkZ) < activeR && !isOverheadActive) { // Modify this line
        // Add these two lines: Base tracking angles on the stable shot origin while the ball is in motion
        const refX = physics.isMoving ? (window.shotStartX !== undefined ? window.shotStartX : ball.position.x) : ball.position.x;
        const refZ = physics.isMoving ? (window.shotStartZ !== undefined ? window.shotStartZ : ball.position.z) : ball.position.z;

        // Modify these two lines: Use the new stable references instead of the raw moving ball positions
        const dX = holePosition.x - refX;
        const dZ = holePosition.z - refZ;

        let angle = Math.atan2(dX, dZ);
        if (input && input.aimAngleOffset) angle += input.aimAngleOffset;
        const dirX = Math.sin(angle);
        const dirZ = Math.cos(angle);

        // Dynamic Profile Matrix to automatically adapt when switching between mobile portrait and desktop monitors
        const aspect = window.innerWidth / window.innerHeight;
        let targetFov, rigidCamDist, rigidCamHeight, lookUpOffset;

        if (aspect < 1) {
            targetFov = 65;
            rigidCamDist = 2.2;
            rigidCamHeight = 1.1;
            lookUpOffset = -0.40;
        } else {
            targetFov = 40;
            rigidCamDist = 3.5;
            rigidCamHeight = 1.2;
            lookUpOffset = -0.40;
        }

        // Add this block: Overrides the zoom values to be much wider/higher if the shot is still moving
        if (physics.isMoving) { // Modify this line: Removed !physics.isPutting to allow putting camera tracking overrides
            if (physics.isPutting) {
                // Add this block: A specialized cinematic viewpoint for rolling putts to observe green breaks
                targetFov = aspect < 1 ? 65 : 45;
                rigidCamDist = 4.8;               // Backs away slightly to open up the visual field
                rigidCamHeight = 2.0;             // Elevates the lens angle to look down the breaking line
                lookUpOffset = -0.25;
            } else {
                targetFov = aspect < 1 ? 72 : 65; // Normal wider field of view for chips/full shots
                rigidCamDist = 8.0;               // Pulls camera 8 units back instead of 3.5
                rigidCamHeight = 3.5;             // Elevates camera 3.5 units up to see the green context
                lookUpOffset = -0.10;             // Centers the look-at target nicely
            }
        }

        if (camera.fov !== targetFov) {
            camera.fov = targetFov;
            camera.updateProjectionMatrix();
        }

        const lookAheadDist = 6.0;

        cameraTargetPos.set(
            ball.position.x - dirX * rigidCamDist,
            ball.position.y + rigidCamHeight,
            ball.position.z - dirZ * rigidCamDist
        );

        cameraLookAt.set(
            ball.position.x + dirX * lookAheadDist,
            ball.position.y + lookUpOffset,
            ball.position.z + dirZ * lookAheadDist
        );

        // FIXED: Dropped from a rigid 1.0 to a smooth fluid interpolation tracking system. 
        // Set to 0.04 when moving so the ball can roll away from the camera naturally down the line.
        // Set to 0.08 when stationary so the camera glides gracefully into position at address.
        activeCameraSpeed = physics.isMoving ? 0.04 : 0.08;
    } else {
        // Restore standard non-putting field of view dynamically
        const defaultFov = window.innerWidth / window.innerHeight < 1 ? 72 : 65;
        if (camera.fov !== defaultFov) {
            camera.fov = defaultFov;
            camera.updateProjectionMatrix();
        }
    }


    if (isCamOnGreen && !isSinking) {
        updateGreenGrid();
    }

    camera.position.lerp(cameraTargetPos, activeCameraSpeed); // Existing line below your new addition
    currentLookAt.lerp(cameraLookAt, activeCameraSpeed);
    camera.lookAt(currentLookAt);

    // NEW: Counteract the camera zoom scale on the green so the ball doesn't look giant
    let finalBallTargetScale = ballTargetScale;
    if (isCamOnGreen) {
        // 1.0 keeps the ball size perfectly constant whether it is rolling or sitting completely still
        finalBallTargetScale *= 0.85;
    }

    // FIXED: Dynamically scale down the ball smoothly if the camera transitions closer, preventing ballooning
    const cameraDistanceToBall = camera.position.distanceTo(ball.position);
    if (cameraDistanceToBall < 9.5 && !isCamOnGreen) {
        // Clamp the proximity modifier to keep visual scale completely stable during close-up chips and approaches
        const proximityFactor = THREE.MathUtils.clamp(cameraDistanceToBall / 9.5, 0.55, 1.0);
        finalBallTargetScale *= proximityFactor;
    }

    // CHANGED: Uses finalBallTargetScale instead of ballTargetScale
    const currentScale = THREE.MathUtils.lerp(ball.scale.x, finalBallTargetScale, 0.05);
    ball.scale.set(currentScale, currentScale, currentScale);

    // --- DYNAMIC CLUB STANCE STATE MACHINE ---
    const clubSwipeElement = document.getElementById('clubSwipe');
    if (clubSwipeElement && input) {
        // Only modify stance classes if the forward swing animation isn't currently playing
        if (!clubSwipeElement.classList.contains('swipe-animation')) {
            if (!physics.isMoving && !isSinking && !isOverheadActive) {
                const activeClub = input.getClubInfo();

                // Establish base club layout shapes
                let clubTypeClass = 'iron';
                if (activeClub.name === 'Putter') {
                    clubTypeClass = 'putter';
                } else if (activeClub.name === 'Driver' || activeClub.name.includes('Wood') || activeClub.name === 'Hybrid') {
                    clubTypeClass = 'wood';
                }

                // Calibrated baseline position mapping perfectly to our 35-degree vertical camera projection
                const cX = ball.position.x - (green ? green.position.x : 0); // Add this line
                const cZ = ball.position.z - greenCenterZ; // Add this line
                const activeRadiusOffset = window.activeGreenRadius || GREEN_RADIUS; // Add this line
                const ballOnGreen = Math.sqrt(cX * cX + cZ * cZ) < activeRadiusOffset; // Add this line
                const putterBaseBottom = ballOnGreen ? 21.8 : 25.8; // Modify this line

                const putterCenteredLeft = 'calc(50% - 77.5px)';
                const aimClass = input.isAimMode ? ' aim-mode' : '';

                if (input.state === 'IDLE') {
                    clubSwipeElement.className = `idle-stance ${clubTypeClass}${aimClass}`; // Modify this line: Appended ${aimClass} to fix the idle mode visibility
                    // Clean out dynamic inline properties when resting at address
                    clubSwipeElement.style.bottom = activeClub.name === 'Putter' ? `${putterBaseBottom}%` : '';
                    // Clean out dynamic inline properties when resting at address
                    clubSwipeElement.style.bottom = activeClub.name === 'Putter' ? `${putterBaseBottom}%` : '';
                    clubSwipeElement.style.left = activeClub.name === 'Putter' ? putterCenteredLeft : '';
                    clubSwipeElement.style.transform = '';
                } else if (input.state === 'PULLBACK') {
                    clubSwipeElement.className = `pullback-stance ${clubTypeClass}${aimClass}`;

                    if (activeClub.name === 'Putter') {
                        // NEW: Dynamically map the club's position directly to the real-time drag ratio
                        const ratio = input.pullRatio || 0;
                        const currentBottom = putterBaseBottom - (6.0 * ratio);
                        const currentLeft = putterCenteredLeft;
                        const currentRotate = 0;

                        clubSwipeElement.style.setProperty('bottom', `${currentBottom}%`, 'important');
                        clubSwipeElement.style.setProperty('left', currentLeft, 'important');
                        clubSwipeElement.style.setProperty('transform', `rotate(${currentRotate}deg) scale(1.4)`, 'important');
                    } else {
                        // Clean defaults for woods/irons if pulled back
                        clubSwipeElement.style.bottom = '';
                        clubSwipeElement.style.left = '';
                        clubSwipeElement.style.transform = '';
                    }
                } // Keep this line

            } else {
                // Clear all classes to hide the club entirely when the ball is in motion
                clubSwipeElement.className = '';
            }
        }
    }

    if (waterHazards && waterHazards.length > 0) {
        const time = performance.now() * 0.0025; // Controls the general speed of the current flow
        waterHazards.forEach(mesh => {
            const posAttr = mesh.geometry.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const u = posAttr.getX(i);
                const v = posAttr.getY(i);

                // Calculate distance from lake center to flatten waves near the shore boundary
                const distFromCenter = Math.sqrt(u * u + v * v); // Add this line
                const lakeRadius = mesh.userData.radius || 5; // Add this line
                // Smoothly fade waves down over the outer 1.5 units of the lake profile
                const waveFade = Math.max(0, Math.min(1, (lakeRadius - distFromCenter) / 1.5)); // Add this line

                // Update this entire block: Combines horizontal, vertical, and diagonal cross-waves
                const wave1 = Math.sin(u * 1.1 + time * 1.5) * 0.025;
                const wave2 = Math.cos(v * 1.1 + time * 1.9) * 0.02;
                const wave3 = Math.sin((u + v) * 0.8 + time * 2.3) * 0.015;

                // Dampen the waves and smoothly transition base level flush with the 0.07 shore height rim
                const waveHeight = ((wave1 + wave2 + wave3) * waveFade) + 0.01 + (0.06 * waveFade); // Modify this line

                posAttr.setZ(i, waveHeight);
            }
            posAttr.needsUpdate = true; // Forces the GPU to reload the fresh wave coordinates
            mesh.geometry.computeVertexNormals(); // Recalculates lighting highlights so reflections move with waves
        });
    }

    // Update Club Landing Ring visibility and positions dynamically in Overhead mode
    if (clubLandingRing) { // Add this line
        if ((isOverheadActive || (input && input.isAimMode)) && physics && !physics.isMoving && !isSinking) { // Modify this line: Added || (input && input.isAimMode) to show the ring during ground aiming
            const club = input ? input.getClubInfo() : null; // Add this line
            if (club && !club.isGreen) { // Add this line
                const ringDist = club.maxYards / 2.76923;

                // Modify these lines: Calculates active aim angle to swing the yellow ring left or right
                let baseTargetX = holePosition.x;
                let baseTargetZ = holePosition.z;
                if (teeBox && teeBox.visible && currentHoleConfig) {
                    const firstLeg = currentHoleConfig.waypoints[1];
                    if (firstLeg) { baseTargetX = firstLeg.x; baseTargetZ = firstLeg.z; }
                }
                const dX = baseTargetX - ball.position.x;
                const dZ = baseTargetZ - ball.position.z;
                let angle = Math.atan2(dX, dZ);
                if (input && input.aimAngleOffset) angle += input.aimAngleOffset;

                const normX = Math.sin(angle); // Modify this line
                const normZ = Math.cos(angle); // Modify this line
                const ringX = ball.position.x + normX * ringDist;
                const ringZ = ball.position.z + normZ * ringDist;

                let baseGroundY = physics.getGroundHeight(ringX, ringZ);

                // Prevent the ring from sinking into water hazard trenches
                if (physics.waterHazards) { // Add this line
                    physics.waterHazards.forEach(water => { // Add this line
                        const dxW = ringX - water.position.x; // Add this line
                        const dzW = ringZ - water.position.z; // Add this line
                        const distToWater = Math.sqrt(dxW * dxW + dzW * dzW); // Add this line
                        const lakeRadius = water.userData && water.userData.radius ? water.userData.radius : 5; // Add this line
                        if (distToWater < lakeRadius + 0.6) { // Add this line
                            baseGroundY = Math.max(baseGroundY, water.position.y); // Add this line
                        } // Add this line
                    }); // Add this line
                } // Add this line

                const ringY = baseGroundY + 0.25; // Change this line
                clubLandingRing.position.set(ringX, ringY, ringZ);
                clubLandingRing.visible = true; // Add this line
                clubLandingBeacon.position.set(ringX, ringY + 75, ringZ); // Add this line
                clubLandingBeacon.visible = true;
            } else { // Add this line
                clubLandingRing.visible = false; // Add this line
                clubLandingBeacon.visible = false;
            } // Add this line
        } else { // Add this line
            clubLandingRing.visible = false; // Add this line
            clubLandingBeacon.visible = false;
        } // Add this line
    } // Add this line

    // Animate the red flag rippling dynamically with wind speed
    if (flag && flag.geometry.attributes.position) { // Add this line
        const flagTime = performance.now() * 0.004; // Add this line
        const flagPos = flag.geometry.attributes.position; // Add this line
        for (let i = 0; i < flagPos.count; i++) { // Add this line
            const u = flagPos.getX(i); // Add this line
            const anchorWeight = (u + 0.4) / 0.8; // Add this line: 0 at left edge (pinned to pole), 1 at right flapping edge
            // Speed and wave amplitude increase exponentially based on currentWindSpeed values
            const wave = Math.sin(u * 8.0 - flagTime * (2.0 + currentWindSpeed * 0.4)) * 0.04 * (0.15 + currentWindSpeed * 0.08) * anchorWeight; // Add this line
            flagPos.setZ(i, wave); // Add this line
        } // Add this line
        flagPos.needsUpdate = true; // Add this line
        flag.geometry.computeVertexNormals(); // Add this line: Recalculates lighting highlights over the ripples
    } // Add this line

    // --- NEW: ANIMATE AND UPDATE SAND SPRAY PARTICLES ---
    for (let i = sandParticles.length - 1; i >= 0; i--) {
        const p = sandParticles[i];

        // 1. Advance position over its horizontal and vertical velocity vectors
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;

        // 2. Apply gravity deceleration to create a beautiful ballistic arc curve
        p.vy -= 0.005;

        // 3. Degrade particle life index over time
        p.life -= p.decay;

        // 4. Smoothly fade the particle out before it disappears
        if (p.mesh.material) {
            p.mesh.material.opacity = Math.max(0, p.life);
        }

        // 5. Memory Cleanup: Wipe out expired particle arrays from the active 3D scene
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
            sandParticles.splice(i, 1);
        }
    }

    updateWindArrowDisplay();

    renderer.render(scene, camera);
}

function init() {
    // 1. Create the 3D World Scene
    scene = new THREE.Scene();

    // 2. Setup Camera View
    const currentAspect = window.innerWidth / window.innerHeight; // Add this line
    const startingFov = currentAspect < 1 ? 72 : 65; // Add this line: 72 for tall mobile screens, 65 for wide desktop screens
    camera = new THREE.PerspectiveCamera(startingFov, currentAspect, 0.1, 1000); // Change this line
    camera.position.set(0, 2, 14);
    camera.lookAt(0, 0, -50);

    // 3. Setup WebGL Canvas Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. Create Lighting
    const light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(12, 8, 15).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x666666));

    // 5. Add Virtual Golf Green Floor
    const floorGeo = new THREE.PlaneGeometry(300, 800, 300, 800);

    // Procedural rough grass noise texture generator
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 64; rCanvas.height = 64;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#c5c5c5'; rCtx.fillRect(0, 0, 64, 64); // Base neutral gray (Add this line)
    for (let i = 0; i < 500; i++) { // Paints 500 micro grass shadows/highlights per tile (Add this line)
        rCtx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#909090'; // Modify this line
        rCtx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 3); // Fine vertical blade specks (Add this line)
    }
    const roughTexture = new THREE.CanvasTexture(rCanvas);
    roughTexture.wrapS = THREE.RepeatWrapping;
    roughTexture.wrapT = THREE.RepeatWrapping;
    roughTexture.repeat.set(90, 600);

    // Modify this line to add the emissive property:
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.9, emissive: 0x163016, map: roughTexture }); // Modify this line

    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const fairwayGeo = new THREE.PlaneGeometry(300, 800, 300, 800);

    const fCanvas = document.createElement('canvas');
    fCanvas.width = 128; fCanvas.height = 4;
    const fCtx = fCanvas.getContext('2d');
    fCtx.fillStyle = '#ffffff'; fCtx.fillRect(0, 0, 64, 4); // Light stripe tint (Add this line)
    fCtx.fillStyle = '#b8b8b8'; fCtx.fillRect(64, 0, 64, 4); // Dark stripe tint (Add this line)
    const fairwayTexture = new THREE.CanvasTexture(fCanvas);
    fairwayTexture.wrapS = THREE.RepeatWrapping;
    fairwayTexture.repeat.set(55, 1);

    const fairwayMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7, map: fairwayTexture });
    fairway = new THREE.Mesh(fairwayGeo, fairwayMat);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(0, 0.011, 0);
    scene.add(fairway);

    // 6. Add Golf Ball Mesh
    const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);

    // High-visibility procedural dimple generator
    const ballCanvas = document.createElement('canvas'); // Add this line
    ballCanvas.width = 512; ballCanvas.height = 256; // Add this line
    const ballCtx = ballCanvas.getContext('2d'); // Add this line
    ballCtx.fillStyle = '#ffffff'; ballCtx.fillRect(0, 0, 512, 256); // Add this line

    // Draw distinct, high-contrast dimple pockets that pop from a distance
    for (let y = 16; y < 256; y += 32) { // Add this line
        let offset = (Math.floor(y / 32) % 2 === 0) ? 16 : 0; // Add this line
        for (let x = offset; x < 512; x += 32) { // Add this line
            let grad = ballCtx.createRadialGradient(x, y, 0, x, y, 14); // Add this line
            grad.addColorStop(0, '#555555'); // Deep charcoal shadow to prevent distant washing out // Add this line
            grad.addColorStop(0.6, '#cccccc'); // Smooth inner incline wall shadow // Add this line
            grad.addColorStop(0.85, '#ffffff'); // Outer flat surface transition // Add this line
            grad.addColorStop(1, '#ffffff'); // Add this line
            ballCtx.fillStyle = grad; // Add this line
            ballCtx.beginPath(); ballCtx.arc(x, y, 14, 0, Math.PI * 2); ballCtx.fill(); // Add this line
        } // Add this line
    } // Add this line
    const ballTexture = new THREE.CanvasTexture(ballCanvas); // Add this line
    ballTexture.wrapS = THREE.RepeatWrapping; // Add this line
    ballTexture.wrapT = THREE.RepeatWrapping; // Add this line
    ballTexture.repeat.set(5, 3); // Lower repeat setting makes individual dimples larger and clear from afar // Add this line

    const ballMat = new THREE.MeshStandardMaterial({ // Change this line
        color: 0xffffff, // Add this line
        roughness: 0.15, // Smooth glossy coating // Add this line
        metalness: 0.0, // Add this line
        map: ballTexture, // Bakes the crisp shadows onto the ball skin // Add this line
        bumpMap: ballTexture, // Distorts lighting over the craters // Add this line
        bumpScale: 0.04 // Elevated bump depth to let 3D light catch the dimple rims // Add this line
    }); // Change this line
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.25, 10);
    scene.add(ball);

    const tracerMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
    const tracerGeo = new THREE.BufferGeometry();
    ballTracer = new THREE.Line(tracerGeo, tracerMat);
    scene.add(ballTracer);



    // 6.1. Add Tee Box Mat (Grassy short turf area with red tee markers)
    const teeGeo = new THREE.BoxGeometry(5.5, 0.01, 3.5); // Modify this line (wider low grass boundary)
    const teeMat = new THREE.MeshStandardMaterial({ color: 0x3cb371, roughness: 0.5 }); // Modify this line (distinct short golf grass)
    teeBox = new THREE.Mesh(teeGeo, teeMat);
    teeBox.position.set(0, 0.01, 10);
    scene.add(teeBox);

    // Add Left and Right Tee Markers as children of teeBox so they randomize together seamlessly
    const markerGeo = new THREE.SphereGeometry(0.3, 16, 16); // Add this line
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.6 }); // Add this line (classic red markers)

    const leftMarker = new THREE.Mesh(markerGeo, markerMat); // Add this line
    leftMarker.position.set(-2.4, 0.08, 0); // Add this line (placed on the left rim)
    teeBox.add(leftMarker); // Add this line

    const rightMarker = new THREE.Mesh(markerGeo, markerMat); // Add this line
    rightMarker.position.set(2.4, 0.08, 0); // Add this line (placed on the right rim)
    teeBox.add(rightMarker); // Add this line

    // Add the physical plastic Golf Tee asset
    const teeCylinderGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.12, 8); // Add this line
    const teeCylinderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // Add this line
    golfTee = new THREE.Mesh(teeCylinderGeo, teeCylinderMat); // Add this line
    golfTee.position.set(0, 0.06, 10); // Add this line
    scene.add(golfTee); // Add this line

    // 6.5. Add the Putting Green, Flagstick, and Red Flag
    // FIXED: Changed to solid RingGeometry (0 inner radius) to unlock actual high-density concentric vertex rings
    const greenGeo = new THREE.RingGeometry(0, GREEN_RADIUS, 64, 32);
    // FIXED: Giving the grid map its own independent mesh geometry prevents shared-vertex texture coordinate breaks
    const gridGeo = new THREE.RingGeometry(0, GREEN_RADIUS - 0.02, 64, 32);

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x11aa44, roughness: 0.85 });
    green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2;
    green.position.set(0, 0.02, -55);
    scene.add(green);


    gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512; // Change this line
    gridCanvas.height = 512; // Change this line

    gridTexture = new THREE.CanvasTexture(gridCanvas);


    greenGrid = new THREE.Mesh(gridGeo, new THREE.MeshBasicMaterial({
        map: gridTexture,
        transparent: true,
        side: THREE.DoubleSide
    }));
    greenGrid.rotation.x = -Math.PI / 2;
    greenGrid.position.set(0, 0.021, -55);
    scene.add(greenGrid);

    const fringeGeo = new THREE.RingGeometry(GREEN_RADIUS, GREEN_RADIUS + 1.0, 64, 16); // Add this line: 2-unit wide ring collar around edge
    const fringeMat = new THREE.MeshStandardMaterial({
        color: 0x1b7a3a,
        roughness: 0.85,
        polygonOffset: true,         // Add this line: Directs the GPU to render this layer on top of overlapping meshes
        polygonOffsetFactor: -1,     // Add this line
        polygonOffsetUnits: -4       // Add this line
    });
    greenFringe = new THREE.Mesh(fringeGeo, fringeMat); // Add this line
    greenFringe.rotation.x = -Math.PI / 2; // Add this line
    greenFringe.position.set(0, 0.018, -55); // Add this line
    scene.add(greenFringe); // Add this line

    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 1.5, -55);
    scene.add(pin);

    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5, 10, 10);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.4, 2.75, -55);
    scene.add(flag);

    holeCup = new THREE.Group();

    const whiteRimGeo = new THREE.RingGeometry(0.17, 0.20, 32);
    const whiteRimMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        polygonOffset: true,         // Add this line: Forces the white rim to stay on top of the grass mesh
        polygonOffsetFactor: -3,     // Add this line
        polygonOffsetUnits: -6       // Add this line
    }); // Change this line
    const whiteRim = new THREE.Mesh(whiteRimGeo, whiteRimMat);
    whiteRim.rotation.x = -Math.PI / 2;
    whiteRim.position.y = 0.002;
    holeCup.add(whiteRim);

    const darkCupGeo = new THREE.CircleGeometry(0.17, 32);
    const darkCupMat = new THREE.MeshBasicMaterial({
        color: 0x151515,
        side: THREE.DoubleSide,
        polygonOffset: true,         // Add this line: Forces the dark core to override the bulging grass fragments
        polygonOffsetFactor: -2,     // Add this line: Layered slightly underneath the white rim face
        polygonOffsetUnits: -4       // Add this line
    }); // Change this line
    const darkCup = new THREE.Mesh(darkCupGeo, darkCupMat);
    darkCup.rotation.x = -Math.PI / 2;
    darkCup.position.y = 0.001; // Change this line: Adjusted upward to sit safely above the grass layer
    holeCup.add(darkCup);

    holeCup.position.set(0, 0.03, -55); // Keep this line
    scene.add(holeCup); // Keep this line

    // 6.6. Add Club Landing Destination Ring for Overhead View
    const ringGeo = new THREE.RingGeometry(3.0, 3.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 1.0, depthTest: true }); // Modify this line
    clubLandingRing = new THREE.Mesh(ringGeo, ringMat);
    clubLandingRing.renderOrder = 9999;
    clubLandingRing.rotation.x = -Math.PI / 2;
    clubLandingRing.visible = false;
    scene.add(clubLandingRing);

    // 6.7. Add Vertical Light Beacon for Overhead View
    const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 150, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.4 });
    clubLandingBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    clubLandingBeacon.visible = false;
    scene.add(clubLandingBeacon);

    // 7. Initialize Modules
    physics = new PhysicsEngine(ball);
    window.physicsEngine = physics;

    sounds = new SoundManager();
    physics.sounds = sounds;

    input = new InputHandler((power, angle, spin, loft) => {
        isOverheadActive = false;
        if (input) { input.aimAngleOffset = 0; input.isAimMode = false; }
        if (teeBox) teeBox.visible = false;
        tracerPoints = [];


        // NEW: Detect if striking from sand to explode a huge cloud of spray particles forward
        let launchedFromSand = false;
        for (let sand of sandTraps) {
            const dx = ball.position.x - sand.position.x;
            const dz = ball.position.z - sand.position.z;

            const angle = Math.atan2(dz, dx); // Add this line
            const shapeWarp = 1.0 + Math.sin(angle * 3) * 0.25 + Math.cos(angle * 1.5) * 0.15; // Add this line
            const sandRadius = (sand.userData && sand.userData.radius ? sand.userData.radius : 5) * shapeWarp; // Modify this line
            if (Math.sqrt(dx * dx + dz * dz) < sandRadius) {
                launchedFromSand = true;
                break;
            }
        }
        if (launchedFromSand && typeof window.triggerSandSpray === 'function') {
            window.triggerSandSpray(ball.position.x, ball.position.y, ball.position.z, 25, 1.4);
        }

        tracerPoints.push(ball.position.clone());
        if (ballTracer) ballTracer.geometry.setFromPoints(tracerPoints);
        ballTracer.geometry.computeBoundingSphere();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // FIXED: Measures from the green's center to scale the hitting power multiplier accurately
        const gX = ball.position.x - (green ? green.position.x : 0);
        const gZ = ball.position.z - greenCenterZ;
        const activeR = window.activeGreenRadius || GREEN_RADIUS; // Add this line
        const isOnGreen = Math.sqrt(gX * gX + gZ * gZ) < activeR; // Modify this line
        let finalPower = power;
        if (isOnGreen) {
            // Set to 0.8588 so an 80ft pull on the gauge physically rolls exactly 80ft in world units
            finalPower *= 1.25;
        }

        const club = input.getClubInfo(); // Add this line: Moved club info to the top of launch
        const isPuttingStroke = isOnGreen || club.name === 'Putter'; // Add this line: Safe check preventing division by zero

        physics.applyImpulse(finalPower, angle, forward, right, isPuttingStroke, spin, loft); // Modify this line

        if (sounds) {
            if (isPuttingStroke) { // Modify this line
                sounds.play('putt'); // Add this line: Triggers the crisp short tap audio file when putting
            } else {
                sounds.play('swing'); // Add this line: Keeps standard big club windy whoosh audio for standard shots
            }
        }
        const clubSwipe = document.getElementById('clubSwipe');
        if (clubSwipe) {
            // Capture the exact position where the pullback stopped for the putter
            if (club.name === 'Putter') {
                const ratio = input.pullRatio || 0;
                const currentBottom = 21.8 - (6.0 * ratio); // Updated baseline to 19.5% to match our precise perspective view
                clubSwipe.style.setProperty('--putter-start-bottom', currentBottom + '%');
            }

            clubSwipe.className = '';

            // Assign the style type based on the active club selection
            if (club.name === 'Putter') {
                clubSwipe.classList.add('putter');
            } else if (club.name === 'Driver' || club.name.includes('Wood') || club.name === 'Hybrid') {
                clubSwipe.classList.add('wood');
            } else {
                clubSwipe.classList.add('iron');
            }

            // Kick off the swipe animation
            clubSwipe.classList.add('swipe-animation');

            // NEW: Instantly wipe active dynamic inline styles so the CSS forward keyframes can execute cleanly
            clubSwipe.style.bottom = '';
            clubSwipe.style.left = '';
            clubSwipe.style.transform = '';

            // NEW: Scales timeout to match the active club (1000ms for slow putts, 350ms for swift swings)
            const swingDuration = club.name === 'Putter' ? 400 : 350;
            setTimeout(() => {
                clubSwipe.classList.remove('swipe-animation');
            }, swingDuration);
        }

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    }, () => {
        // FIXED: Tracks the green boundaries accurately from the true center point during click-drags
        const gX = ball.position.x - (green ? green.position.x : 0);
        const gZ = ball.position.z - greenCenterZ;
        return Math.sqrt(gX * gX + gZ * gZ) < (window.activeGreenRadius || GREEN_RADIUS); // Modify this line
    }, () => {
        // Add this third callback function here to return current distance in yards

        const dx = ball.position.x - holePosition.x;
        const dz = ball.position.z - holePosition.z;
        return Math.sqrt(dx * dx + dz * dz) * 2.76923;
    }); // Add the bracket closure adjustments on this line

    input.ballRef = ball;
    input.sandTrapsRef = sandTraps;
    input.holePositionRef = holePosition;
    input.teeBoxRef = teeBox;

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // Add overhead view button click listener
    const overheadBtn = document.getElementById('overheadBtn');
    if (overheadBtn) {
        overheadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isSinking) return; // Ignore if ball is dropping in the cup

            // Calculate active direction vectors following the current custom aim track heading
            let baseTargetX = holePosition.x;
            let baseTargetZ = holePosition.z;
            if (teeBox && teeBox.visible && currentHoleConfig) {
                const firstLeg = currentHoleConfig.waypoints[1];
                if (firstLeg) { baseTargetX = firstLeg.x; baseTargetZ = firstLeg.z; }
            }
            const dX = baseTargetX - ball.position.x;
            const dZ = baseTargetZ - ball.position.z;
            let angle = Math.atan2(dX, dZ);
            if (input && input.aimAngleOffset) angle += input.aimAngleOffset;

            const aimDirX = Math.sin(angle);
            const aimDirZ = Math.cos(angle);

            // Add these lines: Fetch active club range dynamically to frame the camera over the selected aim circle
            const club = input ? input.getClubInfo() : null;
            const ringDist = (club && !club.isGreen) ? (club.maxYards / 2.76923) : Math.sqrt(dX * dX + dZ * dZ);

            const dirX = aimDirX * ringDist; // Modify this line: Scales horizontally to your aim ring
            const dirZ = aimDirZ * ringDist; // Modify this line: Scales vertically to your aim ring
            const length = ringDist || 1;    // Modify this line: Anchors the aspect framing ratio to match the club distance

            if (!isOverheadActive) {
                // TOGGLE ON: Go up to the 20-foot elevated view
                isOverheadActive = true;
                previewProgress = 0; // Add this line

                const backX = -(dirX / length) * 6.5;
                const backZ = -(dirZ / length) * 6.5;
                const groundHeight = physics.getGroundHeight(ball.position.x, ball.position.z);

                // Puts the camera back up high focused directly on the actual flag cup pin location
                cameraTargetPos.set(ball.position.x + backX, groundHeight + 7.5, ball.position.z + backZ);
                cameraLookAt.copy(holePosition); // Modify this line: Focuses directly on the hole pin right away when clicking static view
            } else {
                // TOGGLE OFF: Bring the camera manually back down behind the ball's current location
                isOverheadActive = false;

                // Check green tracking states on click release to select matching land coordinates
                const checkOnGreen = Math.sqrt(ball.position.x * ball.position.x + (ball.position.z - greenCenterZ) * (ball.position.z - greenCenterZ)) < GREEN_RADIUS;
                // ADJUSTED: Synced with our backed-up 7.5 unit camera perspective
                const camDist = checkOnGreen ? 2.5 : 7.5;
                const camHeight = checkOnGreen ? 1.0 : 2.2;
                const lookDist = checkOnGreen ? 6.0 : 15.0;

                const backX = -(dirX / length) * 7.5;
                const backZ = -(dirZ / length) * 7.5;

                // CORRECTED: Smoothly transitions the camera back to your active zoom/horizon offsets
                cameraTargetPos.set(ball.position.x + backX, ball.position.y + camHeight, ball.position.z + backZ);
                cameraLookAt.set(ball.position.x + (dirX / length) * lookDist, ball.position.y + (checkOnGreen ? 0.35 : 0.0), ball.position.z + (dirZ / length) * lookDist);
            }
        });
    }

    generateNewWind();
    updateDistanceDisplay();
    resetEntireGame();

    // 1. SAFARI GESTURE INTERRUPTER: Constantly forcing manual overrides crashes Safari's zooming logic
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        document.body.style.zoom = 0.99;
    }, { passive: false });

    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        document.body.style.zoom = 0.99;
    }, { passive: false });

    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
        document.body.style.zoom = 1.0;
    }, { passive: false });

    // 2. STOPS MULTI-TOUCH CODES: Chokes 2-finger contact before iOS can scale the view
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, { passive: false });

    // 3. Blocks background page sliding, dragging, and monitors unexpected scale shifts
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1 || (e.scale && e.scale !== 1)) {
            e.preventDefault();
        } else if (!e.target.closest('.club-option') && !e.target.closest('#overheadBtn')) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. Blocks accidental double-tap native page zooms
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = performance.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    animate();
}

init();



// Add this entire function block at the very bottom of the file:
function updateGreenGrid() {
    if (!gridCanvas || !gridTexture || !green || !ball || !physics) return;
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    const gX = green.position.x;
    const gZ = greenCenterZ;

    const dxB = ball.position.x - gX;
    const dzB = ball.position.z - gZ;
    const activeR = window.activeGreenRadius || GREEN_RADIUS;
    const isBallOnGreenOrFringe = Math.sqrt(dxB * dxB + dzB * dzB) < (activeR + 1.5); // Modify this line
    const isAirborne = ball.position.y > physics.getGroundHeight(ball.position.x, ball.position.z) + 0.4;

    // Grid safely stays hidden when swinging
    const isAiming = input && input.isAimMode;

    if (!isBallOnGreenOrFringe || isAirborne || physics.hitWater || isSinking || !isAiming) { // Modify this line
        gridTexture.needsUpdate = true;
        return;
    }

    const dxHole = holePosition.x - ball.position.x; // Modify this line
    const dzHole = holePosition.z - ball.position.z; // Modify this line
    const pathLen = Math.sqrt(dxHole * dxHole + dzHole * dzHole) || 1; // Modify this line

    let angle = Math.atan2(dxHole, dzHole); // Add this line
    if (input && input.aimAngleOffset) angle += input.aimAngleOffset; // Add this line
    const dirX = Math.sin(angle); // Modify this line
    const dirZ = Math.cos(angle); // Modify this line

    // Fixed step intervals ensure uniform, consistent arrow spacing across the entire path
    const travelSteps = Math.max(1, Math.floor(pathLen / 2.2));
    const delta = 0.1;
    for (let s = 0; s <= travelSteps; s++) {
        let baseT = s / travelSteps;
        baseT = Math.max(0, Math.min(1, baseT));
        const sampleWx = ball.position.x + dirX * (baseT * pathLen); // Modify this line
        const sampleWz = ball.position.z + dirZ * (baseT * pathLen);

        // Sample slope values to determine local speed and forward/backward flow vectors
        const localSlopeX = (physics.getGreenHeight(sampleWx - delta, sampleWz) - physics.getGreenHeight(sampleWx + delta, sampleWz)) / (2 * delta);
        const localSlopeZ = (physics.getGreenHeight(sampleWx, sampleWz - delta) - physics.getGreenHeight(sampleWx, sampleWz + delta)) / (2 * delta);

        // FIXED: Multiplies by localSlopeZ instead of localPathSlope to prevent code crashes
        const localPathSlope = (dirX * localSlopeX) + (dirZ * localSlopeZ);

        let localShift = 0.5; // Perfectly centered resting point for static flat terrain slots

        // If an active forward or backward slope exists, animate the streaming velocity
        if (Math.abs(localPathSlope) > 0.0001) {
            const flowDirection = localPathSlope >= 0 ? 1 : -1;
            const velocityScale = 0.025;
            let localVelocity = Math.abs(localPathSlope) * velocityScale * flowDirection;
            localVelocity = Math.max(-0.003, Math.min(0.003, localVelocity));

            localShift = (performance.now() * localVelocity) % 1.0;
            if (localShift < 0) {
                localShift += 1.0;
            }
        }

        // Apply slot coordinates smoothly down the putting line trajectory
        const t = baseT + (localShift - 0.5) / travelSteps;
        if (t < 0 || t > 1) continue;

        const wx = ball.position.x + dirX * (t * pathLen); // Modify this line: Replaced lerp with directional projection
        const wz = ball.position.z + dirZ * (t * pathLen); // Modify this line: Replaced lerp with directional projection

        // Keep texture maps safely contained inside the visual boundary circles
        if (Math.sqrt((wx - gX) * (wx - gX) + (wz - gZ) * (wz - gZ)) < activeR - 0.3) { // Modify this line: Replaced GREEN_RADIUS with activeR
            const cx = 512 * ((wx - gX) / (activeR * 2) + 0.5); // Modify this line: Replaced GREEN_RADIUS with activeR
            const cy = 512 * ((wz - gZ) / (activeR * 2) + 0.5); // Modify this line: Replaced GREEN_RADIUS with activeR

            const arrowSlopeX = (physics.getGreenHeight(wx - delta, wz) - physics.getGreenHeight(wx + delta, wz)) / (2 * delta);
            const arrowSlopeZ = (physics.getGreenHeight(wx, wz - delta) - physics.getGreenHeight(wx, wz + delta)) / (2 * delta);

            ctx.save();
            ctx.translate(cx, cy);

            const unitHoleX = dirX; // Modify this line: Simplified to use your rotatable direction variable
            const unitHoleZ = dirZ; // Modify this line: Simplified to use your rotatable direction variable

            const perpX = -unitHoleZ;
            const perpZ = unitHoleX;

            // Sideways bending calculations to face the arrow left/right depending on contours
            const curveIntensity = (arrowSlopeX * perpX) + (arrowSlopeZ * perpZ);
            const curveSensitivity = 15.0;

            const arrowDirX = unitHoleX + perpX * curveIntensity * curveSensitivity;
            const arrowDirZ = unitHoleZ + perpZ * curveIntensity * curveSensitivity;
            ctx.rotate(Math.atan2(arrowDirZ, arrowDirX));

            // Your exact custom drawing metrics are fully preserved here:
            let arrowScale = 0.42;
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.95)';
            ctx.lineWidth = 3.2;

            ctx.beginPath();
            ctx.moveTo(-12 * arrowScale, -7 * arrowScale);
            ctx.lineTo(4 * arrowScale, 0);
            ctx.lineTo(-12 * arrowScale, 7 * arrowScale);
            ctx.stroke();
            ctx.restore();
        }
    }
    gridTexture.needsUpdate = true;
}