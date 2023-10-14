const canvasOriginal = document.getElementById('image-canvas-original');
const ctx = canvasOriginal.getContext('2d');
const canvasWebGL = document.getElementById('image-canvas-webgl'); // Nouveau canvas pour WebGL
let currentImage = null; // Pour stocker l'image actuellement affichée
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const THREE = require('three');
let directoryPath = null;
const LUT3dlLoader = require('./LUT3dlLoader.js');
const LUTCubeLoader = require('./LUTCubeLoader.js');
const LUTShader = require('./LUTShader.js');


document.getElementById('image-input').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        currentImage = img; // Stocker l'image pour un redimensionnement ultérieur
        initThreeJS();
        resizeAndDrawImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Fonction pour redimensionner et dessiner l'image
let renderer, scene, camera, texture, material, mesh;

function initThreeJS() {
    // Initialisation du rendu WebGL
    renderer = new THREE.WebGLRenderer({ canvas: canvasWebGL });
    renderer.setSize(canvasWebGL.width, canvasWebGL.height);

    // Initialisation de la scène
    scene = new THREE.Scene();

    // Initialisation de la caméra
    camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 1000);
    camera.position.z = 2;
    scene.add(camera);

    // Initialisation de la texture
    texture = new THREE.Texture(currentImage);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    texture.encoding = THREE.sRGBEncoding;

    // Initialisation du matériau
    material = new THREE.MeshBasicMaterial({ map: texture });

    // Initialisation du maillage
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(mesh);
}

function renderThreeJS() {
    renderer.render(scene, camera);
}

function resizeAndDrawImage(img) {
  // Calcul du rapport d'aspect pour redimensionner l'image
  const maxWidth = document.getElementById('image-container').offsetWidth - 20; // -20 pour le padding
  const scaleFactor = maxWidth / img.width;
  const resizedWidth = img.width * scaleFactor;
  const resizedHeight = img.height * scaleFactor;

  // Dessinez l'image originale sur le canvas 2D
  canvasOriginal.width = resizedWidth;
  canvasOriginal.height = resizedHeight;
  renderer.setSize(resizedWidth, resizedHeight);

  // Mise à jour de la texture et du rendu WebGL
  if (texture) {
    texture.needsUpdate = true;
    renderThreeJS();
  }
}

let isResizing = false;

document.getElementById('separator').addEventListener('mousedown', function(event) {
	isResizing = true;
	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', stopResizing);
	event.preventDefault(); // Empêche le comportement par défaut
  });
  
  function handleMouseMove(event) {
	if (!isResizing) return;
	const container = document.getElementById('container');
	const leftWidth = event.clientX - container.offsetLeft;
	const rightWidth = container.offsetWidth - leftWidth - 5; // 5 est la largeur du séparateur
	document.getElementById('image-container').style.width = `${leftWidth}px`;
	document.getElementById('lut-container').style.width = `${rightWidth}px`;
	if (currentImage) {
	  resizeAndDrawImage(currentImage); // Redimensionnez l'image si nécessaire
	}
	event.preventDefault(); // Empêche le comportement par défaut
  }
  
  function stopResizing() {
	isResizing = false;
	document.removeEventListener('mousemove', handleMouseMove);
	document.removeEventListener('mouseup', stopResizing);
  }

  document.getElementById('select-directory').addEventListener('click', function() {
    ipcRenderer.send('open-directory-dialog');
});

function listFilesInDirectory(directory, parentElement) {
  fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
      if (err) {
          console.error("Erreur lors de la lecture du dossier:", err);
          return;
      }

      entries.forEach(entry => {
          if (entry.isDirectory()) {
              const folderItem = document.createElement('li');
              folderItem.textContent = `>${entry.name}`;
              folderItem.style.cursor = 'pointer'; // Changez le curseur pour indiquer que c'est cliquable

              // Créer un nouvel élément de liste pour le contenu du dossier
              const subList = document.createElement('ul');
              subList.style.display = 'none'; // Cachez initialement le contenu du dossier

              folderItem.addEventListener('click', function() {
                  // Toggle (alterner) la visibilité du sous-dossier
                  if (subList.style.display === 'none') {
                      subList.style.display = 'block';
                  } else {
                      subList.style.display = 'none';
                  }
              });

              parentElement.appendChild(folderItem);
              parentElement.appendChild(subList);

              // Récursion pour lister le contenu du sous-dossier
              listFilesInDirectory(path.join(directory, entry.name), subList);
          } else if (entry.name.endsWith('.cube')) {
              const fileItem = document.createElement('li');
              fileItem.textContent = entry.name;
              parentElement.appendChild(fileItem);
          }
      });
  });
}

ipcRenderer.on('selected-directory', (event, path) => {
  directoryPath = path;
  console.log(`Selected directory: ${directoryPath}`);
  
  // Vider la liste actuelle
  const lutList = document.getElementById('lut-list');
  lutList.innerHTML = '';

  // Lister les fichiers dans le dossier sélectionné
  listFilesInDirectory(directoryPath, lutList);
});

const lutShader = {
  uniforms: {
      tDiffuse: { type: 't', value: null },
      lutMap: { type: 't', value: null },
      lutSize: { type: 'f', value: 0 }
  },
  vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D lutMap;
      uniform float lutSize;
      varying vec2 vUv;

      vec4 applyLUT( vec4 color ) {
          float sliceSize = 1.0 / lutSize;
          float slicePixelSize = sliceSize / lutSize;
          float width = lutSize - 1.0;
          float sliceInnerSize = slicePixelSize * width;
          float zSlice0 = min(floor(color.b * width), width - 1.0);
          float zSlice1 = min(zSlice0 + 1.0, width);
          float xOffset = slicePixelSize * 0.5 + color.r * sliceInnerSize;
          float s0 = xOffset + (zSlice0 * sliceSize);
          float s1 = xOffset + (zSlice1 * sliceSize);
          vec4 slice0Color = texture2D(lutMap, vec2(s0, color.g * sliceInnerSize + slicePixelSize * 0.5));
          vec4 slice1Color = texture2D(lutMap, vec2(s1, color.g * sliceInnerSize + slicePixelSize * 0.5));
          float zOffset = mod(color.b * width, 1.0);
          return mix(slice0Color, slice1Color, zOffset);
      }

      void main() {
          vec4 originalColor = texture2D(tDiffuse, vUv);
          gl_FragColor = applyLUT(originalColor);
      }
  `
};

document.getElementById('lut-list').addEventListener('click', function(event) {
  event.stopPropagation();
  const lutFileName = event.target.textContent;
  const lutFilePath = path.resolve(directoryPath, lutFileName);

  // Déterminez le type de fichier LUT et utilisez le chargeur approprié
  let loader;
  if (lutFileName.endsWith('.3dl')) {
    loader = new LUT3dlLoader();
  } else if (lutFileName.endsWith('.cube')) {
    loader = new LUTCubeLoader();
  } else {
    console.error("Format de fichier LUT non pris en charge.");
    return;
  }

  loader.load(lutFilePath, function(lutTexture) {
    const lutMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        lutMap: { value: lutTexture },
        lutSize: { value: 16 } // Vous devrez peut-être ajuster cette valeur en fonction de la taille de votre LUT
      },
      vertexShader: LUTShader.vertexShader,
      fragmentShader: LUTShader.fragmentShader
    });

    mesh.material = lutMaterial;
    renderThreeJS();
  });
});


