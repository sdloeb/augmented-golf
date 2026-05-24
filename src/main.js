import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input;

// NEW: Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;

function init() {
    // 1. Create the 3D World Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // 2. Setup Camera View (Fixed behind the ball, looking down the range)
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000); // <-- ADD THIS LINE
    camera.position.set(0, 2, 14);
    camera.lookAt(0, 0, -50);

    // 3. Setup WebGL Canvas Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. Create Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // 5. Add Virtual Golf Green Floor
    const floorGeo = new THREE.PlaneGeometry(50, 100);
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
    green.position.set(0, 0.02, -35); // Positioned far down the range (Z = -35)
    scene.add(green);

    // Create a thin white flagstick (pin)
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8); // Thin pole, 3 units tall
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 1.5, -35); // Centered on the green, standing upright
    scene.add(pin);

    // Create a bright red flag attached to the top of the pin
    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5); // Rectangular flag
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    // Position it at the top right of the pin
    flag.position.set(0.4, 2.75, -35);
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

    // DYNAMIC CAMERA LOGIC
    if (physics.isMoving) {
        // 1. BALL IS FLYING: Lock the camera's view strictly to the launch pad station
        if (!wasMoving) {
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.75, ball.position.z + 4);
            cameraLookAt.set(0, 0, -50);
            wasMoving = true;
        }
    } else {
        // 2. BALL IS STATIONARY
        if (wasMoving) {
            // It JUST stopped! Glide the camera down the fairway for a close-up zoom
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.8, ball.position.z + 5.5);
            cameraLookAt.copy(ball.position);
        }

        // 3. NEXT SHOT SETUP: If the player clicks to swing again, glide camera back behind the ball
        if (input && input.isSwinging) {
            wasMoving = false; // Reset tracking flag
            cameraTargetPos.set(ball.position.x, ball.position.y + 1.75, ball.position.z + 4);
            cameraLookAt.set(0, 0, -50);
        }
    }

    // Smoothly glide (LERP) the camera position and look-at vector to their targets
    // 0.05 controls the speed of the camera movement glide (lower is smoother)
    camera.position.lerp(cameraTargetPos, 0.05);
    currentLookAt.lerp(cameraLookAt, 0.05);
    camera.lookAt(currentLookAt);

    // Render updated screen visual state
    renderer.render(scene, camera);
}






// Fire up engine when script loads
init();