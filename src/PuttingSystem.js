/** One leftover-feet putting scale. Fringe, cup, and pin numbers are named, not retuned. */

export const COURSE_YARDS_PER_UNIT = 2.76923;
// Hole 1 green radius 10.5; leftover is 40 ft center-to-edge, so 40 / (10.5 * 2).
export const PUTT_FEET_PER_UNIT = 40 / 21;
export const FRINGE_WIDTH_UNITS = 1.0;
export const FLAG_HIDE_FEET = 20;
export const CHIP_BLEND_START_FEET = 25;
export const CHIP_BLEND_END_FEET = 55;
// Keep this number. Old comment said 15 ft; leftover scale is closer to ~3.4 ft.
export const PIN_INSET_UNITS = 5.0 / 2.76923;
export const CUP_RIM_RADIUS = 0.115;
export const CUP_RIM_INNER = 0.095;

export function unitsToPuttFeet(gameDistance) {
    return gameDistance * PUTT_FEET_PER_UNIT;
}

export function unitsToCourseYards(gameDistance) {
    return gameDistance * COURSE_YARDS_PER_UNIT;
}

export function leftoverFeetToYards(feet) {
    return feet / 3;
}

function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function smoothstep(x, edge0, edge1) {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function chipAdjustedYards(gameDistance) {
    const leftoverFeet = unitsToPuttFeet(gameDistance);
    const courseYards = unitsToCourseYards(gameDistance);
    const puttAsYards = leftoverFeetToYards(leftoverFeet);
    const t = smoothstep(leftoverFeet, CHIP_BLEND_START_FEET, CHIP_BLEND_END_FEET);
    return lerp(puttAsYards, courseYards, t);
}

export function greenRadiusAt(angle, baseRadius, shapeType) {
    if (typeof window !== 'undefined' && typeof window.getGreenRadiusAtAngle === 'function') {
        return window.getGreenRadiusAtAngle(angle, baseRadius, shapeType);
    }
    return baseRadius;
}

export function getGreenTouch(worldX, worldZ, greenX, greenZ) {
    const dx = worldX - greenX;
    const dz = worldZ - greenZ;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(-dz, dx);
    const baseR = (typeof window !== 'undefined' && window.activeGreenRadius != null)
        ? window.activeGreenRadius
        : 12.0;
    const shape = (typeof window !== 'undefined' && window.activeGreenShape)
        ? window.activeGreenShape
        : 'circle';
    const activeR = greenRadiusAt(angle, baseR, shape);
    const onGreen = dist < activeR;
    const onFringe = dist >= activeR && dist <= activeR + FRINGE_WIDTH_UNITS;
    return { dist, angle, activeR, onGreen, onFringe };
}

export function isOnFringeRing(dist, activeR) {
    return dist >= activeR && dist <= activeR + FRINGE_WIDTH_UNITS;
}

export function fringeOuterRadius(activeR) {
    return activeR + FRINGE_WIDTH_UNITS;
}

export function formatLeftoverDisplay(leftoverFeet) {
    if (leftoverFeet < 1) {
        const inches = Math.max(1, Math.round(leftoverFeet * 12));
        return { value: inches, unit: inches === 1 ? 'inch' : 'inches' };
    }
    return { value: Math.round(leftoverFeet), unit: 'feet' };
}

export function hudDistance(gameDistance, onGreen) {
    if (onGreen) {
        return formatLeftoverDisplay(unitsToPuttFeet(gameDistance));
    }
    return { value: Math.round(chipAdjustedYards(gameDistance)), unit: 'yards' };
}

export function shouldHideFlag(onGreenOrPutter, leftoverFeet, isMoving, wasHiddenOnShot) {
    if (isMoving) return !!wasHiddenOnShot;
    return onGreenOrPutter && Math.round(leftoverFeet) <= FLAG_HIDE_FEET;
}

export function putterGaugeMaxFeet(leftoverFeet) {
    if (leftoverFeet <= 4) return 10;
    if (leftoverFeet <= 10) return 20;
    if (leftoverFeet <= 20) return 30;
    if (leftoverFeet <= 30) return 40;
    if (leftoverFeet <= 45) return 60;
    if (leftoverFeet <= 65) return 90;
    if (leftoverFeet <= 95) return 120;
    return 150;
}

export function isPuttingLie(onGreen, clubName) {
    return onGreen || clubName === 'Putter';
}

export function leftoverFeetToCup(ballX, ballZ, holeX, holeZ) {
    return unitsToPuttFeet(Math.hypot(ballX - holeX, ballZ - holeZ));
}