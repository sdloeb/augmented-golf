import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';

let scene, camera, renderer, ball, physics, input;

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

    // The camera tracking lines are gone, so the screen stays completely still!

    // Render updated screen visual state
    renderer.render(scene, camera);
}






// Fire up engine when script loads
init();