/**
 * One place that turns a HolesConfig hazard into a mesh AND the physics
 * userData the ball / heightmap already read.
 *
 * Visual and physics share the same radius, ellipse, polygon points, and depth.
 * Do not set those fields in main.js or PhysicsEngine.js for a new bunker/lake.
 *
 * Config shapes (from HolesConfig hazards[]):
 *   { type: 'sand', x, z, radius, depth }
 *   { type: 'sand', shape: 'snake', path: [{x,z}...], radius, depth }
 *   { type: 'sand', shape: 'polygon', points: [{x,z}...], depth }
 *   { type: 'lake', x, z, radius } or { radiusX, radiusZ }
 *   { type: 'ocean', x, z, width, length }
 */

export const SAND_COLLAR_WIDTH = 0.7;
export const LAKE_SINK = 1.5;
export const SNAKE_SPACING = 0.8;

export function pointInPolygon(points, x, z) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, zi = points[i].z;
        const xj = points[j].x, zj = points[j].z;
        if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
    }
    return inside;
}

export function minEdgeDistSq(points, x, z) {
    let minDistSq = Infinity;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, zi = points[i].z;
        const xj = points[j].x, zj = points[j].z;
        const l2 = (xi - xj) * (xi - xj) + (zi - zj) * (zi - zj) || 0.0001;
        let t = ((x - xi) * (xj - xi) + (z - zi) * (zj - zi)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = xi + t * (xj - xi);
        const projZ = zi + t * (zj - zi);
        const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);
        if (distSq < minDistSq) minDistSq = distSq;
    }
    return minDistSq;
}

export function lakeRadii(userData) {
    const rx = (userData && (userData.radiusX || userData.radius)) || 5;
    const rz = (userData && (userData.radiusZ || userData.radius)) || 5;
    return { rx, rz };
}

export function lakeRadiusAtAngle(userData, dx, dz) {
    const { rx, rz } = lakeRadii(userData);
    const angle = Math.atan2(dz, dx);
    return (rx * rz) / Math.sqrt((rz * Math.cos(angle)) ** 2 + (rx * Math.sin(angle)) ** 2);
}

export function sandPhysics(sand, x, z) {
    if (!sand || (sand.userData && sand.userData.isCollar)) return null;
    const ud = sand.userData || {};
    if (ud.isPolygon) {
        const points = ud.points;
        const inside = pointInPolygon(points, x, z);
        const edgeDist = Math.sqrt(minEdgeDistSq(points, x, z));
        return {
            kind: 'polygon',
            inside,
            edgeDist,
            distOut: inside ? -edgeDist : edgeDist,
            depth: ud.depth || 0.8
        };
    }
    const dx = x - sand.position.x;
    const dz = z - sand.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const radius = ud.radius || 5;
    return {
        kind: 'circle',
        inside: dist < radius,
        dist,
        radius,
        edgeDist: Math.abs(dist - radius),
        distOut: dist - radius,
        depth: ud.depth || 0.8
    };
}

export function waterPhysics(water, x, z) {
    if (!water || !water.userData) return null;
    const ud = water.userData;
    if (ud.isRectangular) {
        const halfW = ud.w / 2;
        const halfL = ud.l / 2;
        return {
            kind: 'rect',
            inside: x >= water.position.x - halfW && x <= water.position.x + halfW
                && z >= water.position.z - halfL && z <= water.position.z + halfL,
            minX: water.position.x - halfW,
            maxX: water.position.x + halfW,
            minZ: water.position.z - halfL,
            maxZ: water.position.z + halfL,
            w: ud.w,
            l: ud.l
        };
    }
    const dx = x - water.position.x;
    const dz = z - water.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const radius = lakeRadiusAtAngle(ud, dx, dz);
    return {
        kind: 'ellipse',
        inside: dist < radius,
        dist,
        radius,
        rx: lakeRadii(ud).rx,
        rz: lakeRadii(ud).rz
    };
}

export function sampleSnakePath(path, spacing) {
    const sampled = [];
    if (!path || path.length < 2) return sampled;
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.max(1, Math.floor(dist / spacing));
        for (let s = 0; s <= steps; s++) {
            if (s === steps && i < path.length - 2) continue;
            const t = s / steps;
            sampled.push({ x: p1.x + dx * t, z: p1.z + dz * t });
        }
    }
    return sampled;
}

export function smoothPolygonPoints(points) {
    let pts = points.map(p => ({ x: p.x, z: p.z }));
    for (let pass = 0; pass < 3; pass++) {
        const next = [];
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            next.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 });
            next.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
        }
        pts = next;
    }
    return pts;
}

export function polygonFastBox(points, pad = 3.5) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

function sandMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xd9c59e,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4
    });
}

function collarMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x1e5631,
        roughness: 0.9,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -5
    });
}

function waterMaterial(opts = {}) {
    const mat = {
        color: 0x0000ff,
        specular: 0xffffff,
        shininess: 150,
        flatShading: false
    };
    if (opts.side !== undefined) mat.side = opts.side;
    if (opts.polygonOffset) {
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -4;
    }
    return new THREE.MeshPhongMaterial(mat);
}

function stampCircleSand(mesh, radius, depth) {
    mesh.userData = { radius, depth, kind: 'sand_circle' };
}

function stampPolygonSand(mesh, points, depth) {
    mesh.userData = {
        points,
        depth,
        isPolygon: true,
        kind: 'sand_polygon',
        fastBox: polygonFastBox(points)
    };
}

function stampLake(mesh, rx, rz) {
    mesh.userData = {
        radius: Math.max(rx, rz),
        radiusX: rx,
        radiusZ: rz,
        kind: 'water_ellipse'
    };
}

function stampOcean(mesh, w, l) {
    mesh.userData = { isRectangular: true, w, l, kind: 'water_rect' };
}

function emptyBuilt() {
    return { sands: [], collars: [], waters: [], shores: [] };
}

export function buildCircleSand(spec) {
    const built = emptyBuilt();
    const r = spec.radius;
    const depth = spec.depth;
    const withCollar = spec.withCollar !== false;
    const sandMesh = new THREE.Mesh(new THREE.RingGeometry(0, r, 64, 6), sandMaterial());
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(spec.x, 0, spec.z);
    stampCircleSand(sandMesh, r, depth);
    built.sands.push(sandMesh);

    if (withCollar) {
        const collarWidth = SAND_COLLAR_WIDTH;
        const collarMesh = new THREE.Mesh(
            new THREE.RingGeometry(r - 0.05, r + collarWidth, 64, 4),
            collarMaterial()
        );
        collarMesh.rotation.x = -Math.PI / 2;
        collarMesh.position.set(spec.x, 0, spec.z);
        collarMesh.userData = { isCollar: true, radius: r + collarWidth };
        built.collars.push(collarMesh);
    }
    return built;
}

function buildSnakeCollar(sampled, radius) {
    const N = sampled.length;
    if (N < 2) return null;
    const perps = [];
    for (let i = 0; i < N; i++) {
        const prev = sampled[Math.max(0, i - 1)];
        const next = sampled[Math.min(N - 1, i + 1)];
        const dirX = next.x - prev.x;
        const dirZ = next.z - prev.z;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1.0;
        perps.push({ x: -dirZ / len, z: dirX / len });
    }

    const collarWidth = SAND_COLLAR_WIDTH;
    const rIn = radius - 0.05;
    const rOut = radius + collarWidth;
    const pairs = [];

    for (let i = 0; i < N; i++) {
        const p = sampled[i];
        const perp = perps[i];
        pairs.push({
            inX: p.x + perp.x * rIn, inZ: p.z + perp.z * rIn,
            outX: p.x + perp.x * rOut, outZ: p.z + perp.z * rOut
        });
    }

    const pEnd = sampled[N - 1];
    const pEndPrev = sampled[Math.max(0, N - 2)];
    const tanEndAngle = Math.atan2(pEnd.z - pEndPrev.z, pEnd.x - pEndPrev.x);
    const capSteps = 8;
    for (let c = 1; c < capSteps; c++) {
        const angle = tanEndAngle + (Math.PI / 2) - (c / capSteps) * Math.PI;
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        pairs.push({
            inX: pEnd.x + dx * rIn, inZ: pEnd.z + dz * rIn,
            outX: pEnd.x + dx * rOut, outZ: pEnd.z + dz * rOut
        });
    }

    for (let i = N - 1; i >= 0; i--) {
        const p = sampled[i];
        const perp = perps[i];
        pairs.push({
            inX: p.x - perp.x * rIn, inZ: p.z - perp.z * rIn,
            outX: p.x - perp.x * rOut, outZ: p.z - perp.z * rOut
        });
    }

    const pStart = sampled[0];
    const pStartNext = sampled[Math.min(N - 1, 1)];
    const tanStartAngle = Math.atan2(pStartNext.z - pStart.z, pStartNext.x - pStart.x);
    for (let c = 1; c < capSteps; c++) {
        const angle = tanStartAngle - (Math.PI / 2) - (c / capSteps) * Math.PI;
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        pairs.push({
            inX: pStart.x + dx * rIn, inZ: pStart.z + dz * rIn,
            outX: pStart.x + dx * rOut, outZ: pStart.z + dz * rOut
        });
    }

    const positions = [];
    const indices = [];
    const numPairs = pairs.length;
    for (let i = 0; i < numPairs; i++) {
        const pair = pairs[i];
        positions.push(pair.inX, -pair.inZ, 0);
        positions.push(pair.outX, -pair.outZ, 0);
        const nextI = (i + 1) % numPairs;
        const iIn = i * 2;
        const iOut = i * 2 + 1;
        const nextIn = nextI * 2;
        const nextOut = nextI * 2 + 1;
        indices.push(iIn, nextIn, iOut);
        indices.push(iOut, nextIn, nextOut);
    }

    const collarGeo = new THREE.BufferGeometry();
    collarGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    collarGeo.setIndex(indices);
    collarGeo.computeVertexNormals();
    const collarMesh = new THREE.Mesh(collarGeo, collarMaterial());
    collarMesh.rotation.x = -Math.PI / 2;
    collarMesh.position.set(0, 0, 0);
    collarMesh.userData = { isCollar: true, radius: radius + collarWidth };
    return collarMesh;
}

export function buildSnakeSand(spec) {
    const built = emptyBuilt();
    const spacing = spec.spacing !== undefined ? spec.spacing : SNAKE_SPACING;
    const sampled = sampleSnakePath(spec.path, spacing);
    for (let i = 0; i < sampled.length; i++) {
        const piece = buildCircleSand({
            x: sampled[i].x,
            z: sampled[i].z,
            radius: spec.radius,
            depth: spec.depth,
            withCollar: false
        });
        built.sands.push(piece.sands[0]);
    }
    const collar = buildSnakeCollar(sampled, spec.radius);
    if (collar) built.collars.push(collar);
    return built;
}

export function buildPolygonSand(spec) {
    const built = emptyBuilt();
    const pts = smoothPolygonPoints(spec.points);
    const depth = spec.depth;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    pts.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    });
    const pad = 0.35;
    const w = (maxX - minX) + pad * 2;
    const l = (maxZ - minZ) + pad * 2;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const geometry = new THREE.PlaneGeometry(w, l, Math.max(24, Math.ceil(w * 2.8)), Math.max(24, Math.ceil(l * 2.8)));
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i) + cx;
        const wz = -pos.getY(i) + cz;
        if (pointInPolygon(pts, wx, wz)) continue;
        let lo = 0, hi = 1;
        for (let k = 0; k < 14; k++) {
            const m = (lo + hi) * 0.5;
            const tx = cx + (wx - cx) * m;
            const tz = cz + (wz - cz) * m;
            if (pointInPolygon(pts, tx, tz)) lo = m; else hi = m;
        }
        pos.setX(i, (wx - cx) * lo);
        pos.setY(i, -((wz - cz) * lo));
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, sandMaterial());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, 0, cz);
    stampPolygonSand(mesh, pts, depth);
    built.sands.push(mesh);

    const N = pts.length;
    if (N >= 3) {
        let area = 0;
        for (let i = 0; i < N; i++) {
            const j = (i + 1) % N;
            area += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
        }
        const isCCW = area > 0;
        const outNormals = [];
        for (let i = 0; i < N; i++) {
            const prevPt = pts[(i - 1 + N) % N];
            const currPt = pts[i];
            const nextPt = pts[(i + 1) % N];
            let e1x = currPt.x - prevPt.x, e1z = currPt.z - prevPt.z;
            let e2x = nextPt.x - currPt.x, e2z = nextPt.z - currPt.z;
            const l1 = Math.sqrt(e1x * e1x + e1z * e1z) || 1.0;
            const l2 = Math.sqrt(e2x * e2x + e2z * e2z) || 1.0;
            e1x /= l1; e1z /= l1;
            e2x /= l2; e2z /= l2;
            let n1x = isCCW ? e1z : -e1z;
            let n1z = isCCW ? -e1x : e1x;
            let n2x = isCCW ? e2z : -e2z;
            let n2z = isCCW ? -e2x : e2x;
            let nAvgX = n1x + n2x, nAvgZ = n1z + n2z;
            const lAvg = Math.sqrt(nAvgX * nAvgX + nAvgZ * nAvgZ) || 1.0;
            nAvgX /= lAvg; nAvgZ /= lAvg;
            const dot = n1x * nAvgX + n1z * nAvgZ;
            const miter = 1.0 / Math.max(0.5, dot);
            outNormals.push({ x: nAvgX * miter, z: nAvgZ * miter });
        }

        const collarWidth = SAND_COLLAR_WIDTH;
        const positions = [];
        const indices = [];
        for (let i = 0; i < N; i++) {
            const p = pts[i];
            const n = outNormals[i];
            const inX = p.x - n.x * 0.08;
            const inZ = p.z - n.z * 0.08;
            const outX = p.x + n.x * collarWidth;
            const outZ = p.z + n.z * collarWidth;
            positions.push(inX, -inZ, 0);
            positions.push(outX, -outZ, 0);
            const nextI = (i + 1) % N;
            const iIn = i * 2;
            const iOut = i * 2 + 1;
            const nextIn = nextI * 2;
            const nextOut = nextI * 2 + 1;
            indices.push(iIn, nextIn, iOut);
            indices.push(iOut, nextIn, nextOut);
        }

        const collarGeo = new THREE.BufferGeometry();
        collarGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        collarGeo.setIndex(indices);
        collarGeo.computeVertexNormals();
        const collarMesh = new THREE.Mesh(collarGeo, collarMaterial());
        collarMesh.rotation.x = -Math.PI / 2;
        collarMesh.position.set(0, 0, 0);
        collarMesh.userData = { isCollar: true };
        built.collars.push(collarMesh);
    }
    return built;
}

function clampLakeVertices(geo, rx, rz) {
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
        const pX = pos.getX(j);
        const pY = pos.getY(j);
        const normDist = (pX / rx) * (pX / rx) + (pY / rz) * (pY / rz);
        if (normDist > 1) {
            const angle = Math.atan2(pY, pX);
            pos.setX(j, Math.cos(angle) * rx);
            pos.setY(j, Math.sin(angle) * rz);
        }
    }
    geo.computeVertexNormals();
}

function buildOrganicShore(rx, rz, x, y, z) {
    const shoreWidth = 1.5;
    const shoreMesh = new THREE.Mesh(
        new THREE.RingGeometry(rx - 0.05, rx + shoreWidth, 80, 2),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.98,
            metalness: 0.05,
            vertexColors: THREE.VertexColors
        })
    );
    const shorePos = shoreMesh.geometry.attributes.position;
    const shoreColors = new Float32Array(shorePos.count * 3);
    for (let j = 0; j < shorePos.count; j++) {
        const pX = shorePos.getX(j);
        const pY = shorePos.getY(j);
        const angle = Math.atan2(pY, pX);
        const rNow = Math.hypot(pX, pY);
        const t = (rNow - (rx - 0.05)) / shoreWidth;
        const wobble = (t > 0.35)
            ? (Math.sin(angle * 5.0) * 0.22 + Math.sin(angle * 11.0) * 0.10) * t
            : 0;
        const curRx = (rx - 0.05) + (shoreWidth + wobble) * t;
        const curRz = (rz - 0.05) + (shoreWidth + wobble) * t;
        shorePos.setX(j, Math.cos(angle) * curRx);
        shorePos.setY(j, Math.sin(angle) * curRz);
        const wetR = 0.20, wetG = 0.16, wetB = 0.12;
        const dryR = 0.58, dryG = 0.48, dryB = 0.34;
        shoreColors[j * 3] = wetR + (dryR - wetR) * t;
        shoreColors[j * 3 + 1] = wetG + (dryG - wetG) * t;
        shoreColors[j * 3 + 2] = wetB + (dryB - wetB) * t;
    }
    shoreMesh.geometry.setAttribute('color', new THREE.BufferAttribute(shoreColors, 3));
    shoreMesh.geometry.computeVertexNormals();
    shoreMesh.rotation.x = -Math.PI / 2;
    shoreMesh.position.set(x, y, z);
    return shoreMesh;
}

function buildSimpleShore(r, x, y, z) {
    const shoreMesh = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.05, r + 0.6, 64),
        new THREE.MeshStandardMaterial({
            color: 0x655545,
            roughness: 0.95,
            metalness: 0.1
        })
    );
    shoreMesh.rotation.x = -Math.PI / 2;
    shoreMesh.position.set(x, y, z);
    return shoreMesh;
}

export function buildLake(spec, ctx) {
    const built = emptyBuilt();
    const rx = spec.radiusX || spec.radius || 15;
    const rz = spec.radiusZ || spec.radius || 15;
    const waterGeo = new THREE.PlaneGeometry(rx * 2, rz * 2, 24, 24);
    clampLakeVertices(waterGeo, rx, rz);
    const waterMesh = new THREE.Mesh(waterGeo, waterMaterial({ polygonOffset: true }));
    const groundY = ctx && ctx.getGroundHeight ? ctx.getGroundHeight(spec.x, spec.z) : 0;
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(spec.x, groundY + 0.01 - LAKE_SINK, spec.z);
    stampLake(waterMesh, rx, rz);
    built.waters.push(waterMesh);

    const shoreY = groundY + 0.015 - LAKE_SINK;
    if (spec.shoreStyle === 'simple') {
        built.shores.push(buildSimpleShore(rx, spec.x, shoreY, spec.z));
    } else {
        built.shores.push(buildOrganicShore(rx, rz, spec.x, shoreY, spec.z));
    }

    if (spec.basinWall) {
        const r = Math.max(rx, rz);
        const wallMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(r + 0.58, r + 0.58, 50.0, 64, 1, true),
            new THREE.MeshStandardMaterial({
                color: 0x655545,
                roughness: 0.95,
                metalness: 0.1,
                side: THREE.DoubleSide
            })
        );
        wallMesh.position.set(spec.x, groundY + 0.015 - 25.0 - LAKE_SINK, spec.z);
        built.shores.push(wallMesh);
    }
    return built;
}

export function buildOcean(spec) {
    const built = emptyBuilt();
    const oceanMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.width, spec.length, 30, 60),
        waterMaterial({ side: THREE.DoubleSide, polygonOffset: false })
    );
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(spec.x, 0.05, spec.z);
    stampOcean(oceanMesh, spec.width, spec.length);
    built.waters.push(oceanMesh);
    return built;
}

export function buildHazard(hz, ctx) {
    if (!hz || !hz.type) return emptyBuilt();
    if (hz.type === 'sand') {
        const depth = hz.depth || 0.6;
        if (hz.shape === 'snake' || hz.shapeType === 'snake') {
            return buildSnakeSand({
                path: hz.path || [{ x: hz.x, z: hz.z }, { x: hz.x + 4, z: hz.z + 10 }],
                radius: hz.radius || 5.0,
                depth,
                spacing: hz.spacing
            });
        }
        if (hz.shape === 'polygon' || hz.shapeType === 'polygon') {
            return buildPolygonSand({ points: hz.points, depth });
        }
        return buildCircleSand({
            x: hz.x,
            z: hz.z,
            radius: hz.radius || 5.0,
            depth,
            withCollar: hz.withCollar !== false
        });
    }
    if (hz.type === 'lake') {
        return buildLake(hz, ctx);
    }
    if (hz.type === 'ocean') {
        return buildOcean(hz);
    }
    return emptyBuilt();
}

export function mergeBuilt(target, extra) {
    target.sands.push.apply(target.sands, extra.sands);
    target.collars.push.apply(target.collars, extra.collars);
    target.waters.push.apply(target.waters, extra.waters);
    target.shores.push.apply(target.shores, extra.shores);
    return target;
}

export function addBuiltHazards(scene, built, sandTraps, waterHazards, waterShores) {
    for (let i = 0; i < built.sands.length; i++) {
        scene.add(built.sands[i]);
        sandTraps.push(built.sands[i]);
    }
    for (let i = 0; i < built.collars.length; i++) {
        scene.add(built.collars[i]);
        sandTraps.push(built.collars[i]);
    }
    for (let i = 0; i < built.waters.length; i++) {
        scene.add(built.waters[i]);
        waterHazards.push(built.waters[i]);
    }
    for (let i = 0; i < built.shores.length; i++) {
        scene.add(built.shores[i]);
        waterShores.push(built.shores[i]);
    }
}

export const SAND_CLIP_MAX_CIRCLES = 64;
export const SAND_CLIP_MAX_POLY_PTS = 256;
export const SAND_CLIP_MAX_POLYS = 8;

export function packSandClips(sandTraps) {
    const circles = [];
    const polyPts = [];
    const polys = [];
    if (!sandTraps) return { circles, polyPts, polys };
    for (let i = 0; i < sandTraps.length; i++) {
        const sand = sandTraps[i];
        if (!sand || (sand.userData && sand.userData.isCollar)) continue;
        const ud = sand.userData || {};
        if (ud.isPolygon && ud.points && ud.points.length >= 3) {
            if (polys.length >= SAND_CLIP_MAX_POLYS) continue;
            if (polyPts.length + ud.points.length > SAND_CLIP_MAX_POLY_PTS) continue;
            polys.push({ start: polyPts.length, count: ud.points.length });
            for (let p = 0; p < ud.points.length; p++) {
                polyPts.push({ x: ud.points[p].x, z: ud.points[p].z });
            }
        } else if (ud.radius) {
            if (circles.length >= SAND_CLIP_MAX_CIRCLES) continue;
            circles.push({
                x: sand.position.x,
                z: sand.position.z,
                radius: ud.radius
            });
        }
    }
    return { circles, polyPts, polys };
}

export function createSandClipUniforms() {
    const circles = [];
    for (let i = 0; i < SAND_CLIP_MAX_CIRCLES; i++) circles.push(new THREE.Vector4());
    const polyPts = [];
    for (let i = 0; i < SAND_CLIP_MAX_POLY_PTS; i++) polyPts.push(new THREE.Vector2());
    const polyMeta = [];
    for (let i = 0; i < SAND_CLIP_MAX_POLYS; i++) polyMeta.push(new THREE.Vector4());
    return {
        uSandClipCount: { value: 0 },
        uSandCircles: { value: circles },
        uSandPolyCount: { value: 0 },
        uSandPolyPts: { value: polyPts },
        uSandPolyMeta: { value: polyMeta }
    };
}

export function writeSandClipUniforms(uniforms, sandTraps) {
    if (!uniforms) return;
    const packed = packSandClips(sandTraps);
    uniforms.uSandClipCount.value = packed.circles.length;
    for (let i = 0; i < SAND_CLIP_MAX_CIRCLES; i++) {
        const c = packed.circles[i];
        if (c) uniforms.uSandCircles.value[i].set(c.x, c.z, c.radius, 0);
        else uniforms.uSandCircles.value[i].set(0, 0, 0, 0);
    }
    uniforms.uSandPolyCount.value = packed.polys.length;
    for (let i = 0; i < SAND_CLIP_MAX_POLY_PTS; i++) {
        const p = packed.polyPts[i];
        if (p) uniforms.uSandPolyPts.value[i].set(p.x, p.z);
        else uniforms.uSandPolyPts.value[i].set(0, 0);
    }
    for (let i = 0; i < SAND_CLIP_MAX_POLYS; i++) {
        const p = packed.polys[i];
        if (p) uniforms.uSandPolyMeta.value[i].set(p.start, p.count, 0, 0);
        else uniforms.uSandPolyMeta.value[i].set(0, 0, 0, 0);
    }
}

export function attachSandClip(material, sharedUniforms, enabledRef) {
    if (!material || !sharedUniforms || !enabledRef) return;
    material.customProgramCacheKey = function () { return 'sand-clip-v1'; };
    material.onBeforeCompile = function (shader) {
        shader.uniforms.uSandClipCount = sharedUniforms.uSandClipCount;
        shader.uniforms.uSandCircles = sharedUniforms.uSandCircles;
        shader.uniforms.uSandPolyCount = sharedUniforms.uSandPolyCount;
        shader.uniforms.uSandPolyPts = sharedUniforms.uSandPolyPts;
        shader.uniforms.uSandPolyMeta = sharedUniforms.uSandPolyMeta;
        shader.uniforms.uSandClipOn = enabledRef;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vSandWorldPos;'
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvSandWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            [
                '#include <common>',
                'uniform float uSandClipOn;',
                'uniform float uSandClipCount;',
                'uniform vec4 uSandCircles[' + SAND_CLIP_MAX_CIRCLES + '];',
                'uniform float uSandPolyCount;',
                'uniform vec2 uSandPolyPts[' + SAND_CLIP_MAX_POLY_PTS + '];',
                'uniform vec4 uSandPolyMeta[' + SAND_CLIP_MAX_POLYS + '];',
                'varying vec3 vSandWorldPos;'
            ].join('\n')
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            [
                'void main() {',
                '  if (uSandClipOn > 0.5) {',
                '    vec2 sp = vSandWorldPos.xz;',
                '    for (int i = 0; i < ' + SAND_CLIP_MAX_CIRCLES + '; i++) {',
                '      if (i >= int(uSandClipCount)) break;',
                '      vec2 d = sp - uSandCircles[i].xy;',
                '      float r = uSandCircles[i].z;',
                '      if (dot(d, d) < r * r) discard;',
                '    }',
                '    for (int p = 0; p < ' + SAND_CLIP_MAX_POLYS + '; p++) {',
                '      if (p >= int(uSandPolyCount)) break;',
                '      int start = int(uSandPolyMeta[p].x);',
                '      int count = int(uSandPolyMeta[p].y);',
                '      bool inside = false;',
                '      for (int i = 0; i < 128; i++) {',
                '        if (i >= count) break;',
                '        int i2 = i + 1;',
                '        if (i2 >= count) i2 = 0;',
                '        vec2 a = uSandPolyPts[start + i];',
                '        vec2 b = uSandPolyPts[start + i2];',
                '        if (((a.y > sp.y) != (b.y > sp.y)) && (sp.x < (b.x - a.x) * (sp.y - a.y) / ((b.y - a.y) + 0.0000001) + a.x)) inside = !inside;',
                '      }',
                '      if (inside) discard;',
                '    }',
                '  }'
            ].join('\n')
        );
    };
    material.needsUpdate = true;
}
