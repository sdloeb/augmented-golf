import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { SoundManager } from './SoundManager.js';

let scene, camera, renderer, ball, physics, input, teeBox, currentWindAngle = 0, sounds;
let green, pin, flag, holeCup, fairway, floor;
let ballTracer, tracerPoints = [];
let slopeX = 0, slopeZ = 0, greenGrid, gridTexture, gridCanvas, greenCenterZ;

let sandTraps = [];
let waterHazards = [];
let waterShores = [];
let sceneryObjects = [];
let currentHoleNumber = 1;
let currentPar = 4;

// Camera cinematic interpolation variables
let cameraTargetPos = new THREE.Vector3(0, 2, 14);
let cameraLookAt = new THREE.Vector3(0, 0, -50);
let currentLookAt = new THREE.Vector3(0, 0, -50);
let wasMoving = false;
let overheadTimeout = null;
let isOverheadActive = false;

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
    document.documentElement.style.setProperty('--club-scale', window.innerHeight / 1080);
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
        const greenCheckX = ball.position.x - 0;
        const greenCheckZ = ball.position.z - greenCenterZ;
        const isOnGreen = Math.sqrt(greenCheckX * greenCheckX + greenCheckZ * greenCheckZ) < GREEN_RADIUS;

        // On the putting green, lock to the putter with no extra layout elements
        if (isOnGreen) {
            return;
        }

        const defaultIdx = input.getDefaultClubIndex();
        const activeClub = input.getClubInfo();
        const clubList = input.getClubList();

        // Reconfigure the container style from vertical column to horizontal row row
        container.style.flexDirection = 'row';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center'; // CHANGED: Centers the arrows horizontally
        container.style.gap = '20px';

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
                updateDistanceDisplay(); // Refresh UI layout positions instantly
            }
        });



        // 3. BUILD THE RIGHT SCROLL ARROW (Goes to shorter distance clubs)
        const rightBtn = document.createElement('button');
        rightBtn.className = 'club-option';
        rightBtn.innerText = '▶';

        // Disable the arrow if we are already holding the shortest club (SW Iron at max index)
        if (currentIdx === clubList.length - 1) {
            rightBtn.style.opacity = '0.3';
            rightBtn.style.pointerEvents = 'none';
        }
        rightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let cIdx = input.chosenClubIndex !== null ? input.chosenClubIndex : defaultIdx;
            if (cIdx < clubList.length - 1) {
                input.chosenClubIndex = cIdx + 1;
                updateDistanceDisplay(); // Refresh UI layout positions instantly
            }
        });

        // Append all three nodes to create the smooth inline selection row
        container.appendChild(leftBtn);
        container.appendChild(rightBtn);
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

    const windScale = 0.000012;
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
    sandTraps = [];
    waterHazards = [];
    waterShores = [];

    const numWater = 1 + Math.floor(Math.random() * 2);
    const numSand = Math.floor(Math.random() * 3);  // 0 to 2

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

    for (let i = 0; i < numWater; i++) {
        let x, z, r = 7.0 + Math.random() * 4.5;
        let waterAttempts = 0; // Add this line
        do {
            x = (Math.random() - 0.5) * 50;
            z = (targetGreenZ - 20) + Math.random() * (26 - targetGreenZ);
            waterAttempts++; // Add this line
            if (waterAttempts > 50) break; // Add this line to prevent browser freezing
        } while (
            checkOverlap(x, z, r, waterHazards) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r + 2.0) ||
            (z > -15 && Math.abs(x) < 15)
        );

        if (waterAttempts > 50) continue; // Add this line to skip placement if no space was found

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
        waterMesh.position.set(x, currentWaterGroundY + 0.06, z);
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
        shoreMesh.position.set(x, currentWaterGroundY + 0.07, z);
        scene.add(shoreMesh);
        waterShores.push(shoreMesh);

    }

    for (let i = 0; i < numSand; i++) {
        let x, z, r = 4.5 + Math.random() * 2.5;
        let sandAttempts = 0; // Add this line
        do {
            x = (Math.random() - 0.5) * 50;
            z = (targetGreenZ - 20) + Math.random() * (26 - targetGreenZ);
            sandAttempts++; // Add this line
            if (sandAttempts > 50) break; // Add this line to prevent browser freezing
        } while (
            checkOverlap(x, z, r, waterHazards, 3.0) ||
            checkOverlap(x, z, r, sandTraps) ||
            Math.sqrt(x * x + (z - targetGreenZ) * (z - targetGreenZ)) < (12 + r + 2.0) ||
            (z > -15 && Math.abs(x) < 15)
        );

        if (sandAttempts > 50) continue; // Add this line to skip placement if no space was found

        let currentSandGroundY = physics.getGroundHeight(x, z);

        // NEW: If sand spawns inside the fairway lane, elevate it slightly to match the fairway mesh cushion (+0.03)
        if (z >= targetGreenZ && z <= 8 && Math.abs(x) <= 9.0) {
            currentSandGroundY += 0.035;
        }

        const sandMesh = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0xe0ca9b, roughness: 0.9 }));
        sandMesh.rotation.x = -Math.PI / 2;
        sandMesh.position.set(x, currentSandGroundY + 0.007, z);
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

    // Assign Par properties against the distance requirements provided
    const randomYards = 135 + Math.random() * (650 - 135);

    if (randomYards < 260) {
        currentPar = 3;
    } else if (randomYards <= 475) {
        currentPar = 4;
    } else {
        currentPar = 5;
    }

    // Update the Wood Placard Map Dashboard display readings
    const mapTitleElement = document.getElementById('holeMapTitle');
    const mapParElement = document.getElementById('holeMapPar');
    if (mapTitleElement) mapTitleElement.innerText = `HOLE ${currentHoleNumber}`;
    if (mapParElement) mapParElement.innerText = `PAR ${currentPar}`;

    const gameUnits = randomYards / 2.76923;
    greenCenterZ = 10 - gameUnits;

    // Dynamically shift the physical pin location anywhere within the circular green boundaries
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
        physics.setGreenContours(backZoneProfile, midZoneProfile, frontZoneProfile, greenCenterZ);
    }

    // Calculate the dynamic 3D ground level height exactly where the random pin cup is spawned
    const specificPinCupY = physics.getGreenHeight(holePosition.x, holePosition.z);

    // Pin the visual flagstick elements seamlessly onto the new 3D elevation slopes coordinate
    if (pin) pin.position.set(holePosition.x, 1.5 + specificPinCupY, holePosition.z);
    if (flag) flag.position.set(holePosition.x + 0.4, 2.75 + specificPinCupY, holePosition.z);
    if (holeCup) holeCup.position.set(holePosition.x, 0.04 + specificPinCupY, holePosition.z);

    // Deform the visual green mesh geometries to create real 3D ridges and valleys
    const deformVisualGreenMesh = (targetMesh) => {
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            // Map local plane points to true world coordinate spaces
            const worldX = localX + targetMesh.position.x;
            const worldZ = -localY + targetMesh.position.z;

            // Fetch height calculation and bind directly to local Z (world height elevation after rotation)
            let calculatedHeight = physics.getGreenHeight(worldX, worldZ);
            if (targetMesh === green) calculatedHeight += 0.02;
            if (targetMesh === greenGrid) calculatedHeight += 0.03;
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

            let calculatedHeight = physics.getGroundHeight(worldX, worldZ);

            waterHazards.forEach(water => {
                const dxW = worldX - water.position.x;
                const dzW = worldZ - water.position.z;
                const distToWater = Math.sqrt(dxW * dxW + dzW * dzW);
                const lakeRadius = water.userData.radius || 5;

                // FIXED: Read the level baseline ground height of this specific lake center point
                const centerLakeHeight = water.position.y - 0.06;

                // 0.6 matches the outer radius extension of your shore ring (r + 0.6)
                if (distToWater < lakeRadius + 0.6) {
                    // 1. Flatten the terrain mesh completely to form a level shelf for the shore ring
                    calculatedHeight = centerLakeHeight;

                    // 2. Drop the center down to form the water basin
                    if (distToWater < lakeRadius - 0.4) {
                        calculatedHeight -= 1.2;
                    }
                } else if (distToWater < lakeRadius + 2.5) {
                    // 3. Smoothly blend the flat shore shelf back out into the undulating course hills over a 1.9 unit window
                    const blendFactor = (distToWater - (lakeRadius + 0.6)) / 1.9;
                    calculatedHeight = THREE.MathUtils.lerp(centerLakeHeight, calculatedHeight, blendFactor);
                }
            });

            const gX = worldX;
            const gZ = worldZ - greenCenterZ;
            const distToGreen = Math.sqrt(gX * gX + gZ * gZ);

            // 1. Smooth Green Concealment Push-Down (applies to BOTH fairway and floor meshes)
            // Increased to 0.45 and stretched to a 3-unit window to safely cushion the dense circular green edge
            if (distToGreen < 12.0) {
                calculatedHeight -= 0.45;
            } else if (distToGreen < 15.0) {
                const greenFade = (15.0 - distToGreen) / 3.0;
                calculatedHeight -= 0.45 * greenFade;
            }

            // 2. Fairway Lane Floor Concealment (applies ONLY to the rough floor mesh)
            // Locks a flat, uniform deep buffer inside the track and offsets the fade to the outer rough
            if (targetMesh === floor) {
                if (worldZ >= greenCenterZ && worldZ <= 8) {
                    let zFade = 1.0; // Add this line
                    const fadeWindow = 4.0; // Add this line (creates a smooth 4-unit blend at the ends)

                    if (worldZ - greenCenterZ < fadeWindow) { // Add this line
                        zFade = (worldZ - greenCenterZ) / fadeWindow; // Add this line
                    } else if (8 - worldZ < fadeWindow) { // Add this line
                        zFade = (8 - worldZ) / fadeWindow; // Add this line
                    } // Add this line

                    const absX = Math.abs(worldX);
                    if (absX <= 9.0) {
                        // Solid, unyielding clearance across the entire fairway width
                        calculatedHeight -= 0.75 * zFade; // Change this line
                    } else if (absX <= 12.0) {
                        // Smoothly taper the push-down OUTSIDE the fairway lanes (from 9.0 to 12.0)
                        // Keeps the edge fully buried by 0.75 units without leaving gaps in the outer turf
                        const sideFade = (12.0 - absX) / 3.0;
                        calculatedHeight -= 0.75 * sideFade * zFade; // Change this line
                    }
                }
            }

            // 3. Fairway Elevation Cushion (applies ONLY to the fairway mesh)
            // Adds a small vertical safety cushion to counteract vertex interpolation discrepancies on steep mounds
            if (targetMesh === fairway) {
                calculatedHeight += 0.03;
            }

            posAttr.setZ(i, calculatedHeight);
        }
        posAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals();
    };

    // Run deforming treatments over both the putting grass surface and its alignment grid layer mesh
    deformVisualGreenMesh(green);
    deformVisualGreenMesh(greenGrid);

    // Extract local physics engine height maps to draw custom contour arrows across the surface grid
    if (gridCanvas && gridTexture) {
        const ctx = gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 4.0;

        const gridCount = 5;
        const spacing = 512 / gridCount;

        for (let row = 0; row < gridCount; row++) {
            for (let col = 0; col < gridCount; col++) {
                const cx = col * spacing + spacing / 2;
                const cy = row * spacing + spacing / 2;

                // Map canvas coordinates to world coordinates relative to the green center
                const wx = (cx / 512 - 0.5) * (GREEN_RADIUS * 2);
                const wz = (cy / 512 - 0.5) * (GREEN_RADIUS * 2) + greenCenterZ;

                // Check if this point falls inside the circular green grass area
                const distFromCenter = Math.sqrt(wx * wx + (wz - greenCenterZ) * (wz - greenCenterZ));
                if (distFromCenter < GREEN_RADIUS - 0.5) {

                    // Sample local neighbors to get the exact slope direction at this specific point
                    const delta = 0.1;
                    const hL = physics.getGreenHeight(wx - delta, wz);
                    const hR = physics.getGreenHeight(wx + delta, wz);
                    const hB = physics.getGreenHeight(wx, wz - delta);
                    const hF = physics.getGreenHeight(wx, wz + delta);

                    const localSlopeX = (hL - hR) / (2 * delta);
                    const localSlopeZ = (hB - hF) / (2 * delta);

                    // Only paint an arrow if there is an active slope angle here
                    if (Math.sqrt(localSlopeX * localSlopeX + localSlopeZ * localSlopeZ) > 0.001) {
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate(Math.atan2(localSlopeZ, localSlopeX)); // Points arrow downhill

                        // Draw clean, bolder medium-sized arrows
                        ctx.beginPath();
                        ctx.moveTo(-25, 0); ctx.lineTo(25, 0);
                        ctx.lineTo(12, -9);
                        ctx.moveTo(25, 0); ctx.lineTo(12, 9);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        }
        gridTexture.needsUpdate = true;
    }

    // =========================================================================
    // RESTORED INLINE STRUCTURAL CODE (RE-ADDED SECOND HALF OF FUNCTION PIPELINE)
    // =========================================================================
    if (fairway) {
        const fairwayLength = 8 - greenCenterZ;
        fairway.scale.set(1, fairwayLength, 1);
        fairway.position.set(0, 0.01, (8 + greenCenterZ) / 2);
    }

    deformCourseMesh(floor, false);
    deformCourseMesh(fairway, true);

    // Randomize the Tee Box horizontal offset left or right to vary the shot angles
    const teeBoxX = (Math.random() - 0.5) * 7.0;
    if (teeBox) {
        teeBox.position.set(teeBoxX, 0.01, 10);
        teeBox.visible = true;
    }

    ball.position.set(teeBoxX, 0.25, 10);
    physics.velocity.set(0, 0, 0);
    physics.isMoving = false;
    wasMoving = false;
    isSinking = false;
    isOverheadActive = false;
    ballTargetScale = 1.0;
    ball.scale.set(1, 1, 1);

    // Calculate the precise target-line vector between the randomized tee and pin positions
    const startDirX = holePosition.x - teeBoxX;
    const startDirZ = holePosition.z - 10;
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
    for (let i = 0; i < 35; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (31 + Math.random() * 15);
        const z = 15 - Math.random() * (25 + Math.abs(holePosition.z));

        const sceneryGroup = new THREE.Group();
        const courseHeight = physics.getGroundHeight(x, z);
        sceneryGroup.position.set(x, courseHeight, z);

        if (Math.random() > 0.4) {
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

    generateHazards();
    generateNewWind();
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
        if (distanceToHole < 0.35 && ball.position.y <= (0.25 + physics.getGroundHeight(ball.position.x, ball.position.z) + 0.15)) {
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
        const onGreen = Math.sqrt(ball.position.x * ball.position.x + (ball.position.z - greenCenterZ) * (ball.position.z - greenCenterZ)) < GREEN_RADIUS;
        const camDist = onGreen ? 2.5 : 5.5;      // Zooms in close on the green
        const camHeight = onGreen ? 0.82 : 1.8;    // Lowers camera proportionally to keep the same view angle
        const lookDist = onGreen ? 5.45 : 12.0;
        if (wasMoving && !isSinking) {
            isOverheadActive = false;
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

            const backX = -(dirX / length) * camDist; // CHANGED
            const backZ = -(dirZ / length) * camDist; // CHANGED

            if (!isOverheadActive) {
                cameraTargetPos.set(ball.position.x + backX, ball.position.y + camHeight, ball.position.z + backZ); // CHANGED
                cameraLookAt.set(ball.position.x + (dirX / length) * lookDist, ball.position.y, ball.position.z + (dirZ / length) * lookDist); // CHANGED
            }
            ballTargetScale = 0.5;
            if (teeBox) teeBox.visible = false;

            generateNewWind();
            updateDistanceDisplay();
            wasMoving = false;

            // Wipe the tracer clean immediately whenever the ball comes to a stop anywhere
            tracerPoints = [];
            if (ballTracer) {
                ballTracer.geometry.setFromPoints(tracerPoints);
                ballTracer.geometry.computeBoundingSphere();
            }


        }

        if (input && input.isSwinging) {
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

            const backX = -(dirX / length) * camDist; // CHANGED
            const backZ = -(dirZ / length) * camDist; // CHANGED

            cameraTargetPos.set(ball.position.x + backX, ball.position.y + camHeight, ball.position.z + backZ); // CHANGED
            cameraLookAt.set(ball.position.x + (dirX / length) * lookDist, ball.position.y, ball.position.z + (dirZ / length) * lookDist); // CHANGED
            ballTargetScale = 1.0;
        }
    }

    const ballGreenX = ball.position.x - 0;
    const ballGreenZ = ball.position.z - greenCenterZ;
    const isCamOnGreen = Math.sqrt(ballGreenX * ballGreenX + ballGreenZ * ballGreenZ) < GREEN_RADIUS;
    const activeCameraSpeed = isCamOnGreen ? 0.05 : 0.05;  //(Slower on the green)

    camera.position.lerp(cameraTargetPos, activeCameraSpeed); // Change this line
    currentLookAt.lerp(cameraLookAt, activeCameraSpeed); // Change this line
    camera.lookAt(currentLookAt);

    // NEW: Counteract the camera zoom scale on the green so the ball doesn't look giant
    let finalBallTargetScale = ballTargetScale;
    if (!physics.isMoving) {
        if (isCamOnGreen) {
            // Multiplies the target size by the inverse camera zoom ratio to keep its screen size perfectly normal
            finalBallTargetScale *= (2.5 / 5.5) * 1.0;
        }
    }

    // CHANGED: Uses finalBallTargetScale instead of ballTargetScale
    const currentScale = THREE.MathUtils.lerp(ball.scale.x, finalBallTargetScale, 0.05);
    ball.scale.set(currentScale, currentScale, currentScale);

    // --- DYNAMIC CLUB STANCE STATE MACHINE ---
    const clubSwipeElement = document.getElementById('clubSwipe');
    if (clubSwipeElement && input) {
        // Only modify stance classes if the forward swing animation isn't currently playing
        if (!clubSwipeElement.classList.contains('swipe-animation')) {
            if (!physics.isMoving && !isSinking) {
                const activeClub = input.getClubInfo();

                // Establish base club layout shapes
                let clubTypeClass = 'iron';
                if (activeClub.name === 'Putter') {
                    clubTypeClass = 'putter';
                } else if (activeClub.name === 'Driver' || activeClub.name.includes('Wood') || activeClub.name === 'Hybrid') {
                    clubTypeClass = 'wood';
                }

                // Switch utility classes matching the interactive InputHandler tracking states
                if (input.state === 'IDLE') {
                    clubSwipeElement.className = `idle-stance ${clubTypeClass}`;
                    // Clean out dynamic inline properties when resting at address
                    clubSwipeElement.style.bottom = '';
                    clubSwipeElement.style.left = '';
                    clubSwipeElement.style.transform = '';
                } else if (input.state === 'PULLBACK') {
                    clubSwipeElement.className = `pullback-stance ${clubTypeClass}`;

                    if (activeClub.name === 'Putter') {
                        // NEW: Dynamically map the club's position directly to the real-time drag ratio
                        const ratio = input.pullRatio || 0;
                        const currentBottom = 24 - (22 * ratio); // Smoothly moves from 24% address down to 2% screen edge
                        const currentLeft = 47 + (6 * ratio);   // Curves outward from 47% center to 53% backswing pocket
                        const currentRotate = 20 * ratio;       // Smoothly hinges face open up to 20 degrees

                        clubSwipeElement.style.setProperty('bottom', `${currentBottom}%`, 'important');
                        clubSwipeElement.style.setProperty('left', `${currentLeft}%`, 'important');
                        clubSwipeElement.style.setProperty('transform', `rotate(${currentRotate}deg) scale(${1.2 - 0.2 * ratio})`, 'important');
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
                // Update this entire block: Combines horizontal, vertical, and diagonal cross-waves
                const wave1 = Math.sin(u * 1.1 + time * 1.5) * 0.025;
                const wave2 = Math.cos(v * 1.1 + time * 1.9) * 0.02;
                const wave3 = Math.sin((u + v) * 0.8 + time * 2.3) * 0.015;
                const waveHeight = (wave1 + wave2 + wave3) + 0.07;

                posAttr.setZ(i, waveHeight);
            }
            posAttr.needsUpdate = true; // Forces the GPU to reload the fresh wave coordinates
            mesh.geometry.computeVertexNormals(); // Recalculates lighting highlights so reflections move with waves
        });
    }

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
    const light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(12, 8, 15).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x666666));

    // 5. Add Virtual Golf Green Floor
    const floorGeo = new THREE.PlaneGeometry(60, 800, 40, 300);

    // Procedural rough grass noise texture generator
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 64; rCanvas.height = 64;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#a5a5a5'; rCtx.fillRect(0, 0, 64, 64); // Base neutral gray (Add this line)
    for (let i = 0; i < 500; i++) { // Paints 500 micro grass shadows/highlights per tile (Add this line)
        rCtx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#686868';
        rCtx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 3); // Fine vertical blade specks (Add this line)
    }
    const roughTexture = new THREE.CanvasTexture(rCanvas);
    roughTexture.wrapS = THREE.RepeatWrapping;
    roughTexture.wrapT = THREE.RepeatWrapping;
    roughTexture.repeat.set(90, 600); // Tightly repeats noise to keep blades look micro-fine (Add this line)

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.9, map: roughTexture }); // Update this line (added roughness and map)
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const fairwayGeo = new THREE.PlaneGeometry(18, 1, 15, 100);

    const fCanvas = document.createElement('canvas');
    fCanvas.width = 128; fCanvas.height = 4;
    const fCtx = fCanvas.getContext('2d');
    fCtx.fillStyle = '#ffffff'; fCtx.fillRect(0, 0, 64, 4); // Light stripe tint (Add this line)
    fCtx.fillStyle = '#b8b8b8'; fCtx.fillRect(64, 0, 64, 4); // Dark stripe tint (Add this line)
    const fairwayTexture = new THREE.CanvasTexture(fCanvas);
    fairwayTexture.wrapS = THREE.RepeatWrapping;
    fairwayTexture.repeat.set(4, 1);

    const fairwayMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7, map: fairwayTexture });
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


    // UPDATED: Now passes an extra dynamic checker argument directly into InputHandler
    input = new InputHandler((power, angle, spin, loft) => {

        tracerPoints = [];

        tracerPoints.push(ball.position.clone());  //to anchor the tracer exactly at the ball's starting position
        if (ballTracer) ballTracer.geometry.setFromPoints(tracerPoints);
        ballTracer.geometry.computeBoundingSphere();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // FIXED: Measures from the green's center to scale the hitting power multiplier accurately
        const gX = ball.position.x - 0;
        const gZ = ball.position.z - greenCenterZ;
        const isOnGreen = Math.sqrt(gX * gX + gZ * gZ) < GREEN_RADIUS;

        let finalPower = power;
        if (isOnGreen) {
            // Multiply to fine-tune putting physics:
            // e.g., 0.5 cuts putting power in half, 1.5 increases it by 50%
            finalPower *= 1.0;
        }

        physics.applyImpulse(finalPower, angle, forward, right, isOnGreen, spin, loft);



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

            // NEW: Instantly wipe active dynamic inline styles so the CSS forward keyframes can execute cleanly
            clubSwipe.style.bottom = '';
            clubSwipe.style.left = '';
            clubSwipe.style.transform = '';

            // NEW: Scales timeout to match the active club (1000ms for slow putts, 350ms for swift swings)
            const swingDuration = club.name === 'Putter' ? 1000 : 350;
            setTimeout(() => {
                clubSwipe.classList.remove('swipe-animation');
            }, swingDuration);
        }

        strokeCount++;
        document.getElementById('strokeText').innerText = strokeCount;
    }, () => {
        // FIXED: Tracks the green boundaries accurately from the true center point during click-drags
        const gX = ball.position.x - 0;
        const gZ = ball.position.z - greenCenterZ;
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
    onWindowResize();

    // Add overhead view button click listener
    const overheadBtn = document.getElementById('overheadBtn');
    if (overheadBtn) {
        overheadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isSinking) return; // Ignore if ball is dropping in the cup

            // Calculate direction vectors from ball to hole dynamically
            const dirX = holePosition.x - ball.position.x;
            const dirZ = holePosition.z - ball.position.z;
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

            if (!isOverheadActive) {
                // TOGGLE ON: Go up to the 20-foot elevated view
                isOverheadActive = true;

                const backX = -(dirX / length) * 6.5;
                const backZ = -(dirZ / length) * 6.5;
                const groundHeight = physics.getGroundHeight(ball.position.x, ball.position.z);

                // RESTORED: Puts the camera back up high and focuses directly on the target hole pin map area
                cameraTargetPos.set(ball.position.x + backX, groundHeight + 7.5, ball.position.z + backZ);
                cameraLookAt.copy(holePosition);
            } else {
                // TOGGLE OFF: Bring the camera manually back down behind the ball's current location
                isOverheadActive = false;

                // Check green tracking states on click release to select matching land coordinates
                const checkOnGreen = Math.sqrt(ball.position.x * ball.position.x + (ball.position.z - greenCenterZ) * (ball.position.z - greenCenterZ)) < GREEN_RADIUS;
                const camDist = checkOnGreen ? 2.5 : 5.5;
                const camHeight = checkOnGreen ? 0.82 : 1.8;
                const lookDist = checkOnGreen ? 5.45 : 12.0;

                const backX = -(dirX / length) * camDist;
                const backZ = -(dirZ / length) * camDist;

                // CORRECTED: Smoothly transitions the camera back to your active zoom/horizon offsets
                cameraTargetPos.set(ball.position.x + backX, ball.position.y + camHeight, ball.position.z + backZ);
                cameraLookAt.set(ball.position.x + (dirX / length) * lookDist, ball.position.y, ball.position.z + (dirZ / length) * lookDist);
            }
        });
    }

    generateNewWind();
    updateDistanceDisplay();
    resetEntireGame();
    animate();
}

init();