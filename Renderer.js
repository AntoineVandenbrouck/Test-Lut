<!DOCTYPE html>
<html>
<head>
  <title>Lut Explorer</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    #container {
      display: flex;
      justify-content: space-between;
      height: 80vh;
    }

    #image-container {
      width: 50%;
      border: 1px solid black;
      padding: 10px;
    }

    #lut-container {
      width: 45%;
      border: 1px solid black;
      padding: 10px;
      overflow-y: scroll;
    }

    #lut-list {
      list-style-type: none;
      padding: 0;
    }

    #lut-list li {
      margin: 10px 0;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Welcome to Lut Explorer!</h1>
  <div id="container">
    <div id="image-container">
      <input type="file" id="image-input" accept="image/*">
      <canvas id="image-canvas"></canvas>
    </div>
    <div id="lut-container">
      <ul id="lut-list"></ul>
    </div>
  </div>
</body>
</html>