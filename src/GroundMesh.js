import { sampleHeightField } from './HeightField.js';
import {
    isFairwayHidden,
    fairwayWidthAt,
    skipApronTaper,
    buryFairwayInSand,
    islandGreenSink
} from './HoleLayout.js';
import { FRINGE_WIDTH_UNITS, fringeOuterRadius } from './PuttingSystem.js';

// Ground surfaces are separate functions. deformCourse calls them in the
// same order the old loop used, with the same heights.

function waterAtPoint(worldX, worldZ, waterHazards) {
    let insideWaterZone = false;
    let shortestDistToWaterEdge = Infinity;
    waterHazards.forEach(water => {
        if (!water.userData.isRectangular) {
            const maxR = Math.max(water.userData.radiusX || 0, water.userData.radiusZ || 0) || water.userData.radius || 5;
            const rLimit = maxR + 2.5;
            if (Math.abs(worldX - water.position.x) > rLimit || Math.abs(worldZ - water.position.z) > rLimit) return;
        }
        if (water.userData && water.userData.isRectangular) {
            const oceanMinZ = water.position.z - water.userData.l / 2;
            const oceanMaxZ = water.position.z + water.userData.l / 2;
            if (worldZ >= oceanMinZ && worldZ <= oceanMaxZ) {
                let pathCenter = 0;
                if (worldZ >= -125) {
                    let t = (10 - worldZ) / 135;
                    pathCenter = THREE.MathUtils.lerp(0, -14.0, t);
                } else {
                    let t = (-125 - worldZ) / 55;
                    t = Math.min(1.0, t);
                    pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t);
                }
                const cliffEdgeLimit = pathCenter + window.getHole3CliffPadding(worldZ);
                const distCliff = Math.abs(worldX - cliffEdgeLimit);
                if (distCliff < shortestDistToWaterEdge) shortestDistToWaterEdge = distCliff;
                if (worldX > cliffEdgeLimit && worldX <= water.position.x + water.userData.w / 2) {
                    insideWaterZone = true;
                }
            }
        } else if (water.userData && water.userData.isPond) {
            const dxP = Math.abs(worldX - water.position.x) - (water.userData.w / 2);
            const dzP = Math.abs(worldZ - water.position.z) - (water.userData.l / 2);
            const distP = Math.hypot(Math.max(0, dxP), Math.max(0, dzP));
            if (distP < shortestDistToWaterEdge) shortestDistToWaterEdge = distP;
            if (worldX >= water.position.x - water.userData.w / 2 - 0.3 && worldX <= water.position.x + water.userData.w / 2 + 0.3 &&
                worldZ >= water.position.z - water.userData.l / 2 - 0.3 && worldZ <= water.position.z + water.userData.l / 2 + 0.3) {
                insideWaterZone = true;
            }
        } else {
            const dxW = worldX - water.position.x;
            const dzW = worldZ - water.position.z;
            const distW = Math.hypot(dxW, dzW);
            const rx = water.userData.radiusX || water.userData.radius || 5;
            const rz = water.userData.radiusZ || water.userData.radius || 5;
            const wAngle = Math.atan2(dzW, dxW);
            const lakeRadius = (rx * rz) / Math.sqrt((rz * Math.cos(wAngle)) ** 2 + (rx * Math.sin(wAngle)) ** 2);
            const edgeDist = Math.abs(distW - lakeRadius);
            if (edgeDist < shortestDistToWaterEdge) shortestDistToWaterEdge = edgeDist;
            if (distW < lakeRadius + 0.3) {
                insideWaterZone = true;
            }
        }
    });
    return { insideWaterZone, closeToWater: shortestDistToWaterEdge < 1.0, shortestDistToWaterEdge };
}

function sandAtPoint(worldX, worldZ, sandTraps) {
    let insideSandZone = false;
    let activeSandDepth = 0;
    let shortestDistToBunkerEdge = Infinity;
    let minDistOutsideBunker = Infinity;
    sandTraps.forEach(sand => {
        if (sand.userData && sand.userData.isCollar) return;
        if (!sand.userData.isPolygon) {
            const rLimit = (sand.userData.radius || 5) + 3.5;
            if (Math.abs(worldX - sand.position.x) > rLimit || Math.abs(worldZ - sand.position.z) > rLimit) return;
        } else {
            if (!sand.userData.fastBox) {
                let sMinX = Infinity, sMaxX = -Infinity, sMinZ = Infinity, sMaxZ = -Infinity;
                sand.userData.points.forEach(p => {
                    if (p.x < sMinX) sMinX = p.x; if (p.x > sMaxX) sMaxX = p.x;
                    if (p.z < sMinZ) sMinZ = p.z; if (p.z > sMaxZ) sMaxZ = p.z;
                });
                sand.userData.fastBox = { minX: sMinX - 3.5, maxX: sMaxX + 3.5, minZ: sMinZ - 3.5, maxZ: sMaxZ + 3.5 };
            }
            const b = sand.userData.fastBox;
            if (worldX < b.minX || worldX > b.maxX || worldZ < b.minZ || worldZ > b.maxZ) return;
        }
        if (sand.userData && sand.userData.isPolygon) {
            const points = sand.userData.points;
            let inside = false;
            let minEdgeDistSq = Infinity;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x, zi = points[i].z;
                const xj = points[j].x, zj = points[j].z;
                const intersect = ((zi > worldZ) !== (zj > worldZ))
                    && (worldX < (xj - xi) * (worldZ - zi) / (zj - zi) + xi);
                if (intersect) inside = !inside;
                const l2 = (xi - xj) * (xi - xj) + (zi - zj) * (zi - zj) || 0.001;
                let t = ((worldX - xi) * (xj - xi) + (worldZ - zi) * (zj - zi)) / l2;
                t = Math.max(0, Math.min(1, t));
                const projX = xi + t * (xj - xi);
                const projZ = zi + t * (zj - zi);
                const distSq = (worldX - projX) * (worldX - projX) + (worldZ - projZ) * (worldZ - projZ);
                if (distSq < minEdgeDistSq) minEdgeDistSq = distSq;
            }
            const currentEdgeDist = Math.sqrt(minEdgeDistSq);
            if (currentEdgeDist < shortestDistToBunkerEdge) shortestDistToBunkerEdge = currentEdgeDist;
            const distOut = inside ? -currentEdgeDist : currentEdgeDist;
            if (distOut < minDistOutsideBunker) minDistOutsideBunker = distOut;
            if (inside) {
                insideSandZone = true;
                const depth = sand.userData.depth || 0.6;
                if (depth > activeSandDepth) activeSandDepth = depth;
            }
        } else {
            const dxS = worldX - sand.position.x;
            const dzS = worldZ - sand.position.z;
            const distToSand = Math.hypot(dxS, dzS);
            const baseSandRadius = (sand.userData && sand.userData.radius ? sand.userData.radius : 5);
            const currentEdgeDist = Math.abs(distToSand - baseSandRadius);
            if (currentEdgeDist < shortestDistToBunkerEdge) shortestDistToBunkerEdge = currentEdgeDist;
            const distOut = distToSand - baseSandRadius;
            if (distOut < minDistOutsideBunker) minDistOutsideBunker = distOut;
            if (distToSand < baseSandRadius) {
                insideSandZone = true;
                const depth = sand.userData && sand.userData.depth ? sand.userData.depth : 0.6;
                if (depth > activeSandDepth) activeSandDepth = depth;
            }
        }
    });
    return { insideSandZone, activeSandDepth, shortestDistToBunkerEdge, minDistOutsideBunker };
}

function applyRoughHeight(calculatedHeightIn, targetMesh, floor, floorHeight, distToGreenCenter, fringeOuterR, activeRadius, currentHoleConfig) {
    let calculatedHeight = calculatedHeightIn;
                // Render the rough floor geometry
                if (targetMesh === floor) {
                    calculatedHeight = floorHeight;

                    const islandSink = islandGreenSink(currentHoleConfig && currentHoleConfig.fairwayMask);
                    if (islandSink && distToGreenCenter < fringeOuterR + islandSink) {
                        calculatedHeight -= islandSink;
                    } else if (distToGreenCenter < activeRadius) {
                        calculatedHeight -= 1.15;
                    } else if (distToGreenCenter < fringeOuterR) {
                        const tUnder = THREE.MathUtils.clamp((fringeOuterR - distToGreenCenter) / FRINGE_WIDTH_UNITS, 0, 1);
                        const smoothUnder = tUnder * tUnder * (3 - 2 * tUnder);
                        calculatedHeight -= smoothUnder * 1.15;
                    }

                }


    return calculatedHeight;
}

function applyFairwayHeight(calculatedHeightIn, targetMesh, fairway, uvAttr, i, physics, currentHoleConfig, worldX, worldZ, floorHeight, vertexAngle, distToGreenCenter, distanceToPath, fW, approachDot, fairwayExcess, insideSandZone) {
    let calculatedHeight = calculatedHeightIn;
                if (targetMesh === fairway) {
                    // Dynamically curve mow lines along the fairway centerline path
                    if (uvAttr && physics && physics.fairwayPoints && physics.fairwayPoints.length > 1) {
                        const points = physics.fairwayPoints;
                        let minDistSq = Infinity;
                        let closestIdx = 0;
                        const step = 4;
                        for (let j = 0; j < points.length; j += step) {
                            const pt = points[j];
                            const dSq = (worldX - pt.x) * (worldX - pt.x) + (worldZ - pt.z) * (worldZ - pt.z);
                            if (dSq < minDistSq) {
                                minDistSq = dSq;
                                closestIdx = j;
                            }
                        }
                        const p = points[closestIdx];
                        const pNext = points[Math.min(points.length - 1, closestIdx + 2)];
                        const pPrev = points[Math.max(0, closestIdx - 2)];
                        let tanX = pNext.x - pPrev.x;
                        let tanZ = pNext.z - pPrev.z;
                        const tanLen = Math.sqrt(tanX * tanX + tanZ * tanZ) || 1;
                        const perpX = -tanZ / tanLen;
                        const perpZ = tanX / tanLen;
                        const signedDist = (worldX - p.x) * perpX + (worldZ - p.z) * perpZ;
                        uvAttr.setX(i, signedDist / 5.5);
                    }
                    const isCustomHole = currentHoleConfig && currentHoleConfig.waypoints;
                    const activeR = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');
                    const fringeR = fringeOuterRadius(activeR);
                  const hiddenFairwayH = floorHeight - 0.10;
const mask = currentHoleConfig && currentHoleConfig.fairwayMask;
const meetsGreen = !mask || (mask.meetGreen !== false && !mask.islandGreenSink);
// Distance in front of the green center. Positive toward the tee.
const frontSpan = Math.max(0, -approachDot);
// Full fairway width until just before the collar, then a tongue
// narrower than the green so the sides stay rough.
const tongue = Math.min(fW, Math.max(3.5, activeR * 0.55));
const mouthStart = fringeR + 5;
let visibleHalf = fW;
if (meetsGreen && frontSpan < mouthStart) {
    if (frontSpan <= activeR) {
        visibleHalf = 0;
    } else if (frontSpan <= fringeR) {
        const t = (frontSpan - activeR) / Math.max(0.001, fringeR - activeR);
        const s = t * t * (3 - 2 * t);
        visibleHalf = tongue * s;
    } else {
        const u = (frontSpan - fringeR) / Math.max(0.001, mouthStart - fringeR);
        const s = u * u * (3 - 2 * u);
        visibleHalf = THREE.MathUtils.lerp(tongue, fW, s);
    }
}
const inMouth = meetsGreen && approachDot <= 0 && visibleHalf > 0.4 && distanceToPath <= visibleHalf;
const besideGreen = meetsGreen && approachDot <= 0 && frontSpan < mouthStart && !inMouth;

// Boundary checks for fairway corridor
const isOutsideFairwayBounds = isFairwayHidden(
    currentHoleConfig && currentHoleConfig.fairwayMask,
    worldX,
    worldZ,
    isCustomHole
); if (isOutsideFairwayBounds) {
    calculatedHeight = hiddenFairwayH;
} else if (besideGreen) {
    calculatedHeight = floorHeight - 1.20;
} else if (distToGreenCenter < fringeR) {
    const buriedH = floorHeight - 0.45;
    // Fairway quads are about 1.3 units. The collar is 1 unit, so a 1.20
    // cliff at the green edge rises through the fringe as a jagged stripe.
    const deepInside = activeR - 1.4;
    let meetH = floorHeight;
    if (distToGreenCenter < deepInside) {
        meetH = floorHeight - 1.20;
    } else if (inMouth) {
        const tUnder = Math.max(0, Math.min(1, (fringeR - distToGreenCenter) / FRINGE_WIDTH_UNITS));
        const smoothUnder = tUnder * tUnder * (3 - 2 * tUnder);
        meetH = THREE.MathUtils.lerp(floorHeight - 0.035, floorHeight - 0.22, smoothUnder);
    } else if (distToGreenCenter < activeR) {
        meetH = floorHeight - 1.20;
    } else {
        const tTuckFringe = Math.max(0, Math.min(1, (fringeR - distToGreenCenter) / FRINGE_WIDTH_UNITS));
        const smoothFringeTuck = tTuckFringe * tTuckFringe * (3 - 2 * tTuckFringe);
        meetH = THREE.MathUtils.lerp(floorHeight, buriedH, smoothFringeTuck);
    }
    if (inMouth) {
        calculatedHeight = meetH;
    } else {
        const corridorExcess = Math.max(0, distanceToPath - fW);
        const edgeSoft = meetsGreen ? 2.5 : 1.0;
        const tOut = THREE.MathUtils.clamp(corridorExcess / edgeSoft, 0, 1);
        const smoothOut = tOut * tOut * (3 - 2 * tOut);
        calculatedHeight = THREE.MathUtils.lerp(meetH, buriedH, smoothOut);
    }
} else if (approachDot > 0) {
    calculatedHeight = hiddenFairwayH;
} else {
    const tEdge = THREE.MathUtils.clamp(fairwayExcess / 4.5, 0, 1);
    const smoothEdge = THREE.MathUtils.smoothstep(tEdge, 0, 1);
    calculatedHeight = THREE.MathUtils.lerp(floorHeight, hiddenFairwayH, smoothEdge);
}


                    if (buryFairwayInSand(currentHoleConfig && currentHoleConfig.fairwayMask)) {
                        if (insideSandZone) calculatedHeight = hiddenFairwayH;
                    }


                }

    return calculatedHeight;
}

function applyWaterEdge(calculatedHeightIn, targetMesh, floor, fairway, shortestDistToWaterEdge) {
    let calculatedHeight = calculatedHeightIn;
                // Smoothly lower fairway/rough toward the water's buried depth as the shoreline gets close, avoiding a hard cliff at the water's edge
                if ((targetMesh === floor || targetMesh === fairway) && shortestDistToWaterEdge < 3.0) {
                    const tShore = THREE.MathUtils.clamp((3.0 - shortestDistToWaterEdge) / 3.0, 0, 1);
                    const smoothShore = tShore * tShore * (3 - 2 * tShore);
                    calculatedHeight = THREE.MathUtils.lerp(calculatedHeight, calculatedHeight - 0.2, smoothShore);
                }
    return calculatedHeight;
}


export function deformVisualGreen(targetMesh, ctx, contourStrength = 1, colorsOnly = false) {
    const { physics, green, greenGrid, greenFringe } = ctx;
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        const strength = Math.max(0.5, contourStrength);

        // Initialize or fetch the geometry color attribute array dynamically
        let colorAttr = targetMesh.geometry.attributes.color;
        if (!colorAttr) {
            const colors = new Float32Array(posAttr.count * 3);
            targetMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            colorAttr = targetMesh.geometry.attributes.color;
        }

        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            const worldX = localX * targetMesh.scale.x + targetMesh.position.x;
            const worldZ = -localY * targetMesh.scale.y + targetMesh.position.z;

            let calculatedHeight = physics.getGroundHeight(worldX, worldZ);



            // --- HIGH-PRECISION HEIGHT ELEVATION & BEVEL TAPER ---
            if (targetMesh === green) {
                calculatedHeight += 0.020;
            } else if (targetMesh === greenGrid) {
                calculatedHeight += 0.025;
            } else if (targetMesh === greenFringe) {
                // Taper fringe collar smoothly from green inner edge (+0.019) down to fairway/rough outer edge (+0.012)
                const innerEdgeR = window.getGreenRadiusAtAngle(Math.atan2(localY, localX), window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle'); const localDist = Math.hypot(localX, localY);
                const tFringe = THREE.MathUtils.clamp((localDist - innerEdgeR) / 1.0, 0, 1);
                const smoothFringe = THREE.MathUtils.smoothstep(tFringe, 0, 1);
                calculatedHeight += THREE.MathUtils.lerp(0.019, 0.012, smoothFringe);
            }

            if (!colorsOnly) {
                posAttr.setZ(i, calculatedHeight);
            }

            // --- REALISTIC TURF SHADE CONTRAST GENERATOR ---
            let baseR = 0.066, baseG = 0.666, baseB = 0.266; // Standard Green (0x11aa44)
            if (targetMesh === greenFringe) {
                const innerEdgeR = window.getGreenRadiusAtAngle(Math.atan2(localY, localX), window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle'); const localDist = Math.hypot(localX, localY);
                const tFringe = THREE.MathUtils.clamp((localDist - innerEdgeR) / 1.0, 0, 1);
                // Blend two-tone collar from bright green inner seam to crisp dark green outer collar
                baseR = THREE.MathUtils.lerp(0.080, 0.105, tFringe);
                baseG = THREE.MathUtils.lerp(0.580, 0.478, tFringe);
                baseB = THREE.MathUtils.lerp(0.245, 0.227, tFringe);
            }

            // Evaluate elevation delta relative to the stable pin cup height baseline
            const centerHeight = physics.getGroundHeight(targetMesh.position.x, targetMesh.position.z);
            const heightDiff = calculatedHeight - centerHeight;

            // === REPLACE WITH THIS EXACT BLOCK ===
            const delta = 0.15;
            const hL = physics.getGroundHeight(worldX - delta, worldZ);
            const hR = physics.getGroundHeight(worldX + delta, worldZ);
            const hB = physics.getGroundHeight(worldX, worldZ - delta); // Corrected: Back is negative Z axis
            const hF = physics.getGroundHeight(worldX, worldZ + delta); // Corrected: Front is positive Z axis
            const slopeX = (hL - hR) / (2 * delta); // Corrected: Left - Right to match PhysicsEngine.js
            const slopeZ = (hB - hF) / (2 * delta); // Corrected: Back - Front to match PhysicsEngine.js
            const steepness = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

            // Soft contour read: keep turf green, only vary brightness (no black/white blotches)
            const slopeShading = ((-slopeX - slopeZ) * 0.40 - (steepness * 0.16)) * strength;
            const boost = Math.max(0, strength - 1);
            const blend = THREE.MathUtils.clamp(
                heightDiff * (0.35 * strength) + slopeShading,
                -0.28 - 0.12 * boost,
                0.24 + 0.10 * boost
            );

            if (strength > 1.01) {
                // Multiply base green by a mild shade factor so hue stays turf-like
                const shade = THREE.MathUtils.clamp(1.0 + blend * 0.95, 0.40, 1.50);
                let r = baseR * shade;
                let g = baseG * shade;
                let b = baseB * shade;
                r = THREE.MathUtils.clamp(r, 0.02, 0.30);
                g = THREE.MathUtils.clamp(g, 0.16, 0.96);
                b = THREE.MathUtils.clamp(b, 0.07, 0.50);
                colorAttr.setXYZ(i, r, g, b);
            } else {
                // Normal play: original additive turf shading
                let r = baseR + blend * 0.13;
                let g = baseG + blend * 0.46;
                let b = baseB + blend * 0.17;
                colorAttr.setXYZ(i, r, g, b);
            }
        }
        // Notify the GPU to refresh the coordinates and re-render lighting highlights
        if (!colorsOnly) {
            posAttr.needsUpdate = true;
            targetMesh.geometry.computeVertexNormals();
        }
        if (colorAttr) colorAttr.needsUpdate = true;
}

export function deformCourse(targetMesh, ctx, useScale = false) {
    const {
        physics, floor, fairway, green, greenCenterZ, currentHoleConfig,
        courseHeightField, waterHazards, sandTraps, waterShores
    } = ctx;
        if (!targetMesh) return;
        const posAttr = targetMesh.geometry.attributes.position;
        const scaleX = useScale ? targetMesh.scale.x : 1;
        const scaleY = useScale ? targetMesh.scale.y : 1;
        const uvAttr = targetMesh.geometry.attributes.uv;


        // Initialize or fetch the ground vertex color array dynamically
        let colorAttr = targetMesh.geometry.attributes.color;
        if (!colorAttr) {
            const colors = new Float32Array(posAttr.count * 3);
            colors.fill(1.0); // Base unshaded white
            targetMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            colorAttr = targetMesh.geometry.attributes.color;
        }

        // Precompute the dynamic bounding corridor of the current hole's waypoints
        let wpMinX = Infinity, wpMaxX = -Infinity, wpMinZ = Infinity, wpMaxZ = -Infinity;
        const activeWaypoints = (currentHoleConfig && currentHoleConfig.waypoints) ? currentHoleConfig.waypoints : null;
        if (activeWaypoints) {
            activeWaypoints.forEach(wp => {
                if (wp.x < wpMinX) wpMinX = wp.x; if (wp.x > wpMaxX) wpMaxX = wp.x;
                if (wp.z < wpMinZ) wpMinZ = wp.z; if (wp.z > wpMaxZ) wpMaxZ = wp.z;
            });
        } else {
            wpMinX = -25; wpMaxX = 25; wpMinZ = -220; wpMaxZ = 45;
        }
        // Add a safety buffer zone to encompass wide fairway contours and curves nicely
        wpMinX -= 30; wpMaxX += 30; wpMinZ -= 30; wpMaxZ += 30;

        for (let i = 0; i < posAttr.count; i++) {
            const localX = posAttr.getX(i);
            const localY = posAttr.getY(i);

            // Map local plane points to true world spaces, respecting dynamic mesh scales
            const worldX = localX * scaleX + targetMesh.position.x;
            const worldZ = -localY * scaleY + targetMesh.position.z;

            // Rapid early-exit boundary check: if vertex is far out in background rough, skip complex math
            const isNearFairwayCorridor = (worldX >= wpMinX && worldX <= wpMaxX && worldZ >= wpMinZ && worldZ <= wpMaxZ);

            // Floor/fairway share a 1-unit height cache. Sand and shore meshes stay on live samples
            // so bunker bowls and lake rims keep their denser authored vertex look.
            const useHeightCache = courseHeightField && (targetMesh === floor || targetMesh === fairway);
            let calculatedHeight = useHeightCache
                ? sampleHeightField(courseHeightField, worldX, worldZ)
                : physics.getGroundHeight(worldX, worldZ);

            const waterSample = waterAtPoint(worldX, worldZ, waterHazards);
            let insideWaterZone = waterSample.insideWaterZone;
            let closeToWater = waterSample.closeToWater;
            let shortestDistToWaterEdge = waterSample.shortestDistToWaterEdge;

            const sandSample = sandAtPoint(worldX, worldZ, sandTraps);
            let insideSandZone = sandSample.insideSandZone;
            let activeSandDepth = sandSample.activeSandDepth;
            let shortestDistToBunkerEdge = sandSample.shortestDistToBunkerEdge;
            let minDistOutsideBunker = sandSample.minDistOutsideBunker;

            // Around Line 829 in src/main.js
            const gX = worldX - (green ? green.position.x : 0);
            const gZ = worldZ - greenCenterZ;
            const distToGreen = Math.sqrt(gX * gX + gZ * gZ);
            const vertexAngle = Math.atan2(-gZ, gX);

            // Fetch dynamic green boundary metrics for this explicit slice angle
            const activeR = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');
            const fringeOuterR = fringeOuterRadius(activeR);
            // Soft gradient ramp around the green replaces the harsh cliff cutoff to avoid mesh jaggedness
            if (distToGreen < activeR) {
                calculatedHeight -= 0.0;
            } else if (distToGreen < activeR + 3.5) {
                const greenT = (distToGreen - activeR) / 3.5;
                const smoothGreenT = THREE.MathUtils.smoothstep(greenT, 0, 1);
                calculatedHeight -= THREE.MathUtils.lerp(0.0, 0.0, smoothGreenT);
            }
            if (!insideWaterZone) {
                // If vertex falls out in deep background rough, bypass spline lookup entirely to preserve CPU threads
                const distanceToPath = isNearFairwayCorridor ? physics.getDistanceToSpline(worldX, worldZ) : 999;
                let fW = fairwayWidthAt(currentHoleConfig && currentHoleConfig.fairwayMask, worldZ, physics.fairwayWidth);


                const relX = worldX - (green ? green.position.x : 0);
                const relZ = worldZ - greenCenterZ;
                const distToGreenCenter = Math.sqrt(relX * relX + relZ * relZ);

                const approachDot = (physics.approachDirX !== undefined) ? (relX * physics.approachDirX + relZ * physics.approachDirZ) : -999;

                const activeRadius = window.getGreenRadiusAtAngle(vertexAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle');
                const fringeOuterR = fringeOuterRadius(activeRadius);
                const apronMask = currentHoleConfig && currentHoleConfig.fairwayMask;
                const keepFullWidth = !apronMask || (apronMask.meetGreen !== false && !apronMask.islandGreenSink);
                if (!keepFullWidth && !skipApronTaper(apronMask)) {
                    const apronEnd = -activeRadius;
                    if (approachDot > 0) {
                        fW = 0;
                    } else if (approachDot > apronEnd) {
                        const tApron = THREE.MathUtils.clamp((approachDot - apronEnd) / Math.max(0.001, -apronEnd), 0, 1);
                        fW = THREE.MathUtils.lerp(physics.fairwayWidth, 0, tApron);
                    }
                }

                const fWEdge = fW + 3.5;

                const pastFairwayDist = approachDot + (distToGreenCenter - activeRadius) * 0.5;
                const isPastFairway = (distToGreenCenter < activeRadius) || (pastFairwayDist > 0);

                // Smoothly transition fairway cut only once past the green's equator
                // Widen the allowed corridor near water hazards so the fairway reaches the shoreline
                // instead of tapering off early and leaving a jagged gap between fairway and water
                const waterWidening = 0;
                const lateralExcess = Math.max(0, distanceToPath - fW - waterWidening);
                const forwardExcess = (distToGreenCenter >= fringeOuterR && pastFairwayDist > 0) ? pastFairwayDist : 0;
                const fairwayExcess = Math.max(lateralExcess, forwardExcess);

                let floorHeight = calculatedHeight;



                calculatedHeight = applyRoughHeight(calculatedHeight, targetMesh, floor, floorHeight, distToGreenCenter, fringeOuterR, activeRadius, currentHoleConfig);
                calculatedHeight = applyFairwayHeight(calculatedHeight, targetMesh, fairway, uvAttr, i, physics, currentHoleConfig, worldX, worldZ, floorHeight, vertexAngle, distToGreenCenter, distanceToPath, fW, approachDot, fairwayExcess, insideSandZone);
                calculatedHeight = applyWaterEdge(calculatedHeight, targetMesh, floor, fairway, shortestDistToWaterEdge);

            } else {
                // Pull grass meshes underground inside water lines to prevent clipping at the banks
                if (targetMesh === floor || targetMesh === fairway) {
                    calculatedHeight -= 1.5;
                }
            } // This bracket ends the insideWaterZone check clean

            // NEW: If deforming a sand trap mesh itself, add a tiny positive offset cushion to prevent z-fighting clips
            if (sandTraps.includes(targetMesh)) {
                calculatedHeight += targetMesh.userData && targetMesh.userData.isCollar ? 0.035 : 0.02;
            } else if (waterShores.includes(targetMesh) && targetMesh.geometry.type === 'RingGeometry') {
                // Surgically offset the dirt border ring locally relative to its high/low lake position
                calculatedHeight += (0.022 - targetMesh.position.y);
            }

            // Calculate real-time drop shadows from obstacles onto the main ground textures
            let shadowMultiplier = 1.0; // Moved up here to initialize before use!

            // Apply high-contrast ambient occlusion to mimic deep overhanging sod bunker lips
            if (sandTraps.includes(targetMesh)) {
                // Darken the sand mesh as it climbs up the banks toward the grass edge
                if (shortestDistToBunkerEdge < 2.5) {
                    const tShadow = 1.0 - (shortestDistToBunkerEdge / 2.5);
                    shadowMultiplier *= THREE.MathUtils.lerp(1.0, 0.35, tShadow * tShadow);
                }
            } else if (!insideSandZone && shortestDistToBunkerEdge < 0.8) {
                // Darken the actual turf edge right along the rim drop-off for a crisp border line
                const tTurfShadow = 1.0 - (shortestDistToBunkerEdge / 0.8);
                shadowMultiplier *= THREE.MathUtils.lerp(1.0, 0.65, tTurfShadow);
            }
            if (physics && physics.obstacles) {
                physics.obstacles.forEach(obs => {
                    const dx = worldX - obs.x;
                    const dz = worldZ - obs.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const shadowRadius = obs.type === 'tree' ? obs.foliageRadius * 0.85 : obs.radius * 1.35;

                    if (dist < shadowRadius) {
                        const t = dist / shadowRadius;
                        const factor = t * t * (3 - 2 * t); // Smoothstep curve decay
                        const localShadow = THREE.MathUtils.lerp(0.48, 1.0, factor); // 48% ambient darkness under foliage center
                        if (localShadow < shadowMultiplier) {
                            shadowMultiplier = localShadow;
                        }
                    }
                });
            }
            if (waterShores.includes(targetMesh) && targetMesh.geometry.type === 'RingGeometry') {
                colorAttr.setXYZ(i, colorAttr.getX(i) * shadowMultiplier, colorAttr.getY(i) * shadowMultiplier, colorAttr.getZ(i) * shadowMultiplier);
            } else {
                colorAttr.setXYZ(i, shadowMultiplier, shadowMultiplier, shadowMultiplier);
            }
            posAttr.setZ(i, calculatedHeight);
        }

        // Notify the GPU to refresh the coordinates and re-render lighting highlights
        posAttr.needsUpdate = true;
        if (colorAttr) colorAttr.needsUpdate = true;
        if (targetMesh === fairway && uvAttr) uvAttr.needsUpdate = true;
        targetMesh.geometry.computeVertexNormals();
}
