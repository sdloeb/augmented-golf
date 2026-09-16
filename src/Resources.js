/**
 * GPU cleanup helpers. scene.remove() alone leaves BufferGeometry and
 * Material on the GPU; these walk a mesh/group and free both.
 *
 * Safe to call twice on the same object. Does not dispose geometries that
 * other live meshes still share — callers that pool (rain, sand spray)
 * must skip geometry.dispose themselves.
 */

function disposeMaterial(material) {
    if (!material) return;
    if (material.map) material.map.dispose();
    if (material.bumpMap && material.bumpMap !== material.map) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    material.dispose();
}

export function disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(disposeMaterial);
            } else {
                disposeMaterial(child.material);
            }
        }
    });
}

export function disposeAndRemove(scene, mesh) {
    if (!mesh) return;
    if (scene) scene.remove(mesh);
    disposeObject3D(mesh);
}

export function disposeMeshList(scene, list) {
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
        disposeAndRemove(scene, list[i]);
    }
    list.length = 0;
}