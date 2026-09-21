/**
 * Reads fairwayMask / terrain / customOOB / water off a hole config so
 * main.js and PhysicsEngine do not branch on hole numbers for layout.
 *
 * Rule objects are AND of the fields you set, lists are OR:
 *   { gt: -12 }           z > -12
 *   { gte: -89.5, lte: -51.4 }
 *   { gtX: 24 }           x > 24
 */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth01 = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
};

export function ruleMatches(rule, x, z) {
    if (!rule) return false;
    if (rule.gt !== undefined && !(z > rule.gt)) return false;
    if (rule.gte !== undefined && !(z >= rule.gte)) return false;
    if (rule.lt !== undefined && !(z < rule.lt)) return false;
    if (rule.lte !== undefined && !(z <= rule.lte)) return false;
    if (rule.gtX !== undefined && !(x > rule.gtX)) return false;
    if (rule.gteX !== undefined && !(x >= rule.gteX)) return false;
    if (rule.ltX !== undefined && !(x < rule.ltX)) return false;
    if (rule.lteX !== undefined && !(x <= rule.ltX)) return false;
    return true;
}

function anyRule(rules, x, z) {
    if (!rules || !rules.length) return false;
    for (let i = 0; i < rules.length; i++) {
        if (ruleMatches(rules[i], x, z)) return true;
    }
    return false;
}

export function isFairwayHidden(mask, x, z, isCustomHole) {
    if (!mask) {
        return !isCustomHole && z > -8.0;
    }
    if (mask.hideIf && anyRule(mask.hideIf, x, z)) return true;
    return false;
}

export function isWithinFairwayZ(mask, z) {
    if (!mask) return z <= 15.0;
    if (mask.physicsAllow && mask.physicsAllow.length) {
        return anyRule(mask.physicsAllow, 0, z);
    }
    if (mask.hideIf && mask.hideIf.length) {
        return !anyRule(mask.hideIf, 0, z);
    }
    return z <= 15.0;
}

export function fairwayWidthAt(mask, z, defaultWidth) {
    let width = defaultWidth;
    if (!mask || !mask.widthBands) return width;
    for (let i = 0; i < mask.widthBands.length; i++) {
        const b = mask.widthBands[i];
        if (!ruleMatches(b, 0, z)) continue;
        if (b.width !== undefined) return b.width;
        if (b.from !== undefined && b.to !== undefined && b.fromZ !== undefined && b.toZ !== undefined) {
            const t = smooth01((b.fromZ - z) / (b.fromZ - b.toZ));
            return lerp(b.from, b.to, t);
        }
    }
    return width;
}

export function skipApronTaper(mask) {
    return !!(mask && mask.skipApronTaper);
}

export function meetGreen(mask) {
    if (!mask) return true;
    if (mask.meetGreen === false) return false;
    if (mask.islandGreenSink) return false;
    return true;
}

export function sandFloorLip(mask) {
    return (mask && mask.sandLip !== undefined) ? mask.sandLip : 0.25;
}

export function buryFairwayInSand(mask) {
    return !!(mask && mask.buryFairwayInSand);
}

export function islandGreenSink(mask) {
    return (mask && mask.islandGreenSink) ? mask.islandGreenSink : 0;
}

export function getCliffPathCenter(z, cliff) {
    if (!cliff) return 0;
    const teeZ = cliff.teeZ !== undefined ? cliff.teeZ : 10;
    const elbowZ = cliff.elbowZ !== undefined ? cliff.elbowZ : -125;
    const firstSpan = cliff.firstSpan !== undefined ? cliff.firstSpan : 135;
    const endSpan = cliff.endSpan !== undefined ? cliff.endSpan : 55;
    const startX = cliff.startX !== undefined ? cliff.startX : 0;
    const elbowX = cliff.elbowX !== undefined ? cliff.elbowX : -14;
    const endX = cliff.endX !== undefined ? cliff.endX : 14;
    if (z >= elbowZ) {
        return lerp(startX, elbowX, (teeZ - z) / firstSpan);
    }
    const t = Math.min(1.0, (elbowZ - z) / endSpan);
    return lerp(elbowX, endX, t);
}

export function getCliffEdgeX(z, cliff) {
    if (!cliff) return 20;
    const plateauX = cliff.plateauX !== undefined ? cliff.plateauX : 20;
    const inlandOffset = cliff.inlandOffset !== undefined ? cliff.inlandOffset : 13.5;
    const blendStartZ = cliff.blendStartZ !== undefined ? cliff.blendStartZ : -100;
    const blendSpan = cliff.blendSpan !== undefined ? cliff.blendSpan : 15;
    const blendUntilZ = cliff.blendUntilZ !== undefined ? cliff.blendUntilZ : -115;
    const pathCenter = getCliffPathCenter(z, cliff);
    let edgeX = plateauX;
    if (z >= blendUntilZ) {
        const inland = pathCenter + inlandOffset;
        const t = clamp((blendStartZ - z) / blendSpan, 0, 1);
        edgeX = lerp(inland, plateauX, t);
    }
    return edgeX;
}

export function getCliffPadding(z, cliff) {
    return getCliffEdgeX(z, cliff) - getCliffPathCenter(z, cliff);
}

function heightFromBands(bands, z) {
    for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        if (!ruleMatches(b, 0, z)) continue;
        if (b.height !== undefined) return b.height;
        if (b.highZ !== undefined) {
            const t = smooth01((b.highZ - z) / (b.highZ - b.lowZ));
            return lerp(b.highH, b.lowH, t);
        }
    }
    return 0;
}

function applyXFade(height, x, fade) {
    if (!fade) return height;
    const falloff = fade.falloff !== undefined ? fade.falloff : 10;
    if (fade.positiveOnly) {
        const pos = Math.min(1, Math.max(0, (fade.radius - x) / falloff));
        const both = Math.min(1, Math.max(0, (fade.radius - Math.abs(x)) / falloff));
        const xFade = x > 0 ? pos : both;
        return Math.max(0.001, height * xFade);
    }
    const xFade = Math.min(1, Math.max(0, (fade.radius - Math.abs(x)) / falloff));
    return Math.max(0.001, height * xFade);
}

function applyTerrainFeature(feature, x, z, height, ctx) {
    if (!feature) return height;
    const t = feature.type;
    if (t === 'waves') {
        const a1 = feature.amp1 !== undefined ? feature.amp1 : 0.05;
        const a2 = feature.amp2 !== undefined ? feature.amp2 : 0.02;
        const w1 = Math.sin(x * (feature.fx1 || 0.06)) * Math.cos(z * (feature.fz1 || 0.04));
        const w2 = Math.cos(x * (feature.fx2 || 0.12)) * Math.sin(z * (feature.fz2 || 0.08));
        return height + w1 * a1 + w2 * a2;
    }
    if (t === 'saddle') {
        if (z > feature.zMin && z < feature.zMax) {
            const xDist = Math.abs(x);
            if (xDist < feature.xRadius) {
                let saddleFactor = 1.0 - (xDist / feature.xRadius);
                saddleFactor = smooth01(saddleFactor);
                const zDist = Math.abs(z - feature.zCenter);
                const zFade = Math.max(0, 1.0 - (zDist / feature.zRadius));
                height -= feature.depth * saddleFactor * zFade;
            }
        }
        return height;
    }
    if (t === 'rightHill') {
        const fw = (ctx && ctx.fairwayWidth) || feature.fairwayWidth || 9;
        if (x > fw && z < feature.zMax && z > feature.zMin) {
            let hillIncline = (x - fw) * feature.slope;
            if (z < feature.fadeZ) {
                const fade = (z - feature.zMin) / (feature.fadeZ - feature.zMin);
                hillIncline *= Math.max(0, Math.min(1, fade));
            }
            height += hillIncline;
        }
        return height;
    }
    if (t === 'dunes') {
        const fw = (ctx && ctx.fairwayWidth) || 15;
        const distFromCenter = Math.abs(x);
        const fairwayEdge = fw * (feature.edgeScale !== undefined ? feature.edgeScale : 0.85);
        if (distFromCenter > fairwayEdge) {
            const tDune = Math.min(1.0, (distFromCenter - fairwayEdge) / (feature.width || 55));
            const smoothDune = smooth01(tDune);
            const duneWave = Math.sin(z * 0.06 + x * 0.05) * 1.2 + Math.cos(z * 0.09) * 0.8;
            height += (smoothDune * (feature.height || 13)) + (Math.max(0, duneWave) * smoothDune);
        }
        return height;
    }
    if (t === 'bump') {
        if (z <= feature.zMax && z >= feature.zMin && (feature.requireX === undefined || (feature.requireX === 'positive' && x > 0))) {
            const zDist = Math.abs(z - feature.z);
            const zFactor = Math.max(0.0, 1.0 - (zDist / feature.zRadius));
            const xDist = Math.abs(x - feature.x);
            const xFactor = Math.max(0.0, 1.0 - (xDist / feature.xRadius));
            height += feature.height * smooth01(zFactor) * smooth01(xFactor);
        }
        return height;
    }
    if (t === 'sideRise') {
        const distFromCenter = Math.abs(x);
        if (distFromCenter > feature.edge) {
            const tSide = Math.min(1.0, (distFromCenter - feature.edge) / feature.width);
            height += smooth01(tSide) * feature.height;
        }
        return height;
    }
    if (t === 'moguls') {
        height += Math.sin(x * 0.15) * Math.cos(z * 0.10) * (feature.amp1 || 0.25)
            + Math.cos(x * 0.22 + z * 0.16) * (feature.amp2 || 0.15);
        return height;
    }
    return height;
}

function evaluateCliffShelf(terrain, x, z) {
    const climb = terrain.climb;
    let baseHeight = terrain.lowHeight !== undefined ? terrain.lowHeight : 0.3;
    if (climb && z <= climb.startZ && z >= climb.endZ) {
        const t = (climb.startZ - z) / (climb.startZ - climb.endZ);
        baseHeight = (terrain.lowHeight || 0.3) + (smooth01(t) * climb.rise);
    } else if (climb && z < climb.endZ) {
        baseHeight = terrain.plateau;
    }
    const cliff = terrain.cliff;
    const pathCenter = getCliffPathCenter(z, cliff);
    const cliffEdgeLimit = getCliffEdgeX(z, cliff);
    const dropZ = cliff && cliff.dropZ !== undefined ? cliff.dropZ : -78;
    if (x > cliffEdgeLimit && z <= dropZ) {
        return 0.001;
    }
    return applyXFade(baseHeight, x, terrain.xFade);
}

function evaluateRolling(terrain, x, z, ctx) {
    const teeZ = 10;
    const dxTee = x - 0;
    const dzTee = z - teeZ;
    const distFromTee = Math.sqrt(dxTee * dxTee + dzTee * dzTee);
    const teeFade = Math.min(1, Math.max(0, (distFromTee - 8) / 10));

    const seedX1 = (ctx && ctx.courseSeedX1) || 0;
    const seedZ1 = (ctx && ctx.courseSeedZ1) || 0;
    const seedX2 = (ctx && ctx.courseSeedX2) || 0;
    const seedZ2 = (ctx && ctx.courseSeedZ2) || 0;

    let height;
    if (terrain.style === 'oakmont') {
        const roll1 = Math.sin(z * 0.035) * 1.8;
        const roll2 = Math.cos(x * 0.07 + z * 0.025) * 1.2;
        const roll3 = Math.sin(x * 0.12 + z * 0.06) * 0.5;
        height = roll1 + roll2 + roll3;
        const bank = terrain.leftBank;
        if (bank && z < bank.startZ) {
            const nearGreen = clamp((bank.startZ - z) / bank.spanZ, 0, 1);
            const leftT = clamp((-x) / bank.spanX, 0, 1);
            height -= smooth01(nearGreen) * smooth01(leftT) * bank.drop;
        }
        if (ctx) ctx.hasBigFeature = false;
    } else if (terrain.style === 'flat') {
        const flatWave1 = Math.sin(x * 0.06) * Math.cos(z * 0.04);
        const flatWave2 = Math.cos(x * 0.12) * Math.sin(z * 0.08);
        height = (flatWave1 * 0.05 + flatWave2 * 0.02);
        if (ctx) ctx.hasBigFeature = false;
    } else {
        const wave1 = Math.sin(x * 0.05 + seedX1) * Math.cos(z * 0.03 + seedZ1);
        const wave2 = Math.cos(x * 0.10 + seedX2) * Math.sin(z * 0.06 + seedZ2);
        height = (wave1 * 1.8 + wave2 * 0.9);
        if (ctx && ctx.hasBigFeature) {
            const dxBig = x - ctx.bigFeatureX;
            const dzBig = z - ctx.bigFeatureZ;
            const distBigSq = dxBig * dxBig + dzBig * dzBig;
            const bigInfluence = Math.exp(-distBigSq / 2500);
            height += (ctx.bigFeatureScale || 0) * 1.8 * bigInfluence;
        }
    }

    let maxLayoutWidth = 30;
    if (ctx && ctx.fairwayPoints && ctx.fairwayPoints.length > 0) {
        ctx.fairwayPoints.forEach(p => {
            const absX = Math.abs(p.x);
            if (absX > maxLayoutWidth) maxLayoutWidth = absX;
        });
    }
    const fw = (ctx && ctx.fairwayWidth) || 9.0;
    const dynamicBoundary = maxLayoutWidth + fw + 12.0;
    const xFade = Math.min(1, Math.max(0, (dynamicBoundary - Math.abs(x)) / 10));
    return Math.max(0.001, height * teeFade * xFade);
}

export function evaluateCourseHeight(terrain, x, z, ctx) {
    if (!terrain) return null;
    if (terrain.style === 'rolling' || terrain.style === 'flat' || terrain.style === 'oakmont') {
        return evaluateRolling(terrain, x, z, ctx);
    }
    if (terrain.style === 'cliffShelf') {
        return evaluateCliffShelf(terrain, x, z);
    }

    let height = 0;
    if (terrain.bands && terrain.bands.length) {
        height = heightFromBands(terrain.bands, z);
    }
    const features = terrain.features || [];
    for (let i = 0; i < features.length; i++) {
        height = applyTerrainFeature(features[i], x, z, height, ctx);
    }
    if (terrain.skipTeeFade) {
        return applyXFade(height, x, terrain.xFade);
    }
    const dxTee = x - 0;
    const dzTee = z - 10;
    const distFromTee = Math.sqrt(dxTee * dxTee + dzTee * dzTee);
    const teeFade = Math.min(1, Math.max(0, (distFromTee - 8) / 10));
    const faded = applyXFade(height, x, terrain.xFade);
    if (terrain.xFade) return faded;
    return Math.max(0.001, height * teeFade);
}

export function applyGreenComplex(terrain, x, z, baseHeight, greenCenterX, greenCenterZ, activeRadius) {
    if (!terrain || !terrain.greenComplex) return baseHeight;
    const g = terrain.greenComplex;
    const relX = x - greenCenterX;
    const relZ = z - greenCenterZ;
    const distFromGreen = Math.sqrt(relX * relX + relZ * relZ);
    if (g.berm) {
        const b = g.berm;
        if (relZ < b.relZMax && relZ > b.relZMin && Math.abs(relX) < b.absX) {
            const dzBerm = Math.abs(relZ - b.zCenter);
            const dxBerm = Math.abs(relX);
            if (dzBerm < b.zRadius && dxBerm < b.xRadius) {
                const factorZ = (1.0 + Math.cos((dzBerm / b.zRadius) * Math.PI)) * 0.5;
                const factorX = (1.0 + Math.cos((dxBerm / b.xRadius) * Math.PI)) * 0.5;
                baseHeight += b.height * factorZ * factorX;
            }
        }
    }
    if (g.platform) {
        const extra = g.platform.extraRadius !== undefined ? g.platform.extraRadius : 4.5;
        const platformRadius = activeRadius + extra;
        if (distFromGreen < platformRadius) {
            const tPlateau = Math.min(1.0, (platformRadius - distFromGreen) / extra);
            baseHeight += smooth01(tPlateau) * g.platform.height;
        }
    }
    return baseHeight;
}

export function greenRippleHeight(terrain, dx, dz) {
    if (!terrain || !terrain.greenRipples) return 0;
    const r = terrain.greenRipples;
    return Math.sin(dx * (r.f1 || 0.55)) * Math.cos(dz * (r.f1 || 0.55)) * (r.amp1 || 0.04)
        + Math.cos(dx * (r.f2 || 1.10)) * Math.sin(dz * (r.f2 || 1.10)) * (r.amp2 || 0.015);
}

export function isPointInCustomOOB(oob, x, z) {
    if (!oob) return false;
    if (oob.type === 'rectangle') {
        return x < oob.minX || x > oob.maxX || z > oob.maxZ || z < oob.minZ;
    }
    if (oob.type === 'l_shape') {
        const inLeg1 = (x >= oob.leg1.minX && x <= oob.leg1.maxX && z >= oob.leg1.minZ && z <= oob.leg1.maxZ);
        const inLeg2 = (x >= oob.leg2.minX && x <= oob.leg2.maxX && z >= oob.leg2.minZ && z <= oob.leg2.maxZ);
        return !(inLeg1 || inLeg2);
    }
    if (oob.type === 'stepped') {
        const activeMinX = z < oob.splitZ ? oob.wideMinX : oob.narrowMinX;
        const activeMaxX = z < oob.splitZ ? oob.wideMaxX : oob.narrowMaxX;
        return x < activeMinX || x > activeMaxX || z > oob.maxZ || z < oob.minZ;
    }
    return false;
}

export function isCliffOB(oob, water, x, z) {
    const cliff = (oob && oob.cliff) || (water && water.cliff);
    if (!cliff || !cliff.obZAtOrBelow) return false;
    if (z > cliff.obZAtOrBelow) return false;
    const plateauZ = cliff.obPlateauZ !== undefined ? cliff.obPlateauZ : -115;
    const plateauX = cliff.plateauX !== undefined ? cliff.plateauX : 20;
    const edgeX = z < plateauZ ? plateauX : getCliffEdgeX(z, cliff);
    return x > edgeX;
}

export function skipOOBStakeAt(oob, x) {
    if (!oob || oob.skipStakesXGreater === undefined) return false;
    return x > oob.skipStakesXGreater;
}

export function getWaterCliff(config) {
    if (!config) return null;
    if (config.water && config.water.cliff) return config.water.cliff;
    if (config.customOOB && config.customOOB.cliff) return config.customOOB.cliff;
    if (config.terrain && config.terrain.cliff) return config.terrain.cliff;
    return null;
}