import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { NRRDLoader } from 'three/addons/loaders/NRRDLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VolumeRenderShader1 as VolumeShader } from './VolumeShader.js?v=10.3';

export class VolumeViewer {
  constructor(containerId, progressCallback) {
    this.container = document.getElementById(containerId);
    this.progressCallback = progressCallback;

    this.scene = new THREE.Scene();
    
    // Safeguard aspect ratio if container size is not yet computed by browser
    let aspect = this.container.clientWidth / this.container.clientHeight;
    if (isNaN(aspect) || aspect === 0 || !isFinite(aspect)) {
      aspect = 1.0;
    }
    
    // Use PerspectiveCamera for natural depth perception (Solid 3D view)
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
    this.camera.position.set(0, 0, 300);

    // Setup directional headlight (moves with camera) & ambient light for 3D meshes
    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.dirLight.position.set(0, 0, 1);
    this.camera.add(this.dirLight);
    this.scene.add(this.camera);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 3.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.15;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 1000;

    this.mesh = null;
    this.material = null;

    this.volconfig = {
      clim1: 0,
      clim2: 1,
      renderstyle: 'dvr',
      isothreshold: 0.24,
      colormap: 'viridis'
    };
    this.grayscaleEnabled = false;

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));

    // Live WebGL Post-processing Sketch Shader Setup
    this.postProcessingEnabled = false;
    
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const pixelRatio = this.renderer.getPixelRatio();
    
    this.renderTarget = new THREE.WebGLRenderTarget(
      size.x * pixelRatio,
      size.y * pixelRatio,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    );
    
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(size.x * pixelRatio, size.y * pixelRatio) },
        uStyle: { value: 0 },
        uNoiseTime: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform int uStyle;
        uniform float uNoiseTime;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        vec4 samplePixel(vec2 uv, out float isModel) {
          vec4 color = texture2D(tDiffuse, uv);
          if (color.a == 0.0) {
            isModel = 0.0;
            return vec4(1.0, 1.0, 1.0, 0.0);
          } else {
            isModel = 1.0;
            return color;
          }
        }

        float getGrayscale(vec4 color) {
          return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        }

        void main() {
          vec2 texelSize = 1.0 / uResolution;
          
          float currentIsModel = 0.0;
          vec4 centerColor = samplePixel(vUv, currentIsModel);
          
          // Setup style parameters
          float sobelThreshold = 999.0;
          float sobelMultiplier = 0.0;
          float maxLineStrength = 0.0;
          float shadowThreshold = 0.0;
          float shadowMinVal = 1.0;
          float shadowPower = 1.0;
          vec3 baseColor = vec3(1.0);
          float graphiteMin = 0.0;
          float graphiteMax = 1.0;
          bool useSilhouette = false;
          float silhouetteValue = 0.0;
          
          if (uStyle == 0) {
            sobelThreshold = 999.0;
            sobelMultiplier = 0.0;
            maxLineStrength = 0.0;
            shadowThreshold = 200.0 / 255.0;
            shadowMinVal = 45.0 / 255.0;
            shadowPower = 1.2;
            baseColor = vec3(1.0);
            graphiteMin = 15.0 / 255.0;
            graphiteMax = 255.0 / 255.0;
            useSilhouette = false;
          } else if (uStyle == 1) {
            sobelThreshold = 65.0 / 255.0;
            sobelMultiplier = 6.0;
            maxLineStrength = 150.0 / 255.0;
            shadowThreshold = 60.0 / 255.0;
            shadowMinVal = 195.0 / 255.0;
            shadowPower = 1.5;
            baseColor = vec3(1.0);
            graphiteMin = 85.0 / 255.0;
            graphiteMax = 255.0 / 255.0;
            useSilhouette = true;
            silhouetteValue = 100.0 / 255.0;
          } else if (uStyle == 2) {
            sobelThreshold = 10.5 / 255.0;
            sobelMultiplier = 8.0;
            maxLineStrength = 200.0 / 255.0;
            shadowThreshold = 0.0;
            shadowMinVal = 1.0;
            shadowPower = 1.0;
            baseColor = vec3(0.102, 0.212, 0.365); // #1a365d
            graphiteMin = 1.0;
            graphiteMax = 0.0;
            useSilhouette = true;
            silhouetteValue = 0.0;
          }

          // Build background paper color
          vec3 paperColor = baseColor;
          if (uStyle != 2) {
            float paperNoise = hash(vUv * uResolution) * 14.0 / 255.0 - 7.0 / 255.0;
            paperColor = clamp(baseColor + vec3(paperNoise), 0.0, 1.0);
            
            // Vignette
            float dist = length(vUv - vec2(0.5));
            float vignette = smoothstep(0.3, 0.8, dist);
            paperColor = mix(paperColor, vec3(0.0), mix(0.0, 0.12, vignette));
          }
          
          if (currentIsModel == 0.0) {
            gl_FragColor = vec4(paperColor, 1.0);
            return;
          }

          // Sample 3x3 grid for Sobel
          float dummy = 0.0;
          float g00 = getGrayscale(samplePixel(vUv + vec2(-1.0, -1.0) * texelSize, dummy));
          float g01 = getGrayscale(samplePixel(vUv + vec2( 0.0, -1.0) * texelSize, dummy));
          float g02 = getGrayscale(samplePixel(vUv + vec2( 1.0, -1.0) * texelSize, dummy));
          
          float g10 = getGrayscale(samplePixel(vUv + vec2(-1.0,  0.0) * texelSize, dummy));
          float g11 = getGrayscale(centerColor);
          float g12 = getGrayscale(samplePixel(vUv + vec2( 1.0,  0.0) * texelSize, dummy));
          
          float g20 = getGrayscale(samplePixel(vUv + vec2(-1.0,  1.0) * texelSize, dummy));
          float g21 = getGrayscale(samplePixel(vUv + vec2( 0.0,  1.0) * texelSize, dummy));
          float g22 = getGrayscale(samplePixel(vUv + vec2( 1.0,  1.0) * texelSize, dummy));

          float gx = -g00 + g02 - 2.0 * g10 + 2.0 * g12 - g20 + g22;
          float gy = -g00 - 2.0 * g01 - g02 + g20 + 2.0 * g21 + g22;
          
          float edge = sqrt(gx*gx + gy*gy);
          
          float lineStrength = 0.0;
          if (edge > sobelThreshold && sobelMultiplier > 0.0) {
            lineStrength = min(maxLineStrength, (edge - sobelThreshold) * sobelMultiplier);
          }
          float edgeVal = 1.0 - lineStrength;
          
          float shadowVal = 1.0;
          if (g11 < shadowThreshold) {
            float pct = g11 / shadowThreshold;
            shadowVal = shadowMinVal + pow(pct, shadowPower) * (1.0 - shadowMinVal);
          }
          
          float anatomyGray = min(shadowVal, edgeVal);
          
          // Silhouette edge detection
          float silhouette = 0.0;
          if (useSilhouette) {
            float hasModel = currentIsModel;
            float hasBackground = 1.0 - currentIsModel;
            for (int y = -1; y <= 1; y++) {
              for (int x = -1; x <= 1; x++) {
                if (x == 0 && y == 0) continue;
                float neighborIsModel = 0.0;
                samplePixel(vUv + vec2(float(x), float(y)) * texelSize, neighborIsModel);
                if (neighborIsModel == 1.0) hasModel = 1.0;
                else hasBackground = 1.0;
              }
            }
            if (hasModel == 1.0 && hasBackground == 1.0) {
              silhouette = 1.0;
            }
          }
          
          if (useSilhouette && silhouette == 1.0) {
            anatomyGray = min(anatomyGray, silhouetteValue);
          }
          
          float mappedGray = 0.0;
          if (uStyle == 2) {
            mappedGray = 1.0 - anatomyGray;
          } else {
            mappedGray = graphiteMin + anatomyGray * (graphiteMax - graphiteMin);
            if (mappedGray < 0.96 && uStyle == 1) {
              float lineNoise = hash(vUv * uResolution + uNoiseTime) * 26.0 / 255.0 - 13.0 / 255.0;
              mappedGray = clamp(mappedGray + lineNoise, graphiteMin, 1.0);
            }
          }
          
          vec3 finalColor = vec3(0.0);
          if (uStyle == 2) {
            finalColor = clamp(paperColor + vec3(mappedGray), 0.0, 1.0);
          } else {
            finalColor = paperColor * mappedGray;
          }
          
          gl_FragColor = vec4(finalColor, 1.0);
        }`
    });
    
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, this.postMaterial);
    this.postScene.add(quad);

    this.animate();
    
    // Pre-allocated matrices for rendering loop to prevent garbage collection stutters
    this._tempMatrixInverse = new THREE.Matrix4();
    this._tempMatrixInverseTranspose = new THREE.Matrix4();
    
    // Force a resize calculation shortly after mounting to correct any layout timing glitches
    setTimeout(() => this.onWindowResize(), 100);
  }

  onWindowResize() {
    let aspect = this.container.clientWidth / this.container.clientHeight;
    if (isNaN(aspect) || aspect === 0 || !isFinite(aspect)) {
      aspect = 1.0;
    }
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const pixelRatio = this.renderer.getPixelRatio();
    
    this.renderer.setSize(width, height);
    if (this.renderTarget) {
      this.renderTarget.setSize(width * pixelRatio, height * pixelRatio);
    }
    if (this.postMaterial) {
      this.postMaterial.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    }
    this.controls.handleResize();
  }

  onKeyDown(event) {
    // Prevent hotkey triggering when typing in inputs/textareas
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      this.resetView();
    }
  }

  resetView() {
    if (this.camera) {
      this.camera.position.set(0, 0, 300);
      this.camera.up.set(0, 1, 0);
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    }
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    
    if (this.material && this.mesh && !this.isMeshModel) {
      this._tempMatrixInverse.copy(this.mesh.matrixWorld).invert();
      this._tempMatrixInverseTranspose.copy(this._tempMatrixInverse).transpose();
      this.material.uniforms['u_modelMatrixInverse'].value.copy(this._tempMatrixInverse);
      this.material.uniforms['u_modelMatrixInverseTranspose'].value.copy(this._tempMatrixInverseTranspose);
    }

    if (this.postProcessingEnabled) {
      // 1. Render main scene to render target
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.scene, this.camera);
      
      // 2. Render post-processing quad to screen
      this.renderer.setRenderTarget(null);
      this.postMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
      this.postMaterial.uniforms.uNoiseTime.value = Math.random();
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x000000, 0.0); // Reset clear color to transparent
      this.renderer.render(this.scene, this.camera);
    }
  }

  loadDataset(url) {
    this.resetView();

    const loadId = ++this.currentLoadCounter || (this.currentLoadCounter = 1);
    this.activeLoadId = loadId;
    this.grayscaleEnabled = false;
    this.currentUrl = url;
    if (!url.startsWith('blob:')) {
      this.currentFileName = '';
    }

    if (this.volumeGroup) {
      this.scene.remove(this.volumeGroup);
      this.volumeGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat && typeof mat.dispose === 'function') mat.dispose();
              });
            } else if (typeof child.material.dispose === 'function') {
              child.material.dispose();
            }
          }
        }
      });
      this.volumeGroup = null;
      this.mesh = null;
      this.material = null;
    }

    // Encode the URI path segments to support spaces in filenames/folders (e.g. RISD models)
    let fetchUrl = url;
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      const [path, query] = url.split('?');
      const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
      fetchUrl = query ? `${encodedPath}?${query}` : encodedPath;
    }

    // Parse extension using url or trailing hash tag
    let extension = '';
    const hashParts = url.split('#');
    if (hashParts.length > 1 && hashParts[1].startsWith('.')) {
      extension = hashParts[1].substring(1).toLowerCase();
    } else {
      extension = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
    }

    this.isGLB = (extension === 'glb' || extension === 'gltf');
    this.isMeshModel = (extension === 'ply' || extension === 'stl' || this.isGLB);

    if (this.isMeshModel) {
      this.volconfig.isothreshold = 1.0; // default opacity for mesh
      if (this.isGLB) {
        const loader = new GLTFLoader();
        loader.load(fetchUrl,
          (gltf) => {
            if (this.activeLoadId !== loadId) return;
            this.onGLBLoaded(gltf);
          },
          (xhr) => {
            if (this.activeLoadId !== loadId) return;
            if (this.progressCallback) {
              const percent = (xhr.loaded / xhr.total) * 100;
              this.progressCallback(percent || 0);
            }
          },
          (error) => {
            if (this.activeLoadId !== loadId) return;
            console.error('An error happened loading the GLTF model:', error);
            alert("Failed to load GLTF model.\n\nPossible reasons:\n1. CORS restrictions on remote files.\n2. The file format is corrupt or unsupported.");
          }
        );
      } else {
        const loader = (extension === 'ply') ? new PLYLoader() : new STLLoader();
        loader.load(fetchUrl, 
          (geometry) => {
            if (this.activeLoadId !== loadId) return;
            this.onMeshLoaded(geometry);
          }, 
          (xhr) => {
            if (this.activeLoadId !== loadId) return;
            if (this.progressCallback) {
              const percent = (xhr.loaded / xhr.total) * 100;
              this.progressCallback(percent || 0);
            }
          },
          (error) => {
            if (this.activeLoadId !== loadId) return;
            console.error('An error happened loading the 3D mesh model:', error);
            alert("Failed to load mesh model.\n\nPossible reasons:\n1. CORS restrictions on remote files.\n2. The file format is corrupt or unsupported.");
          }
        );
      }
    } else {
      const loader = new NRRDLoader();
      loader.load(fetchUrl, 
        (volume) => {
          if (this.activeLoadId !== loadId) return;
          this.onVolumeLoaded(volume);
        }, 
        (xhr) => {
          if (this.activeLoadId !== loadId) return;
          if (this.progressCallback) {
            const percent = (xhr.loaded / xhr.total) * 100;
            this.progressCallback(percent || 0);
          }
        },
        (error) => {
          if (this.activeLoadId !== loadId) return;
          console.error('An error happened loading the NRRD dataset:', error);
          alert("Failed to load dataset.\n\nPossible reasons:\n1. The URL is a webpage, not a direct .nrrd or .nii file.\n2. The host server (like MorphoSource or Dropbox) has CORS blocked for security.\n3. The host requires user login.\n\nWorkaround:\nPlease download the raw file to your computer and load it using the 'Local Library' tab instead (which is instant and avoids CORS restrictions).");
        }
      );
    }
  }

  loadFromFile(file) {
    const url = URL.createObjectURL(file);
    const queryUrl = `${url}#.${file.name.split('.').pop().toLowerCase()}`;
    this.currentFileName = file.name;
    this.loadDataset(queryUrl);
  }

  onVolumeLoaded(volume) {
    // Zero out the border to prevent clamping/interpolation artifacts at the edges of the box
    const W = volume.xLength;
    const H = volume.yLength;
    const D = volume.zLength;
    const WH = W * H;
    const B = Math.min(4, Math.floor(Math.min(W, H, D) / 4));

    // 1. Zero out z < B and z >= D - B planes
    volume.data.fill(0, 0, B * WH); // First B planes
    volume.data.fill(0, (D - B) * WH, D * WH); // Last B planes

    // 2. Zero out border rows and columns for all other planes
    for (let z = B; z < D - B; z++) {
      const zOffset = z * WH;
      // y < B rows
      volume.data.fill(0, zOffset, zOffset + B * W);
      // y >= H - B rows
      volume.data.fill(0, zOffset + (H - B) * W, zOffset + H * W);
      // x < B and x >= W - B columns for all other y
      for (let y = B; y < H - B; y++) {
        const rowOffset = zOffset + y * W;
        volume.data.fill(0, rowOffset, rowOffset + B); // Left border
        volume.data.fill(0, rowOffset + W - B, rowOffset + W); // Right border
      }
    }

    const normalizeRobust = (srcData) => {
      const len = srcData.length;
      const floatData = new Float32Array(len);
      const sampleSize = Math.min(len, 10000);
      const sample = new Float32Array(sampleSize);
      const step = Math.floor(len / sampleSize);
      for (let i = 0; i < sampleSize; i++) {
        sample[i] = srcData[i * step];
      }
      sample.sort();
      const minClip = sample[Math.floor(sampleSize * 0.005)];
      const maxClip = Math.max(sample[Math.floor(sampleSize * 0.995)], minClip + 1);
      const range = maxClip - minClip;
      for (let i = 0; i < len; i++) {
        floatData[i] = Math.min(1.0, Math.max(0.0, (srcData[i] - minClip) / range));
      }
      return floatData;
    };

    let data = volume.data;
    let textureType = THREE.FloatType;

    if (data instanceof Uint8Array) {
      textureType = THREE.UnsignedByteType;
    } else if (data instanceof Int32Array || data instanceof Uint32Array || data instanceof Int8Array || (typeof Uint8ClampedArray !== 'undefined' && data instanceof Uint8ClampedArray)) {
      console.log("Converting and robustly normalizing 32-bit/8-bit integer array to Float32Array...");
      data = normalizeRobust(data);
      textureType = THREE.FloatType;
    } else if (data instanceof Uint16Array) {
      console.log("Converting Uint16Array to Float32Array for linear filtering...");
      const len = data.length;
      const floatData = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        floatData[i] = data[i] / 65535.0;
      }
      data = floatData;
      textureType = THREE.FloatType;
    } else if (data instanceof Int16Array) {
      console.log("Converting and robustly normalizing Int16Array to Float32Array...");
      data = normalizeRobust(data);
      textureType = THREE.FloatType;
    } else if (data instanceof Float32Array) {
      // Normalize Float32Array to [0, 1] if it isn't already
      let minVal = Infinity;
      let maxVal = -Infinity;
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const val = data[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      if (minVal < 0.0 || maxVal > 1.0) {
        console.log("Normalizing Float32Array values to [0, 1] range...");
        const range = maxVal - minVal;
        if (range > 0) {
          const normalized = new Float32Array(len);
          for (let i = 0; i < len; i++) {
            normalized[i] = (data[i] - minVal) / range;
          }
          data = normalized;
        }
      }
      textureType = THREE.FloatType;
    }

    // Generate 3D Data Texture
    const texture = new THREE.Data3DTexture(data, volume.xLength, volume.yLength, volume.zLength);
    texture.format = THREE.RedFormat;
    texture.type = textureType;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    // Colormap Texture (We'll use a simple grayscale/viridis gradient for anatomy mapping)
    const cmTexture = this.createColormapTexture();

    const shader = VolumeShader;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    // Decompose spatial matrix to retrieve spacing (scaling factor) and rigid orientation transform (quaternion)
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    volume.matrix.decompose(position, quaternion, scale);

    const spacingX = Math.abs(scale.x);
    const spacingY = Math.abs(scale.y);
    const spacingZ = Math.abs(scale.z);

    const physicalX = volume.xLength * spacingX;
    const physicalY = volume.yLength * spacingY;
    const physicalZ = volume.zLength * spacingZ;

    uniforms['u_data'].value = texture;
    // Pass the voxel size to uniforms so the shader samples the texture coordinates correctly
    uniforms['u_size'].value.set(volume.xLength, volume.yLength, volume.zLength);
    uniforms['u_clim'].value.set(this.volconfig.clim1, this.volconfig.clim2);
    uniforms['u_renderstyle'].value = this.getRenderStyleIndex(this.volconfig.renderstyle);
    uniforms['u_renderthreshold'].value = this.volconfig.isothreshold;
    uniforms['u_cmdata'].value = cmTexture;

    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide // Required for the raymarching to start at the back of the bounding box
    });

    // Create the box geometry in voxel index space
    const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
    // Align texture lookups perfectly to index coordinates by shifting [0, size]
    geometry.translate(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5);

    this.mesh = new THREE.Mesh(geometry, this.material);
    
    // Set position, rotation and spacing scale from spatial matrix directly
    this.mesh.position.copy(position);
    this.mesh.quaternion.copy(quaternion);
    this.mesh.scale.set(spacingX, spacingY, spacingZ);
    this.mesh.updateMatrix();
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrixWorld(true);

    // Calculate bounding box in RAS (physical world) space
    const box = new THREE.Box3().setFromObject(this.mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 200 / maxDim;

    // 1. Translation group: offsets the mesh to center it at (0, 0, 0) local coordinates
    const translationGroup = new THREE.Group();
    translationGroup.add(this.mesh);
    translationGroup.position.copy(center).negate(); // Shift RAS center to (0, 0, 0)

    // 2. Volume group: handles scaling and vertical orientation rotation
    this.volumeGroup = new THREE.Group();
    this.volumeGroup.add(translationGroup);
    this.volumeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Rotate by -Math.PI / 2 around the X axis to align RAS Z (Superior)
    // with Three.js Y (Up) so that the head stands upright, and RAS Y (Anterior)
    // with World Z (facing camera) so the head faces the user.
    this.volumeGroup.rotation.x = -Math.PI / 2;

    this.scene.add(this.volumeGroup);

    // Force world matrix update of the entire hierarchy to ensure mesh.matrixWorld is correct
    this.volumeGroup.updateMatrixWorld(true);

    const modelMatrixInverse = new THREE.Matrix4().copy(this.mesh.matrixWorld).invert();
    const modelMatrixInverseTranspose = new THREE.Matrix4().copy(modelMatrixInverse).transpose();
    uniforms['u_modelMatrixInverse'].value.copy(modelMatrixInverse);
    uniforms['u_modelMatrixInverseTranspose'].value.copy(modelMatrixInverseTranspose);

    if (this.progressCallback) {
      this.progressCallback(100); // Complete
    }
  }

  onGLBLoaded(gltf) {
    const scene = gltf.scene;

    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.side = THREE.DoubleSide;
            });
          } else {
            child.material.side = THREE.DoubleSide;
          }
        }
      }
    });

    this.mesh = scene;
    this.material = null; // GLB models have internal multi-materials

    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 200 / (maxDim || 1);

    const translationGroup = new THREE.Group();
    translationGroup.add(scene);
    scene.position.copy(center).negate();

    this.volumeGroup = new THREE.Group();
    this.volumeGroup.add(translationGroup);
    this.volumeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

    this.scene.add(this.volumeGroup);

    // Apply current grayscale state to the loaded GLTF model materials
    this.setGrayscale(this.grayscaleEnabled);

    if (this.progressCallback) {
      this.progressCallback(100);
    }
  }

  onMeshLoaded(geometry) {
    geometry.computeVertexNormals();

    this.material = new THREE.MeshStandardMaterial({
      color: 0xf5eedc,       // Warm bone/clay color
      roughness: 0.65,       // Matte-like
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 200 / maxDim;

    const translationGroup = new THREE.Group();
    translationGroup.add(this.mesh);
    this.mesh.position.copy(center).negate();

    this.volumeGroup = new THREE.Group();
    this.volumeGroup.add(translationGroup);
    this.volumeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Meshes do not need the X-axis -PI/2 rotation that volume raw RAS grids need,
    // they usually render right side up in Standard Y-Up.
    this.scene.add(this.volumeGroup);

    if (this.progressCallback) {
      this.progressCallback(100);
    }
  }

  createColormapTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    
    const isFemale = (this.currentUrl && this.currentUrl.toLowerCase().includes('female')) ||
                     (this.currentFileName && this.currentFileName.toLowerCase().includes('female'));
    
    const gradient = context.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0.00, 'rgba(0, 0, 0, 0.0)');
    gradient.addColorStop(0.18, 'rgba(120, 120, 120, 0.0)');
    gradient.addColorStop(0.19, 'rgba(160, 160, 160, 0.35)'); // Fat (Gray)
    
    if (isFemale) {
      // Female-specific colormap adjustments (lower bone threshold density, 0.28)
      gradient.addColorStop(0.22, 'rgba(170, 170, 170, 0.40)');
      gradient.addColorStop(0.23, 'rgba(235, 175, 145, 0.60)'); // Skin (Warm beige)
      gradient.addColorStop(0.25, 'rgba(235, 175, 145, 0.70)');
      gradient.addColorStop(0.26, 'rgba(235, 125, 115, 1.0)');   // Muscle (Creamy pinkish red)
      gradient.addColorStop(0.27, 'rgba(210, 100, 95, 1.0)');
      gradient.addColorStop(0.28, 'rgba(245, 238, 220, 1.0)');   // Bone (Cream)
    } else {
      // Default / Male-specific colormap (higher bone threshold density, 0.31)
      gradient.addColorStop(0.21, 'rgba(170, 170, 170, 0.40)'); // Fat (Gray)
      gradient.addColorStop(0.22, 'rgba(235, 175, 145, 0.60)'); // Skin (Warm beige)
      gradient.addColorStop(0.24, 'rgba(235, 175, 145, 0.70)');
      gradient.addColorStop(0.26, 'rgba(235, 125, 115, 1.0)');   // Muscle (Creamy pinkish red)
      gradient.addColorStop(0.30, 'rgba(210, 100, 95, 1.0)');
      gradient.addColorStop(0.31, 'rgba(245, 238, 220, 1.0)');   // Bone (Cream)
    }
    
    gradient.addColorStop(0.80, 'rgba(250, 244, 230, 1.0)');
    gradient.addColorStop(1.00, 'rgba(255, 255, 250, 1.0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 1);

    const cmTexture = new THREE.CanvasTexture(canvas);
    cmTexture.format = THREE.RGBAFormat; // ensure RGBA
    cmTexture.minFilter = cmTexture.magFilter = THREE.LinearFilter;
    return cmTexture;
  }

  getRenderStyleIndex(style) {
    if (style === 'mip') return 0;
    if (style === 'iso') return 1;
    if (style === 'dvr') return 2;
    return 2; // Default fallback to DVR (Smooth Muscles)
  }

  updateThreshold(value) {
    this.volconfig.isothreshold = parseFloat(value);
    if (this.isMeshModel) {
      const opacity = this.volconfig.isothreshold;
      const transparent = opacity < 1.0;
      if (this.material) {
        this.material.opacity = opacity;
        this.material.transparent = transparent;
      }
      if (this.mesh) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat) {
                  mat.opacity = opacity;
                  mat.transparent = transparent;
                }
              });
            } else {
              child.material.opacity = opacity;
              child.material.transparent = transparent;
            }
          }
        });
      }
    } else {
      if (this.material) {
        this.material.uniforms['u_renderthreshold'].value = this.volconfig.isothreshold;
        // Correlate clim with threshold to dynamically hide lower densities when rendering in volume mode
        this.volconfig.clim1 = parseFloat(value); 
        this.material.uniforms['u_clim'].value.set(this.volconfig.clim1, this.volconfig.clim2);
      }
    }
  }

  setRenderMode(mode) {
    this.volconfig.renderstyle = mode.toLowerCase();
    if (this.material) {
      this.material.uniforms['u_renderstyle'].value = this.getRenderStyleIndex(this.volconfig.renderstyle);
    }
  }

  setGrayscale(enabled) {
    this.grayscaleEnabled = !!enabled;
    if (this.mesh && this.isGLB) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat) {
              // Store original states on first toggling
              if (mat.userData.originalMap === undefined) {
                mat.userData.originalMap = mat.map;
              }
              if (mat.userData.originalColor === undefined) {
                mat.userData.originalColor = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
              }
              if (mat.userData.originalVertexColors === undefined) {
                mat.userData.originalVertexColors = mat.vertexColors;
              }
              if (mat.userData.originalEmissive === undefined) {
                mat.userData.originalEmissive = mat.emissive ? mat.emissive.clone() : null;
              }
              if (mat.userData.originalEmissiveMap === undefined) {
                mat.userData.originalEmissiveMap = mat.emissiveMap;
              }
              
              if (this.grayscaleEnabled) {
                mat.map = null;
                mat.vertexColors = false;
                mat.emissiveMap = null;
                if (mat.emissive) {
                  mat.emissive.setHex(0x000000);
                }
                if (mat.color) {
                  mat.color.setHex(0xaaaaaa); // Clay render base color (preserves normal map shadows/bumpiness)
                }
              } else {
                mat.map = mat.userData.originalMap;
                mat.vertexColors = mat.userData.originalVertexColors;
                mat.emissiveMap = mat.userData.originalEmissiveMap;
                if (mat.color && mat.userData.originalColor) {
                  mat.color.copy(mat.userData.originalColor);
                }
                if (mat.emissive && mat.userData.originalEmissive) {
                  mat.emissive.copy(mat.userData.originalEmissive);
                }
              }
              mat.needsUpdate = true;
            }
          });
        }
      });
    }
  }
}
