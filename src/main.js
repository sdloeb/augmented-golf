import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input;

// NEW: Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;

let ballTargetScale = 1.0;

function init() {
    // 1. Create the 3D World Scene
    scene = new THREE.Scene();


    // 2. Setup Camera View (Fixed behind the ball, looking down the range)
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000); // <-- ADD THIS LINE
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
    floor.rotation.x = -Math.PI / 2; // Lie flat
    scene.add(floor);

    // 6. Add Golf Ball Mesh
    const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.25, 10); // Start slightly forward from camera view
    scene.add(ball);

    // 6.5. Add the Putting Green, Flagstick, and Red Flag
    // Create a circular green target area
    const greenGeo = new THREE.CircleGeometry(4, 32); // Radius of 4 units
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x32cd32, roughness: 0.8 }); // Brighter green
    const green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2; // Lie flat on top of the fairway
    green.position.set(0, 0.02, -55); // Positioned far down the range (Z = -35)
    scene.add(green);

    // Create a thin white flagstick (pin)
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8); // Thin pole, 3 units tall
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 1.5, -55); // Centered on the green, standing upright
    scene.add(pin);

    // Create a bright red flag attached to the top of the pin
    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5); // Rectangular flag
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    // Position it at the top right of the pin
    flag.position.set(0.4, 2.75, -55);
    scene.add(flag);

    // 7. Initialize Modules
    physics = new PhysicsEngine(ball);
    input = new InputHandler((power, angle) => {
        physics.applyImpulse(power, angle);
    });

    // Handle Window Resizing
    window.addEventListener('resize', onWindowResize, false);

    // Start Main Loop
    animate();


    generateNewWind(); // NEW: Set up the wind for the very first shot
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Run physics frames
    physics.update();

    // DYNAMIC CAMERA & SCALE LOGIC
    if (physics.isMoving) {
        if (!wasMoving) {
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.75, ball.position.z + 4);
            cameraLookAt.set(0, 0, -50);
            ballTargetScale = 1.0; // Keep full size while flying down range
            wasMoving = true;
        }
    } else {
        if (wasMoving) {
            // It JUST stopped! Zoom camera and shrink ball target to 0.5 (half size)
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.8, ball.position.z + 5.5);
            cameraLookAt.copy(ball.position);
            ballTargetScale = 0.5;

            generateNewWind(); // Fires exactly once right here!

            wasMoving = false; // FIX: Flip this to false immediately so it doesn't loop!
        }

        if (input && input.isSwinging) {
            // We no longer clear wasMoving here because we safely cleared it above
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.75, ball.position.z + 4);
            cameraLookAt.set(0, 0, -50);
            ballTargetScale = 1.0;
        }
    }

    // Smoothly glide (LERP) the camera position and look-at view
    camera.position.lerp(cameraTargetPos, 0.05);
    currentLookAt.lerp(cameraLookAt, 0.05);
    camera.lookAt(currentLookAt);

    // NEW: Smoothly morph the ball's size to match our target scale
    const currentScale = THREE.MathUtils.lerp(ball.scale.x, ballTargetScale, 0.05);
    ball.scale.set(currentScale, currentScale, currentScale);

    // Render updated screen visual state
    renderer.render(scene, camera);
}





// Fire up engine when script loads
init();

function generateNewWind() {
    const maxWindSpeed = 25;
    const windSpeed = Math.floor(Math.random() * maxWindSpeed);
    const windAngle = Math.random() * Math.PI * 2; // Random angle in radians (0 to 360°)

    // Update the UI HTML elements
    const arrow = document.getElementById('windArrow');
    const text = document.getElementById('windText');
    if (arrow && text) {
        const degrees = (windAngle * 180) / Math.PI;
        arrow.style.transform = `rotate(${degrees}deg)`;
        text.innerText = `${windSpeed} mph`;
    }

    // Convert the wind angle and speed into a tiny 3D force vector for our physics engine
    const windScale = 0.00004; // Keeps the wind realistic so it doesn't violently throw the ball off-screen
    physics.wind.set(
        Math.sin(windAngle) * windSpeed * windScale,
        0,
        -Math.cos(windAngle) * windSpeed * windScale
    );
}