import * as THREE from "three";

// Mesa de sinuca simples: um plano (feltro) com bordas (moldura)
// Unidades aproximadas em metros
class BilliardTable {
  static create({
    width = 2.54,
    height = 1.27,
    railHeight = 0.08,
    railThickness = 0.08,
  } = {}) {
    const group = new THREE.Group();

    // Feltro (plano)
    const feltGeometry = new THREE.PlaneGeometry(width, height);
    const feltMaterial = new THREE.MeshPhongMaterial({
      color: 0x0b7a2b, // verde feltro
      polygonOffset: true,
      polygonOffsetFactor: -1, // afasta do z-buffer
      polygonOffsetUnits: -1,
    });
    const felt = new THREE.Mesh(feltGeometry, feltMaterial);
    felt.rotation.x = -Math.PI / 2; // deitar
    felt.position.y = 0.001; // eleva levemente para evitar coplanar com base
    felt.receiveShadow = true;
    group.add(felt);

    // Bordas (moldura de madeira)
    const railMaterial = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });

    const railGeomLong = new THREE.BoxGeometry(
      width + railThickness * 2,
      railHeight,
      railThickness
    );
    const railGeomShort = new THREE.BoxGeometry(
      railThickness,
      railHeight,
      height
    );

    // Rail Norte e Sul (longos)
    const railNorth = new THREE.Mesh(railGeomLong, railMaterial);
    railNorth.position.set(0, railHeight / 2, (height + railThickness) / 2);
    const railSouth = railNorth.clone();
    railSouth.position.z = -(height + railThickness) / 2;

    // Rail Leste e Oeste (curtos)
    const railEast = new THREE.Mesh(railGeomShort, railMaterial);
    railEast.position.set((width + railThickness) / 2, railHeight / 2, 0);
    const railWest = railEast.clone();
    railWest.position.x = -(width + railThickness) / 2;

    for (const rail of [railNorth, railSouth, railEast, railWest]) {
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);
    }

    // Base (opcional) – leve espessura sob o feltro
    const baseGeom = new THREE.BoxGeometry(
      width + railThickness * 2,
      0.02,
      height + railThickness * 2
    );
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x1e392a });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.02; // um pouco abaixo do feltro
    base.receiveShadow = true;
    group.add(base);

    return group;
  }
}

export { BilliardTable };
