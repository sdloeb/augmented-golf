import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input, teeBox, currentWindAngle = 0;
let green, pin, flag, holeCup, fairway;
let ballTracer, tracerPoints = [];
let slopeX = 0, slopeZ = 0, greenGrid, gridTexture, gridCanvas;

let sandTraps = [];
let waterHazards = [];
let sceneryObjects = [];

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
}

function generateNewWind() {
    const maxWindSpeed = 25;
    const windSpeed = Math.floor(Math.random() * maxWindSpeed);
    currentWindAngle = Math.random() * Math.PI * 2; // Save globally

    const text = document.getElementById('windText');
    if (text) {
        text.innerText = `${windSpeed} mph`;
    }

    const windScale = 0.00001;
    physics.wind.set(
        Math.sin(currentWindAngle) * windSpeed * windScale,
        0,
        -Math.cos(currentWindAngle) * windSpeed * windScale
    );
}

// ADD THIS NEW FUNCTION:
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

    // REPLACE the Spawn Water loop with this:
    for (let i = 0; i < numWater; i++) {
        let x, z, r = 2.0 + Math.random() * 1.5;
        do {
            // Widened X to 50 to spread across the full course width (rough)
            x = (Math.random() - 0.5) * 50;
            // Change this line to scale with the dynamic hole depth:
            z = (holePosition.z - 20) + Math.random() * (26 - holePosition.z);
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - holePosition.z) * (z - holePosition.z)) < (12 + r) || // Change -55 to holePosition.z on this line
            (z > 6 && Math.abs(x) < 4) // Avoid the Tee Box starting zone
        );

        const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0x1d70b8, roughness: 0.1 }));
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(x, 0.018, z);
        scene.add(waterMesh);
        waterHazards.push(waterMesh);
    }

    // REPLACE the Spawn Sand loop with this:
    for (let i = 0; i < numSand; i++) {
        let x, z, r = 1.8 + Math.random() * 1.2;
        do {
            // Widened X to 50 to spread across the full course width (rough)
            x = (Math.random() - 0.5) * 50;
            // Change this line to scale with the dynamic hole depth:
            z = (holePosition.z - 20) + Math.random() * (26 - holePosition.z);
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - holePosition.z) * (z - holePosition.z)) < (12 + r) || // Change -55 to holePosition.z on this line
            (z > 6 && Math.abs(x) < 4) // Avoid the Tee Box starting zone
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

function resetEntireGame() {
    strokeCount = 0;
    document.getElementById('strokeText').innerText = strokeCount;

    tracerPoints = [];
    if (ballTracer) ballTracer.geometry.setFromPoints([]);

    const randomYards = 130 + Math.random() * (550 - 130);
    const gameUnits = randomYards / 2.76923;
    holePosition.z = 10 - gameUnits;

    // Add these lines to reposition the visual green elements to the new depth
    if (green) green.position.z = holePosition.z;
    if (pin) pin.position.z = holePosition.z;
    if (flag) flag.position.z = holePosition.z;
    if (holeCup) holeCup.position.z = holePosition.z;
    if (greenGrid) greenGrid.position.z = holePosition.z;

    slopeX = (Math.random() - 0.5) * 0.0014
    slopeZ = (Math.random() - 0.5) * 0.0014; // Controls uphill/downhill speed strength

    if (gridCanvas && gridTexture) {
        const ctx = gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64); // Clear the previous hole's arrows

        ctx.save();
        ctx.translate(32, 32); // Move to the center of the grid tile
        ctx.rotate(Math.atan2(slopeZ, slopeX)); // Rotate arrow perfectly towards downhill drift

        // Draw a clean, semi-transparent white arrow 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(12, 0);  // Arrow shaft
        ctx.lineTo(4, -6);                      // Top barb pointer
        ctx.moveTo(12, 0); ctx.lineTo(4, 6);   // Bottom barb pointer
        ctx.stroke();
        ctx.restore();

        gridTexture.needsUpdate = true; // Tell Three.js to upload the updated arrow image
    }

    if (physics) {
        physics.holePosition.copy(holePosition);
        physics.slopeX = slopeX;
        physics.slopeZ = slopeZ;
    }

    if (fairway) {
        const fairwayLength = 8 - holePosition.z; // Measures distance from just past Tee (Z: 8) to Green center
        fairway.scale.set(1, fairwayLength, 1);   // Stretches local Y-axis (which is world Z-axis due to rotation)
        fairway.position.set(0, 0.01, (8 + holePosition.z) / 2); // Places it exactly halfway between Tee and Green
    }

    ball.position.set(0, 0.25, 10);
    physics.velocity.set(0, 0, 0);
    physics.isMoving = false;
    wasMoving = false;
    isSinking = false; // Reset sinking state
    ballTargetScale = 1.0;
    if (teeBox) teeBox.visible = true;
    ball.scale.set(1, 1, 1);

    cameraTargetPos.set(0, 2, 14);
    cameraLookAt.set(0, 0, -50);
    currentLookAt.set(0, 0, -50);
    camera.position.copy(cameraTargetPos);
    camera.lookAt(currentLookAt);

    sceneryObjects.forEach(obj => scene.remove(obj));
    sceneryObjects = [];

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



    // Only update standard physical trajectories if the ball isn't sinking into the cup
    if (!isSinking) {
        physics.update();
    }

    // 1. FIXED OUT OF BOUNDS CHECK
    if (Math.abs(ball.position.x) > 30 || ball.position.z < holePosition.z - 40) {
        alert(`Out of Bounds! Ball flew off the course.`);
        resetEntireGame();
        return;
    }

    // ADD THIS BLOCK:
    if (physics && physics.hitWater) {
        physics.hitWater = false;
        alert(`Water Hazard! 🌊 Your ball splashed in. Resetting hole!`);
        resetEntireGame();
        return;
    }

    // 2. CONTINUOUS HOLE COLLISION & SMOOTH SINKING ANIMATION
    if (!isSinking) {
        const dx = ball.position.x - holePosition.x;
        const dz = ball.position.z - holePosition.z;
        const distanceToHole = Math.sqrt(dx * dx + dz * dz);

        // Capture condition: ball must hit the threshold and be near the grass level
        if (distanceToHole < 0.35 && ball.position.y <= 0.25) {
            // Add this speed block right here:
            const ballSpeed = physics.velocity.length();
            if (ballSpeed > 0.07) {
                physics.velocity.y = 0.04; // Pops the ball up into the air slightly
                physics.velocity.x *= 0.85; // Slightly slows down forward momentum from the impact
                physics.velocity.z *= 0.85;
                return; // Exits early so the ball avoids the sinking code below!
            }
            isSinking = true;
            physics.velocity.set(0, 0, 0);
            physics.isMoving = false;
            wasMoving = false;

            // Snap perfectly center over the black hole disk layout
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

            // Give the browser 30ms to fully render the final subterranean frame before alerting
            setTimeout(() => {
                alert(`Sunk it! 🎉 You finished in ${strokeCount} strokes.`);
                resetEntireGame();
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
    const greenGeo = new THREE.CircleGeometry(GREEN_RADIUS, 32);
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x32cd32, roughness: 0.8 });
    green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2;
    green.position.set(0, 0.02, -55);
    scene.add(green);

    gridCanvas = document.createElement('canvas'); // Change "const canvas" to "gridCanvas"
    gridCanvas.width = 64;
    gridCanvas.height = 64;

    gridTexture = new THREE.CanvasTexture(gridCanvas); // Change "canvas" to "gridCanvas"
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(12, 12);

    greenGrid = new THREE.Mesh(greenGeo, new THREE.MeshBasicMaterial({
        map: gridTexture,
        transparent: true,
        side: THREE.DoubleSide
    }));
    greenGrid.rotation.x = -Math.PI / 2;
    greenGrid.position.set(0, 0.021, -55); // Placed 0.001 higher to prevent flickering
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



        physics.applyImpulse(finalPower, angle, forward, right, isOnGreen);

        // Add these lines below to trigger the first-person club swipe animation
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