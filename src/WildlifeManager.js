export class WildlifeManager {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.birds = [];
        this.bugs = [];
        this.birdGroup = new THREE.Group();
        this.bugGroup = new THREE.Group();
        this.scene.add(this.birdGroup);
        this.scene.add(this.bugGroup);
    }

    reset(holeConfig, holePosition) {
        this.clear();

        const greenZ = holePosition ? holePosition.z : -60;
        const teeZ = 10;
        const totalSpanZ = Math.abs(greenZ - teeZ);

        // --- 1. BIRDS IN FLIGHT (Flapping 3D wings circling the sky) ---
        const birdCount = 6;
        const birdMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < birdCount; i++) {
            const bird = new THREE.Group();

            // Aerodynamic body
            const bodyGeo = new THREE.ConeGeometry(0.12, 0.6, 5);
            bodyGeo.rotateX(Math.PI / 2);
            const bodyMesh = new THREE.Mesh(bodyGeo, birdMat);
            bird.add(bodyMesh);

            // Left Wing
            const leftWingGeo = new THREE.PlaneGeometry(0.55, 0.28);
            leftWingGeo.translate(-0.28, 0, 0);
            const leftWing = new THREE.Mesh(leftWingGeo, birdMat);
            leftWing.position.set(-0.05, 0.04, 0);
            bird.add(leftWing);

            // Right Wing
            const rightWingGeo = new THREE.PlaneGeometry(0.55, 0.28);
            rightWingGeo.translate(0.28, 0, 0);
            const rightWing = new THREE.Mesh(rightWingGeo, birdMat);
            rightWing.position.set(0.05, 0.04, 0);
            bird.add(rightWing);

            // Flight paths
            const orbitCenterX = (Math.random() - 0.5) * 60;
            const orbitCenterZ = teeZ - Math.random() * totalSpanZ;
            const orbitRadiusX = 25 + Math.random() * 35;
            const orbitRadiusZ = 30 + Math.random() * 40;
            const altitude = 18 + Math.random() * 14;
            const speed = 0.0004 + Math.random() * 0.0003;
            const phase = Math.random() * Math.PI * 2;
            const flapSpeed = 0.012 + Math.random() * 0.006;

            this.birds.push({
                group: bird,
                leftWing: leftWing,
                rightWing: rightWing,
                centerX: orbitCenterX,
                centerZ: orbitCenterZ,
                radiusX: orbitRadiusX,
                radiusZ: orbitRadiusZ,
                altitude: altitude,
                speed: speed,
                phase: phase,
                flapSpeed: flapSpeed,
                direction: Math.random() > 0.5 ? 1 : -1
            });

            this.birdGroup.add(bird);
        }

        // --- 2. AMBIENT BUGS & FIREFLIES (Hovering over grass and hazards) ---
        const bugCount = 35;
        const bugColors = [0xd4e157, 0x81c784, 0xffeb3b, 0x80deea];

        for (let i = 0; i < bugCount; i++) {
            const color = bugColors[i % bugColors.length];
            const bugMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.85
            });

            const bugGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
            const bugMesh = new THREE.Mesh(bugGeo, bugMat);

            const anchorX = (Math.random() - 0.5) * 55;
            const anchorZ = teeZ - Math.random() * (totalSpanZ + 15);
            const hoverHeight = 0.8 + Math.random() * 2.2;
            const wanderSpeed = 0.002 + Math.random() * 0.003;
            const wanderRadius = 1.5 + Math.random() * 3.0;

            this.bugs.push({
                mesh: bugMesh,
                anchorX: anchorX,
                anchorZ: anchorZ,
                hoverHeight: hoverHeight,
                wanderSpeed: wanderSpeed,
                wanderRadius: wanderRadius,
                phase: Math.random() * Math.PI * 2,
                noiseOffset: Math.random() * 100
            });

            this.bugGroup.add(bugMesh);
        }
    }

    update(time, isRaining) {
        // --- 1. UPDATE BIRDS ---
        for (let i = 0; i < this.birds.length; i++) {
            const b = this.birds[i];
            if (isRaining) {
                b.group.visible = false;
                continue;
            }
            b.group.visible = true;

            const t = (time * b.speed * b.direction) + b.phase;
            const x = b.centerX + Math.sin(t) * b.radiusX;
            const z = b.centerZ + Math.cos(t) * b.radiusZ;
            const y = b.altitude + Math.sin(t * 2.0) * 2.5;

            const nextT = t + 0.01 * b.direction;
            const nextX = b.centerX + Math.sin(nextT) * b.radiusX;
            const nextZ = b.centerZ + Math.cos(nextT) * b.radiusZ;
            const nextY = b.altitude + Math.sin(nextT * 2.0) * 2.5;

            b.group.position.set(x, y, z);
            b.group.lookAt(nextX, nextY, nextZ);

            const flapAngle = Math.sin(time * b.flapSpeed) * 0.65;
            b.leftWing.rotation.z = flapAngle;
            b.rightWing.rotation.z = -flapAngle;
        }

        // --- 2. UPDATE BUGS ---
        for (let i = 0; i < this.bugs.length; i++) {
            const bg = this.bugs[i];
            if (isRaining) {
                bg.mesh.visible = false;
                continue;
            }
            bg.mesh.visible = true;

            const t = (time * bg.wanderSpeed) + bg.phase;
            const currentX = bg.anchorX + Math.sin(t) * bg.wanderRadius + Math.sin(time * 0.008 + bg.noiseOffset) * 0.4;
            const currentZ = bg.anchorZ + Math.cos(t * 0.8) * bg.wanderRadius + Math.cos(time * 0.007 + bg.noiseOffset) * 0.4;

            const groundY = this.physics ? this.physics.getGroundHeight(currentX, currentZ) : 0;
            const currentY = groundY + bg.hoverHeight + Math.sin(time * 0.005 + bg.noiseOffset) * 0.35;

            bg.mesh.position.set(currentX, currentY, currentZ);

            const flutter = 0.8 + Math.sin(time * 0.03 + bg.noiseOffset) * 0.3;
            bg.mesh.scale.set(flutter, flutter, flutter);
        }
    }

    clear() {
        while (this.birdGroup.children.length > 0) {
            const obj = this.birdGroup.children[0];
            this.birdGroup.remove(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        while (this.bugGroup.children.length > 0) {
            const obj = this.bugGroup.children[0];
            this.bugGroup.remove(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        this.birds = [];
        this.bugs = [];
    }
}