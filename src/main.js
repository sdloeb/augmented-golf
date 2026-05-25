import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input, teeBox, currentWindAngle = 0;

let sandTraps = [];
let waterHazards = [];

// Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;

let ballTargetScale = 1.0;

let strokeCount = 0;
const holePosition = new THREE.Vector3(0, 0.25, -55); // Center of the green target

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
}

function generateNewWind() {
    const maxWindSpeed = 25;
    const windSpeed = Math.floor(Math.random() * maxWindSpeed);
    currentWindAngle = Math.random() * Math.PI * 2; // Save globally

    const text = document.getElementById('windText');
    if (text) {
        text.innerText = `${windSpeed} mph`;
    }

    const windScale = 0.00004;
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
            // Extended Z depth to allow hazards in front of and behind the green
            z = -110 + Math.random() * 115;
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - (-55)) * (z - (-55))) < (12 + r) || // Avoid the Green (radius 12 at z:-55)
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
            // Extended Z depth to allow hazards in front of and behind the green
            z = -110 + Math.random() * 115;
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - (-55)) * (z - (-55))) < (12 + r) || // Avoid the Green (radius 12 at z:-55)
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
    if (Math.abs(ball.position.x) > 30 || ball.position.z < -135) {
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
        if (distanceToHole < 0.45 && ball.position.y <= 0.25) {
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
        if (ball.position.y <= -0.15) {
            isSinking = false;

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
    const floorGeo = new THREE.PlaneGeometry(60, 300);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e5631 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ADD THIS BLOCK RIGHT BELOW THE FLOOR MESH:
    const fairwayGeo = new THREE.PlaneGeometry(18, 53);
    const fairwayMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7 });
    const fairway = new THREE.Mesh(fairwayGeo, fairwayMat);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(0, 0.01, -16.5);
    scene.add(fairway);

    // 6. Add Golf Ball Mesh
    const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.25, 10);
    scene.add(ball);



    // 6.1. Add Tee Box Mat
    const teeGeo = new THREE.BoxGeometry(1.5, 0.02, 2.5);
    const teeMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); // Dark brown/wood mat
    teeBox = new THREE.Mesh(teeGeo, teeMat);
    teeBox.position.set(0, 0.01, 10); // Placed slightly above the main floor to prevent flickering
    scene.add(teeBox);

    // 6.5. Add the Putting Green, Flagstick, and Red Flag
    const greenGeo = new THREE.CircleGeometry(GREEN_RADIUS, 32);
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x32cd32, roughness: 0.8 });
    const green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2;
    green.position.set(0, 0.02, -55);
    scene.add(green);

    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 1.5, -55);
    scene.add(pin);

    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.4, 2.75, -55);
    scene.add(flag);

    const holeCupGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.01, 32);
    const holeCupMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const holeCup = new THREE.Mesh(holeCupGeo, holeCupMat);
    holeCup.position.set(0, 0.03, -55);
    scene.add(holeCup);

    // 7. Initialize Modules
    physics = new PhysicsEngine(ball);

    generateHazards();
    physics.sandTraps = sandTraps;
    physics.waterHazards = waterHazards;

    // UPDATED: Now passes an extra dynamic checker argument directly into InputHandler
    input = new InputHandler((power, angle) => {
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
        // If it's past the tee shot (strokeCount > 0) and not on the green, boost the power
        if (strokeCount > 0 && !isOnGreen) {
            finalPower *= 1.20; // Boosts power by 25%
        }

        physics.applyImpulse(finalPower, angle, forward, right, isOnGreen);

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    }, () => {
        // This execution frame allows InputHandler to track green conditions on drag
        const gX = ball.position.x - holePosition.x;
        const gZ = ball.position.z - holePosition.z;
        return Math.sqrt(gX * gX + gZ * gZ) < GREEN_RADIUS;
    });

    window.addEventListener('resize', onWindowResize, false);

    generateNewWind();
    updateDistanceDisplay();

    animate();
}

init();