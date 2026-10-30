// advanced.js - extra features for the home page (needs JavaScript).
// If you ever want to remove them: delete the <script> line at the bottom of index.html.

// ---------- 1. Countdown to the next event ----------
// the next upcoming event, read from the events list that app.js saved
const list = JSON.parse(localStorage.getItem("eventnest-events")) || [];
const next = list.map(e => new Date(e.date + "T" + e.time)).filter(d => d > new Date()).sort((a, b) => a - b)[0];
const fest = next || new Date();
const out = document.getElementById("countdown");

function tick() {
  const ms = fest - new Date();                          // milliseconds left
  if (ms <= 0) { out.textContent = "No upcoming event right now"; return; }
  const days  = Math.floor(ms / 86400000);               // 1 day = 86,400,000 ms
  const hours = Math.floor(ms / 3600000) % 24;
  const mins  = Math.floor(ms / 60000) % 60;
  const secs  = Math.floor(ms / 1000) % 60;
  out.textContent = days + " days  " + hours + " hrs  " + mins + " min  " + secs + " sec";
}
tick();
setInterval(tick, 1000);                                 // repeat every second

// ---------- 2. Real 3D hero with three.js ----------
// If the library or WebGL fails to load, the CSS cube stays as a fallback.
try {
  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
  const box = document.getElementById("hero3d");
  const H = 300;

  const scene = new THREE.Scene();                       // the 3D world
  const camera = new THREE.PerspectiveCamera(50, box.clientWidth / H, 0.1, 100);
  camera.position.z = 4;                                 // move the camera back
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(box.clientWidth, H);

  // A mesh = geometry (shape) + material (look)
  const shape = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1, 0.3, 120, 16),
    new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 0.8, roughness: 0.25 })
  );
  scene.add(shape);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.PointLight(0xffffff, 60);
  light.position.set(3, 3, 5);
  scene.add(light);

  box.innerHTML = "";                                    // remove the CSS cube
  box.appendChild(renderer.domElement);

  let mouse = 0;                                         // -1 (left) to 1 (right)
  box.addEventListener("mousemove", e => { mouse = (e.offsetX / box.clientWidth - 0.5) * 2; });

  function animate() {                                   // runs about 60 times a second
    requestAnimationFrame(animate);
    shape.rotation.y += 0.01 + mouse * 0.03;             // mouse changes the speed
    shape.rotation.x += 0.005;
    renderer.render(scene, camera);
  }
  animate();
} catch (err) {
  console.log("three.js not loaded, showing the CSS cube instead.", err);
}
