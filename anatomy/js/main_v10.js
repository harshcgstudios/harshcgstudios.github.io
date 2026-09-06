import { VolumeViewer } from './VolumeViewer.js?v=10.8';

document.addEventListener('DOMContentLoaded', () => {
  const loaderEl = document.getElementById('loader');
  const progressEl = document.getElementById('loadingProgress');
  
  let hideSketchOverlay = () => {};
  
  // Helper to dynamically populate select options depending on dataset type
  const rebuildRenderModeSelect = () => {
    const select = document.getElementById('renderMode');
    const labelText = document.getElementById('renderModeLabelText');
    const toggleGroup = select.closest('.toggle-group');
    
    // Clear existing options
    select.innerHTML = '';
    
    if (viewer.isGLB) {
      if (labelText) labelText.innerText = "Mode:";
      if (toggleGroup) toggleGroup.style.display = 'flex';
      
      const optColor = document.createElement('option');
      optColor.value = 'color';
      optColor.text = 'Color';
      optColor.selected = !viewer.grayscaleEnabled;
      select.appendChild(optColor);
      
      const optGray = document.createElement('option');
      optGray.value = 'grayscale';
      optGray.text = 'Greyscale';
      optGray.selected = viewer.grayscaleEnabled;
      select.appendChild(optGray);
      
    } else if (viewer.isMeshModel) {
      // Non-GLB meshes (PLY/STL) don't have modes
      if (toggleGroup) toggleGroup.style.display = 'none';
      
    } else {
      // Volumetric scans
      if (labelText) labelText.innerText = "Mode:";
      if (toggleGroup) toggleGroup.style.display = 'flex';
      
      const optDvr = document.createElement('option');
      optDvr.value = 'DVR';
      optDvr.text = 'Direct Volume (Smooth Muscles)';
      optDvr.selected = (viewer.volconfig.renderstyle === 'dvr');
      select.appendChild(optDvr);
      
      const optIso = document.createElement('option');
      optIso.value = 'ISO';
      optIso.text = 'Isosurface (Solid View)';
      optIso.selected = (viewer.volconfig.renderstyle === 'iso');
      select.appendChild(optIso);
      
      const optMip = document.createElement('option');
      optMip.value = 'MIP';
      optMip.text = 'Maximum Intensity (MIP)';
      optMip.selected = (viewer.volconfig.renderstyle === 'mip');
      select.appendChild(optMip);
    }
  };

  // Progress Callback for Volume Loader
  const handleProgress = (percent) => {
    if (percent === 100) {
      setTimeout(() => {
        loaderEl.classList.add('hidden');

        // Dynamically customize controls for Mesh vs Volumetric scan
        const controlHeaderH3 = document.querySelector('.control-header h3');
        const controlHeaderP = document.querySelector('.control-header p');
        const slider = document.getElementById('thresholdSlider');
        const skinLabel = document.querySelector('.slider-container .slider-label:first-child');
        const boneLabel = document.querySelector('.slider-container .slider-label:last-child');

        rebuildRenderModeSelect();

        if (viewer.isMeshModel) {
          if (controlHeaderH3) controlHeaderH3.innerText = "Model Opacity Control";
          if (controlHeaderP) controlHeaderP.innerText = "Adjust transparency of the 3D surface model";
          if (skinLabel) skinLabel.innerText = "Clear";
          if (boneLabel) boneLabel.innerText = "Opaque";
          if (slider) slider.value = viewer.volconfig.isothreshold; // Sync with mesh's 1.0 default opacity
        } else {
          if (controlHeaderH3) controlHeaderH3.innerText = "Tissue Density Threshold";
          if (controlHeaderP) controlHeaderP.innerText = "Slide to strip away skin/muscle to reveal bone";
          if (skinLabel) skinLabel.innerText = "Skin";
          if (boneLabel) boneLabel.innerText = "Bone";
          if (slider) slider.value = viewer.volconfig.isothreshold;
        }
      }, 500); // 0.5s delay to assure rendering context is warm
    } else {
      loaderEl.classList.remove('hidden');
      progressEl.innerText = `${Math.round(percent)}%`;
      hideSketchOverlay();
    }
  };

  // Initialize Viewer
  const viewer = new VolumeViewer('viewerContainer', handleProgress);

  // Mobile Collapsible Sidebar Logic
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  };

  const toggleSidebar = () => {
    if (sidebar) sidebar.classList.toggle('open');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
  };

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Large full-body volumes live on the NAS (over GitHub's file limit) - absolute host
  const NAS_MODELS_BASE = 'https://nas-models.harshcgstudios.co.uk/anatomy/models';

  const getRedirectedUrl = (url) => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('visible_human_female_whole_body') || urlLower.includes('visible_human_female_whole_body_highres')) {
      return NAS_MODELS_BASE + '/visible_human_female_whole_body_balanced.nrrd';
    } else if (urlLower.includes('visible_human_whole_body') || urlLower.includes('visible_human_whole_body_highres')) {
      return NAS_MODELS_BASE + '/visible_human_whole_body_balanced.nrrd';
    }
    return url;
  };

  // Hook up Controls
  document.getElementById('thresholdSlider').addEventListener('input', (e) => {
    viewer.updateThreshold(e.target.value);
  });

  document.getElementById('renderMode').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'color') {
      viewer.setGrayscale(false);
    } else if (val === 'grayscale') {
      viewer.setGrayscale(true);
    } else {
      viewer.setRenderMode(val);
    }
  });

  const sketchfabEmbed = document.getElementById('sketchfabEmbed');
  const controlPanel = document.querySelector('.control-panel');

  const restoreThreeCanvas = () => {
    // Reset Sketchfab iframe
    if (sketchfabEmbed) {
      sketchfabEmbed.src = '';
      sketchfabEmbed.classList.add('hidden');
    }
    
    // Hide sketch overlay
    hideSketchOverlay();
    
    // Show Three.js canvas
    if (viewer && viewer.renderer && viewer.renderer.domElement) {
      viewer.renderer.domElement.style.display = 'block';
    }
    
    // Show local control panel
    if (controlPanel) controlPanel.classList.remove('hidden');
  };

  // File Upload Logic
  document.getElementById('fileUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      restoreThreeCanvas();
      loaderEl.classList.remove('hidden');
      progressEl.innerText = `Processing ${file.name}...`;
      
      viewer.loadFromFile(file);
      
      // Update UI
      document.querySelectorAll('.dataset-item').forEach(el => el.classList.remove('active'));
      closeSidebar();
    }
  });

  // Tab Switching Logic
  const tabLocal = document.getElementById('tabLocal');
  const tabMorphoSource = document.getElementById('tabMorphoSource');
  const tabRISD = document.getElementById('tabRISD');
  const tabSketchfab = document.getElementById('tabSketchfab');
  
  const panelLocal = document.getElementById('panelLocal');
  const panelMorphoSource = document.getElementById('panelMorphoSource');
  const panelRISD = document.getElementById('panelRISD');
  const panelSketchfab = document.getElementById('panelSketchfab');

  const tabs = [tabLocal, tabMorphoSource, tabRISD, tabSketchfab];
  const panels = [panelLocal, panelMorphoSource, panelRISD, panelSketchfab];

  tabs.forEach((tab, index) => {
    if (tab) {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t && t.classList.remove('active'));
        panels.forEach(p => p && p.classList.remove('active'));
        
        tab.classList.add('active');
        if (panels[index]) panels[index].classList.add('active');
      });
    }
  });

  // Helper to hook up a click event listener on a dataset-list container
  const setupListHandler = (elementId, loadingText) => {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;
    
    listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.dataset-item');
      if (!item) return;

      document.querySelectorAll('.dataset-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      const url = item.getAttribute('data-url');
      if (url) {
        restoreThreeCanvas();
        loaderEl.classList.remove('hidden');
        progressEl.innerText = loadingText;
        const redirectedUrl = getRedirectedUrl(url);
        viewer.loadDataset(redirectedUrl);
        closeSidebar();
      }
    });
  };

  setupListHandler('datasetList', "Fetching dataset...");
  setupListHandler('morphoSourceDatasetList', "Downloading primate micro-CT scan from MorphoSource...");
  setupListHandler('risdDatasetList', "Loading RISD Nature Lab 3D model...");

  // Dynamic Sketchfab list populating
  const populateSketchfabList = () => {
    const listEl = document.getElementById('sketchfabDatasetList');
    if (!listEl) return;
    
    listEl.innerHTML = '<li class="helper-text" style="text-align:center; padding: 20px;">Fetching from Sketchfab...</li>';
    
    const collections = [
      '03ed080f5dcd43f08e2ddccda316d93a',
      '127bdde3fd3540698dae43b633f58415'
    ];
    
    Promise.all(collections.map(uid => 
      fetch(`api/sketchfab/collection/${uid}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
    ))
      .then(results => {
        listEl.innerHTML = '';
        const allModels = [];
        results.forEach(res => {
          if (res.results) {
            allModels.push(...res.results);
          }
        });
        
        if (allModels.length === 0) {
          listEl.innerHTML = '<li class="helper-text">No models found in these collections.</li>';
          return;
        }
        
        // Deduplicate models by uid
        const uniqueModels = [];
        const seenUids = new Set();
        allModels.forEach(model => {
          if (!seenUids.has(model.uid)) {
            seenUids.add(model.uid);
            uniqueModels.push(model);
          }
        });
        
        uniqueModels.forEach(model => {
          const li = document.createElement('li');
          li.className = 'dataset-item';
          li.setAttribute('data-uid', model.uid);
          li.setAttribute('data-name', model.name);
          
          // Get thumbnail
          let thumbnail = 'images/thumb_skull_mesh.png';
          if (model.thumbnails && model.thumbnails.images && model.thumbnails.images.length > 0) {
            const images = model.thumbnails.images;
            const targetWidth = 256;
            let closest = images[0];
            images.forEach(img => {
              if (Math.abs(img.width - targetWidth) < Math.abs(closest.width - targetWidth)) {
                closest = img;
              }
            });
            thumbnail = closest.url;
          }
          
          li.innerHTML = `
            <div class="thumbnail-wrapper">
              <img src="${thumbnail}" class="dataset-thumbnail" alt="${model.name}">
            </div>
            <div class="dataset-info">
              <span class="dataset-title-small">${model.name}</span>
              <span class="dataset-badge-small">Sketchfab 3D</span>
            </div>
          `;
          listEl.appendChild(li);
        });
      })
      .catch(err => {
        console.error('Failed to load Sketchfab collections:', err);
        listEl.innerHTML = `<li class="helper-text" style="color: #ef4444; text-align: center; padding: 12px; font-size: 0.78rem;">Failed to load from Sketchfab:<br><strong style="word-break: break-all; color: #f87171;">${err.message || err}</strong><br><br>Please hard-refresh (Ctrl+F5) or check connection.</li>`;
      });
  };

  const setupSketchfabHandler = () => {
    const listEl = document.getElementById('sketchfabDatasetList');
    if (!listEl) return;
    
    listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.dataset-item');
      if (!item) return;

      document.querySelectorAll('.dataset-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      const uid = item.getAttribute('data-uid');
      if (uid) {
        // Stop any active volume loader progress
        if (viewer.activeLoadId) {
          viewer.activeLoadId = null; 
        }
        
        // Hide loading progress bar
        loaderEl.classList.add('hidden');
        
        // Hide sketch overlay
        hideSketchOverlay();
        
        // Hide Three.js canvas
        if (viewer && viewer.renderer && viewer.renderer.domElement) {
          viewer.renderer.domElement.style.display = 'none';
        }
        
        // Hide local control panel (threshold and render mode selection)
        if (controlPanel) controlPanel.classList.add('hidden');
        
        // Show Sketchfab iframe and set its URL
        sketchfabEmbed.src = `https://sketchfab.com/models/${uid}/embed?autostart=1&internal=1&tracking=0&ui_infos=0&ui_watermark=0`;
        sketchfabEmbed.classList.remove('hidden');
        closeSidebar();
      }
    });
  };

  // Populate Sketchfab collection and setup events
  populateSketchfabList();
  setupSketchfabHandler();



  const isAnimalModel = (dataset) => {
    const title = dataset.title.toLowerCase();
    const url = dataset.url.toLowerCase();
    const animalKeywords = [
      'alligator', 'wolf', 'eagle', 'gecko', 'bird', 'bat', 'rabbit',
      'gila', 'anaconda', 'python', 'varanus', 'frog', 'snake', 'rattlesnake',
      'pig', 'minipig', 'mouse', 'kangaroo', 'lizard', 'toad', 'tuatara',
      'paw', 'pfote', 'mantis', 'ceromacra', 'cat', 'sheep'
    ];
    return animalKeywords.some(keyword => title.includes(keyword) || url.includes(keyword));
  };

  let allLocalDatasets = [];
  let currentLocalCategory = 'human';

  const renderLocalList = (defaultUrl = null) => {
    const listEl = document.getElementById('datasetList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = allLocalDatasets.filter(dataset => {
      const isAnimal = isAnimalModel(dataset);
      return currentLocalCategory === 'animal' ? isAnimal : !isAnimal;
    });

    filtered.forEach(dataset => {
      const li = document.createElement('li');
      const isDefault = defaultUrl && dataset.url === defaultUrl;
      li.className = `dataset-item${isDefault ? ' active' : ''}`;
      li.setAttribute('data-url', dataset.url);

      li.innerHTML = `
        <div class="thumbnail-wrapper">
          <img src="${dataset.thumbnail}" class="dataset-thumbnail" alt="${dataset.title}">
        </div>
        <div class="dataset-info">
          <span class="dataset-title-small">${dataset.title}</span>
          <span class="dataset-badge-small">${dataset.size}</span>
        </div>
      `;
      listEl.appendChild(li);
    });
  };

  // Dynamic model populator function
  const populateList = (url, elementId, defaultUrl = null) => {
    return fetch(url)
      .then(response => response.json())
      .then(datasets => {
        const listEl = document.getElementById(elementId);
        if (!listEl) return;
        listEl.innerHTML = '';
        
        datasets.forEach(dataset => {
          const li = document.createElement('li');
          const isDefault = defaultUrl && dataset.url === defaultUrl;
          li.className = `dataset-item${isDefault ? ' active' : ''}`;
          li.setAttribute('data-url', dataset.url);
          
          li.innerHTML = `
            <div class="thumbnail-wrapper">
              <img src="${dataset.thumbnail}" class="dataset-thumbnail" alt="${dataset.title}">
            </div>
            <div class="dataset-info">
              <span class="dataset-title-small">${dataset.title}</span>
              <span class="dataset-badge-small">${dataset.size}</span>
            </div>
          `;
          listEl.appendChild(li);
        });
      })
      .catch(err => {
        console.warn(`Could not load ${url}.`, err);
      });
  };

  // Fetch lists and populate with cache buster
  fetch('models_list.json?t=' + Date.now())
    .then(response => response.json())
    .then(datasets => {
      allLocalDatasets = datasets;
      renderLocalList('models/Atlas_CT_12025abab5.nrrd');
    })
    .catch(err => {
      console.warn('Could not load models_list.json', err);
    });

  populateList('morphosource_models.json?t=' + Date.now(), 'morphoSourceDatasetList');
  populateList('risd_models.json?t=' + Date.now(), 'risdDatasetList');

  // Category switch handlers
  const btnCatHuman = document.getElementById('btnCatHuman');
  const btnCatAnimal = document.getElementById('btnCatAnimal');

  if (btnCatHuman && btnCatAnimal) {
    btnCatHuman.addEventListener('click', () => {
      if (currentLocalCategory === 'human') return;
      currentLocalCategory = 'human';
      btnCatHuman.classList.add('active');
      btnCatAnimal.classList.remove('active');
      renderLocalList();
    });

    btnCatAnimal.addEventListener('click', () => {
      if (currentLocalCategory === 'animal') return;
      currentLocalCategory = 'animal';
      btnCatAnimal.classList.add('active');
      btnCatHuman.classList.remove('active');
      renderLocalList();
    });
  }

  // Load initial sample automatically
  const initialUrl = getRedirectedUrl('models/Atlas_CT_12025abab5.nrrd');
  viewer.loadDataset(initialUrl);

  // Fullscreen/Maximize button logic
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const appContainer = document.querySelector('.app-container');

  if (fullscreenBtn && appContainer) {
    const toggleFullscreen = () => {
      if (!document.fullscreenElement && 
          !document.webkitFullscreenElement && 
          !document.msFullscreenElement) {
        // Request fullscreen
        const reqFS = appContainer.requestFullscreen || 
                      appContainer.webkitRequestFullscreen || 
                      appContainer.msRequestFullscreen;
        if (reqFS) {
          reqFS.call(appContainer).catch(err => {
            console.error('Failed to enter fullscreen:', err);
          });
        }
      } else {
        // Exit fullscreen
        const exitFS = document.exitFullscreen || 
                       document.webkitExitFullscreen || 
                       document.msExitFullscreen;
        if (exitFS) {
          exitFS.call(document);
        }
      }
    };

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    const updateFullscreenButton = () => {
      const isFS = !!(document.fullscreenElement || 
                      document.webkitFullscreenElement || 
                      document.msFullscreenElement);
      fullscreenBtn.classList.toggle('active', isFS);
      
      // Update SVG icon inside the button depending on state
      if (isFS) {
        fullscreenBtn.innerHTML = `<svg class="fs-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>`;
      } else {
        fullscreenBtn.innerHTML = `<svg class="fs-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
      }
    };

    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('msfullscreenchange', updateFullscreenButton);
  }

  // Sketch Conversion & Export Logic
  const convertToSketchBtn = document.getElementById('convertToSketchBtn');
  const exportSketchBtn = document.getElementById('exportSketchBtn');
  const sketchOverlayCanvas = document.getElementById('sketchOverlayCanvas');
  const sketchStyleSelect = document.getElementById('sketchStyleSelect');
  
  let currentSketchDataUrl = null;

  // Configuration for interactive sketch styles
  const SKETCH_STYLES = {
    clay: {
      blurRadius: 1,
      sobelThreshold: 999,  // No lines at all
      sobelMultiplier: 0,
      maxLineStrength: 0,
      shadowThreshold: 200, // Reduced from 220 to accentuate whites
      shadowMinVal: 45,     // Deeper, higher contrast shadows (was 60)
      shadowPower: 1.2,     // High contrast falloff (was 1.1)
      baseColor: '#ffffff', // Pure white base color for glowing highlights (was #e2e2e2)
      graphiteMin: 15,
      graphiteMax: 255,
      tint: null,
      useSilhouette: false
    },
    clayOutlines: {
      blurRadius: 1,        // Finer blur makes outlines thinner/sharper
      sobelThreshold: 65.0, // High threshold to ignore all minor internal textures/noise
      sobelMultiplier: 6.0,  // Softer outline contrast
      maxLineStrength: 150,
      shadowThreshold: 60,  // Only shade the deepest crevices, keeping muscle surfaces white
      shadowMinVal: 195,    // Very soft and light crevice shadows
      shadowPower: 1.5,
      baseColor: '#ffffff', // Pure white base color
      graphiteMin: 85,      // Softer graphite pencil gray (was 15)
      graphiteMax: 255,
      tint: null,
      useSilhouette: true,  // Draw crisp black outlines on outermost edges
      silhouetteRadius: 1,  // 1-pixel radius for a thin outside outline
      silhouetteValue: 100  // Soft pencil outline instead of solid black ink
    },
    blueprint: {
      blurRadius: 1,
      sobelThreshold: 10.5,
      sobelMultiplier: 8.0,
      maxLineStrength: 200,
      shadowThreshold: 0,
      shadowMinVal: 255,
      shadowPower: 1.0,
      baseColor: '#1a365d', // Deep blue
      graphiteMin: 255,     // Inverse range mapping: lines become white, background blue
      graphiteMax: 0,
      tint: [255, 255, 255],
      isBlueprint: true,
      useSilhouette: true,
      silhouetteRadius: 1
    }
  };

  const showSketchOverlay = () => {
    if (!viewer) return;
    
    const selectedStyleKey = sketchStyleSelect ? sketchStyleSelect.value : 'clay';
    let styleIndex = 0;
    if (selectedStyleKey === 'clay') styleIndex = 0;
    else if (selectedStyleKey === 'clayOutlines') styleIndex = 1;
    else if (selectedStyleKey === 'blueprint') styleIndex = 2;
    
    viewer.postProcessingStyle = selectedStyleKey;
    if (viewer.postMaterial) {
      viewer.postMaterial.uniforms.uStyle.value = styleIndex;
    }
    viewer.postProcessingEnabled = true;

    if (convertToSketchBtn) {
      convertToSketchBtn.innerText = "Revert to 3D View";
      convertToSketchBtn.classList.add('active-sketch');
    }
    
    // Show sketch style dropdown selector
    const sketchStyleGroup = document.querySelector('.sketch-style-group');
    if (sketchStyleGroup) sketchStyleGroup.style.display = 'flex';
    
    if (exportSketchBtn) {
      exportSketchBtn.disabled = false;
      exportSketchBtn.style.opacity = '1.0';
      exportSketchBtn.style.cursor = 'pointer';
      exportSketchBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.4)';
    }
  };

  hideSketchOverlay = () => {
    if (viewer) {
      viewer.postProcessingEnabled = false;
    }
    
    if (convertToSketchBtn) {
      convertToSketchBtn.innerText = "Convert to Sketch";
      convertToSketchBtn.classList.remove('active-sketch');
    }
    
    // Hide sketch style dropdown selector
    const sketchStyleGroup = document.querySelector('.sketch-style-group');
    if (sketchStyleGroup) sketchStyleGroup.style.display = 'none';
    
    if (exportSketchBtn) {
      exportSketchBtn.disabled = true;
      exportSketchBtn.style.opacity = '0.5';
      exportSketchBtn.style.cursor = 'not-allowed';
      exportSketchBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
    }
    
    if (sketchOverlayCanvas) {
      sketchOverlayCanvas.style.display = 'none';
    }
  };

  const generateSketch = () => {
    showSketchOverlay();
  };

  if (convertToSketchBtn) {
    convertToSketchBtn.addEventListener('click', () => {
      if (viewer && viewer.postProcessingEnabled) {
        restoreThreeCanvas();
      } else {
        generateSketch();
      }
    });
  }

  if (sketchStyleSelect) {
    sketchStyleSelect.addEventListener('change', () => {
      if (viewer && viewer.postProcessingEnabled) {
        showSketchOverlay();
      }
    });
  }

  if (exportSketchBtn) {
    exportSketchBtn.addEventListener('click', () => {
      if (viewer) {
        // Force a render pass to populate the drawing buffer
        if (viewer.postProcessingEnabled) {
          viewer.renderer.setRenderTarget(viewer.renderTarget);
          viewer.renderer.render(viewer.scene, viewer.camera);
          viewer.renderer.setRenderTarget(null);
          viewer.postMaterial.uniforms.tDiffuse.value = viewer.renderTarget.texture;
          viewer.renderer.render(viewer.postScene, viewer.postCamera);
        } else {
          viewer.renderer.render(viewer.scene, viewer.camera);
        }
      }
      const dataUrl = viewer.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `anatomy_sketch_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    });
  }
});
