// === PASTE THIS REPLACEMENT CODE BLOCK ===
window.getGreenRadiusAtAngle = function (angle, baseRadius, shapeType) {
    if (!shapeType || shapeType === 'circle') return baseRadius;
    if (shapeType === 'oval') {
        return baseRadius * (1.0 + 0.24 * Math.cos(angle * 2));
    }
    if (shapeType === 'kidney') {
        // AMPLIFIED: Increased coefficients from 0.16/0.08 to 0.26/0.18 to force an unmistakable, 
        // high-contrast deep bean indentation visible from any camera zoom angle
        return baseRadius * (1.0 + 0.26 * Math.sin(angle) + 0.18 * Math.cos(angle * 2));
    }
    if (shapeType === 'wavy') {
        return baseRadius * (1.0 + 0.12 * Math.sin(angle * 3) + 0.04 * Math.cos(angle * 5));
    }
    return baseRadius;
};


import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { SoundManager } from './SoundManager.js';
import { TutorialManager } from './TutorialManager.js';

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
        par: 3,
        greenShape: 'kidney',
        slopeProfile: {
            back: { rx: 0.00, rz: 0.02 },  // Section 1: Pure subtle uphill backstop tilt
            mid: { rx: 0.03, rz: 0.00 },  // Section 2: Clean left-to-right break cutting through the cup area
            front: { rx: -0.02, rz: -0.02 }  // Section 3: Downhill tilt combined with a right-to-left break
        },
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
            new THREE.Vector3(0, 0, 10),       // Flat Tee Box zone
            new THREE.Vector3(0, 0, -108),     // 327 Yard Elbow (Hill descent ends here)
            new THREE.Vector3(11, 0, -139)     // 87 Yard Approach Green
        ],
        hazards: [
            { type: 'sand', x: -14.5, z: -115.0, radius: 4.2, depth: 0.5 },
            { type: 'sand', x: 18.5, z: -126.0, radius: 4.0, depth: 0.6 },
            { type: 'sand', x: 20.0, z: -155.0, radius: 3.8, depth: 0.6 },
            { type: 'sand', x: 28.5, z: -140.0, radius: 3.5, depth: 0.6 }
        ]
    },

    3: { // Pebble Beach Hole 6 Replica - Chasm Cliff Par 5
        par: 5,
        fairwayWidth: 8.0,
        greenRadius: 8.5,
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -65),
            new THREE.Vector3(-14, 0, -125), // CHANGED: Shifted from 0 to -14 to curve the end of the 1st fairway out to the left
            new THREE.Vector3(-3, 0, -180)
        ],
        hazards: [
            // Bunkers on the left (Shifted back to flank the lower driver landing zone precisely)
            { type: 'sand', x: -27.5, z: -85.0, radius: 3.8, depth: 0.55 },

            { type: 'sand', x: -36.5, z: -100.0, radius: 1.9, depth: 0.50 },  //left bunker
            { type: 'sand', x: -27.5, z: -101.5, radius: 1.4, depth: 0.45 },
            { type: 'sand', x: -30.5, z: -102.0, radius: 3.8, depth: 0.60 },
            { type: 'sand', x: -31.5, z: -111.0, radius: 3.0, depth: 0.60 },
            // Lower driving zone bunker cluster converted into a single long, wide polygon with rounded caps
            {
                type: 'sand',
                shape: 'polygon',
                depth: 0.55,
                points: [
                    // Top straight boundary line
                    { x: -34.5, z: -89.5 },  // Top-Left straight edge
                    { x: -29.5, z: -89.5 },  // Top-Right straight edge

                    // Right rounded cap (Shifted far left to clear the wide 18-unit fairway edge)
                    { x: -27.5, z: -91.0 },  // Right upper turn point
                    { x: -27.0, z: -92.5 },  // Right Apex Center (Safely in the rough)
                    { x: -29.0, z: -94.5 },  // Right lower turn point

                    // Bottom straight boundary line
                    { x: -39.5, z: -96.5 },  // Bottom-Right straight edge
                    { x: -44.5, z: -96.5 },  // Bottom-Left straight edge

                    // Left rounded cap (facing deep out into the left rough)
                    { x: -46.5, z: -95.0 },  // Left lower turn point
                    { x: -47.0, z: -93.5 },  // Left Apex Center
                    { x: -45.0, z: -91.5 }   // Left upper turn point
                ]
            },
            // 2. The single intermediate bunker in the left rough before the green
            { type: 'sand', x: -30.5, z: -163.0, radius: 2.3, depth: 0.60 },

            // 3. The green-side bunker positioned tightly to the left of your x: -3 green
            { type: 'sand', x: -15.5, z: -183.0, radius: 2.5, depth: 0.60 },

            // Exactly 2 right-side bunkers adjusted to perfectly hug your new x: -3 green edge
            { type: 'sand', x: 8.3, z: -174.0, radius: 2.1, depth: 0.60 },
            { type: 'sand', x: 9.8, z: -181.5, radius: 2.0, depth: 0.60 },

            { type: 'ocean', x: 60.0, z: -153.5, width: 130.0, length: 150.0 }
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
let visualGuideBeads = [];
let completedHoles = [];
let isRaining = false;
let isOutOfBoundsResetting = false;
let isBackspinOn = false;
let cloudOffsetX = 0, cloudOffsetY = 0;
let rainParticles = [];
let currentHoleYards = 0;
let sandTraps = [];
let waterHazards = [];
let waterShores = [];
let sceneryObjects = [];
let divotObjects = [];
let currentHoleNumber = 1; //1st hole start
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

    const scoreToParEl = document.getElementById('scoreToParText');
    if (scoreToParEl) {
        let totalDiff = completedHoles.reduce((sum, h) => sum + (h.score - h.par), 0);
        if (totalDiff === 0) {
            scoreToParEl.innerText = "E";
            scoreToParEl.style.color = '#44bb66'; // Add this line: Even Par Green
        } else if (totalDiff > 0) {
            scoreToParEl.innerText = "+" + totalDiff;
            scoreToParEl.style.color = '#ffffff'; // Add this line: Over Par White
        } else {
            scoreToParEl.innerText = totalDiff;
            scoreToParEl.style.color = '#ff4d4d'; // Add this line: Under Par Red
        }
    }

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
        const checkAngle = Math.atan2(-greenCheckZ, greenCheckX);
        const activeR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(checkAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;
        const distToGreen = Math.sqrt(greenCheckX * greenCheckX + greenCheckZ * greenCheckZ);
        const isOnGreen = distToGreen < activeR;
        const isOnFringe = distToGreen >= activeR && distToGreen <= (activeR + 2.5); // Tracks the fringe boundary line

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
        container.style.gap = isMobileScreen ? '10px' : '10px'; // Modify this line: Tightens layout footprint on mobile screens
        container.style.flexWrap = 'wrap'; // Add this line: Safely wraps the buttons instead of breaking outer layout bounds

        // Calculate what index is currently highlighted
        let currentIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;

        // 1. BUILD THE LEFT SCROLL ARROW (Goes to longer distance clubs)
        const leftBtn = document.createElement('button');
        leftBtn.className = 'club-option';
        leftBtn.innerText = '◀';

        // Disable the arrow if we are already holding the longest club (Driver at index 0)
        if (currentIdx === 0) {
            leftBtn.style.opacity = '0.3';
            leftBtn.style.pointerEvents = 'none';
        }
        leftBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let cIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;
            if (cIdx > 0) {
                input.chosenClubIndex = cIdx - 1;
                updateDistanceDisplay();
            }
        });

        // 3. BUILD THE RIGHT SCROLL ARROW (Goes to shorter distance clubs)
        const rightBtn = document.createElement('button');
        rightBtn.className = 'club-option';
        rightBtn.innerText = '▶';

        // Allows scrolling to the putter (clubList.length - 1) on the fringe, otherwise stops at Sand Wedge (- 2)
        const maxClubIdx = isOnFringe ? clubList.length - 1 : clubList.length - 2;

        if (currentIdx === maxClubIdx) {
            rightBtn.style.opacity = '0.3';
            rightBtn.style.pointerEvents = 'none';
        }
        rightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let cIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;
            if (cIdx < maxClubIdx) {
                input.chosenClubIndex = cIdx + 1;
                updateDistanceDisplay();
            }
        });

        // Create a vertical flex container to perfectly stack name and yards between the arrows
        const clubLabelWrapper = document.createElement('div');
        clubLabelWrapper.style.display = 'flex';
        clubLabelWrapper.style.flexDirection = 'column';
        clubLabelWrapper.style.alignItems = 'center';
        clubLabelWrapper.style.justifyContent = 'center';
        clubLabelWrapper.style.minWidth = '85px'; // Slightly widened to keep layout rock-solid on longer names
        clubLabelWrapper.style.textAlign = 'center';

        // 1. The Club Name text sub-layer (Crisp White)
        const nameSpan = document.createElement('span');
        nameSpan.style.color = '#ffffff';
        nameSpan.style.fontSize = '16px';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.lineHeight = '1.2';
        nameSpan.innerText = clubList[currentIdx].name;

        // 2. The Club Max Capacity text sub-layer (Vibrant Light Blue)
        const yardsSpan = document.createElement('span');
        yardsSpan.style.color = '#00ffcc';
        yardsSpan.style.fontSize = '16px'; // Slightly smaller font scale for perfect hierarchy
        yardsSpan.style.fontWeight = 'bold';
        yardsSpan.style.marginTop = '2px';
        yardsSpan.innerText = `(${clubList[currentIdx].maxYards} yds)`;

        // Append text elements into our new vertical sub-layout frame
        clubLabelWrapper.appendChild(nameSpan);
        clubLabelWrapper.appendChild(yardsSpan);

        // Append the nodes in order to create the clean row layout
        container.appendChild(leftBtn);
        container.appendChild(clubLabelWrapper);
        container.appendChild(rightBtn);
    }


}

function generateNewWind() {
    // RESTORED: Re-randomize the wind angle on every generation so wind direction varies completely!
    currentWindAngle = Math.random() * Math.PI * 2;

    let windSpeed = 0;
    const windRoll = Math.random();


    // 20% chance: Calm / Light (0 – 3 MPH)
    if (windRoll < 0.20) {
        windSpeed = Math.floor(Math.random() * 4); // Generates 0, 1, 2, or 3
    }
    // 60% chance: Moderate (4 – 10 MPH) 
    // (Handles the 20% to 80% range -> 0.80 - 0.20 = 0.60)
    else if (windRoll < 0.80) {
        windSpeed = 4 + Math.floor(Math.random() * 7); // Generates 4, 5, 6, 7, 8, 9, or 10
    }
    // 15% chance: Strong (11 – 15 MPH)
    // (Handles the 80% to 95% range -> 0.95 - 0.80 = 0.15)
    else if (windRoll < 0.95) {
        windSpeed = 11 + Math.floor(Math.random() * 5); // Generates 11, 12, 13, 14, or 15
    }
    // 5% chance: Extreme (16 – 25 MPH)
    // (Handles the final remainder from 95% to 100%)
    else {
        windSpeed = 16 + Math.floor(Math.random() * 10); // Generates 16 through 25
    }


    // NEW: Enforce a minimum of 10 MPH wind during a storm/rain
    if (isRaining) {
        windSpeed = Math.max(10, windSpeed);
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

/**
 * Helper to generate a snaking bunker by placing circles along a path
 * @param {Array} path - Array of {x, z} points
 * @param {number} spacing - Distance between circles (smaller = smoother, higher count)
 * @param {number} radius - Radius of each circle
 * @param {number} depth - Depth of the bunker
 */
function createSnakingBunker(path, spacing, radius, depth) {
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
        const steps = Math.floor(dist / spacing);

        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const z = p1.z + (p2.z - p1.z) * t;

            // Add the bunker circle to the scene and the tracking array
            // This reuses your existing circle logic
            addSandTrap(x, z, radius, depth);
        }
    }
}



function addPolygonSandTrap(points, depth) {
    const shape = new THREE.Shape();
    // FIXED: Invert the Z coordinates to counteract the -Math.PI / 2 mesh rotation flip
    shape.moveTo(points[0].x, -points[0].z);
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, -points[i].z);
    }
    shape.lineTo(points[0].x, -points[0].z); // Close the path

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
        color: 0xd9c59e,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = { points: points, depth: depth, isPolygon: true };
    scene.add(mesh);
    sandTraps.push(mesh);
}

function addSandTrap(x, z, r, depth) {
    const sandMesh = new THREE.Mesh(
        new THREE.RingGeometry(0, r, 64, 6), // 64 segments for smoothness
        new THREE.MeshStandardMaterial({
            color: 0xd9c59e,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: false,    // This smooths the lighting
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4
        })
    );
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(x, 0.01, z); // Slightly raised to avoid z-fighting
    sandMesh.userData = { radius: r, depth: depth };
    scene.add(sandMesh);
    sandTraps.push(sandMesh);
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
    const targetGreenX = holePosition.x;

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
        const wallGeo = new THREE.CylinderGeometry(r + 0.58, r + 0.58, 50.0, 64, 1, true); // Add this line
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
        wallMesh.position.set(x, currentWaterGroundY + 0.015 - 25.0, z);
        scene.add(wallMesh);
        waterShores.push(wallMesh);

    }

    for (let i = 0; i < numSand; i++) {
        let x, z, r = 4.5 + Math.random() * 2.5;
        let sandAttempts = 0;
        let endX = 0, endZ = 0; // Add this line
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

            // Pre-calculate where the snaking path body ends to check overlap metrics cleanly
            const tsX = x - targetGreenX;                                         // Add this line
            const tsZ = z - targetGreenZ;                                         // Add this line
            const tsLen = Math.sqrt(tsX * tsX + tsZ * tsZ) || 1;                  // Add this line
            endX = x + (tsX / tsLen) * 9.0;                                        // Add this line
            endZ = z + (tsZ / tsLen) * 9.0;                                        // Add this line

            sandAttempts++;
            if (sandAttempts > 100) break;
        } while (
            checkOverlap(x, z, r, waterHazards, 3.0) ||
            checkOverlap(x, z, r, sandTraps) ||
            checkOverlap(endX, endZ, r, waterHazards, 3.0) || // Add this line
            checkOverlap(endX, endZ, r, sandTraps) ||         // Add this line
            Math.sqrt((x - targetGreenX) * (x - targetGreenX) + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r + 0.5) ||
            Math.sqrt((endX - targetGreenX) * (endX - targetGreenX) + (endZ - targetGreenZ) * (endZ - targetGreenZ)) < (12 + r + 0.5) || // Add this line
            (physics && physics.getDistanceToSpline(x, z) < (9.0 + r + 0.5)) ||
            (z > -15 && Math.abs(x) < 15)
        );

        if (sandAttempts > 100) continue;

        let currentSandGroundY = physics.getGroundHeight(x, z);
        if (z >= targetGreenZ && z <= 8 && Math.abs(x) <= 9.0) {
            currentSandGroundY += 0.035;
        }

        // Calculate a vector pointing straight out away from the green center
        const toSandX = x - targetGreenX;
        const toSandZ = z - (green ? green.position.z : -55);
        const toSandLen = Math.sqrt(toSandX * toSandX + toSandZ * toSandZ) || 1;
        const dirAwayX = toSandX / toSandLen;
        const dirAwayZ = toSandZ / toSandLen;

        // Tangent perpendicular vector to maintain a natural, curved snake contour shape
        const tanX = -dirAwayZ;
        const tanZ = dirAwayX;

        // Build the path so it winds outward into the rough and avoids the green entirely
        const path = [
            { x: x, z: z },
            { x: x + dirAwayX * 3.0 + tanX * 1.5, z: z + dirAwayZ * 3.0 + tanZ * 1.5 },
            { x: x + dirAwayX * 6.0 - tanX * 1.0, z: z + dirAwayZ * 6.0 - tanZ * 1.0 },
            { x: x + dirAwayX * 9.0, z: z + dirAwayZ * 9.0 }
        ];

        // Now call the function with the path and a very tight spacing
        let sandDepth = 0.3 + Math.random() * 0.45;           // Modify this line
        const maxDepthCap = r * 0.085;                        // Add this line
        sandDepth = Math.min(sandDepth, maxDepthCap);          // Add this line
        createSnakingBunker(path, 0.8, r, sandDepth)


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

    // Clear old divots so they don't carry over into the next hole or reset
    if (divotObjects) {
        divotObjects.forEach(d => scene.remove(d));
        divotObjects = [];
    }

    if (rainParticles) {
        rainParticles.forEach(p => scene.remove(p));
        rainParticles = [];
    }
    isRaining = Math.random() < 0.35; // 35% chance of rain on any given hole
    if (isRaining) {
        document.body.classList.add('storm-mode');
    } else {
        document.body.classList.remove('storm-mode');
    }
    if (sounds) {
        if (isRaining) {
            sounds.stopAmbient('birds');
            sounds.playAmbient('rain');
        } else {
            sounds.stopAmbient('rain');
            sounds.playAmbient('birds');
        }
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
                    new THREE.Vector3(0, 0, 10),     // Tee Box
                    new THREE.Vector3(0, 0, -65),    // Flat Fairway
                    new THREE.Vector3(0, 0, -125),   // Shifted left (x: 8 -> 0)
                    new THREE.Vector3(-4, 0, -180)   // Shifted green significantly left (x: 16 -> -4)
                ],
            };
        }
    }

    currentHoleConfig = holeConfig;
    window.activeGreenRadius = (holeConfig && holeConfig.greenRadius) ? holeConfig.greenRadius : 12.0;

    // Assign shape style (supports specific manual profiles or cycles variety across procedural tracks)
    window.activeGreenShape = (holeConfig && holeConfig.greenShape) ? holeConfig.greenShape : 'circle';
    if (!holeConfig) {
        const shapeOptions = ['circle', 'oval', 'kidney', 'wavy'];
        window.activeGreenShape = shapeOptions[(currentHoleNumber - 1) % shapeOptions.length];
    }

    // Warps vertices to sculpt geometric borders while maintaining perfect concentric alignment
    const applyShapeWarp = (targetMesh, baseR) => {
        if (!targetMesh || !targetMesh.geometry.userData.origXY) return;
        const posAttr = targetMesh.geometry.attributes.position;
        const templates = targetMesh.geometry.userData.origXY;
        const isFringeMesh = (targetMesh === greenFringe);

        for (let i = 0; i < posAttr.count; i++) {
            const tx = templates[i].x;
            const ty = templates[i].y;
            const theta = Math.atan2(ty, tx);
            const templateDist = Math.sqrt(tx * tx + ty * ty);

            const dynamicBorderR = window.getGreenRadiusAtAngle(theta, baseR, window.activeGreenShape);

            let finalizedDist = 0;
            if (isFringeMesh) {
                const fringeOffset = templateDist - 12.0; // original GREEN_RADIUS reference
                finalizedDist = dynamicBorderR + fringeOffset;
            } else {
                finalizedDist = dynamicBorderR * (templateDist / 12.0);
            }

            posAttr.setX(i, Math.cos(theta) * finalizedDist);
            posAttr.setY(i, Math.sin(theta) * finalizedDist);
        }
        posAttr.needsUpdate = true;
    };

    applyShapeWarp(green, window.activeGreenRadius);
    applyShapeWarp(greenGrid, window.activeGreenRadius - 0.02);
    applyShapeWarp(greenFringe, window.activeGreenRadius);

    // Lock baseline scale to 1.0 since transformations are performed directly on the vertex arrays
    if (green) green.scale.set(1, 1, 1);
    if (greenGrid) greenGrid.scale.set(1, 1, 1);
    if (greenFringe) greenFringe.scale.set(1, 1, 1);
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

    // --- 1. SET HOLE POSITION (PRIORITY: CUSTOM DATA) ---
    // Clear out any old values first
    holePosition.x = 0;
    holePosition.z = 0;

    if (currentHoleConfig && currentHoleConfig.holePosition) {
        // Use custom config
        holePosition.x = currentHoleConfig.holePosition.x;
        holePosition.z = currentHoleConfig.holePosition.z;
    } else {
        // Fallback for procedural
        const greenEndpoint = holeConfig.waypoints[holeConfig.waypoints.length - 1];
        holePosition.x = greenEndpoint.x;
        holePosition.z = greenEndpoint.z;

        // Add random pin variance bounded perfectly inside the contour limits
        const pinAngle = Math.random() * Math.PI * 2;
        const maxAllowedR = window.getGreenRadiusAtAngle(pinAngle, window.activeGreenRadius || 12.0, window.activeGreenShape) - 3.0;
        const pinRadius = Math.random() * Math.max(2.0, maxAllowedR);
        holePosition.x += Math.cos(pinAngle) * pinRadius;
        holePosition.z += Math.sin(pinAngle) * pinRadius;
    }

    greenCenterZ = holePosition.z; // Sync helper variable

    // --- 2. PHYSICALLY MOVE THE MESHES ---
    if (green) green.position.set(holePosition.x, 0.02, holePosition.z);
    if (greenGrid) greenGrid.position.set(holePosition.x, 0.021, holePosition.z);
    if (greenFringe) greenFringe.position.set(holePosition.x, 0.018, holePosition.z);

    // --- 3. SYNC PHYSICS ENGINE ---
    if (physics) {
        physics.greenCenterX = holePosition.x;
        physics.greenCenterZ = holePosition.z;
        physics.updateGreenPosition(holePosition.x, holePosition.z);
    }

    // NEW: Kick off the sequential visual tutorial tour if the player is landing on Hole 1
    if (currentHoleNumber === 1) {
        setTimeout(() => {
            const tutorial = new TutorialManager();
            tutorial.start();
        }, 800); // Small delay to let the green finish shifting into position first
    }

    // 3. UPDATING THE PHYSICS ENGINE:
    // This tells the ball physics where the new center is.
    if (physics) {
        physics.greenCenterX = holePosition.x;
        physics.greenCenterZ = holePosition.z;
    }

    // Set up the horizontal profiles matrix (Flat, Left-to-Right, Right-to-Left)
    const horizontalOptions = [0.0, 0.05, -0.05];

    // Shuffle the array so the horizontal options map randomly to Front, Mid, or Back tiers
    for (let i = horizontalOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [horizontalOptions[i], horizontalOptions[j]] = [horizontalOptions[j], horizontalOptions[i]];
    }

    // === PASTE THIS REPLACEMENT CODE BLOCK ===
    const verticalOptions = [0.03, -0.03, 0.0];

    // Build the 3 distinct randomized tier zones configuration blocks
    let backZoneProfile = { rx: horizontalOptions[0], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    let midZoneProfile = { rx: horizontalOptions[1], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    let frontZoneProfile = { rx: horizontalOptions[2], rz: verticalOptions[Math.floor(Math.random() * 3)] };

    // FIXED: Dynamically load individual slope configurations from blueprints if specified
    if (holeConfig && holeConfig.slopeProfile) {
        if (holeConfig.slopeProfile.back) backZoneProfile = holeConfig.slopeProfile.back;
        if (holeConfig.slopeProfile.mid) midZoneProfile = holeConfig.slopeProfile.mid;
        if (holeConfig.slopeProfile.front) frontZoneProfile = holeConfig.slopeProfile.front;
    } else if (currentHoleNumber === 3) {
        // Fallback safety check preservation for standard non-configured tracks
        backZoneProfile = { rx: -0.04, rz: 0.01 };
        midZoneProfile = { rx: -0.05, rz: 0.00 };
        frontZoneProfile = { rx: -0.03, rz: -0.02 };
    }

    // Pass the full contoured landscape configurations down to the physics machine instance
    if (physics) {
        const generatedWidth = (holeConfig && holeConfig.fairwayWidth) ? holeConfig.fairwayWidth : (8.5 + Math.random() * 20);
        physics.setGreenContours(backZoneProfile, midZoneProfile, frontZoneProfile, holePosition.x, holePosition.z, generatedWidth);
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
                let sandDepth = hz.depth || 0.6;              // Modify this line: Change const to let
                const maxCustomDepthCap = r * 0.085;          // Add this line
                sandDepth = Math.min(sandDepth, maxCustomDepthCap); // Add this line

                // Route to polygon generator if configuration matches
                if (hz.shape === 'polygon' || hz.shapeType === 'polygon') {
                    addPolygonSandTrap(hz.points, sandDepth);
                } else {
                    // Preserves original circle geometry setup unmodified
                    const sandMesh = new THREE.Mesh(
                        new THREE.RingGeometry(0, r, 64, 6),
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

                    // FIXED: Set position.y to 0 so absolute heights don't double-stack and float over hills
                    sandMesh.position.set(x, 0, z);
                    sandMesh.userData = { radius: r, depth: sandDepth };
                    scene.add(sandMesh);
                    sandTraps.push(sandMesh);
                }
            }
            // NEW: Render the custom rectangular Pacific Ocean body & protective vertical cliff wall geometry
            else if (hz.type === 'ocean') {
                const oceanGeo = new THREE.PlaneGeometry(hz.width, hz.length, 30, 60);
                const oceanMesh = new THREE.Mesh(
                    oceanGeo,
                    new THREE.MeshPhongMaterial({
                        color: 0x0000ff,
                        specular: 0xffffff,
                        shininess: 150,
                        side: THREE.DoubleSide
                    })
                );
                oceanMesh.rotation.x = -Math.PI / 2;
                // Positioned flush at sea-level surface line
                oceanMesh.position.set(hz.x, 0.05, hz.z);
                oceanMesh.userData = { isRectangular: true, w: hz.width, l: hz.length };
                scene.add(oceanMesh);
                waterHazards.push(oceanMesh);

                // MODIFIED: Fully synchronized path metrics and expanded boundaries to perfectly clear the putting green radius cleanly
                const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.95 });
                const sliceLength = 0.4;
                const startZ = -51.75;
                const endZ = -215.0;

                for (let currentZ = startZ; currentZ >= endZ; currentZ -= sliceLength) {
                    let pathCenter = 0; // Keep this single declaration line!

                    if (currentZ >= -125) {
                        let t = (10 - currentZ) / 135;
                        pathCenter = THREE.MathUtils.lerp(0, -14.0, t); // CHANGED: Aligns visual cliff walls with the leftward fairway curve
                    } else {
                        let t = (-125 - currentZ) / 55;
                        t = Math.min(1.0, t);
                        pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t); // CHANGED: Starts from -14.0 and sweeps back towards the right green
                    }

                    // FIXED: Ensure there is NO "let pathCenter = 0;" here anymore!
                    let cliffPadding = 15.5;
                    if (currentZ < -115) {
                        cliffPadding = THREE.MathUtils.lerp(15.5, 10.5, Math.max(0, Math.min(1, (-115 - currentZ) / 20.0)));
                    }
                    const cliffEdgeLimit = pathCenter + cliffPadding;

                    const trueCrestHeight = physics.getCourseHeight(pathCenter, currentZ);

                    // FIXED: Seamlessly taper down rock ruggedness and rotations on the flat fairway section so it functions as a smooth retaining curb
                    let ruggedIntensity = 1.0;
                    if (currentZ >= -125) {
                        ruggedIntensity = 0.0; // Perfectly smooth and flush alongside the low fairway turf
                    } else if (currentZ > -135) {
                        ruggedIntensity = (-125 - currentZ) / 10.0; // Gracefully blends rock fracturing back in as it climbs up the hill crest
                    }

                    const rockWidth = 5.0 + (Math.sin(currentZ * 1.5) * 0.3 * ruggedIntensity);
                    const ruggedOffset = Math.cos(currentZ * 2.5) * 0.12 * ruggedIntensity;

                    const wallGeo = new THREE.BoxGeometry(rockWidth, 50.0, sliceLength + 0.08);
                    const cliffWall = new THREE.Mesh(wallGeo, wallMat);

                    cliffWall.rotation.z = Math.sin(currentZ * 2.0) * 0.03 * ruggedIntensity;
                    cliffWall.rotation.y = Math.cos(currentZ * 1.1) * 0.04 * ruggedIntensity;

                    // Position the rock face flush against the outer boundaries
                    const positionX = cliffEdgeLimit + (rockWidth / 2) + ruggedOffset;

                    cliffWall.position.set(
                        positionX,
                        trueCrestHeight - 25.15,
                        currentZ - sliceLength / 2
                    );

                    scene.add(cliffWall);
                    waterShores.push(cliffWall);
                }
            }
        });

        if (physics) {
            physics.sandTraps = sandTraps;
            physics.waterHazards = waterHazards;
        }
    } // This bracket cleanly closes the outer "else" statement of the hazard checker


    // Calculate the dynamic 3D ground level height exactly where the random pin cup is spawned
    // MODIFIED: Changed from getGreenHeight to getGroundHeight so the pin objects snap to the clifftop table
    const specificPinCupY = physics.getGroundHeight(holePosition.x, holePosition.z);

    // Pin the visual flagstick elements seamlessly onto the new 3D elevation slopes coordinate
    if (pin) pin.position.set(holePosition.x, 1.5 + specificPinCupY, holePosition.z);
    if (flag) flag.position.set(holePosition.x + 0.4, 2.75 + specificPinCupY, holePosition.z);
    if (holeCup) { // Change this line
        const cupDelta = 0.1; // Add this line: Resolution boundary for sampling local slopes
        // MODIFIED: Swapped slope anchors to getGroundHeight to align the contour angles with the cliff table
        const cL = physics.getGroundHeight(holePosition.x - cupDelta, holePosition.z); // Add this line
        const cR = physics.getGroundHeight(holePosition.x + cupDelta, holePosition.z); // Add this line
        const cB = physics.getGroundHeight(holePosition.x, holePosition.z - cupDelta); // Add this line
        const cF = physics.getGroundHeight(holePosition.x, holePosition.z + cupDelta); // Add this line
        const cupSlopeX = (cL - cR) / (2 * cupDelta); // Add this line
        const cupSlopeZ = (cB - cF) / (2 * cupDelta); // Add this line

        holeCup.position.set(holePosition.x, 0.042 + specificPinCupY, holePosition.z); // Change this line
        holeCup.rotation.set(Math.atan2(cupSlopeZ, 1), 0, -Math.atan2(cupSlopeX, 1)); // Add this line: Slopes cup flush to terrain
    } // Change this line

    // Deform the visual green mesh geometries to create real 3D ridges and valleys
    const deformVisualGreenMesh = (targetMesh) => {
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;

        // Initialize or fetch the geometry color attribute array dynamically
        let colorAttr = targetMesh.geometry.attributes.color;
        if (!colorAttr) {
            const colors = new Float32Array(posAttr.count * 3);
            targetMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            colorAttr = targetMesh.geometry.attributes.color;
        }

        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            const worldX = localX * targetMesh.scale.x + targetMesh.position.x;
            const worldZ = -localY * targetMesh.scale.y + targetMesh.position.z;

            let calculatedHeight = physics.getGroundHeight(worldX, worldZ);

            // Prevent the putting green complex from clipping into overlapping sand traps
            let insideSandZoneCheck = false;
            sandTraps.forEach(sand => {
                if (sand.userData && sand.userData.isPolygon) {
                    const points = sand.userData.points;
                    let inside = false;
                    for (let k = 0, j = points.length - 1; k < points.length; j = k++) {
                        const xi = points[k].x, zi = points[k].z;
                        const xj = points[j].x, zj = points[j].z;
                        const intersect = ((zi > worldZ) !== (zj > worldZ))
                            && (worldX < (xj - xi) * (worldZ - zi) / (zj - zi) + xi);
                        if (intersect) inside = !inside;
                    }
                    if (inside) insideSandZoneCheck = true;
                } else {
                    const dxS = worldX - sand.position.x;
                    const dzS = worldZ - sand.position.z;
                    const sandRadius = sand.userData && sand.userData.radius ? sand.userData.radius : 5;
                    if (Math.sqrt(dxS * dxS + dzS * dzS) < sandRadius) insideSandZoneCheck = true;
                }
            });
            if (insideSandZoneCheck) {
                calculatedHeight -= 1.5;
            }

            if (targetMesh === green) calculatedHeight += 0.02;
            if (targetMesh === greenGrid) calculatedHeight += 0.03;
            if (targetMesh === greenFringe) calculatedHeight += 0.018;

            posAttr.setZ(i, calculatedHeight);

            // --- REALISTIC TURF SHADE CONTRAST GENERATOR ---
            let baseR = 0.066, baseG = 0.666, baseB = 0.266; // Standard Green (0x11aa44)
            if (targetMesh === greenFringe) {
                baseR = 0.105; baseG = 0.478; baseB = 0.227; // Crisp Collar Fringe (0x1b7a3a)
            }

            // Evaluate elevation delta relative to the stable pin cup height baseline
            const centerHeight = physics.getGroundHeight(targetMesh.position.x, targetMesh.position.z);
            const heightDiff = calculatedHeight - centerHeight;

            // NEW: Micro-sample nearby terrain vectors to calculate localized slope breaks and curve directions
            const delta = 0.15;
            const hL = physics.getGroundHeight(worldX - delta, worldZ);
            const hR = physics.getGroundHeight(worldX + delta, worldZ);
            const hF = physics.getGroundHeight(worldX, worldZ - delta);
            const hB = physics.getGroundHeight(worldX, worldZ + delta);
            const slopeX = (hR - hL) / (2 * delta);
            const slopeZ = (hB - hF) / (2 * delta);
            const steepness = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

            // Create an organic embossed shading weight (darkens down-slopes, illuminates up-mounds)
            const slopeShading = (slopeX - slopeZ) * 0.35 - (steepness * 0.18);

            // Blend absolute elevation mapping with dynamic directional slope contrast
            const blend = THREE.MathUtils.clamp(heightDiff * 0.35 + slopeShading, -0.32, 0.28);

            // Organically enrich channels: channels scale deep into shadows or sun highlights to outline contours
            let r = baseR + blend * 0.12;
            let g = baseG + blend * 0.48;
            let b = baseB + blend * 0.18;

            colorAttr.setXYZ(i, r, g, b);
        }
        posAttr.needsUpdate = true;
        if (colorAttr) colorAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals();
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
            let closeToWater = false; // Tracks vertices near the lake terrace
            waterHazards.forEach(water => {
                // MODIFIED: Constrained the rectangular ocean check to only apply to coordinates past our curved cliff face line
                if (water.userData && water.userData.isRectangular) {
                    let pathCenter = 0;
                    if (worldZ >= -125) {
                        let t = (10 - worldZ) / 135;
                        pathCenter = THREE.MathUtils.lerp(0, -14.0, t);
                    } else {
                        let t = (-125 - worldZ) / 55;
                        t = Math.min(1.0, t);
                        pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t);
                    }
                    let cliffPadding = 15.5;
                    if (worldZ < -115) { cliffPadding = THREE.MathUtils.lerp(15.5, 10.5, Math.max(0, Math.min(1, (-115 - worldZ) / 20.0))); }
                    const cliffEdgeLimit = pathCenter + cliffPadding;
                    if (worldX > cliffEdgeLimit && worldX <= water.position.x + water.userData.w / 2 &&
                        worldZ >= water.position.z - water.userData.l / 2 && worldZ <= water.position.z + water.userData.l / 2) {
                        insideWaterZone = true;
                    }
                } else {
                    const dxW = worldX - water.position.x;
                    const dzW = worldZ - water.position.z;
                    const distToWater = Math.sqrt(dxW * dxW + dzW * dzW);
                    const lakeRadius = water.userData.radius || 5;
                    if (distToWater < lakeRadius - 0.65) { // Pull grass down ONLY inside the inner water pool basin
                        insideWaterZone = true;
                    }
                    if (distToWater < lakeRadius + 6.0) { // Flags vertices sitting within the lake's terrace blend
                        closeToWater = true;
                    }
                }
            });

            // Scan active sand trap footprint borders using correct userData properties
            let insideSandZone = false;
            let activeSandDepth = 0;
            sandTraps.forEach(sand => {
                if (sand.userData && sand.userData.isPolygon) {
                    // High-performance Point-in-Polygon check to carve visual grass/fairway meshes
                    const points = sand.userData.points;
                    let inside = false;
                    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                        const xi = points[i].x, zi = points[i].z;
                        const xj = points[j].x, zj = points[j].z;
                        const intersect = ((zi > worldZ) !== (zj > worldZ))
                            && (worldX < (xj - xi) * (worldZ - zi) / (zj - zi) + xi);
                        if (intersect) inside = !inside;
                    }
                    if (inside) {
                        insideSandZone = true;
                        const depth = sand.userData.depth || 0.6;
                        if (depth > activeSandDepth) activeSandDepth = depth;
                    }
                } else {
                    // Preserves original circle geometry setup unmodified
                    const dxS = worldX - sand.position.x;
                    const dzS = worldZ - sand.position.z;
                    let distToSand = Math.sqrt(dxS * dxS + dzS * dzS); // Keep this line

                    // FIXED: Removed irregular shapeWarp to align perfectly with the unwarped circular sand trap mesh geometry
                    const padding = (targetMesh === floor || targetMesh === fairway) ? 0.0 : 0.0;
                    const sandRadius = (sand.userData && sand.userData.radius ? sand.userData.radius : 5) + padding;

                    if (distToSand < sandRadius) {
                        insideSandZone = true;
                        const depth = sand.userData && sand.userData.depth ? sand.userData.depth : 0.6;
                        if (depth > activeSandDepth) activeSandDepth = depth;
                    }
                }
            });

            // Around Line 829 in src/main.js
            const gX = worldX - (green ? green.position.x : 0);
            const gZ = worldZ - greenCenterZ;
            const distToGreen = Math.sqrt(gX * gX + gZ * gZ);
            const vertexAngle = Math.atan2(-gZ, gX);

            // Fetch dynamic green boundary metrics for this explicit slice angle
            const activeR = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');
            const fringeOuterR = activeR + 1.0;

            // Soft gradient ramp around the green replaces the harsh cliff cutoff to avoid mesh jaggedness
            if (distToGreen < activeR) {
                calculatedHeight -= 0.0;
            } else if (distToGreen < activeR + 3.5) {
                const greenT = (distToGreen - activeR) / 3.5;
                const smoothGreenT = THREE.MathUtils.smoothstep(greenT, 0, 1);
                calculatedHeight -= THREE.MathUtils.lerp(0.0, 0.0, smoothGreenT);
            }
            if (!insideWaterZone) {
                const distanceToPath = physics.getDistanceToSpline(worldX, worldZ);
                let fW = physics.fairwayWidth;

                if (currentHoleNumber === 3) {
                    if (worldZ <= -20.0 && worldZ >= -160.0) {
                        fW = 18.0; // Keeps the fairway wide across both the driving area and the hill climb
                    } else if (worldZ < -160.0 && worldZ >= -172.0) {
                        // Smoothly taper the fairway width down from 18.0 to 8.0 just before the bunkers
                        let tTaper = (-160.0 - worldZ) / 12.0;
                        fW = THREE.MathUtils.lerp(18.0, 8.0, tTaper);
                    } else if (worldZ < -172.0) {
                        fW = 8.0; // Clean tight approach into the green entrance
                    }
                }


                // FIXED: Replaced undefined greenCenterX with your safe horizontal green positioning reference
                const relX = worldX - (green ? green.position.x : 0);
                const relZ = worldZ - greenCenterZ;
                const distToGreenCenter = Math.sqrt(relX * relX + relZ * relZ);

                // FIXED: Added 'physics.' prefix to approachDirX and approachDirZ to fix the blank screen ReferenceError crash
                const approachDot = (physics.approachDirX !== undefined) ? (relX * physics.approachDirX + relZ * physics.approachDirZ) : -999;

                // Use the angle-warped green radius instead of a static circle fallback
                const activeRadius = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');

                // Universal procedural apron taper logic for all standard and random holes
                if (currentHoleNumber !== 3) {
                    const apronStart = -activeRadius - 12.0;
                    const apronEnd = -activeRadius;
                    if (approachDot > apronStart && approachDot <= apronEnd) {
                        let tApron = (approachDot - apronStart) / 12.0;
                        // FIXED: Flare out to embrace the full green/fringe radius at the throat entrance
                        const targetApronWidth = Math.max(physics.fairwayWidth, activeRadius + 1.0);
                        fW = THREE.MathUtils.lerp(physics.fairwayWidth, targetApronWidth, tApron);
                    } else if (approachDot > apronEnd) {
                        fW = Math.max(physics.fairwayWidth, activeRadius + 1.0);
                    }
                }

                const fWEdge = fW + 3.5;

                // FIXED: Terminate cutoff cleanly along the green's circular edge and back equator sides
                const isPastFairway = (distToGreenCenter < activeR) || (approachDot > 0 && distToGreenCenter >= activeR);
                const isOnGreenSidesOrBack = (approachDot > 0.0) && (distToGreenCenter >= activeR - 2.0);
                // 1. Calculate exactly where the rough floor mesh sits at this coordinate
                let floorHeight = calculatedHeight;
                if (closeToWater) {
                    // Skip fairway cuts right around the hazard to guarantee uniform alignment with the dirt ring
                } else if (distanceToPath <= fW && !isPastFairway && !isOnGreenSidesOrBack) {
                    floorHeight -= 0.04;
                } else if (distanceToPath <= fWEdge && !isPastFairway && !isOnGreenSidesOrBack) {
                    const t = (distanceToPath - fW) / 3.5;
                    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
                    floorHeight -= THREE.MathUtils.lerp(0.04, 0.0, smoothT);
                }

                // Render the rough floor geometry
                if (targetMesh === floor) {
                    calculatedHeight = floorHeight;
                    if (distToGreen < fringeOuterR) {
                        // Safety buffer zone: Stay perfectly flush at the fringe circle, slope down smoothly underneath it
                        const transitionZone = 2.0;
                        if (distToGreen < fringeOuterR - transitionZone) {
                            calculatedHeight -= 1.5;
                        } else {
                            const tFloor = (fringeOuterR - distToGreen) / transitionZone;
                            const smoothTFloor = tFloor * tFloor * (3 - 2 * tFloor);
                            calculatedHeight -= smoothTFloor * 1.5;
                        }
                    }
                    if (insideSandZone) {
                        calculatedHeight = physics.getGroundHeight(worldX, worldZ) - 1.5; // Modify this line
                    }
                }

                if (targetMesh === fairway) {
                    const isCustomHole = currentHoleConfig && currentHoleConfig.waypoints;
                    // Use the angle-warped green radius so the fairway mesh conforms to the kidney shape bounds
                    const activeR = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');


                    // Isolate boundary/sand hiding rules from green-blending rules
                    const isOutsideFairwayBounds = (distanceToPath > fWEdge) || (!isCustomHole && worldZ > -8.0) || (isCustomHole && currentHoleNumber === 2 && worldZ > -60) || (isCustomHole && currentHoleNumber === 3 && (worldZ > -20.0 || (worldZ <= -115 && worldZ >= -132) || worldZ < -192.0));
                    if (insideSandZone || isOutsideFairwayBounds) {
                        calculatedHeight = insideSandZone ? (physics.getGroundHeight(worldX, worldZ) - 1.5) : (floorHeight - 1.5);
                    } else if (isOnGreenSidesOrBack && distToGreenCenter >= activeR) {
                        calculatedHeight = floorHeight - 1.5;
                    } else if (!insideSandZone && (distToGreenCenter < activeR || isPastFairway || isOnGreenSidesOrBack)) {
                        // Smoothly slope the fairway mesh underground as it meets and slips beneath the green apron
                        const transitionStart = fringeOuterR + 0.2; // Adjusted to start diving seamlessly right before the fringe edge
                        const transitionEnd = activeR - 3.0;
                        if (distToGreenCenter <= transitionEnd) {
                            calculatedHeight = floorHeight - 1.5;
                        } else {
                            const tFairway = (transitionStart - distToGreenCenter) / (transitionStart - transitionEnd);
                            const smoothTFairway = Math.max(0, Math.min(1, tFairway * tFairway * (3 - 2 * tFairway)));

                            // Track what the normal fairway height should have been
                            let normalFairwayHeight = calculatedHeight;
                            if (distanceToPath <= fW) {
                                let cushion = 0.06;
                                if (distToGreenCenter < fringeOuterR + 3.0) { // FIXED: Removed isCustomHole flag to make blend universal
                                    let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                                    cushion = THREE.MathUtils.lerp(-0.06, 0.06, Math.max(0, Math.min(1, tFade)));
                                }
                                normalFairwayHeight += cushion;
                            } else {
                                const t = (distanceToPath - fW) / 3.5;
                                const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);

                                let cushion = closeToWater ? 0.0 : 0.06; // Neutralize the step highlight around lakes
                                if (distToGreenCenter < fringeOuterR + 3.0) { // FIXED: Removed isCustomHole flag to make blend universal
                                    let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                                    cushion = THREE.MathUtils.lerp(-0.06, 0.06, Math.max(0, Math.min(1, tFade)));
                                }
                                const visibleHeight = calculatedHeight + cushion;
                                const hiddenHeight = floorHeight - 1.5;
                                normalFairwayHeight = THREE.MathUtils.lerp(visibleHeight, hiddenHeight, smoothT);
                            }

                            // Blend the normal height cleanly down into the subterranean clearance zone
                            calculatedHeight = THREE.MathUtils.lerp(normalFairwayHeight, floorHeight - 1.5, smoothTFairway);
                        }
                    } else if (distanceToPath <= fW) {
                        let cushion = closeToWater ? 0.0 : 0.06; // Neutralize the step highlight around lakes
                        if (distToGreenCenter < fringeOuterR + 3.0) { // FIXED: Removed isCustomHole flag to make blend universal
                            let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                            cushion = THREE.MathUtils.lerp(-0.06, 0.06, Math.max(0, Math.min(1, tFade)));
                        }
                        calculatedHeight += cushion;
                    } else {
                        const t = (distanceToPath - fW) / 3.5;
                        const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);

                        let cushion = 0.06;
                        if (distToGreenCenter < fringeOuterR + 3.0) { // FIXED: Removed isCustomHole flag to make blend universal
                            let tFade = (distToGreenCenter - fringeOuterR) / 3.0;
                            cushion = THREE.MathUtils.lerp(-0.06, 0.06, Math.max(0, Math.min(1, tFade)));
                        }

                        const visibleHeight = calculatedHeight + cushion;
                        const hiddenHeight = insideSandZone ? (physics.getGroundHeight(worldX, worldZ) - (0.17 + activeSandDepth * 0.35)) : (floorHeight - 1.5);

                        calculatedHeight = THREE.MathUtils.lerp(visibleHeight, hiddenHeight, smoothT);
                    }
                }
            } else {
                // Pull grass meshes underground inside water lines to prevent clipping at the banks
                if (targetMesh === floor || targetMesh === fairway) {
                    calculatedHeight -= 1.5;
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
    if (ball) ball.isSunk = false;
    isOverheadActive = false;
    ballTargetScale = 1.0;
    // NEW: Instantly snap the starting scale to avoid the visual shrinking artifact on loading
    const isMobileOnStart = window.innerWidth <= 768 || window.innerWidth / window.innerHeight < 1;
    const initialTeeScale = isMobileOnStart ? 0.9 : 0.65; /* Matches your custom computer desktop size */
    ballTargetScale = initialTeeScale;
    ball.scale.set(initialTeeScale, initialTeeScale, initialTeeScale);

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

    // FIXED: Force the camera to instantly teleport to the new Tee Box coordinates instead of slowly floating through space from the previous green location
    camera.position.copy(cameraTargetPos);

    sceneryObjects.forEach(obj => scene.remove(obj));
    sceneryObjects = [];

    // Materials for the scenery elements
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1d5330, roughness: 0.6 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.5 });

    // Generate 35 pieces of random scenery scattered along the edges
    for (let i = 0; i < 65; i++) { // Modify this line: increased count to account for skips
        if (currentHoleNumber === 3) continue; // Add this line: Skips background foliage/houses on Hole 3 entirely
        const isHouse = currentHoleNumber === 2 ? false : (Math.random() <= 0.4); // Modify this line: No houses on Green Lakes hole

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
            sceneryGroup.userData = { type: 'tree' };
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
    if (currentHoleNumber === 3) obstacleAttempts = 0;

    // Strictly target random doglegs (Holes 4 and up) to protect your manual configurations
    if (currentHoleNumber >= 4 && currentHoleConfig && currentHoleConfig.waypoints && currentHoleConfig.waypoints.length > 2) { // Add this line
        obstacleAttempts = Math.max(obstacleAttempts, 450);                                 // Add this line
    }

    for (let i = 0; i < obstacleAttempts; i++) { // Modify this line: Replaced 45 with dynamic attempts counter
        let sampleX = (Math.random() - 0.5) * 220;
        if (currentHoleNumber === 2 && sampleX > 0) {
            sampleX += 35.0; // Pushes right-side trees/bushes further right
        }
        let sampleZ = greenCenterZ + Math.random() * (10 - greenCenterZ);

        // 1. 25-Yard Safe Zone Check from both Tee box and Hole Pin
        let distanceToTee = Math.sqrt((sampleX - teeBoxX) * (sampleX - teeBoxX) + (sampleZ - 10) * (sampleZ - 10));
        let distanceToHole = Math.sqrt((sampleX - holePosition.x) * (sampleX - holePosition.x) + (sampleZ - holePosition.z) * (sampleZ - holePosition.z));
        // LINE ABOVE FOR FIND: let distanceToHole = Math.sqrt((sampleX - holePosition.x) * (sampleX - holePosition.x) + (sampleZ - holePosition.z) * (sampleZ - holePosition.z));
        if (distanceToTee < 9.03 || distanceToHole < 9.03) {
            continue;
        }

        // Prevent spawning on or overlapping the putting green (12.0 radius + 3.0 branch buffer)
        let distanceToGreenCenter = Math.sqrt((sampleX - holePosition.x) * (sampleX - holePosition.x) + (sampleZ - holePosition.z) * (sampleZ - holePosition.z));
        if (distanceToGreenCenter < 15.0) {
            continue;
        }
        // Prevent spawning inside sand traps (+1.0 unit buffer padding)
        let insideSandTrap = sandTraps.some(sandMesh => {
            if (sandMesh.userData && sandMesh.userData.isPolygon) { // Add this line
                const points = sandMesh.userData.points;            // Add this line
                let inside = false;                                 // Add this line
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) { // Add this line
                    const xi = points[i].x, zi = points[i].z;       // Add this line
                    const xj = points[j].x, zj = points[j].z;       // Add this line
                    const intersect = ((zi > sampleZ) !== (zj > sampleZ)) && (sampleX < (xj - xi) * (sampleZ - zi) / (zj - zi) + xi); // Add this line
                    if (intersect) inside = !inside;                // Add this line
                }                                                   // Add this line
                return inside;                                      // Add this line
            }                                                       // Add this line
            let dxS = sampleX - sandMesh.position.x;
            let dzS = sampleZ - sandMesh.position.z;
            // FIXED: Look up our live userData radius property, and add a +1.5 buffer cushion to clear foliage limbs
            let sandRadius = (sandMesh.userData && sandMesh.userData.radius ? sandMesh.userData.radius : 5) + 1.5; return Math.sqrt(dxS * dxS + dzS * dzS) < (sandRadius + 1.0);
        });
        if (insideSandTrap) continue;

        // Prevent spawning inside water hazards (+1.5 unit buffer padding)
        let insideWaterHazard = waterHazards.some(waterMesh => {
            if (waterMesh.userData && waterMesh.userData.isRectangular) { // Add this line
                let pathCenter = 0;                                       // Add this line
                if (sampleZ >= -125) {                                    // Add this line
                    let t = (10 - sampleZ) / 135;                         // Add this line
                    pathCenter = THREE.MathUtils.lerp(0, -14.0, t);       // Add this line
                } else {                                                  // Add this line
                    let t = (-125 - sampleZ) / 55;                        // Add this line
                    t = Math.min(1.0, t);                                 // Add this line
                    pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t);    // Add this line
                }                                                         // Add this line
                let cliffPadding = sampleZ < -115 ? THREE.MathUtils.lerp(15.5, 10.5, Math.max(0, Math.min(1, (-115 - sampleZ) / 20.0))) : 15.5; // Add this line
                const cliffEdgeLimit = pathCenter + cliffPadding;         // Add this line
                return sampleX > (cliffEdgeLimit - 1.5);                  // Add this line
            }                                                             // Add this line
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
        let minTreeDist = (currentHoleNumber === 2 && sampleX > 0) ? (physics.fairwayWidth + 14.5) : (physics.fairwayWidth + 6.8);

        let isShortcutZone = false; // Add this line
        // Enforce the forest barrier constraint exclusively on procedural dogleg gaps (Hole 4+)
        if (currentHoleNumber >= 4 && currentHoleConfig && currentHoleConfig.waypoints && currentHoleConfig.waypoints.length > 2) { // Add this line
            const tee = currentHoleConfig.waypoints[0];                                          // Add this line
            const greenPt = currentHoleConfig.waypoints[currentHoleConfig.waypoints.length - 1]; // Add this line
            const minX = Math.min(tee.x, greenPt.x) - 15.0;                                      // Add this line
            const maxX = Math.max(tee.x, greenPt.x) + 15.0;                                      // Add this line
            const minZ = Math.min(tee.z, greenPt.z) - 15.0;                                      // Add this line
            const maxZ = Math.max(tee.z, greenPt.z) + 15.0;                                      // Add this line
            if (sampleX >= minX && sampleX <= maxX && sampleZ >= minZ && sampleZ <= maxZ) {      // Add this line
                isShortcutZone = true;                                                           // Add this line
            }                                                                                    // Add this line
        }                                                                                        // Add this line

        // FIXED: Expanded clearance cushion to clear the smooth transition grass and prevent branches from overlapping the fairway
        if (fairwayDistance <= minTreeDist || (fairwayDistance > maxTreeDist && !isShortcutZone)) { // Modify this line
            continue;
        }

        const sceneryGroup = new THREE.Group();
        const courseHeight = physics.getGroundHeight(sampleX, sampleZ);
        sceneryGroup.position.set(sampleX, courseHeight, sampleZ);

        let generateAsTree = currentHoleNumber === 2 ? (Math.random() < 0.95) : (Math.random() < 0.6);
        if (isShortcutZone) generateAsTree = true; // Add this line: Force a solid wall of trees over bushes in the bypass lane

        if (generateAsTree) {
            sceneryGroup.userData = { type: 'tree' };
            let randomScale = 3.5 + Math.random() * 1.3;
            if (isShortcutZone) randomScale = 6.5 + Math.random() * 2.5; // Add this line: Scales shortcut blocker trees into towering, impenetrable walls
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
                    let leafGeo = new THREE.SphereGeometry(finalizedFoliageRadius * p[3], 24, 24);
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
                    let leafGeo = new THREE.SphereGeometry(calculatedFoliageRad * p[3], 24, 24);
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
                    let leafGeo = new THREE.SphereGeometry(calculatedFoliageRad * p[3], 24, 24);
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
                totalHeight: finalizedTotalHeight,
                version: treeVersion
            });

            // --- DELETE AND REPLACE THE ENTIRE "else" BUSH SCAFFOLD IN src/main.js ---
        } else {
            sceneryGroup.userData = { type: 'bush' };
            let randomBushRad = 0.7 + Math.random() * 1.2;

            // Create a base structural container group to combine twigs, shadow core, and leaf cards
            const bushGroup = new THREE.Group();

            // 1. BASE STEM STRUCTURE: Render exposed dark wood anchor branches at the floor line
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.95 });
            const stemCount = 5 + Math.floor(Math.random() * 3);

            for (let s = 0; s < stemCount; s++) {
                const stemH = randomBushRad * 0.45;
                const stemGeo = new THREE.CylinderGeometry(0.012, 0.03, stemH, 5);
                const stemMesh = new THREE.Mesh(stemGeo, stemMat);

                const stemAngle = (s / stemCount) * Math.PI * 2;
                const outwardTilt = 0.3 + Math.random() * 0.2;

                stemMesh.position.set(
                    Math.cos(stemAngle) * (randomBushRad * 0.12),
                    stemH / 2 - 0.03,
                    Math.sin(stemAngle) * (randomBushRad * 0.12)
                );

                stemMesh.rotation.z = Math.cos(stemAngle) * outwardTilt;
                stemMesh.rotation.x = Math.sin(stemAngle) * outwardTilt;
                bushGroup.add(stemMesh);
            }

            // 2. DARK INTERNAL CORE: Solid dark green center ball to block light and give internal depth
            const shadowMat = new THREE.MeshStandardMaterial({ color: 0x0c260c, roughness: 0.95 });
            const shadowGeo = new THREE.SphereGeometry(randomBushRad * 0.65, 8, 8);
            const shadowCore = new THREE.Mesh(shadowGeo, shadowMat);
            shadowCore.position.y = randomBushRad * 0.4;
            shadowCore.scale.set(1, 0.8, 1); // Flatten slightly to match base dimensions
            bushGroup.add(shadowCore);

            // 3. CARTVECT ILLUSTRATED LEAF LAYER: Layout flat oval card plates facing outward
            const foliageColors = [
                0x144414, // Tier 0: Deep shadow backdrop green
                0x1e5c1e, // Tier 1: Rich vector foliage mid-tone
                0x2c821a, // Tier 2: Bright accent leaf blade green
                0x5cb814  // Tier 3: Chartreuse sun highlight green
            ];

            // Dynamically scale leaf count by the overall random asset radius to protect performance
            const leafCount = Math.floor(45 + (randomBushRad * 45));
            // Standard circle mesh shape that we will squash and stretch into an organic leaf profile
            const leafGeo = new THREE.CircleGeometry(randomBushRad * 0.22, 6);

            for (let l = 0; l < leafCount; l++) {
                // Mathematically distribute coordinates evenly across a upper hemisphere shell
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 0.88); // Prioritizes standard outward/upward facings

                const surfaceDist = randomBushRad * (0.82 + Math.random() * 0.24);
                const pX = Math.sin(phi) * Math.cos(theta) * surfaceDist;
                const pZ = Math.sin(phi) * Math.sin(theta) * surfaceDist;
                const pY = Math.cos(phi) * surfaceDist * 0.85 + (randomBushRad * 0.12);

                const normalizedHeight = pY / (randomBushRad * 1.1);
                let colorIdx = 1;

                if (normalizedHeight > 0.74) {
                    colorIdx = Math.random() > 0.4 ? 3 : 2; // Bright highlights on crown clusters
                } else if (normalizedHeight < 0.38) {
                    colorIdx = 0; // Drop low hidden base foliage to shadow tier
                } else {
                    colorIdx = Math.random() > 0.5 ? 2 : 1; // Blend middle body leaves
                }

                const leafMat = new THREE.MeshStandardMaterial({
                    color: foliageColors[colorIdx],
                    roughness: 0.65,
                    side: THREE.DoubleSide // Essential to allow two-way visibility during target rotations
                });

                const leafMesh = new THREE.Mesh(leafGeo, leafMat);
                leafMesh.position.set(pX, pY, pZ);

                // Point the leaf face directly away from the root center core
                leafMesh.lookAt(new THREE.Vector3(pX * 2, pY + 0.15, pZ * 2));
                // Add a micro random spin twist to avoid computerized patterns
                leafMesh.rotation.z += (Math.random() - 0.5) * 0.6;

                // squash width and extend height to sculpt an illustrated leaf blade contour shape
                leafMesh.scale.set(
                    0.65 + Math.random() * 0.25,
                    1.35 + Math.random() * 0.35,
                    1.0
                );

                bushGroup.add(leafMesh);
            }

            sceneryGroup.add(bushGroup);

            // Sync structural bounds with physical engine limits safely
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

    // NEW: Generate visual 3D White Stakes along the exact Out of Bounds boundary lines
    if (physics && physics.fairwayPoints && physics.fairwayPoints.length > 1) {
        // --- CONFIGURATION CORNER ---
        // Change these two numbers anytime to perfectly control the layout count!
        const STAKES_PER_SIDE = 8; // Total stakes running down each side track
        const STAKES_PER_ROW = 4;  // Total stakes sealing the back wall & front green wall

        const points = physics.fairwayPoints;
        const stakeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 4);
        const stakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }); // Traditional White Stakes
        // Create an extended array of points to carry the rails all the way out to the fence lines
        const boundaryPoints = [...points];

        // Prepend a virtual point extended backward to match the back wall line at z = 25.0
        const pStart = points[0];
        const pNext = points[1] || pStart;
        const dXStart = pStart.x - pNext.x;
        const dZStart = pStart.z - pNext.z;
        const zDistStart = 25.0 - pStart.z;
        const extendedStart = {
            x: pStart.x + (Math.abs(dZStart) > 0.01 ? (dXStart / dZStart) * zDistStart : 0),
            z: 25.0
        };
        boundaryPoints.unshift(extendedStart);

        // Append a virtual point extended forward to match the front wall line at z = holePosition.z - 45.0
        const pEnd = points[points.length - 1];
        const pPrev = points[points.length - 2] || pEnd;
        const dXEnd = pEnd.x - pPrev.x;
        const dZEnd = pEnd.z - pPrev.z;
        const targetZEnd = holePosition.z - 45.0;
        const zDistEnd = targetZEnd - pEnd.z;
        const extendedEnd = {
            x: pEnd.x + (Math.abs(dZEnd) > 0.01 ? (dXEnd / dZEnd) * zDistEnd : 0),
            z: targetZEnd
        };
        boundaryPoints.push(extendedEnd);

        // 1. Automatically calculate spacing and spawn pairs along left/right tracks spanning wall-to-wall
        for (let k = 0; k < STAKES_PER_SIDE; k++) {
            const index = Math.round((k / (STAKES_PER_SIDE - 1)) * (boundaryPoints.length - 1));
            const currentPt = boundaryPoints[index];

            let nextPt = boundaryPoints[index + 1];
            let prevPt = boundaryPoints[index - 1];

            let dirX = 0, dirZ = 0;
            if (nextPt && prevPt) {
                dirX = nextPt.x - prevPt.x;
                dirZ = nextPt.z - prevPt.z;
            } else if (nextPt) {
                dirX = nextPt.x - currentPt.x;
                dirZ = nextPt.z - currentPt.z;
            } else if (prevPt) {
                dirX = currentPt.x - prevPt.x;
                dirZ = currentPt.z - prevPt.z;
            }

            const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
            const perpX = -dirZ / len;
            const perpZ = dirX / len;

            // Left boundary line stake
            const leftX = currentPt.x + perpX * 70.0;
            const leftZ = currentPt.z + perpZ * 70.0;
            const leftY = physics.getGroundHeight(leftX, leftZ);
            const leftStake = new THREE.Mesh(stakeGeo, stakeMat);
            leftStake.position.set(leftX, leftY + 0.4, leftZ);
            scene.add(leftStake);
            sceneryObjects.push(leftStake);

            // Right boundary line stake
            const rightX = currentPt.x - perpX * 70.0;
            const rightZ = currentPt.z - perpZ * 70.0;
            const rightY = physics.getGroundHeight(rightX, rightZ);
            const rightStake = new THREE.Mesh(stakeGeo, stakeMat);
            rightStake.position.set(rightX, rightY + 0.4, rightZ);
            scene.add(rightStake);
            sceneryObjects.push(rightStake);
        }

        // Calculate dynamic horizontal widths from -70 to 70
        const totalWidthRange = 140;
        const rowSpacing = totalWidthRange / Math.max(1, STAKES_PER_ROW - 1);

        // 2. Spawn evenly spaced closing row behind the Tee Box (at z = 25.0)
        for (let k = 0; k < STAKES_PER_ROW; k++) {
            const xOffset = -70.0 + (k * rowSpacing);
            const sX = boundaryPoints[0].x + xOffset;
            const sZ = 25.0;
            const sY = physics.getGroundHeight(sX, sZ);
            const backStake = new THREE.Mesh(stakeGeo, stakeMat);
            backStake.position.set(sX, sY + 0.4, sZ);
            scene.add(backStake);
            sceneryObjects.push(backStake);
        }

        // 3. Spawn evenly spaced closing row beyond the Green (at z = holePosition.z - 45.0)
        for (let k = 0; k < STAKES_PER_ROW; k++) {
            const xOffset = -70.0 + (k * rowSpacing);
            const sX = boundaryPoints[boundaryPoints.length - 1].x + xOffset;
            const sZ = holePosition.z - 45.0;
            const sY = physics.getGroundHeight(sX, sZ);
            const frontStake = new THREE.Mesh(stakeGeo, stakeMat);
            frontStake.position.set(sX, sY + 0.4, sZ);
            scene.add(frontStake);
            sceneryObjects.push(frontStake);
        }
    }

    generateNewWind();
    updateDistanceDisplay();

    const totalDx = ball.position.x - holePosition.x;
    const totalDz = ball.position.z - holePosition.z;
    currentHoleYards = Math.round(Math.sqrt(totalDx * totalDx + totalDz * totalDz) * 2.76923);
}


function animate() {
    requestAnimationFrame(animate);
    if (input) input.isOverheadActive = isOverheadActive;

    // Update backspin button visibility state based on aim mode and active club choice
    const backspinBtn = document.getElementById('backspinBtn');
    if (backspinBtn && input) {
        const activeClub = input.getClubInfo();
        const allowedClub = activeClub && (activeClub.name === '9 Iron' || activeClub.name === 'PW Iron' || activeClub.name === 'SW Iron');

        if (input.isAimMode && allowedClub && !physics.isMoving && !isSinking) {
            backspinBtn.classList.remove('hidden');
        } else {
            backspinBtn.classList.add('hidden');
        }
    }

    // UPDATED BLOCK: Smooth infinite background cloud texture glide
    const dynamicCloudMesh = document.getElementById('cloudSkyLayer');
    if (dynamicCloudMesh) {
        // Base movement velocity tied directly to your active weather wind speed profiles
        const atmosphericVelocity = (currentWindSpeed * 0.0005) + 0.04;

        // Accumulate horizontal directional texture coordinates following the active wind vectors
        cloudOffsetX += 0.04 + (Math.sin(currentWindAngle) * currentWindSpeed * 0.0005);

        // FIXED: Locks vertical axis to 0px so your repeating texture glides level along the repeat-x strip
        dynamicCloudMesh.style.backgroundPosition = `${cloudOffsetX}px 0px`;
    }

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

                    // Fetch the airborne/ground timeScale modifier from the engine dynamically
                    const currentTS = (ball.position.y > (0.25 + physics.getGroundHeight(ball.position.x, ball.position.z)) || physics.velocity.y > 0) ? 0.6 : 1.0;

                    // Determine rotation angle proportional to actual distance traveled per calculation step
                    const angle = (speed * currentTS) / 0.25;

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

    // FIXED: Dynamic out-of-bounds boundary check based on distance to the hole's centerline track
    let isOutOfBounds = false;
    if (physics) {
        const distanceToPath = physics.getDistanceToSpline(ball.position.x, ball.position.z);
        // Out of Bounds activates if ball is 70+ units from path, 25 units behind tee, or 45 units beyond the hole
        if (distanceToPath > 70.0 || ball.position.z > 25.0 || ball.position.z < holePosition.z - 45.0) {
            isOutOfBounds = true;
        }
    }

    if (!isSinking && isOutOfBounds && !isOutOfBoundsResetting) {
        isOutOfBoundsResetting = true;

        // FORCE THE BALL TO STOP MOVING IMMEDIATELY
        if (physics) {
            physics.velocity.set(0, 0, 0);
            physics.isMoving = false;
        }
        wasMoving = false;

        // Clear the visual shot tracer line immediately
        tracerPoints = [];
        if (ballTracer) ballTracer.geometry.setFromPoints([]);

        // Add the penalty stroke
        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;

        setTimeout(() => {
            alert(`Out of Bounds! 🏳️ One stroke penalty. Dropping back where you last hit.`);

            ball.position.x = window.shotStartX !== undefined ? window.shotStartX : 0;
            ball.position.z = window.shotStartZ !== undefined ? window.shotStartZ : 10;
            ball.position.y = physics.getGroundHeight(ball.position.x, ball.position.z) + 0.25;
            ball.visible = true;

            if (teeBox && window.shotStartZ !== undefined && window.shotStartZ > 5.0) {
                teeBox.visible = true;
            }

            // Re-align the camera safely behind the ball looking toward the hole cup
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
            const backX = -(dirX / length) * 7.5;
            const backZ = -(dirZ / length) * 7.5;
            cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ);
            cameraLookAt.set(ball.position.x + (dirX / length) * 12.0, ball.position.y, ball.position.z + (dirZ / length) * 12.0);

            // Re-verify the stroke UI display text is forced visible after the alert closes
            document.getElementById('strokeText').innerText = strokeCount;
            updateDistanceDisplay();
            isOutOfBoundsResetting = false;
        }, 30);
        return;
    }

    // FIXED: Re-added your Water Hazard tracker check
    if (!isSinking && physics && physics.hitWater) { // Modify this line
        physics.hitWater = false;

        physics.velocity.set(0, 0, 0);
        physics.isMoving = false;
        wasMoving = false;
        tracerPoints = [];
        if (ballTracer) ballTracer.geometry.setFromPoints([]);
        strokeCount += 1;
        document.getElementById('strokeText').innerText = strokeCount;

        setTimeout(() => {
            alert(`Water Hazard! 🌊 One stroke penalty. Dropping back where you last hit.`);

            ball.position.x = window.shotStartX !== undefined ? window.shotStartX : 0;
            ball.position.z = window.shotStartZ !== undefined ? window.shotStartZ : 10;
            ball.position.y = physics.getGroundHeight(ball.position.x, ball.position.z) + 0.25;
            ball.visible = true;

            // Modify this block: Check the captured shot start directly to beat the first-frame physics jump
            if (teeBox && window.shotStartZ !== undefined && window.shotStartZ > 5.0) {
                teeBox.visible = true;
            }

            // Re-align the camera safely behind the ball looking toward the hole cup
            const dirX = holePosition.x - ball.position.x;
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

        // Tightened physics trigger to perfectly match your 0.17 visual cup radius so it never captures early from the right
        const dynamicCaptureRadius = (!physics.isMoving || physics.velocity.length() < 0.05) ? 0.18 : 0.13;

        // FIXED: Added a +0.15 vertical tolerance cushion to ensure the ball triggers capture 
        // even with minor floating-point variations or light bounces on the 3D mound
        if (distanceToHole < dynamicCaptureRadius && ball.position.y <= (0.25 + physics.getGroundHeight(ball.position.x, ball.position.z) + 0.15)) {
            const rawSpeed = physics.velocity.length();

            // Calculate true world speed translation based on internal engine time scaling profiles
            const currentScale = (physics && physics.isPutting) ? 0.70 : 1.0;
            const trueWorldSpeed = rawSpeed * currentScale;

            // A uniform physical threshold standard (0.24) applied equally to both chips and putts
            const maxWorldSinkSpeed = 0.14;

            // Realism Lip-out simulation based on true physical ground speed limits
            if (trueWorldSpeed > maxWorldSinkSpeed) {
                if (trueWorldSpeed > 0.48) return; // Add this line: Smashed putts roll straight over the cup

                const perpX = -dz / distanceToHole;
                const perpZ = dx / distanceToHole;

                // Centripetal sling wraps the ball around the lip edge based on velocity
                const slingX = (physics.velocity.x * 0.4) + (perpX * rawSpeed * 0.6); // Add this line
                const slingZ = (physics.velocity.z * 0.4) + (perpZ * rawSpeed * 0.6); // Add this line
                const slingLen = Math.sqrt(slingX * slingX + slingZ * slingZ) || 1; // Add this line

                physics.velocity.x = (slingX / slingLen) * rawSpeed * 0.95; // Modify this line: Maintains full ball speed
                physics.velocity.z = (slingZ / slingLen) * rawSpeed * 0.95; // Modify this line: Maintains full ball speed
                return;
            }
            isSinking = true;
            physics.velocity.set(0, 0, 0);
            physics.isMoving = false;
            wasMoving = false;

            // REMOVED instant horizontal teleportation to allow a smooth gravitational dropping profile
        }
    }
    if (isSinking) {
        // Smoothly pull the ball horizontally toward the exact center of the cup while it drops to create a natural gravity effect
        ball.position.x = THREE.MathUtils.lerp(ball.position.x, holePosition.x, 0.25);
        ball.position.z = THREE.MathUtils.lerp(ball.position.z, holePosition.z, 0.25);

        // Linearly drop the ball downward beneath the flat ground plane layout
        // FIXED: Only subtract height if the ball hasn't reached its hidden subterranean resting limit yet
        const localCupFloor = physics.getGroundHeight(holePosition.x, holePosition.z) - 0.45; /* Deeper cup floor to let the ball fully plunge underground */
        if (ball.position.y > localCupFloor) {
            ball.position.y -= 0.04; /* Snap down faster to simulate weight/gravity */
        }

        // Once it drops safely inside the hole depth out of sight (Y <= localCupFloor)
        if (ball.position.y <= localCupFloor && !ball.isSunk) { // Update this line
            ball.isSunk = true; // Add this line: Prevents the loop from firing multiple times
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

            // Give the browser 2000ms to observe the ball resting inside the hole structure
            setTimeout(() => {
                ball.position.y = -999; // Add this line: Hide the ball when scorecard appears
                // Add this block: Submits current metrics to historical ledger array and invokes card interface layout
                completedHoles.push({
                    hole: currentHoleNumber,
                    par: currentPar,
                    yards: currentHoleYards,
                    score: strokeCount
                });
                showScorecard();
            }, 2000); // Update this line: Set to 2 full seconds
            return;
        }
    }

    // 3. DYNAMIC CAMERA CONTROLLER


    if (physics.isMoving) {
        if (!wasMoving) {
            wasMoving = true;
            shotStartTime = performance.now(); // Record launch timestamp


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
                // FIXED: Factor in the exact proximity factor active at address so the ball launches at its true rendered size
                const addressCamDist = camera.position.distanceTo(ball.position);
                const baseScale = isCurrentMobile ? 0.75 : 0.70;
                if (addressCamDist < 9.5) {
                    const dxH = holePosition.x - ball.position.x;
                    const dzH = holePosition.z - ball.position.z;
                    const yardsToPin = Math.sqrt(dxH * dxH + dzH * dzH) * 2.76923;
                    const chipScaleFloor = yardsToPin < 25.0 ? 0.82 : 0.55;
                    const prox = THREE.MathUtils.clamp(addressCamDist / 9.5, chipScaleFloor, 1.0);
                    window.shotStartScale = baseScale * prox;
                } else {
                    window.shotStartScale = baseScale;
                }
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
        } else if (!isLongShot) {
            // FIXED: For short shots where the camera is stationary, lock code scale to launch size
            // and let natural WebGL 3D perspective handle making the ball smaller as it rolls away
            ballTargetScale = activeLaunchScale;
        } else {
            // For long shots where the camera actively chases the ball, manually scale down to simulate height/distance
            ballTargetScale = Math.max(0.30, activeLaunchScale - (distanceTraveled * 0.0035));
        }
        if (isLongShot) {
            if ((performance.now() - shotStartTime > (window.cameraDelayTime || 2000)) && !isOverheadActive) {
                const dirX = holePosition.x - ball.position.x;
                const dirZ = holePosition.z - ball.position.z;
                const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

                // ADJUSTED: Pushed horizontal cushion back to 20.0 to stay further behind the ball
                const backX = -(dirX / length) * 20.0;
                const backZ = -(dirZ / length) * 20.0;

                const moveCamX = ball.position.x + backX; // Add this line
                const moveCamZ = ball.position.z + backZ; // Add this line
                const moveCamGroundY = physics.getGroundHeight(moveCamX, moveCamZ); // Add this line: Samples ground directly beneath moving camera

                // ADJUSTED: Raised vertical cushion to 5.5 to keep a higher, clear blimp-style angle
                const moveCamY = Math.max(ball.position.y + 5.5, moveCamGroundY + 5.5);

                cameraTargetPos.set(moveCamX, moveCamY, moveCamZ); // Modify this line

                // ADJUSTED: Framed slightly forward (4.5) to tilt the camera view down the fairway path
                cameraLookAt.set(ball.position.x + (dirX / length) * 4.5, ball.position.y, ball.position.z + (dirZ / length) * 4.5);
            }

        } else if (!isOverheadActive) { }
    } else {
        if (wasMoving) {
            wasMoving = false;
            tracerPoints = []; // Add this line: Empties the line point rendering path history array
            if (ballTracer) ballTracer.geometry.setFromPoints([]); // Add this line: Erases the path geometry line visually from screen
            updateDistanceDisplay();
        }

        const camGreenX = ball.position.x - (green ? green.position.x : 0);
        const camGreenZ = ball.position.z - greenCenterZ;
        const camGreenDist = Math.sqrt(camGreenX * camGreenX + camGreenZ * camGreenZ);
        const camGreenAngle = Math.atan2(-camGreenZ, camGreenX);
        const activeR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(camGreenAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;

        const currentClub = input ? input.getClubInfo() : null;
        const onGreen = camGreenDist < activeR || (currentClub && currentClub.name === 'Putter'); // Sets putting size profiles if Putter is selected on fringe
        // Detect if screen width is mobile or portrait orientation at top of block
        // Detect if screen width is mobile or portrait orientation at top of block
        const isMobile = window.innerWidth <= 768 || window.innerWidth / window.innerHeight < 1;

        if (teeBox && teeBox.visible) {
            // NEW: Separate mobile and desktop sizing for the Tee
            ballTargetScale = isMobile ? 0.9 : 0.80; // Change first number for mobile, second for desktop
        } else if (onGreen) {
            ballTargetScale = 0.30;  // Change this number to adjust size when Putting
        } else {
            ballTargetScale = isMobile ? 0.75 : 0.70; // Fairway, rough, and sand size
        }

        const isSand = physics && physics.isBallInSand();

        // NEW: Calculate true distance to the hole pin to detect short chip-shot scenarios
        const dxHole = holePosition.x - ball.position.x;
        const dzHole = holePosition.z - ball.position.z;
        const holeDistYards = Math.sqrt(dxHole * dxHole + dxHole * dzHole) * 2.76923;
        const isChippingClose = !onGreen && holeDistYards < 25.0;

        // ADJUSTED: Tighten camera profile for close chip situations so you can see the hole path clearly
        const camDist = onGreen ? 2.5 : (isSand ? 5.0 : (isChippingClose ? 4.5 : 7.5));
        const camHeight = onGreen ? 1.0 : (isSand ? 2.0 : (isChippingClose ? 1.4 : 2.2));
        const lookDist = onGreen ? 6.0 : (isSand ? 4.0 : (isChippingClose ? 8.0 : 15.0));
        if (!isOverheadActive) {
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

            // Look for these lines to find your spot:
            const aimDirX = Math.sin(angle);
            const aimDirZ = Math.cos(angle);

            const lookTargetX = ball.position.x + aimDirX * lookDist;
            const lookTargetZ = ball.position.z + aimDirZ * lookDist;
            let lookTargetY = physics.getGroundHeight(lookTargetX, lookTargetZ); // Modify this line: Changed 'const' to 'let'

            // Add this block: Overrides the downward tilt at the tee box so the 2D club overlay aligns perfectly
            if (teeBox && teeBox.visible) {
                lookTargetY = ball.position.y - 0.37;
            }


            const camX = ball.position.x - aimDirX * camDist; // Add this line
            const camZ = ball.position.z - aimDirZ * camDist; // Add this line
            const camGroundY = physics.getGroundHeight(camX, camZ); // Add this line: Samples the hill height behind the ball

            // FIXED: Prevent the camera from plunging if the ball is sinking into the cup
            const stableBallHeight = isSinking ? (physics.getGroundHeight(ball.position.x, ball.position.z) + 0.25) : ball.position.y;
            const camY = isSand ? (stableBallHeight + camHeight) : Math.max(stableBallHeight + camHeight, camGroundY + camHeight);

            cameraTargetPos.set(camX, camY, camZ); // Modify this line
            cameraLookAt.set(lookTargetX, lookTargetY + (onGreen ? 0.35 : 0.0), lookTargetZ); // Keep this line
        }
    }


    // <-- This brace closes the entire "ball is not moving" section

    const ballGreenX = ball.position.x - (green ? green.position.x : 0);
    const ballGreenZ = ball.position.z - greenCenterZ;
    const bgDist = Math.sqrt(ballGreenX * ballGreenX + ballGreenZ * ballGreenZ);
    const bgAngle = Math.atan2(-ballGreenZ, ballGreenX);
    const bgActiveR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(bgAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;

    const currentClub = input ? input.getClubInfo() : null;
    // Expands the circle check to include the fringe boundary if holding the Putter
    const isBallInGreenCircle = bgDist < bgActiveR || (currentClub && currentClub.name === 'Putter' && bgDist <= bgActiveR + 2.5);
    const isCamOnGreen = isBallInGreenCircle && (ball.position.y <= physics.getGroundHeight(ball.position.x, ball.position.z) + 0.5);
    // === PASTE THIS REPLACEMENT CODE BLOCK ===
    // 1. DEFAULT SPEED: Set to 0.25 when stationary so the camera instantly snaps into the address 
    // position behind the ball the moment it stops, completely removing the "too far away to hit" delay lag.
    let activeCameraSpeed = physics.isMoving ? 0.05 : 0.25;

    // FIXED: Responsive chase speed (0.035 instead of 0.005) allows camera to slow down precisely WITH the ball on bounce impact
    if (physics.isMoving && isLongShot && (performance.now() - shotStartTime > 2000) && !isOverheadActive) {
        activeCameraSpeed = 0.035;
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


    const checkX = ball.position.x - (green ? green.position.x : 0);
    const checkZ = ball.position.z - greenCenterZ;
    const checkDist = Math.sqrt(checkX * checkX + checkZ * checkZ);
    const checkAngle = Math.atan2(-checkZ, checkX);
    const activeR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(checkAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;

    if ((checkDist < activeR || (currentClub && currentClub.name === 'Putter')) && !isOverheadActive) {
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

        // UPDATED: Starting the tilt sooner (3.5 yards) and dropping lookAheadDist to 0.0 for a clean top-down view when close
        let lookAheadDist = 6.0;
        const distToHole = Math.sqrt((holePosition.x - ball.position.x) * (holePosition.x - ball.position.x) + (holePosition.z - ball.position.z) * (holePosition.z - ball.position.z));
        if (distToHole < 3.5) {
            const factor = distToHole / 3.5; // 0 when right at the cup, 1 when 3.5 yards away
            lookAheadDist = THREE.MathUtils.lerp(0.0, 6.0, factor);

            // Dynamically increase camera height and pull in distance to create a steep, clear top-down perspective
            rigidCamHeight = THREE.MathUtils.lerp(aspect < 1 ? 2.0 : 2.2, rigidCamHeight, factor);
            rigidCamDist = THREE.MathUtils.lerp(aspect < 1 ? 1.7 : 2.5, rigidCamDist, factor);
            lookUpOffset = THREE.MathUtils.lerp(-0.15, lookUpOffset, factor);
        }

        // MODIFIED: Anchor the camera position base to the stable shot origin (refX, refZ) during an active putt.
        // This keeps the camera steady behind the initial hitting zone while letting the ball smoothly roll away down the green.
        const camBaseX = physics.isPutting ? refX : ball.position.x;
        const camBaseZ = physics.isPutting ? refZ : ball.position.z;

        // FIXED: Establish a stable height anchor so the camera stays on the green surface while the ball sinks underground
        const stableBallY = isSinking ? (physics.getGroundHeight(holePosition.x, holePosition.z) + 0.25) : ball.position.y;

        const putterCamX = camBaseX - dirX * rigidCamDist;
        const putterCamZ = camBaseZ - dirZ * rigidCamDist;
        const putterCamGroundY = physics.getGroundHeight(putterCamX, putterCamZ); // Samples hill contours under the camera
        const putterCamY = Math.max(stableBallY + rigidCamHeight, putterCamGroundY + rigidCamHeight); // Keeps view cleanly elevated over the green edge

        cameraTargetPos.set(putterCamX, putterCamY, putterCamZ);

        cameraLookAt.set(
            (isSinking ? holePosition.x : ball.position.x) + dirX * lookAheadDist,
            stableBallY + lookUpOffset,
            (isSinking ? holePosition.z : ball.position.z) + dirZ * lookAheadDist
        );
        // FIXED: Dropped from a rigid 1.0 to a smooth fluid interpolation tracking system. 
        // Set to 0.04 when moving so the ball can roll away from the camera naturally down the line.
        // Set to 0.08 when stationary so the camera glides gracefully into position at address.
        activeCameraSpeed = physics.isMoving ? (physics.isPutting ? 0.015 : 0.04) : 0.08;
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

    let finalBallTargetScale = ballTargetScale;
    if (isCamOnGreen) {
        // 1.0 keeps the ball size perfectly constant whether it is rolling or sitting completely still
        finalBallTargetScale *= 0.85;
    }


    // NEW: Keep full scale during the plunge, only zero out once resting out of sight at the bottom
    if (isSinking) {
        if (ball.isSunk) {
            finalBallTargetScale = 0.001;
        }
    }

    // FIXED: Dynamically scale down the ball smoothly if the camera transitions closer, preventing ballooning
    const cameraDistanceToBall = camera.position.distanceTo(ball.position);
    if (cameraDistanceToBall < 9.5 && !isCamOnGreen && !physics.isMoving) { // MODIFIED: Added !physics.isMoving check
        // NEW: Calculate distance to hole to avoid aggressive shrinking on delicate chips
        const dxH = holePosition.x - ball.position.x;
        const dzH = holePosition.z - ball.position.z;
        const yardsToPin = Math.sqrt(dxH * dxH + dzH * dzH) * 2.76923;
        const chipScaleFloor = yardsToPin < 25.0 ? 0.82 : 0.55; // Keeps ball full and visible when near green

        // Clamp the proximity modifier to keep visual scale completely stable during close-up chips and approaches
        const proximityFactor = THREE.MathUtils.clamp(cameraDistanceToBall / 9.5, chipScaleFloor, 1.0);
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

                // Add these lines: Calculates the ball's real-time 2D screen percentage height
                const tempProj = new THREE.Vector3();
                ball.getWorldPosition(tempProj);
                tempProj.project(camera);
                const ballBottomPercent = (tempProj.y * 0.5 + 0.5) * 100;
                const dynamicBottom = ballBottomPercent - 4.0; // Automatically tracks ball equator with calibration offset

                // Establish base club layout shapes
                let clubTypeClass = 'iron';
                if (activeClub.name === 'Putter') {
                    clubTypeClass = 'putter';
                } else if (activeClub.name === 'Driver' || activeClub.name.includes('Wood') || activeClub.name === 'Hybrid') {
                    clubTypeClass = 'wood';
                }

                // Calibrated baseline position mapping perfectly to our 35-degree vertical camera projection
                const cX = ball.position.x - (green ? green.position.x : 0);
                const cZ = ball.position.z - greenCenterZ;
                const activeRadiusOffset = window.activeGreenRadius || GREEN_RADIUS;
                const ballOnGreen = Math.sqrt(cX * cX + cZ * cZ) < activeRadiusOffset;
                // Delete the old static putterBaseBottom line from here

                const putterCenteredLeft = 'calc(50% - 77.5px)';
                const aimClass = input.isAimMode ? ' aim-mode' : '';

                // Capture if the tutorial is currently highlighting the club before overwriting
                const tutorialHighlight = clubSwipeElement.classList.contains('tutorial-highlighted') ? ' tutorial-highlighted' : '';

                if (input.state === 'IDLE') {
                    clubSwipeElement.className = `idle-stance ${clubTypeClass}${aimClass}${tutorialHighlight}`;

                    clubSwipeElement.style.setProperty('bottom', `${dynamicBottom}%`, 'important'); // Add this line: Locks ALL clubs to follow ball height

                    if (activeClub.name === 'Putter') {
                        // Delete the old inline style bottom line from here
                        clubSwipeElement.style.setProperty('left', putterCenteredLeft, 'important');
                        clubSwipeElement.style.setProperty('transform', `rotate(0deg) scale(${ballOnGreen ? 1.4 : 1.10})`, 'important');
                    } else {
                        // Delete clubSwipeElement.style.bottom = ''; from here
                        clubSwipeElement.style.left = '';
                        clubSwipeElement.style.transform = '';
                    }
                } else if (input.state === 'PULLBACK') {
                    clubSwipeElement.className = `pullback-stance ${clubTypeClass}${aimClass}`;

                    if (activeClub.name === 'Putter') {
                        // NEW: Dynamically map the club's position directly to the real-time drag ratio
                        const ratio = input.pullRatio || 0;
                        const currentBottom = dynamicBottom - (6.0 * ratio); // Modify this line: Pull back relative to dynamic hill height
                        const currentLeft = putterCenteredLeft;
                        const currentRotate = 0;

                        clubSwipeElement.style.setProperty('bottom', `${currentBottom}%`, 'important');
                        clubSwipeElement.style.setProperty('left', currentLeft, 'important');
                        clubSwipeElement.style.setProperty('transform', `rotate(${currentRotate}deg) scale(${ballOnGreen ? 1.4 : 1.10})`, 'important');
                    } else {
                        // Clean defaults for woods/irons if pulled back
                        clubSwipeElement.style.bottom = '';
                        clubSwipeElement.style.left = '';
                        clubSwipeElement.style.transform = '';
                    }
                }

            } else {
                // Clear all classes to hide the club entirely when the ball is in motion
                clubSwipeElement.className = '';
                clubSwipeElement.style.bottom = ''; // Add this line: Clean up alignment tracking style variables when hidden
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
                // Smoothly fade waves down over the outer 1.5 units of the lake profile
                let waveFade = Math.max(0, Math.min(1, (lakeRadius - distFromCenter) / 1.5));
                if (mesh.userData && mesh.userData.isRectangular) {
                    waveFade = 1.0; // Keep waves active across the entire ocean surface
                }

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

    // Add this block: Procedural 3D Rain Generation and Particle Recycling Simulation
    if (isRaining && rainParticles.length < 120 && scene) {
        const rGeo = new THREE.BoxGeometry(0.015, 0.4, 0.015);
        const rMat = new THREE.MeshBasicMaterial({ color: 0x8cc4f4, transparent: true, opacity: 0.35 });
        for (let i = 0; i < 3; i++) {
            const rMesh = new THREE.Mesh(rGeo, rMat);
            rMesh.position.set(
                ball.position.x + (Math.random() - 0.5) * 55,
                ball.position.y + 10 + Math.random() * 8,
                ball.position.z + (Math.random() - 0.5) * 55
            );
            scene.add(rMesh);
            rainParticles.push(rMesh);
        }
    }
    for (let i = rainParticles.length - 1; i >= 0; i--) {
        const p = rainParticles[i];
        p.position.y -= 0.38; // Speed of falling drops
        const currentFloor = physics ? physics.getGroundHeight(p.position.x, p.position.z) : 0;
        if (p.position.y < currentFloor) {
            // Recycle drops back into the sky boundary context box following the ball to save memory
            p.position.y = ball.position.y + 11 + Math.random() * 5;
            p.position.x = ball.position.x + (Math.random() - 0.5) * 55;
            p.position.z = ball.position.z + (Math.random() - 0.5) * 55;
        }
    }

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

    // --- ADD THIS BLOCK: X-RAY GHOST OBSTRUCTION FADER ---
    if (sceneryObjects && sceneryObjects.length > 0 && camera && ball && !isOverheadActive) { // Modify this line: Target the 3D meshes instead of physics data[cite: 2]
        // Create a raycaster pointing from the camera directly to the center of the ball
        const raycaster = new THREE.Raycaster();
        const camToBallDir = new THREE.Vector3().subVectors(ball.position, camera.position);
        const distanceToBall = camToBallDir.length();
        camToBallDir.normalize();
        raycaster.set(camera.position, camToBallDir);

        // Raycast straight against your active 3D world models array
        const intersects = raycaster.intersectObjects(sceneryObjects, true); // Modify this line: Target sceneryObjects directly[cite: 2]

        // Reset all obstacles back to fully solid by default
        sceneryObjects.forEach(mesh => { // Modify this line: Target sceneryObjects directly[cite: 2]
            mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => { mat.transparent = false; mat.opacity = 1.0; });
                    } else {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                }
            });
        });

        // If any obstacles cut directly between the camera lens and the ball, drop their opacity to 0.20
        intersects.forEach(hit => {
            if (hit.distance < distanceToBall) {
                hit.object.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => { mat.transparent = true; mat.opacity = 0.20; });
                        } else {
                            child.material.transparent = true;
                            child.material.opacity = 0.20;
                        }
                    }
                });
            }
        });
    }

    // --- NEW: TREE AND BUSH WIND SWAY ANIMATION ---
    if (sceneryObjects && sceneryObjects.length > 0) {
        const time = currentTime * 0.003;
        const baseDirX = Math.sin(currentWindAngle);
        const baseDirZ = -Math.cos(currentWindAngle);

        // Pseudo-random overlapping waves to simulate natural unpredictable wind gusts, lulls, and absolute stops
        const gustFactor = Math.max(0, (
            Math.sin(time * 0.12) * 0.4 +
            Math.cos(time * 0.35) * 0.3 +
            Math.sin(time * 0.03) * 0.5 +
            0.1
        ));

        sceneryObjects.forEach(obj => {
            if (obj.userData && obj.userData.type === 'tree') {
                // Keep the trunk container perfectly vertical and rigid
                obj.rotation.z = 0;
                obj.rotation.x = 0;

                // Animate only the green foliage children meshes
                obj.children.forEach(child => {
                    if (child.geometry && (child.geometry.type === 'SphereGeometry' || child.geometry.type === 'ConeGeometry')) {
                        // Store reference positions on the first frame so they don't drift away
                        if (child.userData.origX === undefined) {
                            child.userData.origX = child.position.x;
                            child.userData.origZ = child.position.z;
                        }

                        if (currentWindSpeed > 0 && gustFactor > 0) {
                            const phase = (obj.position.x * 0.15) + (obj.position.z * 0.15);
                            const swayOscillation = Math.sin(time * 1.0 + phase) * 0.012 * currentWindSpeed * gustFactor;
                            const constantTilt = 0.002 * currentWindSpeed * gustFactor;
                            const totalSway = constantTilt + swayOscillation;

                            if (child.geometry.type === 'ConeGeometry') {
                                // Triangle Pine Trees: Lock the base center position to the trunk axis and apply bending angular rotation
                                const halfHeight = (child.geometry.parameters && child.geometry.parameters.height) ? (child.geometry.parameters.height / 2) : 0.5;
                                const coneTilt = totalSway * 1.00; // Pronounced bending factor for the conical tops

                                child.rotation.z = -baseDirX * coneTilt;
                                child.rotation.x = baseDirZ * coneTilt;

                                // Trigonometric counter-offset keeps the bottom face perfectly pinned to the trunk while leaning
                                child.position.x = child.userData.origX - halfHeight * Math.sin(child.rotation.z);
                                child.position.z = child.userData.origZ + halfHeight * Math.sin(child.rotation.x);
                            } else {
                                // Big Round Trees: Continue using smooth horizontal shearing position offsets as preferred
                                child.position.x = child.userData.origX + (baseDirX * totalSway * child.position.y * 0.5);
                                child.position.z = child.userData.origZ + (baseDirZ * totalSway * child.position.y * 0.5);
                                child.rotation.z = 0;
                                child.rotation.x = 0;
                            }
                        } else {
                            // Reset foliage to baseline coordinates on completely calm wind conditions
                            child.position.x = child.userData.origX;
                            child.position.z = child.userData.origZ;
                            child.rotation.z = 0;
                            child.rotation.x = 0;
                        }
                    }
                });
            }
            else if (obj.userData && obj.userData.type === 'bush') {
                // Bushes don't have trunks, so they can safely sway as a whole unit
                if (currentWindSpeed > 0 && gustFactor > 0) {
                    const phase = (obj.position.x * 0.15) + (obj.position.z * 0.15);
                    const swayOscillation = Math.sin(time * 1.0 + phase) * 0.012 * currentWindSpeed * gustFactor;
                    const constantTilt = 0.002 * currentWindSpeed * gustFactor;
                    const totalSway = (constantTilt + swayOscillation) * 0.8;

                    obj.rotation.z = -baseDirX * totalSway;
                    obj.rotation.x = baseDirZ * totalSway;
                } else {
                    obj.rotation.z = 0;
                    obj.rotation.x = 0;
                }
            }
        });
    }

    renderer.render(scene, camera); // Preserved: Main renderer pipeline stays intact
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



    // 5. Add Virtual Golf Green Floor (Optimized grid segments to prevent mobile browser crash overhead)
    const floorGeo = new THREE.PlaneGeometry(300, 800, 100, 200);

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

    // Balanced geometric limits ensuring smooth organic curved shapes while minimizing performance weight
    const fairwayGeo = new THREE.PlaneGeometry(300, 800, 100, 200);

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

    // Cache original layout templates to allow infinite clean shape-warping transforms
    greenGeo.userData.origXY = [];
    for (let i = 0; i < greenGeo.attributes.position.count; i++) {
        greenGeo.userData.origXY.push({ x: greenGeo.attributes.position.getX(i), y: greenGeo.attributes.position.getY(i) });
    }
    gridGeo.userData.origXY = [];
    for (let i = 0; i < gridGeo.attributes.position.count; i++) {
        gridGeo.userData.origXY.push({ x: gridGeo.attributes.position.getX(i), y: gridGeo.attributes.position.getY(i) });
    }

    const greenMat = new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true });
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
    fringeGeo.userData.origXY = [];
    for (let i = 0; i < fringeGeo.attributes.position.count; i++) {
        fringeGeo.userData.origXY.push({ x: fringeGeo.attributes.position.getX(i), y: fringeGeo.attributes.position.getY(i) });
    }
    const fringeMat = new THREE.MeshStandardMaterial({
        roughness: 0.85,
        vertexColors: true,
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

    // --- PUT THIS NEW SPECIFICATION IN ITS PLACE ---
    // Increased geometric resolution (64, 4) to allow smooth hill molding profiles
    const ringGeo = new THREE.RingGeometry(3.0, 3.6, 64, 4);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 1.0 });
    clubLandingRing = new THREE.Mesh(ringGeo, ringMat);
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
        window.shotStartX = ball.position.x; // Add this line
        window.shotStartZ = ball.position.z;
        isOverheadActive = false;

        // Reset backspin parameters back to off default upon striking the shot
        isBackspinOn = false;
        const currentBackspinBtn = document.getElementById('backspinBtn');
        if (currentBackspinBtn) {
            currentBackspinBtn.innerText = "BACKSPIN OFF";
            currentBackspinBtn.style.borderColor = "#ffffff";
            currentBackspinBtn.style.color = "#ffffff";
        }

        if (input) { input.aimAngleOffset = 0; input.isAimMode = false; }

        // FIXED: Capture if the ball is struck off the tee box before hiding its template mesh structure
        const isOffTee = teeBox && teeBox.visible;

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

        // FIXED: Measures from the green's center using shape-aware angles to scale accurately
        const gX = ball.position.x - (green ? green.position.x : 0);
        const gZ = ball.position.z - greenCenterZ;
        const checkAngle = Math.atan2(-gZ, gX);
        const trueGreenR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(checkAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;
        const isOnGreen = Math.sqrt(gX * gX + gZ * gZ) < trueGreenR;

        // NEW: Spawn a 3D turf divot patch when hitting from the fairway or rough
        if (!isOnGreen && !launchedFromSand && !isOffTee) {
            const divotGeo = new THREE.CircleGeometry(0.15, 8);
            const divotMat = new THREE.MeshBasicMaterial({
                color: 0x4a321a, // Rich soil dirt brown
                side: THREE.DoubleSide,
                polygonOffset: true,         // FORCES the divot layer to render cleanly on top of the turf
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -4
            });
            const divotMesh = new THREE.Mesh(divotGeo, divotMat);

            // Lay it flat on the ground and randomize its rotation so patches look unique
            divotMesh.rotation.x = -Math.PI / 2;
            divotMesh.rotation.z = Math.random() * Math.PI;

            // ADJUSTED: Raised height to 0.065 to clear the fairway mesh visual cushion profile safely
            const groundBaseY = physics.getGroundHeight(ball.position.x, ball.position.z);
            const divotY = groundBaseY + 0.065;

            divotMesh.position.set(ball.position.x, divotY, ball.position.z);
            scene.add(divotMesh);
            divotObjects.push(divotMesh);
        }

        let finalPower = power;
        if (isOnGreen) {
            // Set to 0.8588 so an 80ft pull on the gauge physically rolls exactly 80ft in world units
            finalPower *= 2.10;

            // ADD THIS BLOCK: Smooth friction compensation for ultra-short micro putts
            if (finalPower < 5.5) {
                finalPower += (5.5 - finalPower) * 0.58;
            }
        }

        const club = input.getClubInfo()
        const isPuttingStroke = isOnGreen || club.name === 'Putter'; // Add this line: Safe check preventing division by zero

        physics.applyImpulse(finalPower, angle, forward, right, isPuttingStroke, spin, loft); // Modify this line

        // FIXED: Dynamically differentiate swing audios. Tee box launches play swing.wav,
        // putting strokes play putt.wav, and fairway/rough lies trigger your new iron.wav.
        if (sounds) {
            if (isPuttingStroke) {
                sounds.play('putt');
            } else if (isOffTee) {
                sounds.play('swing');
            } else {
                sounds.play('iron');
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
            clubSwipe.style.removeProperty('bottom');
            clubSwipe.style.removeProperty('left');
            clubSwipe.style.removeProperty('transform');

            // NEW: Scales timeout to match the active club (1000ms for slow putts, 350ms for swift swings)
            const swingDuration = club.name === 'Putter' ? 400 : 350;
            setTimeout(() => {
                clubSwipe.classList.remove('swipe-animation');
            }, swingDuration);
        }

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    }, () => {
        // FIXED: Tracks the green boundaries accurately from the true center point during click-drags using shape-aware angles
        const gX = ball.position.x - (green ? green.position.x : 0);
        const gZ = ball.position.z - greenCenterZ;
        const checkAngle = Math.atan2(-gZ, gX);
        const activeR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(checkAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;
        return Math.sqrt(gX * gX + gZ * gZ) < activeR;
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
                const isSand = physics && physics.isBallInSand();
                // ADJUSTED: Synced with our backed-up 7.5 unit camera perspective
                const camDist = checkOnGreen ? 2.5 : (isSand ? 2.0 : 7.5);
                const camHeight = checkOnGreen ? 1.0 : (isSand ? 3.2 : 2.2);
                const lookDist = checkOnGreen ? 6.0 : (isSand ? 4.5 : 15.0);

                const backX = -(dirX / length) * 7.5;
                const backZ = -(dirZ / length) * 7.5;

                // CORRECTED: Smoothly transitions the camera back to your active zoom/horizon offsets
                cameraTargetPos.set(ball.position.x + backX, ball.position.y + camHeight, ball.position.z + backZ);
                cameraLookAt.set(ball.position.x + (dirX / length) * lookDist, ball.position.y + (checkOnGreen ? 0.35 : 0.0), ball.position.z + (dirZ / length) * lookDist);
            }
        });
    }

    // Add backspin button interaction click listeners
    const backspinBtn = document.getElementById('backspinBtn');
    if (backspinBtn) {
        const handleBackspinToggle = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault();

            isBackspinOn = !isBackspinOn;
            backspinBtn.innerText = isBackspinOn ? "BACKSPIN ON" : "BACKSPIN OFF";
            backspinBtn.style.borderColor = isBackspinOn ? "#ff3366" : "#ffffff";
            backspinBtn.style.color = isBackspinOn ? "#ff3366" : "#ffffff";
        };
        backspinBtn.addEventListener('click', handleBackspinToggle);
        backspinBtn.addEventListener('touchstart', handleBackspinToggle, { passive: false });
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

    // FIXED: Kick off your background ambient loop sequence when the game sets up
    if (sounds) {
        if (isRaining) {
            sounds.playAmbient('rain'); // Update this line
        } else {
            sounds.playAmbient('birds'); // Update this line
        }
    }

    animate();
}

init();



function updateGreenGrid() {
    if (!green || !ball || !physics || !scene) return;

    // FIXED: De-allocate the old legacy 2D canvas grid overlay mesh so it can never block our 3D beads
    if (greenGrid) greenGrid.visible = false;

    const gX = green.position.x;
    const gZ = greenCenterZ;

    // RESTORED: These two lines are required so the distance formulas below know where the ball is!
    const dxB = ball.position.x - gX;
    const dzB = ball.position.z - gZ;

    const gridBallDist = Math.sqrt(dxB * dxB + dzB * dzB);
    const gridBallAngle = Math.atan2(-dzB, dxB);
    const activeR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(gridBallAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;

    const activeClub = input ? input.getClubInfo() : null;
    const isPutter = activeClub && activeClub.name === 'Putter';
    const isBallOnGreenOrFringe = gridBallDist < (activeR + (isPutter ? 2.5 : 1.5));

    const isAirborne = ball.position.y > physics.getGroundHeight(ball.position.x, ball.position.z) + 0.4;
    // Automatically activates aiming dots if the putter is selected, matching normal green behavior
    const isAiming = input && input.isAimMode;

    // Turn off 3D meshes if display criteria aren't met
    if (!isBallOnGreenOrFringe || isAirborne || physics.hitWater || isSinking || !isAiming) {
        visualGuideBeads.forEach(bead => { bead.visible = false; });
        return;
    }

    const dxHole = holePosition.x - ball.position.x;
    const dzHole = holePosition.z - ball.position.z;
    const pathLen = Math.sqrt(dxHole * dxHole + dzHole * dzHole) || 1;

    let angle = Math.atan2(dxHole, dzHole);
    if (input && input.aimAngleOffset) angle += input.aimAngleOffset;
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);

    const travelSteps = Math.max(12, Math.floor(pathLen / 0.35));
    const delta = 0.1;

    let cumulativeDrift = 0;
    let sideVelocity = 0;
    let visibleCount = 0;

    for (let s = 0; s <= travelSteps; s++) {
        const t = s / travelSteps;

        const wx = ball.position.x + dirX * (t * pathLen);
        const wz = ball.position.z + dirZ * (t * pathLen);

        const perpX = -dirZ;
        const perpZ = dirX;
        const finalWx = wx + perpX * cumulativeDrift;
        const finalWz = wz + perpZ * cumulativeDrift;

        const arrowSlopeX = (physics.getGroundHeight(finalWx - delta, finalWz) - physics.getGroundHeight(finalWx + delta, finalWz)) / (2 * delta);
        const arrowSlopeZ = (physics.getGroundHeight(finalWx, finalWz - delta) - physics.getGroundHeight(finalWx, finalWz + delta)) / (2 * delta);

        const currentPathSlope = (dirX * arrowSlopeX) + (dirZ * arrowSlopeZ);
        let dotColor = 0x2288ff; // Uphill Blue

        if (Math.abs(currentPathSlope) < 0.012) {
            dotColor = 0xffffff; // Flat White
        } else if (currentPathSlope > 0.012) {
            dotColor = 0xff4d4d; // Downhill Red
        }

        const fDx = finalWx - gX;
        const fDz = finalWz - gZ;
        const fDist = Math.sqrt(fDx * fDx + fDz * fDz);
        const fAngle = Math.atan2(-fDz, fDx);
        const dotActiveR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(fAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : activeR;

        const allowedRadius = isPutter ? (dotActiveR + 2.5) : (dotActiveR - 0.3);

        if (fDist < allowedRadius) {
            if (!visualGuideBeads[visibleCount]) {
                // FIXED: Adjusted geometry radius to 0.08 to perfectly restore the original clear dot size
                const beadGeo = new THREE.CircleGeometry(0.08, 8);
                const beadMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
                const beadMesh = new THREE.Mesh(beadGeo, beadMat);
                beadMesh.rotation.x = -Math.PI / 2;
                scene.add(beadMesh);
                visualGuideBeads.push(beadMesh);
            }

            const bead = visualGuideBeads[visibleCount];
            const currentGroundY = physics.getGroundHeight(finalWx, finalWz);

            // FIXED: Raised baseline placement factor to +0.06 to float securely and visibly over all turf surfaces
            bead.position.set(finalWx, currentGroundY + 0.06, finalWz);
            bead.material.color.setHex(dotColor);
            bead.visible = true;
            visibleCount++;
        }

        // === PASTE THIS REPLACEMENT CODE BLOCK ===
        // FIXED: Accumulate the lateral breaking forces at the very END of the loop step
        // so that they safely influence the trajectory projection of the NEXT dot.
        const curveIntensity = (arrowSlopeX * perpX) + (arrowSlopeZ * perpZ);
        // CALIBRATED: Increased step acceleration coefficient from 0.0045 to 0.165 to accurately 
        // scale realistic tournament-grade slopes across a compact number of visual prediction dots.
        sideVelocity += curveIntensity * 0.055;
        cumulativeDrift += sideVelocity;
    }

    // Hide any unused mesh segments lingering in the pool cache
    for (let i = visibleCount; i < visualGuideBeads.length; i++) {
        visualGuideBeads[i].visible = false;
    }

    gridTexture.needsUpdate = true;
}


// Add this entire function block at the very bottom of src/main.js
function showScorecard() {
    const overlay = document.getElementById('scorecardOverlay');
    const table = document.getElementById('scorecardTable');
    if (!overlay || !table) return;

    // Separate completed holes into Front 9 and Back 9 segments
    const maxHolePlayed = completedHoles.reduce((max, h) => Math.max(max, h.hole), 0);
    const showBack9 = maxHolePlayed >= 10 || currentHoleNumber >= 10;

    let holeHtml = '<th style="z-index: 15;">HOLE</th>';
    let yardsHtml = '<tr><td><strong>YARDS</strong></td>';
    let parHtml = '<tr><td><strong>PAR</strong></td>';
    let scoreHtml = '<tr><td><strong>SCORE</strong></td>';

    // Accumulator metrics for Front 9
    let fYards = 0, fPar = 0, fScore = 0, fPlayed = 0;

    // --- 1. RENDER FRONT 9 (HOLES 1-9) ---
    for (let i = 1; i <= 9; i++) {
        const hData = completedHoles.find(h => h.hole === i);
        let yards = '---', par = '---', score = '---', scoreClass = '';

        if (hData) {
            yards = hData.yards; par = hData.par; score = hData.score;
            fYards += hData.yards; fPar += hData.par; fScore += hData.score; fPlayed++;
            if (score <= par) scoreClass = ' class="scorecard-highlight"';
        } else if (HOLES_CONFIG[i]) {
            par = HOLES_CONFIG[i].par || '---';
            if (HOLES_CONFIG[i].waypoints) {
                const wp = HOLES_CONFIG[i].waypoints;
                const dx = wp[wp.length - 1].x - wp[0].x;
                const dz = wp[wp.length - 1].z - wp[0].z;
                yards = Math.round(Math.sqrt(dx * dx + dz * dz) * 2.76923);
            }
        }

        holeHtml += `<th class="scorecard-hole-col">${i}</th>`;
        yardsHtml += `<td class="scorecard-hole-col">${yards}</td>`;
        parHtml += `<td class="scorecard-hole-col">${par}</td>`;
        scoreHtml += `<td class="scorecard-hole-col"${scoreClass}>${score}</td>`;
    }

    // Append Front 9 'OUT' Totals Column
    holeHtml += `<th class="scorecard-total-col">OUT</th>`;
    yardsHtml += `<td class="scorecard-total-col">${fYards || '0'}</td>`;
    parHtml += `<td class="scorecard-total-col">${fPar || '0'}</td>`;
    scoreHtml += `<td class="scorecard-total-col"><strong>${fPlayed > 0 ? fScore : '---'}</strong></td>`;

    // Accumulator metrics for Back 9
    let bYards = 0, bPar = 0, bScore = 0, bPlayed = 0;

    // --- 2. RENDER BACK 9 (HOLES 10-18) IF REACHED ---
    if (showBack9) {
        for (let i = 10; i <= 18; i++) {
            const hData = completedHoles.find(h => h.hole === i);
            let yards = '---', par = '---', score = '---', scoreClass = '';

            if (hData) {
                yards = hData.yards; par = hData.par; score = hData.score;
                bYards += hData.yards; bPar += hData.par; bScore += hData.score; bPlayed++;
                if (score <= par) scoreClass = ' class="scorecard-highlight"';
            } else if (HOLES_CONFIG[i]) {
                par = HOLES_CONFIG[i].par || '---';
                if (HOLES_CONFIG[i].waypoints) {
                    const wp = HOLES_CONFIG[i].waypoints;
                    const dx = wp[wp.length - 1].x - wp[0].x;
                    const dz = wp[wp.length - 1].z - wp[0].z;
                    yards = Math.round(Math.sqrt(dx * dx + dz * dz) * 2.76923);
                }
            }

            holeHtml += `<th class="scorecard-hole-col">${i}</th>`;
            yardsHtml += `<td class="scorecard-hole-col">${yards}</td>`;
            parHtml += `<td class="scorecard-hole-col">${par}</td>`;
            scoreHtml += `<td class="scorecard-hole-col"${scoreClass}>${score}</td>`;
        }

        // Append Back 9 'IN' Totals Column
        holeHtml += `<th class="scorecard-total-col">IN</th>`;
        yardsHtml += `<td class="scorecard-total-col">${bYards || '0'}</td>`;
        parHtml += `<td class="scorecard-total-col">${bPar || '0'}</td>`;
        scoreHtml += `<td class="scorecard-total-col"><strong>${bPlayed > 0 ? bScore : '---'}</strong></td>`;

        // Append Grand 'TOT' Column for full Round Summary
        const grandYards = fYards + bYards;
        const grandPar = fPar + bPar;
        const grandScore = (fPlayed > 0 ? fScore : 0) + (bPlayed > 0 ? bScore : 0);
        const totalPlayed = fPlayed + bPlayed;

        holeHtml += `<th class="scorecard-total-col">TOT</th>`;
        yardsHtml += `<td class="scorecard-total-col"><strong>${grandYards}</strong></td>`;
        parHtml += `<td class="scorecard-total-col"><strong>${grandPar}</strong></td>`;
        scoreHtml += `<td class="scorecard-total-col" style="color: #00ffcc;"><strong>${totalPlayed > 0 ? grandScore : '---'}</strong></td>`;
    }

    yardsHtml += '</tr>';
    parHtml += '</tr>';
    scoreHtml += '</tr>';

    table.innerHTML = `
        <thead><tr>${holeHtml}</tr></thead>
        <tbody>
            ${yardsHtml}
            ${parHtml}
            ${scoreHtml}
        </tbody>
    `;

    overlay.style.display = 'flex';

    const nextHoleBtn = document.getElementById('nextHoleBtn');
    const proceedToNextHole = (e) => {
        if (e) e.stopPropagation();
        if (e && e.type === 'touchstart') e.preventDefault();

        if (nextHoleBtn) {
            nextHoleBtn.removeEventListener('click', proceedToNextHole);
            nextHoleBtn.removeEventListener('touchstart', proceedToNextHole);
        }

        overlay.style.display = 'none';
        resetEntireGame(true);
    };

    setTimeout(() => {
        if (nextHoleBtn) {
            nextHoleBtn.addEventListener('click', proceedToNextHole);
            nextHoleBtn.addEventListener('touchstart', proceedToNextHole);
        }
    }, 10);
}

