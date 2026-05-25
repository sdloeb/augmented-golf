import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input;

// Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;

let ballTargetScale = 1.0;

let strokeCount = 0;
const holePosition = new THREE.Vector3(0, 0.25, -55); // Center of the green target

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function generateNewWind() {
    const maxWindSpeed = 25;
    const windSpeed = Math.floor(Math.random() * maxWindSpeed);
    const windAngle = Math.random() * Math.PI * 2;

    const arrow = document.getElementById('windArrow');
    const text = document.getElementById('windText');
    if (arrow && text) {
        const degrees = (windAngle * 180) / Math.PI;
        arrow.style.transform = `rotate(${degrees}deg)`;
        text.innerText = `${windSpeed} mph`;
    }

    const windScale = 0.00004;
    physics.wind.set(
        Math.sin(windAngle) * windSpeed * windScale,
        0,
        -Math.cos(windAngle) * windSpeed * windScale
    );
}

function resetEntireGame() {
    strokeCount = 0;
    document.getElementById('strokeText').innerText = strokeCount;
    document.getElementById('distanceText').innerText = "180";
    ball.position.set(0, 0.25, 10);
    physics.velocity.set(0, 0, 0);
    physics.isMoving = false;
    wasMoving = false;
    ballTargetScale = 1.0;
    ball.scale.set(1, 1, 1);

    cameraTargetPos.set(0, 2, 14);
    cameraLookAt.set(0, 0, -50);
    currentLookAt.set(0, 0, -50);
    camera.position.copy(cameraTargetPos);
    camera.lookAt(currentLookAt);

    generateNewWind();
}

function animate() {
    requestAnimationFrame(animate);

    // Run physics frames
    physics.update();

    // 1. FIXED OUT OF BOUNDS CHECK (Handles sides AND the deep sky horizon)
    // Left/Right limit: 30 units from center
    // Deep Horizon limit: -135 units down the range (where the grass meets the sky)
    if (Math.abs(ball.position.x) > 30 || ball.position.z < -135) {
        alert(`Out of Bounds! Ball flew off the course.`);
        resetEntireGame();
        return;
    }

    // 2. CONTINUOUS HOLE COLLISION CHECK (Runs every single frame while moving or rolling!)
    const dx = ball.position.x - holePosition.x;
    const dz = ball.position.z - holePosition.z;
    const distanceToHole = Math.sqrt(dx * dx + dz * dz);

    // 0.45 means physical contact: Ball Radius (0.25) + Hole Radius (0.20)
    if (distanceToHole < 0.45) {
        // Drop the ball visually into the cup before alerting
        ball.position.set(holePosition.x, 0.05, holePosition.z);
        physics.velocity.set(0, 0, 0);
        physics.isMoving = false;

        alert(`Sunk it! 🎉 You finished in ${strokeCount} strokes.`);
        resetEntireGame();
        return;
    }

    // 3. DYNAMIC CAMERA CONTROLLER
    if (physics.isMoving) {
        if (!wasMoving) {
            wasMoving = true;
        }
    } else {
        if (wasMoving) {
            // BALL JUST STOPPED (And didn't hit the hole)
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

            const backX = -(dirX / length) * 5.5;
            const backZ = -(dirZ / length) * 5.5;

            cameraTargetPos.set(ball.position.x + backX, ball.position.y + 1.8, ball.position.z + backZ);
            cameraLookAt.copy(holePosition);
            ballTargetScale = 0.5;

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

    // Smoothly glide camera and focus point
    camera.position.lerp(cameraTargetPos, 0.05);
    currentLookAt.lerp(cameraLookAt, 0.05);
    camera.lookAt(currentLookAt);

    // Smoothly morph ball scale
    const currentScale = THREE.MathUtils.lerp(ball.scale.x, ballTargetScale, 0.05);
    ball.scale.set(currentScale, currentScale, currentScale);

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

    // 6. Add Golf Ball Mesh
    const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.25, 10);
    scene.add(ball);

    // 6.5. Add the Putting Green, Flagstick, and Red Flag
    const greenGeo = new THREE.CircleGeometry(4, 32);
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
    input = new InputHandler((power, angle) => {
        // 1. Get the camera's forward direction vector
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement completely flat on the grass
        forward.normalize();

        // 2. Get the camera's right direction vector by crossing forward with the up-axis
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Pass the power, the mouse deviation angle, and our physical view vectors
        physics.applyImpulse(power, angle, forward, right);

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    });

    window.addEventListener('resize', onWindowResize, false);

    // FIX: Generate the wind vectors first so the UI shows data immediately
    generateNewWind();

    // Start the main rendering loop
    animate();
}

// Fire up engine safely now that everything is declared
init();

function updateDistanceDisplay() {
    const dx = ball.position.x - holePosition.x;
    const dz = ball.position.z - holePosition.z;
    const gameDistance = Math.sqrt(dx * dx + dz * dz);

    // Scale multiplier: 65 units at the tee box = exactly 180 yards
    const yards = Math.round(gameDistance * 2.7692);

    const distanceText = document.getElementById('distanceText');
    if (distanceText) {
        distanceText.innerText = yards;
    }
}