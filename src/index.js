import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import simVertex from "./shaders/particles/simVertex.glsl";
import simFragment from "./shaders/particles/simFragment.glsl";

export default class Experience {
  constructor() {
    this.scene = new THREE.Scene();

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    };
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.canvas = document.querySelector("canvas.webgl");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      // alpha: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;

    this.clock = new THREE.Clock();
    this.previousTime = 0;
    this.setupEvents();
    this.setResize();
    this.setFBO();
    this.setCamera();

    this.setupObjects();
    this.update();
  }

  setCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.sizes.width / this.sizes.height,
      0.01,
      10000
    );
    // this.scene.add(this.camera);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
  }

  setResize() {
    window.addEventListener("resize", () => {
      // Update sizes
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;
      this.sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

      // Update camera
      this.sizes.aspectRatio = this.sizes.width / this.sizes.height;
      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      // Update renderer
      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(this.sizes.pixelRatio);
    });
  }

  setRenderTarget() {
    const renderTarget = new THREE.WebGLRenderTarget(
      this.sizes.width,
      this.sizes.height,
      {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
      }
    );
    return renderTarget;
  }

  setupEvents() {
    this.dummy = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial()
    );
    // this.scene.add(this.dummy);
    document.addEventListener("mousemove", (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      console.log(this.pointer.x, this.pointer.y);

      this.raycaster.setFromCamera(this.pointer, this.camera);
      let intersects = this.raycaster.intersectObject(this.dummy);
      if (intersects.length > 0) {
        let { x, y } = intersects[0].point;
        this.fboMaterial.uniforms.uMouse.value = new THREE.Vector2(x, y);

        this.dummy.position.set(x, y, 0);
      }
    });
  }

  setFBO() {
    this.fbo = this.setRenderTarget();
    this.fbo1 = this.setRenderTarget();

    this.psize = 256;

    this.fboScene = new THREE.Scene();
    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.fboCamera.position.set(0, 0, 0.5);
    this.fboCamera.lookAt(0, 0, 0);

    this.geometry = new THREE.PlaneGeometry(2, 2);

    this.data = new Float32Array(this.psize * this.psize * 4);

    for (let i = 0; i < this.psize; i++) {
      for (let j = 0; j < this.psize; j++) {
        let index = (i + j * this.psize) * 4;
        let theta = Math.random() * Math.PI * 2;
        let r = 0.5 + 0.5 * Math.random();
        this.data[index * 3 + 0] = r * Math.cos(theta);
        this.data[index * 3 + 1] = r * Math.sin(theta);
        this.data[index * 3 + 2] = 1;
        this.data[index * 3 + 3] = 1;
      }
    }
    this.fboTexture = new THREE.DataTexture(
      this.data,
      this.psize,
      this.psize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.fboTexture.minFilter = THREE.NearestFilter;
    this.fboTexture.magFilter = THREE.NearestFilter;
    this.fboTexture.needsUpdate = true;

    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: this.fboTexture },
        uInfo: { value: null },
        time: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    });

    this.infoArray = new Float32Array(this.psize * this.psize * 4);

    for (let i = 0; i < this.psize; i++) {
      for (let j = 0; j < this.psize; j++) {
        let index = (i + j * this.psize) * 4;
        let theta = Math.random() * Math.PI * 2;
        let r = 0.5 + 0.5 * Math.random();
        this.infoArray[index * 3 + 0] = 0.5 + Math.random();
        this.infoArray[index * 3 + 1] = 0.5 + Math.random();
        this.infoArray[index * 3 + 2] = 1;
        this.infoArray[index * 3 + 3] = 1;
      }
    }

    this.info = new THREE.DataTexture(
      this.infoArray,
      this.psize,
      this.psize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.info.minFilter = THREE.NearestFilter;
    this.info.magFilter = THREE.NearestFilter;
    this.info.needsUpdate = true;

    this.fboMaterial.uniforms.uInfo.value = this.info;

    this.fboMesh = new THREE.Mesh(this.geometry, this.fboMaterial);
    this.fboScene.add(this.fboMesh);

    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);
    this.renderer.setRenderTarget(this.fbo1);
    this.renderer.render(this.fboScene, this.fboCamera);
  }

  setupObjects() {
    this.count = this.psize ** 2;
    let geometry = new THREE.BufferGeometry();
    let positions = new Float32Array(this.count * 3);
    let uv = new Float32Array(this.count * 2);

    for (let i = 0; i < this.psize; i++) {
      for (let j = 0; j < this.psize; j++) {
        let index = i + j * this.psize;
        positions[index * 3 + 0] = i / Math.random();
        positions[index * 3 + 1] = j / Math.random();
        positions[index * 3 + 2] = 0;
        uv[index * 2 + 0] = i / this.psize;
        uv[index * 2 + 1] = j / this.psize;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    this.material = new THREE.ShaderMaterial({
      extensions: {
        derviatives: "#extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        uPositions: { value: null },
        resolution: { value: new THREE.Vector4() },
        uMouse: { value: new THREE.Vector2(0, 0) },
        time: { value: 0.0 },
      },
      transparent: true,
      vertexShader: particlesVertexShader,
      fragmentShader: particlesFragmentShader,
    });

    const spotLight = new THREE.SpotLight("#6a40e9", 10);
    const spotLightHelp = new THREE.SpotLightHelper(spotLight);
    //spotLight.position.y = 0;

    //this.scene.add(spotLight, spotLightHelp);

    this.material.uniforms.uPositions.value = this.fboTexture;
    let points = new THREE.Points(geometry, this.material);
    this.controls.target.set(
      points.position.x,
      points.position.y,
      points.position.z
    );
    spotLight.lookAt(points);
    this.scene.add(points);
  }

  update() {
    this.elapsedTime = this.clock.getElapsedTime();
    const deltaTime = this.elapsedTime - this.previousTime;
    this.previousTime = this.elapsedTime;

    this.fboMaterial.uniforms.time.value += deltaTime;
    this.material.uniforms.time.value += deltaTime;

    // Swap the render target for FBO simulation
    this.renderer.setRenderTarget(this.fbo1); // Render into fbo1
    this.fboMaterial.uniforms.uPositions.value = this.fbo.texture; // Read from fbo
    this.renderer.render(this.fboScene, this.fboCamera); // Run simulation
    this.renderer.setRenderTarget(null); // Reset render target to default

    // Now render the final scene
    this.material.uniforms.uPositions.value = this.fbo1.texture; // Read from fbo1
    this.renderer.render(this.scene, this.camera); // Render final scene

    // Swap FBOs
    let temp = this.fbo;
    this.fbo = this.fbo1;
    this.fbo1 = temp;

    // Continue looping
    window.requestAnimationFrame(this.update.bind(this));
  }
}

const experience = new Experience();
