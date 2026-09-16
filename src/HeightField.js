/**
 * Uniform XZ height cache. deformCourseMesh used to call getGroundHeight
 * once per floor vertex and once per fairway vertex (~360k samples).
 * Building one grid and bilinear-sampling it cuts that to one pass.
 *
 * cellSize 1.0 matches the floor/fairway X spacing so bunker lips and
 * fairway edges stay on the same samples the meshes already used.
 */

export function buildHeightField(sampleFn, bounds) {
    const minX = bounds.minX;
    const minZ = bounds.minZ;
    const cellSize = bounds.cellSize;
    const cols = Math.floor((bounds.maxX - minX) / cellSize + 0.5) + 1;
    const rows = Math.floor((bounds.maxZ - minZ) / cellSize + 0.5) + 1;
    const heights = new Float32Array(cols * rows);

    let i = 0;
    for (let r = 0; r < rows; r++) {
        const z = minZ + r * cellSize;
        for (let c = 0; c < cols; c++) {
            heights[i++] = sampleFn(minX + c * cellSize, z);
        }
    }

    return { minX, minZ, cellSize, cols, rows, heights };
}

export function sampleHeightField(field, x, z) {
    if (!field || field.cols < 1 || field.rows < 1) return 0;

    const u = (x - field.minX) / field.cellSize;
    const v = (z - field.minZ) / field.cellSize;

    const c0 = Math.max(0, Math.min(field.cols - 1, Math.floor(u)));
    const r0 = Math.max(0, Math.min(field.rows - 1, Math.floor(v)));
    const c1 = Math.min(c0 + 1, field.cols - 1);
    const r1 = Math.min(r0 + 1, field.rows - 1);

    const tx = c0 === c1 ? 0 : Math.max(0, Math.min(1, u - c0));
    const tz = r0 === r1 ? 0 : Math.max(0, Math.min(1, v - r0));

    const h00 = field.heights[r0 * field.cols + c0];
    const h10 = field.heights[r0 * field.cols + c1];
    const h01 = field.heights[r1 * field.cols + c0];
    const h11 = field.heights[r1 * field.cols + c1];

    return h00 * (1 - tx) * (1 - tz)
        + h10 * tx * (1 - tz)
        + h01 * (1 - tx) * tz
        + h11 * tx * tz;
}