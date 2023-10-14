const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');
let currentImage = null; // Pour stocker l'image actuellement affichée
const { ipcRenderer } = require('electron');

document.getElementById('image-input').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        currentImage = img; // Stocker l'image pour un redimensionnement ultérieur
        resizeAndDrawImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Fonction pour redimensionner et dessiner l'image
function resizeAndDrawImage(img) {
  // Calcul du rapport d'aspect pour redimensionner l'image
  const maxWidth = document.getElementById('image-container').offsetWidth - 20; // -20 pour le padding
  const scaleFactor = maxWidth / img.width;
  const resizedWidth = img.width * scaleFactor;
  const resizedHeight = img.height * scaleFactor;

  canvas.width = resizedWidth;
  canvas.height = resizedHeight;
  ctx.drawImage(img, 0, 0, resizedWidth, resizedHeight);
}

// Écouteur d'événements pour le redimensionnement de la fenêtre
window.addEventListener('resize', function() {
  if (currentImage) {
    resizeAndDrawImage(currentImage);
  }
});

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

ipcRenderer.on('selected-directory', (event, path) => {
    console.log(`Selected directory: ${path}`);
    // Ici, vous pouvez traiter le chemin du dossier sélectionné
});
