import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GuiControls } from "./systems/GuiControls.js";

import { Camera } from "./components/Camera.js";
// import { Cube } from './components/Cube.js';
// import { Sphere } from './components/Sphere.js';
import { Scene } from "./components/Scene.js";

import { Floor } from "./components/Floor.js";
import { Light } from "./components/Light.js";
import { BilliardTable } from "./components/BilliardTable.js";

import { Renderer } from "./systems/Renderer.js";
import { Resizer } from "./systems/Resizer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// These variables are module-scoped: we cannot access them
// from outside the module
let camera;
let renderer;
let scene;
let controls;
// let cube;
// let sphere;
let resizer;
let cueGroup; // taco
let ballsGroup; // conjunto de bolas
let cueBall; // bola branca
let animState = { t: 0, phase: "idle", strike: null, roll: null };

class World {
  constructor(container) {
    camera = Camera.create();
    renderer = Renderer.create();
    container.append(renderer.domElement);
    resizer = new Resizer(container, camera, renderer);

    // Permite controle da camera com mouse e teclado
    controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(window);
    //controls.enableDamping = true; // suaviza o movimento

    // Objetos de exemplo removidos (Cube/Sphere)

    scene = Scene.create();

    // Carregar imagem de fundo da cena
    Scene.setBackgroundTexture(
      scene,
      "src/World/assets/textures/backgrounds/starry_night_sky.jpg"
    );

    // Setar cor de fundo da cena
    //Scene.setBackgroundColor(scene, 0x21272e);

    // Agrupar elementos da cena para iluminação e sombras
    const mainGroup = new THREE.Group();

    scene.add(mainGroup);

    // adiciona grid de referência
    Scene.addGridHelper(scene, 10, 10).helper.visible = false;

    // adiciona eixos de referência
    Scene.addAxesHelper(scene, 8).helper.visible = false;

    // adiciona helper da câmera
    Scene.addCameraHelper(scene, camera).helper.visible = false;

    // adiciona mesa de sinuca (plano + bordas)
    const table = BilliardTable.create({ width: 2.54, height: 1.27 });
    mainGroup.add(table);

    // iluminação
    const ambientLight = Light.createAmbientLight(0xffffff, 0.5);
    mainGroup.add(ambientLight);

    const directionalLight = Light.createDirectionalLight(
      0,
      5,
      3,
      0xffffff,
      0.8
    );

    // adiciona helper da iluminação
    const dlHelper = Light.createDirectionalLightHelper(directionalLight, 0.5);
    dlHelper.visible = false;

    //directionalLight.target = table;

    mainGroup.add(directionalLight, dlHelper);

    // Espaço para tacos e bolas (GLTF) será adicionado abaixo

    // Ajuste a posição da câmera para enquadrar a mesa
    camera.position.set(0.6, 1.4, 2.6);
    camera.lookAt(0, 0, 0);

    // Carregar GLTF do taco e bolas
    this.#loadGltfAssets(mainGroup).catch((e) => {
      console.warn("Falha ao carregar GLTF, usando placeholders.", e);
      this.#createPlaceholders(mainGroup);
    });

    // Mostra controle de propriedades na tela (dat.GUI)
    const guiControls = new GuiControls();
    guiControls.addSceneFolder(scene);
    guiControls.addCameraFolder(camera, controls);
    guiControls.addLightFolder(ambientLight);
    guiControls.addLightFolder(directionalLight, dlHelper);

    // Permitir reiniciar a animação com espaço/B
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

  // Animação: taco avança e empurra a bola branca em direção ao rack
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

  // Configura dinamicamente a tacada com base na posição da bola branca
  #startShot() {
    if (!cueBall || !cueGroup) return;
    const r = 0.028; // raio da bola branca

    // Alinhar taco no eixo X da bola e altura aproximada do feltro
    cueGroup.position.x = cueBall.position.x;
    cueGroup.position.y = 0.03;

    // Limites da tacada (se aproximar até encostar na bola)
    const startZ = cueBall.position.z + 0.12; // recuo inicial
    const endZ = cueBall.position.z + (r + 0.01); // quase tocando
    cueGroup.position.z = startZ;

    // Fase de rolagem da bola até perto do triângulo
    const rollStartZ = cueBall.position.z;
    const rollEndZ = -0.32;

    animState.strike = { startZ, endZ };
    animState.roll = { startZ: rollStartZ, endZ: rollEndZ };
    animState.phase = "strike";
    animState.t = 0;
  }

  async #loadGltfAssets(parentGroup) {
    const loader = new GLTFLoader();
    // Espera-se que o usuário coloque os arquivos GLTF aqui
    const url = "src/World/assets/models/pool_set/scene.gltf";
    const gltf = await loader.loadAsync(url);

    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Tentar detectar taco e bolas por nomes comuns
    cueGroup =
      model.getObjectByName("cue") || model.getObjectByName("Cue") || null;
    ballsGroup =
      model.getObjectByName("balls") || model.getObjectByName("Balls") || null;

    // Se não achar separadamente, adiciona tudo e cria bola branca placeholder
    if (!cueGroup && !ballsGroup) {
      model.scale.setScalar(0.01);
      model.rotation.x = -Math.PI / 2; // deitar caso necessário
      parentGroup.add(model);
      // Placeholder de bola branca
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
      // Caso não haja bola branca identificável, cria uma
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

    // Posicionar taco e rack aproximadamente
    if (cueGroup) {
      cueGroup.position.set(0, 0.03, 0.62);
      cueGroup.rotation.y = Math.PI; // apontando para -Z
      cueGroup.scale.setScalar(0.01);
    }
    if (ballsGroup) {
      ballsGroup.position.set(0, 0.028, -0.45);
      ballsGroup.scale.setScalar(0.01);
    }

    // Iniciar animação com base na posição atual da bola
    this.#startShot();
  }

  #createPlaceholders(parentGroup) {
    // Taco simples (cilindro + cone)
    cueGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.01, 1.3, 16),
      new THREE.MeshPhongMaterial({ color: 0xdeb887 })
    );
    // Orientar eixo do taco ao longo de Z (apontando para -Z)
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.009, 0.12, 16),
      new THREE.MeshPhongMaterial({ color: 0x4444ff })
    );
    tip.position.z = -0.65; // ponta para -Z
    tip.rotation.x = -Math.PI / 2;
    cueGroup.add(shaft, tip);
    cueGroup.position.set(0, 0.03, 0.62);
    parentGroup.add(cueGroup);

    // Rack em triângulo simples (bolas coloridas)
    ballsGroup = new THREE.Group();
    const r = 0.028; // raio típico ~28mm
    const colors = [
      0xffff00, 0x0000ff, 0xff0000, 0x8b00ff, 0xffa500, 0x00ff00, 0x800000,
      0x000000, 0xffffff,
    ];
    let idx = 0;
    const rows = 5;
    const startZ = -0.25; // dentro do limite de -0.635
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

    // Bola branca
    cueBall = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    cueBall.position.set(0, r, 0.5);
    cueBall.castShadow = true;
    parentGroup.add(cueBall);

    // Iniciar animação com base na posição atual da bola
    this.#startShot();
  }
}

export { World };
