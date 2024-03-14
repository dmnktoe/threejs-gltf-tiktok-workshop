import './style.css';

import GUI from 'lil-gui';
import {
  AmbientLight,
  AnimationAction,
  AnimationMixer,
  AxesHelper,
  Clock,
  Color,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  LoadingManager,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { dances } from './data/dances';
import { toggleFullScreen } from './helpers/fullscreen';
import { resizeRendererToDisplaySize } from './helpers/responsiveness';
import { Dance } from './types/Dance';

const CANVAS_ID = 'scene';

let canvas: HTMLElement;
let renderer: WebGLRenderer;
let model: Group;
const mixers: AnimationMixer[] = [];
const models: Object3D[] = [];
let clock: Clock;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let hemisphereLight: HemisphereLight;
let pointlight: PointLight;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let axesHelper: AxesHelper;
let stats: Stats;
let gui: GUI;

let danceAction: AnimationAction;
let settings: any;

const music = new Audio('sounds/fingers-up.mp3');
music.loop = true;

init();

function init() {
  // ===== 👨🏻‍💼 LOADING MANAGER =====
  {
    loadingManager = new LoadingManager();

    loadingManager.onStart = () => {
      console.log('loading started');
    };
    loadingManager.onProgress = (url, loaded, total) => {
      console.log('loading in progress:');
      console.log(`${url} -> ${loaded} / ${total}`);
    };
    loadingManager.onLoad = () => {
      console.log('loaded!');
    };
    loadingManager.onError = () => {
      console.log('❌ error while loading');
    };
  }

  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    scene = new Scene();

    scene.background = new Color(0x000000);
    scene.fog = new Fog(0xffffff, 10, 50);
  }

  // ===== 💡 LIGHTS =====
  {
    ambientLight = new AmbientLight('white', 0.4);
    hemisphereLight = new HemisphereLight(0xffffff, 0x8d8d8d, 1);
    hemisphereLight.position.set(0, 20, 15);
    pointlight = new PointLight('green', 55);
    pointlight.position.set(0, 2, 2);

    scene.add(ambientLight);
    scene.add(hemisphereLight);
    scene.add(pointlight);
  }

  // ===== 📦 BASISKLASSE =====
  {
    const loader = new GLTFLoader(loadingManager);
    loader.load('models/basis-room.glb', (gltf) => {
      model = gltf.scene;
      model.position.set(0, 2.3, 0);
      scene.add(model);
      animate();
    });
  }

  // ===== 🎳 LOAD GLTF MODEL =====
  {
    const loader = new GLTFLoader(loadingManager);

    dances.forEach((dance, index) => {
      loader.load(
        dance.modelFile,
        (gltf) => {
          const model = gltf.scene;
          // Set models position from data
          model.position.set(
            dance.modelPosition.x,
            dance.modelPosition.y,
            dance.modelPosition.z,
          );
          // Set models rotation from data if available
          if (dance.modelRotation) {
            model.rotation.set(
              dance.modelRotation.x,
              dance.modelRotation.y,
              dance.modelRotation.z,
            );
          }
          // Set models scale from data
          if (dance.modelScale) {
            model.scale.set(
              dance.modelScale,
              dance.modelScale,
              dance.modelScale,
            );
          }
          // Add model to scene
          scene.add(model);

          // Model im Array speichern, um es eindeutig identifizierbar zu machen
          models[index] = model;

          const mixer = new AnimationMixer(model);
          danceAction = mixer.clipAction(gltf.animations[0]);
          danceAction.play();

          // Mixer im Array speichern, um ihn eindeutig identifizierbar zu machen
          mixers[index] = mixer;
        },
        (xhr) => {
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        },
        (error) => {
          console.log('❌ Error while loading GLTF model');
          console.error(error);
        },
      );
    });

    // ===== 🎥 CAMERA =====
    {
      camera = new PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        100,
      );
      camera.position.set(2, 4, -8);
      camera.lookAt(0, 2, 0);
    }

    // ===== 🕹️ CONTROLS =====
    {
      cameraControls = new OrbitControls(camera, canvas);
      cameraControls.enableDamping = true;
      cameraControls.autoRotate = false;
      cameraControls.update();

      // Full screen
      window.addEventListener('dblclick', (event) => {
        if (event.target === canvas) {
          toggleFullScreen(canvas);
        }
      });
    }

    // ===== 🪄 HELPERS =====
    {
      axesHelper = new AxesHelper(4);
      axesHelper.visible = false;
      scene.add(axesHelper);

      const gridHelper = new GridHelper(20, 20, 'teal', 'darkgray');
      gridHelper.position.y = -0.01;
      gridHelper.visible = true;
      scene.add(gridHelper);
    }

    // ===== 📈 STATS & CLOCK =====
    {
      clock = new Clock();
      stats = new Stats();
      document.body.appendChild(stats.dom);
    }

    // ==== 🐞 DEBUG GUI ====
    {
      gui = new GUI({ title: '💃 Dance-Options', width: 300 });

      const danceFolder = gui.addFolder('Dances');
      const danceNames = dances.map((dance: Dance) => dance.name);
      const danceSelect = danceFolder.add(
        { dance: danceNames[0] },
        'dance',
        danceNames,
      );

      danceSelect.onChange((selectedDance: string) => {
        console.log('selected dance:', selectedDance);
      });

      const musicFolder = gui.addFolder('Music');

      settings = {
        'play music': false,
        'modify music volume': 0.5,
      };

      musicFolder.add(settings, 'play music').onChange(playMusic);
      musicFolder
        .add(settings, 'modify music volume', 0.0, 1.0, 0.01)
        .onChange(modifyVolume);

      musicFolder.open();

      const helpersFolder = gui.addFolder('Helpers');
      helpersFolder.add(axesHelper, 'visible').name('axes');

      const cameraFolder = gui.addFolder('Camera');
      cameraFolder.add(cameraControls, 'autoRotate');

      // persist GUI state in local storage on changes
      gui.onFinishChange(() => {
        const guiState = gui.save();
        localStorage.setItem('guiState', JSON.stringify(guiState));
      });

      // load GUI state if available in local storage
      const guiState = localStorage.getItem('guiState');
      if (guiState) gui.load(JSON.parse(guiState));

      // reset GUI state button
      const resetGui = () => {
        localStorage.removeItem('guiState');
        gui.reset();
      };
      gui.add({ resetGui }, 'resetGui').name('RESET');

      gui.close();
    }
  }

  function playMusic(play: boolean) {
    if (play) {
      music.play();
    } else {
      music.pause();
    }
  }

  function modifyVolume(volume: number) {
    music.volume = volume;
  }

  function animate() {
    requestAnimationFrame(animate);

    // Delta-Zeit seit dem letzten Frame berechnen
    const delta = clock.getDelta();

    // Aktualisiere alle Mixer mit der Zeit seit dem letzten Frame
    mixers.forEach((mixer) => {
      mixer.update(delta);
    });

    stats.update();

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cameraControls.update();

    renderer.render(scene, camera);
  }
}
