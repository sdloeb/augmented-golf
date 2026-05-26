import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { SoundManager } from './SoundManager.js';

let scene, camera, renderer, ball, physics, input, teeBox, currentWindAngle = 0, sounds;
let green, pin, flag, holeCup, fairway;
let ballTracer, tracerPoints = [];
let slopeX = 0, slopeZ = 0, greenGrid, gridTexture, gridCanvas;

let sandTraps = [];
let waterHazards = [];
let sceneryObjects = [];
let currentHoleNumber = 1;
let currentPar = 4;

// Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;

let ballTargetScale = 1.0;

let strokeCount = 0;
let holePosition = new THREE.Vector3(0, 0.25, -55); // Center of the green target

// NEW: Animation state tracker to let the ball physically drop into the cup
let isSinking = false;

const GREEN_RADIUS = 12.0;

// --- UTILITY FUNCTIONS ---

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateDistanceDisplay() {
    const dx = ball.position.x - holePosition.x;
    const dz = ball.position.z - holePosition.z;
    const gameDistance = Math.sqrt(dx * dx + dz * dz);

    const distanceText = document.getElementById('distanceText');
    const unitText = document.getElementById('unitText');

    if (distanceText && unitText) {
        if (gameDistance < GREEN_RADIUS) {
            const feet = Math.round(gameDistance * 3.00);
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
        clubText.innerText = club.name;
    }

    // --- DYNAMIC CLUB OPTIONS SELECTION GENERATOR ---
    const container = document.getElementById('clubOptionsContainer');
    if (container && input) {
        container.innerHTML = ''; // Wipe out old button listings

        // Hide panel if the ball is currently moving through physical trajectory or sinking out of view
        if ((physics && physics.isMoving) || isSinking) {
            return;
        }

        const isOnGreen = gameDistance < GREEN_RADIUS;
        // On the putting green, lock to the putter with no extra layout elements
        if (isOnGreen) {
            return;
        }

        const defaultIdx = input.getDefaultClubIndex();
        const activeClub = input.getClubInfo();
        const clubList = input.getClubList();

        const indicesToShow = [];

        // 1. One club above (longer range distance) if not hitting Driver edge boundary
        if (defaultIdx > 0) {
            indicesToShow.push(defaultIdx - 1);
        }

        // 2. The standard automatic club index matching current target yards distance
        indicesToShow.push(defaultIdx);

        // 3. One club below (shorter range distance) if not hitting SW Iron edge boundary
        if (defaultIdx < 10) {
            indicesToShow.push(defaultIdx + 1);
        }

        // Construct HTML layouts for valid club candidate index options
        indicesToShow.forEach(idx => {
            const clubInfo = clubList[idx];
            const btn = document.createElement('button');
            btn.className = 'club-option';

            if (activeClub.name === clubInfo.name) {
                btn.classList.add('active');
            }

            // NEW: Displays the club's name alongside its maximum capacity yardage
            btn.innerText = `${clubInfo.name} (${clubInfo.maxYards} yds)`;

            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Shield external capture setups from click triggers
                input.chosenClubIndex = idx;
                updateDistanceDisplay(); // Instantly update active class highlights
            });

            container.appendChild(btn);
        });
    }
}

function generateNewWind() {
    const maxWindSpeed = 21;
    const windSpeed = Math.floor(Math.random() * maxWindSpeed);
    currentWindAngle = Math.random() * Math.PI * 2; // Save globally

    const text = document.getElementById('windText');
    if (text) {
        text.innerText = `${windSpeed} mph`;
    }

    const windScale = 0.000005;
    physics.wind.set(
        Math.sin(currentWindAngle) * windSpeed * windScale,
        0,
        -Math.cos(currentWindAngle) * windSpeed * windScale
    );
}

function generateHazards() {
    sandTraps.forEach(mesh => scene.remove(mesh));
    waterHazards.forEach(mesh => scene.remove(mesh));
    sandTraps = [];
    waterHazards = [];

    const numWater = Math.floor(Math.random() * 3); // 0 to 2
    const numSand = Math.floor(Math.random() * 3);  // 0 to 2

    const checkOverlap = (x, z, r, list) => {
        return list.some(mesh => {
            const dx = x - mesh.position.x;
            const dz = z - mesh.position.z;
            return Math.sqrt(dx * dx + dz * dz) < (r + mesh.geometry.parameters.radius);
        });
    };

    // Use a safe fallback if green hasn't initialized yet
    const targetGreenZ = green ? green.position.z : -55;

    for (let i = 0; i < numWater; i++) {
        let x, z, r = 2.0 + Math.random() * 1.5;
        do {
            x = (Math.random() - 0.5) * 50;
            // Spawns hazards relative to the actual circular putting green plane depth location
            z = (targetGreenZ - 20) + Math.random() * (26 - targetGreenZ);
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r) ||
            (z > 6 && Math.abs(x) < 4) // Safe zone protection surrounding the Tee Box area
        );

        const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0x1d70b8, roughness: 0.1 }));
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(x, 0.018, z);
        scene.add(waterMesh);
        waterHazards.push(waterMesh);
    }

    for (let i = 0; i < numSand; i++) {
        let x, z, r = 1.8 + Math.random() * 1.2;
        do {
            x = (Math.random() - 0.5) * 50;
            z = (targetGreenZ - 20) + Math.random() * (26 - targetGreenZ);
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r) ||
            (z > 6 && Math.abs(x) < 4)
        );

        const sandMesh = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0xe0ca9b, roughness: 0.9 }));
        sandMesh.rotation.x = -Math.PI / 2;
        sandMesh.position.set(x, 0.017, z);
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

    // Get the horizontal direction vector the camera is facing
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    // Calculate the camera's heading angle in radians
    const cameraAngle = Math.atan2(forward.x, -forward.z);

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


    // NEW: Assign Par properties against the distance requirements provided
    const randomYards = 130 + Math.random() * (550 - 130);

    // NEW: Assign Par properties against the distance requirements provided
    if (randomYards < 220) {
        currentPar = 3;
    } else if (randomYards <= 450) {
        currentPar = 4;
    } else {
        currentPar = 5;
    }

    // NEW: Update the Wood Placard Map Dashboard display readings
    const mapTitleElement = document.getElementById('holeMapTitle');
    const mapParElement = document.getElementById('holeMapPar');
    if (mapTitleElement) mapTitleElement.innerText = `HOLE ${currentHoleNumber}`;
    if (mapParElement) mapParElement.innerText = `PAR ${currentPar}`;

    const gameUnits = randomYards / 2.76923;
    const greenCenterZ = 10 - gameUnits;

    // NEW: Dynamically shift the physical pin location anywhere within the circular green boundaries
    const pinAngle = Math.random() * Math.PI * 2;
    // Keep the pin at least 2 units safely away from the absolute outer perimeter edge of the green grass
    const pinRadius = Math.random() * (GREEN_RADIUS - 2.0);

    holePosition.x = Math.cos(pinAngle) * pinRadius;
    holePosition.z = greenCenterZ + Math.sin(pinAngle) * pinRadius;

    // The circular putting green and its helper grid map layer align centered with the course layout track
    if (green) {
        green.position.x = 0;
        green.position.z = greenCenterZ;
    }
    if (greenGrid) {
        greenGrid.position.x = 0;
        greenGrid.position.z = greenCenterZ;
    }

    // The physical pin flagstick, target flag mesh, and open target hole cup track the randomized target position
    // NEW: Set up the horizontal profiles matrix (Flat, Left-to-Right, Right-to-Left)
    const horizontalOptions = [0.0, 0.02, -0.02];

    // Shuffle the array so the horizontal options map randomly to Front, Mid, or Back tiers
    for (let i = horizontalOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [horizontalOptions[i], horizontalOptions[j]] = [horizontalOptions[j], horizontalOptions[i]];
    }

    // FIXED: Drastically lowered from 0.04 to 0.01 to make uphill/downhill putts fair and readable
    const verticalOptions = [0.01, -0.01, 0.0];

    // Build the 3 distinct randomized tier zones configuration blocks
    const backZoneProfile = { rx: horizontalOptions[0], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    const midZoneProfile = { rx: horizontalOptions[1], rz: verticalOptions[Math.floor(Math.random() * 3)] };
    const frontZoneProfile = { rx: horizontalOptions[2], rz: verticalOptions[Math.floor(Math.random() * 3)] };

    // Pass the full contoured landscape configurations down to the physics machine instance
    if (physics) {
        physics.setGreenContours(backZoneProfile, midZoneProfile, frontZoneProfile, greenCenterZ);
    }

    // NEW: Calculate the dynamic 3D ground level height exactly where the random pin cup is spawned
    const specificPinCupY = physics.getGreenHeight(holePosition.x, holePosition.z);

    // Pin the visual flagstick elements seamlessly onto the new 3D elevation slopes coordinate
    if (pin) pin.position.set(holePosition.x, 1.5 + specificPinCupY, holePosition.z);
    if (flag) flag.position.set(holePosition.x + 0.4, 2.75 + specificPinCupY, holePosition.z);
    if (holeCup) holeCup.position.set(holePosition.x, 0.03 + specificPinCupY, holePosition.z);

    // NEW: Deform the visual green mesh geometries to create real 3D ridges and valleys
    const deformVisualGreenMesh = (targetMesh) => {
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i); // CircleGeometry sets up flat on local 2D XY plane initially

            // Map local plane points to true world coordinate spaces
            const worldX = localX + targetMesh.position.x;
            const worldZ = -localY + targetMesh.position.z;

            // Fetch height calculation and bind directly to local Z (world height elevation after rotation)
            const calculatedHeight = physics.getGreenHeight(worldX, worldZ);
            posAttr.setZ(i, calculatedHeight);
        }
        posAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals(); // Forces Three.js to re-render lighting shadows smoothly
    };

    // Run deforming treatments over both the putting grass surface and its alignment grid layer mesh
    deformVisualGreenMesh(green);
    deformVisualGreenMesh(greenGrid);

    // Extract middle zone values as reference for drawing the helper guide canvas texture arrow
    slopeX = midZoneProfile.rx * 0.015;
    slopeZ = midZoneProfile.rz * 0.015;

    if (gridCanvas && gridTexture) {
        const ctx = gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);

        ctx.save();
        ctx.translate(32, 32);
        ctx.rotate(Math.atan2(slopeZ, slopeX));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
        ctx.lineTo(4, -6);
        ctx.moveTo(12, 0); ctx.lineTo(4, 6);
        ctx.stroke();
        ctx.restore();

        gridTexture.needsUpdate = true;
    }


    if (fairway) {
        const fairwayLength = 8 - greenCenterZ;
        fairway.scale.set(1, fairwayLength, 1);
        fairway.position.set(0, 0.01, (8 + greenCenterZ) / 2);
    }

    // NEW: Randomize the Tee Box horizontal offset left or right to vary the shot angles
    const teeBoxX = (Math.random() - 0.5) * 7.0; // Shifting limits spanning between -3.5 and +3.5
    if (teeBox) {
        teeBox.position.set(teeBoxX, 0.01, 10);
        teeBox.visible = true;
    }

    ball.position.set(teeBoxX, 0.25, 10);
    physics.velocity.set(0, 0, 0);
    physics.isMoving = false;
    wasMoving = false;
    isSinking = false;
    ballTargetScale = 1.0;
    ball.scale.set(1, 1, 1);


    // NEW: Calculate the precise target-line vector between the randomized tee and pin positions
    const startDirX = holePosition.x - teeBoxX;
    const startDirZ = holePosition.z - 10; // Ball starts at Z: 10
    const startLength = Math.sqrt(startDirX * startDirX + startDirZ * startDirZ);

    // Position the camera exactly 4 units backward along the true ball-to-hole line of sight
    const startBackX = -(startDirX / startLength) * 4;
    const startBackZ = -(startDirZ / startLength) * 4;

    // Set the starting position using the precise target line vector to prevent swing shift adjustments
    cameraTargetPos.set(teeBoxX + startBackX, 2, 10 + startBackZ);
    cameraLookAt.copy(holePosition);
    currentLookAt.copy(holePosition);
    camera.position.copy(cameraTargetPos);
    camera.lookAt(currentLookAt);

    sceneryObjects.forEach(obj => scene.remove(obj));

    // Materials for the scenery elements
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1d5330, roughness: 0.6 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.5 }); // Dark Red roofs

    // Generate 35 pieces of random scenery scattered along the edges
    for (let i = 0; i < 35; i++) {
        // Determine whether to place on the left side or right side of the track
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (31 + Math.random() * 15); // Outside the fairway but on the grass plane

        // Scatter evenly from the tee box (Z: 15) up past the green destination
        const z = 15 - Math.random() * (25 + Math.abs(holePosition.z));

        const sceneryGroup = new THREE.Group();
        sceneryGroup.position.set(x, 0, z);

        if (Math.random() > 0.4) {
            // --- BUILD A PROCEDURAL TREE ---
            const treeHeight = 1.5; // Explicit trunk height variable
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, treeHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);

            // Change this line to set position perfectly flat to the main floor:
            trunk.position.y = treeHeight / 2;
            sceneryGroup.add(trunk);

            const leavesHeight = 2.5; // Explicit foliage height variable
            const leavesGeo = new THREE.ConeGeometry(1.2, leavesHeight, 8);
            const leaves = new THREE.Mesh(leavesGeo, foliageMat);

            // Change this line to stack perfectly on top of the trunk height:
            leaves.position.y = treeHeight + (leavesHeight / 2);
            sceneryGroup.add(leaves);
        } else {
            // --- BUILD A PROCEDURAL HOUSE ---
            const houseWidth = 2.0 + Math.random() * 1.5;
            const houseHeight = 1.5 + Math.random() * 1.0; // Dynamic height variable

            const baseGeo = new THREE.BoxGeometry(houseWidth, houseHeight, houseWidth);
            const base = new THREE.Mesh(baseGeo, wallMat);

            // Change this line to map perfectly from the ground floor up:
            base.position.y = houseHeight / 2;
            sceneryGroup.add(base);

            // Give it a pointed triangular roof
            const roofGeo = new THREE.ConeGeometry(houseWidth * 0.8, 1.2, 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);

            // Change this line to place the roof perfectly flush with the top of the walls:
            roof.position.y = houseHeight + 0.6;
            roof.rotation.y = Math.PI / 4;
            sceneryGroup.add(roof);
        }

        scene.add(sceneryGroup);
        sceneryObjects.push(sceneryGroup);
    }

    generateNewWind();
    generateHazards();
    updateDistanceDisplay();
}

function animate() {
    requestAnimationFrame(animate);

    // FIXED: Re-added the frame tick runner so the ball can actually move through space!
    if (physics && !isSinking) {
        physics.update();
    }

    // FIXED: Re-added your Out of Bounds course boundary tracking check
    if (Math.abs(ball.position.x) > 30 || ball.position.z < holePosition.z - 40) {
        alert(`Out of Bounds! Ball flew off the course.`);
        resetEntireGame(false);
        return;
    }

    // FIXED: Re-added your Water Hazard tracker check
    if (physics && physics.hitWater) {
        physics.hitWater = false;
        alert(`Water Hazard! 🌊 Your ball splashed in. Resetting hole!`);
        resetEntireGame(false);
        return;
    }

    // 2. CONTINUOUS HOLE COLLISION & SMOOTH SINKING ANIMATION
    if (!isSinking) {
        const dx = ball.position.x - holePosition.x;
        const dz = ball.position.z - holePosition.z;
        const distanceToHole = Math.sqrt(dx * dx + dz * dz);

        // FIXED: Added a +0.15 vertical tolerance cushion to ensure the ball triggers capture 
        // even with minor floating-point variations or light bounces on the 3D mound
        if (distanceToHole < 0.35 && ball.position.y <= (0.25 + physics.getGreenHeight(ball.position.x, ball.position.z) + 0.15)) {
            const ballSpeed = physics.velocity.length();

            // FIXED: Raised speed threshold from 0.07 to 0.14 so true putts sink cleanly 
            // instead of automatically bouncing off the rim due to mound acceleration
            if (ballSpeed > 0.14) {
                physics.velocity.y = 0.04; // Pops the ball up into the air slightly
                physics.velocity.x *= 0.85;
                physics.velocity.z *= 0.85;
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
    if (physics.isMoving) {
        if (!wasMoving) {
            wasMoving = true;
        }

        updateDistanceDisplay();

        tracerPoints.push(ball.position.clone());
        if (ballTracer) ballTracer.geometry.setFromPoints(tracerPoints);
        ballTracer.geometry.computeBoundingSphere();

        // --- REPLACE THE Y-AXIS SHRINKING WITH THIS DISTANCE-BASED BLOCK ---
        // Calculate the horizontal distance the ball has traveled from the Tee Box (0, 10)
        const dx = ball.position.x - 0;
        const dz = ball.position.z - 10;
        const distanceTraveled = Math.sqrt(dx * dx + dz * dz);

        // Starts at 1.0 at the tee box, and gets smaller the further away it travels.
        // Change 0.006 to make it shrink faster or slower over distance.
        // Math.max(0.4, ...) ensures it doesn't get smaller than 40% of its original size while in flight.
        ballTargetScale = Math.max(0.4, 1.0 - (distanceTraveled * 0.006));
        // -------------------------------------------------------------------
    } else {
        if (wasMoving && !isSinking) {
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

            const backX = -(dirX / length) * 5.5;
            const backZ = -(dirZ / length) * 5.5;

            cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ);
            cameraLookAt.copy(holePosition);
            ballTargetScale = 0.5;
            if (teeBox) teeBox.visible = false;

            generateNewWind();
            updateDistanceDisplay();
            wasMoving = false;
            // Add this block below to wipe the tracer clean only when landing on the green:
            const gX = ball.position.x - holePosition.x;
            const gZ = ball.position.z - holePosition.z;
            if (Math.sqrt(gX * gX + gZ * gZ) < GREEN_RADIUS || ball.position.z <= holePosition.z) {
                tracerPoints = [];
                if (ballTracer) {
                    ballTracer.geometry.setFromPoints(tracerPoints);
                    ballTracer.geometry.computeBoundingSphere();
                }
            }


        }

        if (input && input.isSwinging) {
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

            const backX = -(dirX / length) * 4;
            const backZ = -(dirZ / length) * 4;

            cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.75, ball.position.z + backZ);
            cameraLookAt.copy(holePosition);
            ballTargetScale = 1.0;
        }
    }

    camera.position.lerp(cameraTargetPos, 0.05);
    currentLookAt.lerp(cameraLookAt, 0.05);
    camera.lookAt(currentLookAt);

    const currentScale = THREE.MathUtils.lerp(ball.scale.x, ballTargetScale, 0.05);
    ball.scale.set(currentScale, currentScale, currentScale);

    updateWindArrowDisplay();

    renderer.render(scene, camera);
}

function init() {
    // 1. Create the 3D World Scene
    scene = new THREE.Scene();

    // 2. Setup Camera View
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 14);
    camera.lookAt(0, 0, -50);

    // 3. Setup WebGL Canvas Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. Create Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // 5. Add Virtual Golf Green Floor
    const floorGeo = new THREE.PlaneGeometry(60, 800);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e5631 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ADD THIS BLOCK RIGHT BELOW THE FLOOR MESH:
    const fairwayGeo = new THREE.PlaneGeometry(18, 1);
    const fairwayMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7 });
    fairway = new THREE.Mesh(fairwayGeo, fairwayMat);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(0, 0.01, -16.5);
    scene.add(fairway);

    // 6. Add Golf Ball Mesh
    const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.25, 10);
    scene.add(ball);

    const tracerMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
    const tracerGeo = new THREE.BufferGeometry();
    ballTracer = new THREE.Line(tracerGeo, tracerMat);
    scene.add(ballTracer);



    // 6.1. Add Tee Box Mat
    const teeGeo = new THREE.BoxGeometry(1.5, 0.02, 2.5);
    const teeMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); // Dark brown/wood mat
    teeBox = new THREE.Mesh(teeGeo, teeMat);
    teeBox.position.set(0, 0.01, 10); // Placed slightly above the main floor to prevent flickering
    scene.add(teeBox);

    // 6.5. Add the Putting Green, Flagstick, and Red Flag
    // FIXED: Changed to solid RingGeometry (0 inner radius) to unlock actual high-density concentric vertex rings
    const greenGeo = new THREE.RingGeometry(0, GREEN_RADIUS, 64, 32);
    // FIXED: Giving the grid map its own independent mesh geometry prevents shared-vertex texture coordinate breaks
    const gridGeo = new THREE.RingGeometry(0, GREEN_RADIUS - 0.02, 64, 32);

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x11aa44, roughness: 0.4 });
    green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2;
    green.position.set(0, 0.02, -55);
    scene.add(green);


    gridCanvas = document.createElement('canvas');
    gridCanvas.width = 64;
    gridCanvas.height = 64;

    gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(12, 12);

    greenGrid = new THREE.Mesh(gridGeo, new THREE.MeshBasicMaterial({
        map: gridTexture,
        transparent: true,
        side: THREE.DoubleSide
    }));
    greenGrid.rotation.x = -Math.PI / 2;
    greenGrid.position.set(0, 0.021, -55);
    scene.add(greenGrid);

    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 1.5, -55);
    scene.add(pin);

    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.4, 2.75, -55);
    scene.add(flag);

    const holeCupGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.01, 32);
    const holeCupMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    holeCup = new THREE.Mesh(holeCupGeo, holeCupMat);
    holeCup.position.set(0, 0.03, -55);
    scene.add(holeCup);

    // 7. Initialize Modules

    physics = new PhysicsEngine(ball);

    // Add these lines below to create the sound instance and pass it to physics
    sounds = new SoundManager();
    physics.sounds = sounds;

    generateHazards();
    physics.sandTraps = sandTraps;
    physics.waterHazards = waterHazards;


    // UPDATED: Now passes an extra dynamic checker argument directly into InputHandler
    input = new InputHandler((power, angle) => {

        tracerPoints = [];

        tracerPoints.push(ball.position.clone()); // Add this line to anchor the tracer exactly at the ball's starting position
        if (ballTracer) ballTracer.geometry.setFromPoints(tracerPoints);
        ballTracer.geometry.computeBoundingSphere();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const gX = ball.position.x - holePosition.x;
        const gZ = ball.position.z - holePosition.z;
        const isOnGreen = Math.sqrt(gX * gX + gZ * gZ) < GREEN_RADIUS;

        let finalPower = power;
        if (isOnGreen) {
            // Multiply to fine-tune putting physics:
            // e.g., 0.5 cuts putting power in half, 1.5 increases it by 50%
            finalPower *= 2.4;
        }

        physics.applyImpulse(finalPower, angle, forward, right, isOnGreen);



        if (sounds) sounds.play('swing');
        const club = input.getClubInfo();
        const clubSwipe = document.getElementById('clubSwipe');
        if (clubSwipe) {
            clubSwipe.className = ''; // Clear out previous animation or styling classes

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

            // Remove the utility class once finished so it can be re-triggered next stroke
            setTimeout(() => {
                clubSwipe.classList.remove('swipe-animation');
            }, 350);
        }

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    }, () => {
        // This execution frame allows InputHandler to track green conditions on drag
        const gX = ball.position.x - holePosition.x;
        const gZ = ball.position.z - holePosition.z;
        return Math.sqrt(gX * gX + gZ * gZ) < GREEN_RADIUS;
    }, () => {
        // Add this third callback function here to return current distance in yards
        const dx = ball.position.x - holePosition.x;
        const dz = ball.position.z - holePosition.z;
        return Math.sqrt(dx * dx + dz * dz) * 2.76923;
    }); // Add the bracket closure adjustments on this line

    input.ballRef = ball;
    input.sandTrapsRef = sandTraps;
    input.holePositionRef = holePosition;

    window.addEventListener('resize', onWindowResize, false);

    generateNewWind();
    updateDistanceDisplay();
    resetEntireGame();
    animate();
}

init();