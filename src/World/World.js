import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GuiControls } from "./systems/GuiControls.js";

import { Camera } from "./components/Camera.js";
import { Scene } from "./components/Scene.js";

import { Floor } from "./components/Floor.js";
import { Light } from "./components/Light.js";
import { BilliardTable } from "./components/BilliardTable.js";

import { Renderer } from "./systems/Renderer.js";
import { Resizer } from "./systems/Resizer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera;
let renderer;
let scene;
let controls;
let resizer;
let cueGroup;
let ballsGroup;
let cueBall;
let animState = { t: 0, phase: "idle", strike: null, roll: null };

class World {
  constructor(container) {
    camera = Camera.create();
    renderer = Renderer.create();
    container.append(renderer.domElement);
    resizer = new Resizer(container, camera, renderer);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(window);

    scene = Scene.create();

    Scene.setBackgroundTexture(
      scene,
      "src/World/assets/textures/backgrounds/starry_night_sky.jpg"
    );

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    Scene.addGridHelper(scene, 10, 10).helper.visible = false;
    Scene.addAxesHelper(scene, 8).helper.visible = false;
    Scene.addCameraHelper(scene, camera).helper.visible = false;

    const table = BilliardTable.create({ width: 2.54, height: 1.27 });
    mainGroup.add(table);

    const ambientLight = Light.createAmbientLight(0xffffff, 0.5);
    mainGroup.add(ambientLight);

    const directionalLight = Light.createDirectionalLight(
      0,
      5,
      3,
      0xffffff,
      0.8
    );

    const dlHelper = Light.createDirectionalLightHelper(directionalLight, 0.5);
    dlHelper.visible = false;

    mainGroup.add(directionalLight, dlHelper);

    camera.position.set(0.6, 1.4, 2.6);
    camera.lookAt(0, 0, 0);

    this.#loadGltfAssets(mainGroup).catch((e) => {
      console.warn("Falha ao carregar GLTF, usando placeholders.", e);
      this.#createPlaceholders(mainGroup);
    });

    const guiControls = new GuiControls();
    guiControls.addSceneFolder(scene);
    guiControls.addCameraFolder(camera, controls);
    guiControls.addLightFolder(ambientLight);
    guiControls.addLightFolder(directionalLight, dlHelper);

    window.addEventListener("keydown", (ev) => {
      if (ev.code === "Space" || ev.key === "b" || ev.key === "B") {
        this.#startShot();
      }
    });
  }

  render() {
    renderer.setAnimationLoop(() => {
      controls.update();
      this.#animate();
      renderer.render(scene, camera);
    });
  }

  #animate() {
    if (animState.phase === "strike" && cueGroup && cueBall) {
      animState.t += 0.03;
      const { startZ, endZ } = animState.strike;
      const z = startZ + (endZ - startZ) * Math.min(animState.t, 1);
      cueGroup.position.z = z;

      if (animState.t >= 1) {
        animState.phase = "roll";
        animState.t = 0;
      }
    } else if (animState.phase === "roll" && cueBall) {
      animState.t += 0.012;
      const { startZ, endZ } = animState.roll;
      cueBall.position.z = startZ + (endZ - startZ) * Math.min(animState.t, 1);
      if (animState.t >= 1) {
        animState.phase = "idle";
      }
    }
  }

  #startShot() {
    if (!cueBall || !cueGroup) return;
    const r = 0.028;

    cueGroup.position.x = cueBall.position.x;
    cueGroup.position.y = 0.03;

    const startZ = cueBall.position.z + 0.12;
    const endZ = cueBall.position.z + (r + 0.01);
    cueGroup.position.z = startZ;

    const rollStartZ = cueBall.position.z;
    const rollEndZ = -0.32;

    animState.strike = { startZ, endZ };
    animState.roll = { startZ: rollStartZ, endZ: rollEndZ };
    animState.phase = "strike";
    animState.t = 0;
  }

  async #loadGltfAssets(parentGroup) {
    const loader = new GLTFLoader();
    const url = "src/World/assets/models/pool_set/scene.gltf";
    const gltf = await loader.loadAsync(url);

    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    cueGroup =
      model.getObjectByName("cue") || model.getObjectByName("Cue") || null;
    ballsGroup =
      model.getObjectByName("balls") || model.getObjectByName("Balls") || null;

    if (!cueGroup && !ballsGroup) {
      model.scale.setScalar(0.01);
      model.rotation.x = -Math.PI / 2;
      parentGroup.add(model);
      const white = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
      );
      white.position.set(0, 0.028, 0.5);
      cueBall = white;
      parentGroup.add(white);
    } else {
      if (cueGroup) parentGroup.add(cueGroup);
      if (ballsGroup) parentGroup.add(ballsGroup);
      cueBall =
        (ballsGroup &&
          (ballsGroup.getObjectByName("white") ||
            ballsGroup.getObjectByName("White"))) ||
        null;
      if (!cueBall) {
        cueBall = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 32, 32),
          new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        cueBall.position.set(0, 0.028, 0.5);
        parentGroup.add(cueBall);
      }
    }

    if (cueGroup) {
      cueGroup.position.set(0, 0.03, 0.62);
      cueGroup.rotation.y = Math.PI;
      cueGroup.scale.setScalar(0.01);
    }
    if (ballsGroup) {
      ballsGroup.position.set(0, 0.028, -0.45);
      ballsGroup.scale.setScalar(0.01);
    }

    this.#startShot();
  }

  #createPlaceholders(parentGroup) {
    cueGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.01, 1.3, 16),
      new THREE.MeshPhongMaterial({ color: 0xdeb887 })
    );
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.009, 0.12, 16),
      new THREE.MeshPhongMaterial({ color: 0x4444ff })
    );
    tip.position.z = -0.65;
    tip.rotation.x = -Math.PI / 2;
    cueGroup.add(shaft, tip);
    cueGroup.position.set(0, 0.03, 0.62);
    parentGroup.add(cueGroup);

    ballsGroup = new THREE.Group();
    const r = 0.028;
    const colors = [
      0xffff00, 0x0000ff, 0xff0000, 0x8b00ff, 0xffa500, 0x00ff00, 0x800000,
      0x000000, 0xffffff,
    ];
    let idx = 0;
    const rows = 5;
    const startZ = -0.25;
    for (let row = 0; row < rows; row++) {
      const count = row + 1;
      const z = startZ - row * (r * 2 + 0.005);
      for (let i = 0; i < count; i++) {
        const x = -(count - 1) * (r + 0.005) + i * 2 * (r + 0.005);
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(r, 32, 32),
          new THREE.MeshPhongMaterial({ color: colors[idx % colors.length] })
        );
        ball.position.set(x, r, z);
        ball.castShadow = true;
        ball.receiveShadow = true;
        ballsGroup.add(ball);
        idx++;
      }
    }
    parentGroup.add(ballsGroup);

    cueBall = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    cueBall.position.set(0, r, 0.5);
    cueBall.castShadow = true;
    parentGroup.add(cueBall);

    this.#startShot();
  }
}

export { World };
