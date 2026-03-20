const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = [...document.querySelectorAll("section[id]")];
const header = document.getElementById("header");
const progressBar = document.getElementById("page-progress");
const currentYear = document.getElementById("current-year");
const revealElements = [...document.querySelectorAll("[data-reveal]")];
const counterElements = [...document.querySelectorAll("[data-count]")];
const sceneElements = [...document.querySelectorAll("[data-scene]")];
const driftElements = [...document.querySelectorAll("[data-depth]")];
const tiltElements = [...document.querySelectorAll("[data-tilt]")];
const buttonElements = [...document.querySelectorAll(".button, .nav__button")];
const worldCanvas = document.getElementById("world-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pointer = { x: 0, y: 0 };
let frameRequested = false;
let activeSceneIndex = 0;

class SpringValue {
  constructor(value, stiffness = 140, damping = 18) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target) {
    this.target = target;
  }

  update(delta) {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force * delta;
    this.velocity *= Math.exp(-this.damping * delta);
    this.value += this.velocity * delta;
  }
}

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("show");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu?.classList.remove("show");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateActiveLink = () => {
  const scrollY = window.scrollY + 160;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute("id");
    const link = document.querySelector(`.nav__link[href="#${id}"]`);

    if (!link) return;

    if (scrollY >= top && scrollY < top + height) {
      link.classList.add("active-link");
    } else {
      link.classList.remove("active-link");
    }
  });
};

const updateHeaderState = () => {
  header?.classList.toggle("scroll-header", window.scrollY > 24);
};

const updateProgressBar = () => {
  if (!progressBar) return;

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.transform = `scaleX(${clamp(progress, 0, 1)})`;
};

const animateCounter = (element) => {
  const target = Number(element.dataset.count);

  if (!target || Number.isNaN(target) || element.dataset.animated === "true") {
    return;
  }

  element.dataset.animated = "true";

  if (reduceMotion) {
    element.textContent = target.toString();
    return;
  }

  const duration = 1400;
  const start = performance.now();

  const tick = (time) => {
    const progress = clamp((time - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toString();

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = target.toString();
    }
  };

  requestAnimationFrame(tick);
};

const updateScenes = () => {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  sceneElements.forEach((scene, index) => {
    const rect = scene.getBoundingClientRect();
    const progress = clamp(
      (window.innerHeight - rect.top) / (window.innerHeight + rect.height),
      0,
      1
    );
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(window.innerHeight / 2 - center);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }

    scene.style.setProperty("--scene-progress", progress.toFixed(3));
    scene.classList.toggle(
      "scene--active",
      rect.top < window.innerHeight * 0.58 && rect.bottom > window.innerHeight * 0.42
    );
  });

  activeSceneIndex = closestIndex;
};

const updateDriftElements = () => {
  if (reduceMotion) return;

  driftElements.forEach((element) => {
    const depth = Number(element.dataset.depth || 0.12);
    const parentScene = element.closest("[data-scene]");
    const sceneRect = parentScene?.getBoundingClientRect();
    const sceneOffset = sceneRect
      ? (window.innerHeight / 2 - (sceneRect.top + sceneRect.height / 2)) / window.innerHeight
      : 0;

    const x = pointer.x * depth * 90;
    const y = pointer.y * depth * 70 + sceneOffset * depth * 140;
    const rotate = pointer.x * depth * 24;

    element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
  });
};

const enableTilt = () => {
  if (reduceMotion || window.innerWidth < 960) return;

  tiltElements.forEach((element) => {
    element.classList.add("panel3d");

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const tiltX = (0.5 - py) * 8;
      const tiltY = (px - 0.5) * 10;

      element.style.setProperty("--tilt-x", `${tiltX}deg`);
      element.style.setProperty("--tilt-y", `${tiltY}deg`);
      element.style.setProperty("--lift-y", "-8px");
      element.style.setProperty("--spotlight-x", `${px * 100}%`);
      element.style.setProperty("--spotlight-y", `${py * 100}%`);
    });

    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      element.style.setProperty("--lift-y", "0px");
      element.style.setProperty("--spotlight-x", "50%");
      element.style.setProperty("--spotlight-y", "50%");
    });
  });
};

const enableMagneticButtons = () => {
  if (reduceMotion || window.innerWidth < 960) return;

  buttonElements.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      button.style.setProperty("--mag-x", `${px * 12}px`);
      button.style.setProperty("--mag-y", `${py * 10}px`);
    });

    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--mag-x", "0px");
      button.style.setProperty("--mag-y", "0px");
    });
  });
};

revealElements.forEach((element) => {
  const delay = element.dataset.revealDelay;

  if (delay) {
    element.style.setProperty("--reveal-delay", `${delay}s`);
  }
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");

        if (entry.target.hasAttribute("data-count")) {
          animateCounter(entry.target);
        }

        const nestedCounters = entry.target.querySelectorAll?.("[data-count]");
        nestedCounters?.forEach((counter) => animateCounter(counter));

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealElements.forEach((element) => observer.observe(element));
  counterElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
  counterElements.forEach((element) => animateCounter(element));
}

const requestSceneUpdate = () => {
  if (frameRequested) return;

  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    updateProgressBar();
    updateHeaderState();
    updateActiveLink();
    updateScenes();
    updateDriftElements();
  });
};

window.addEventListener("scroll", requestSceneUpdate, { passive: true });
window.addEventListener("resize", requestSceneUpdate);

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / window.innerWidth - 0.5;
  pointer.y = event.clientY / window.innerHeight - 0.5;
  document.documentElement.style.setProperty("--pointer-x", pointer.x.toFixed(4));
  document.documentElement.style.setProperty("--pointer-y", pointer.y.toFixed(4));
  requestSceneUpdate();
});

const initWorld = async () => {
  if (!worldCanvas || reduceMotion) return;

  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: worldCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040814, 0.085);

    const camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      80
    );
    camera.position.set(0, 1.15, 11.2);

    const world = new THREE.Group();
    scene.add(world);

    const ambient = new THREE.AmbientLight(0xa7d6ff, 1.35);
    const rim = new THREE.PointLight(0x67d5ff, 24, 40, 2);
    rim.position.set(-4, 6, 8);
    const fill = new THREE.PointLight(0x7f6bff, 20, 40, 2);
    fill.position.set(6, 3, 10);
    const warm = new THREE.PointLight(0xffb36b, 10, 32, 2);
    warm.position.set(0, -2, 6);

    scene.add(ambient, rim, fill, warm);

    const gridGroup = new THREE.Group();
    const tileGeometry = new THREE.BoxGeometry(1.15, 0.08, 1.15);
    const tileMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e1630,
      emissive: 0x143454,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.4,
    });

    const tiles = [];
    for (let x = -4; x <= 4; x += 1) {
      for (let z = -4; z <= 4; z += 1) {
        if ((x + z) % 2 === 0) continue;

        const tile = new THREE.Mesh(tileGeometry, tileMaterial.clone());
        tile.position.set(x * 1.35, -2.1, z * 1.35);
        tile.userData.baseY = tile.position.y;
        tile.userData.phase = Math.random() * Math.PI * 2;
        tile.userData.row = z;
        gridGroup.add(tile);
        tiles.push(tile);
      }
    }
    world.add(gridGroup);

    const barGroup = new THREE.Group();
    const bars = [];
    const barGeometry = new THREE.BoxGeometry(0.36, 2.4, 0.36);
    for (let i = 0; i < 24; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1f2b52 : 0x15203f,
        emissive: i % 2 === 0 ? 0x1d5e8d : 0x2d2f78,
        emissiveIntensity: 0.24,
        roughness: 0.3,
        metalness: 0.45,
      });
      const bar = new THREE.Mesh(barGeometry, material);
      const angle = (i / 24) * Math.PI * 2;
      const radius = 4.8 + (i % 3) * 0.85;

      bar.position.set(Math.cos(angle) * radius, -0.6 + (i % 4) * 0.4, Math.sin(angle) * radius);
      bar.rotation.y = angle;
      bar.userData.baseY = bar.position.y;
      bar.userData.phase = Math.random() * Math.PI * 2;
      barGroup.add(bar);
      bars.push(bar);
    }
    world.add(barGroup);

    const rings = [];
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.8 + i * 1.25, 0.035, 16, 150),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0x7f6bff : 0x67d5ff,
          transparent: true,
          opacity: i === 1 ? 0.18 : 0.12,
        })
      );

      ring.rotation.x = Math.PI / 2.8 + i * 0.12;
      ring.rotation.z = i * 0.55;
      ring.position.y = -1.35 + i * 0.35;
      world.add(ring);
      rings.push(ring);
    }

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 700;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i += 1) {
      const i3 = i * 3;
      starPositions[i3] = (Math.random() - 0.5) * 34;
      starPositions[i3 + 1] = Math.random() * 16 - 4;
      starPositions[i3 + 2] = (Math.random() - 0.5) * 34;
      starSizes[i] = Math.random() * 1.4 + 0.6;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xd8f7ff,
        size: 0.05,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    scene.add(stars);

    const landmarkPalette = [0x67d5ff, 0x7f6bff, 0x7bffd8, 0xffb36b, 0x9fe7ff, 0xc8a8ff];
    const landmarkGroup = new THREE.Group();
    const landmarks = [];

    const createLandmark = (index, x, y, z) => {
      const hue = landmarkPalette[index % landmarkPalette.length];
      const root = new THREE.Group();
      root.position.set(x, y, z);
      root.userData.phase = Math.random() * Math.PI * 2;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.52, 0.2, 6),
        new THREE.MeshStandardMaterial({
          color: 0x111a32,
          emissive: hue,
          emissiveIntensity: 0.16,
          roughness: 0.3,
          metalness: 0.65,
        })
      );
      base.position.y = -0.65;
      root.add(base);

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.44, 0),
        new THREE.MeshStandardMaterial({
          color: 0xeaf7ff,
          emissive: hue,
          emissiveIntensity: 0.58,
          roughness: 0.18,
          metalness: 0.1,
        })
      );
      root.add(core);

      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.02, 14, 80),
        new THREE.MeshBasicMaterial({
          color: hue,
          transparent: true,
          opacity: 0.38,
        })
      );
      orbit.rotation.x = Math.PI / 2.2;
      root.add(orbit);

      root.userData.baseY = y;
      root.userData.baseScale = 1;
      root.userData.core = core;
      root.userData.orbit = orbit;
      root.userData.glow = new SpringValue(0.42, 90, 12);
      root.userData.targetGlow = 0.42;
      root.userData.index = index;

      landmarkGroup.add(root);
      landmarks.push(root);
    };

    createLandmark(0, -2.8, -0.1, 1.8);
    createLandmark(1, 2.7, 0.35, 0.6);
    createLandmark(2, -3.2, 0.25, -2.3);
    createLandmark(3, 0.4, 1.25, -3.4);
    createLandmark(4, 3.5, -0.1, -2.1);
    createLandmark(5, 0.2, 0.2, 3.6);
    world.add(landmarkGroup);

    const sceneTargets = [
      { camX: 0, camY: 1.15, camZ: 11.2, rotX: 0.05, rotY: -0.18, focus: 0 },
      { camX: -0.9, camY: 1.45, camZ: 10.4, rotX: 0.12, rotY: 0.34, focus: 1 },
      { camX: 1.35, camY: 1.05, camZ: 10.1, rotX: -0.02, rotY: 0.92, focus: 2 },
      { camX: -1.2, camY: 0.95, camZ: 9.8, rotX: 0.08, rotY: 1.64, focus: 3 },
      { camX: 1.4, camY: 1.05, camZ: 10.2, rotX: -0.04, rotY: 2.16, focus: 4 },
      { camX: 0.1, camY: 1.1, camZ: 10.9, rotX: 0.05, rotY: 2.72, focus: 5 },
    ];

    const camX = new SpringValue(sceneTargets[0].camX, 60, 10);
    const camY = new SpringValue(sceneTargets[0].camY, 60, 10);
    const camZ = new SpringValue(sceneTargets[0].camZ, 60, 10);
    const rotX = new SpringValue(sceneTargets[0].rotX, 42, 11);
    const rotY = new SpringValue(sceneTargets[0].rotY, 42, 11);

    const raycaster = new THREE.Raycaster();
    const ndcPointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let hoveredLandmark = null;
    let worldRunning = true;

    const updateWorldTargets = () => {
      const target = sceneTargets[clamp(activeSceneIndex, 0, sceneTargets.length - 1)];

      camX.setTarget(target.camX);
      camY.setTarget(target.camY);
      camZ.setTarget(target.camZ);
      rotX.setTarget(target.rotX);
      rotY.setTarget(target.rotY);

      landmarks.forEach((landmark, index) => {
        const isFocused = index === target.focus;
        landmark.userData.targetGlow = isFocused ? 1 : 0.42;
      });
    };

    const resizeWorld = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    const updateRaycast = () => {
      ndcPointer.set(pointer.x * 2, -pointer.y * 2);
      raycaster.setFromCamera(ndcPointer, camera);

      const intersects = raycaster.intersectObjects(
        landmarks.map((landmark) => landmark.userData.core),
        false
      );

      hoveredLandmark = intersects[0]?.object ?? null;
    };

    const animateWorld = () => {
      if (!worldRunning) return;

      const delta = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.elapsedTime;

      updateWorldTargets();
      updateRaycast();

      camX.update(delta);
      camY.update(delta);
      camZ.update(delta);
      rotX.update(delta);
      rotY.update(delta);

      camera.position.set(
        camX.value + pointer.x * 0.95,
        camY.value - pointer.y * 0.8,
        camZ.value
      );
      camera.lookAt(pointer.x * 1.2, 0.4 + pointer.y * 0.45, 0);

      world.rotation.x = rotX.value + pointer.y * 0.08;
      world.rotation.y = rotY.value + pointer.x * 0.12;

      gridGroup.position.x = pointer.x * 1.1;
      gridGroup.position.z = pointer.y * 0.8;

      tiles.forEach((tile, index) => {
        tile.position.y =
          tile.userData.baseY +
          Math.sin(elapsed * 1.5 + tile.userData.phase + index * 0.08) * 0.05;
        tile.material.emissiveIntensity =
          0.26 + Math.sin(elapsed * 2 + tile.userData.row * 0.8) * 0.08;
      });

      bars.forEach((bar, index) => {
        bar.position.y =
          bar.userData.baseY + Math.sin(elapsed * 1.1 + bar.userData.phase + index * 0.2) * 0.16;
        bar.rotation.y += delta * 0.08;
      });

      rings.forEach((ring, index) => {
        ring.rotation.z += delta * (0.12 + index * 0.04);
        ring.rotation.y += delta * (0.05 + index * 0.02);
      });

      stars.rotation.y += delta * 0.014;
      stars.rotation.x = pointer.y * 0.04;

      landmarks.forEach((landmark) => {
        const core = landmark.userData.core;
        const orbit = landmark.userData.orbit;
        const isHovered = hoveredLandmark === core;

        landmark.userData.glow.setTarget(
          landmark.userData.targetGlow + (isHovered ? 0.85 : 0)
        );
        landmark.userData.glow.update(delta);

        landmark.position.y =
          landmark.userData.baseY + Math.sin(elapsed * 1.6 + landmark.userData.phase) * 0.18;
        landmark.rotation.y += delta * 0.2;
        orbit.rotation.z += delta * (0.8 + landmark.userData.index * 0.03);

        const glow = landmark.userData.glow.value;
        const scale = 1 + glow * 0.16;

        landmark.scale.setScalar(scale);
        core.material.emissiveIntensity = 0.4 + glow * 0.65;
        orbit.material.opacity = 0.16 + glow * 0.24;
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animateWorld);
    };

    document.addEventListener("visibilitychange", () => {
      worldRunning = !document.hidden;
      if (worldRunning) {
        clock.getDelta();
        requestAnimationFrame(animateWorld);
      }
    });

    window.addEventListener("resize", resizeWorld);
    resizeWorld();
    animateWorld();
  } catch (error) {
    console.warn("3D world scene could not be initialized.", error);
  }
};

window.addEventListener("load", () => {
  enableTilt();
  enableMagneticButtons();
  requestSceneUpdate();
  initWorld();
});

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
