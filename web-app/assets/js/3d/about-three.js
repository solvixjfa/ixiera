// assets/js/3d/three-about.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

class IxieraStory {
  constructor() {
    this.isMobile = window.innerWidth < 768;
    
    // Cek compatibility simple
    if (!this.checkCompatibility()) {
      this.activateFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = null;
    this.elements = [];
    this.particles = [];
    
    this.init();
    this.animate();
  }

  checkCompatibility() {
    // Simple compatibility check
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  activateFallback() {
    console.log('Three.js About: Fallback ke background image');
    const canvas = document.getElementById('three-about-canvas');
    const fallbackBg = document.getElementById('about-fallback-bg');
    
    // Sembunyikan Three.js
    if (canvas) canvas.style.display = 'none';
    
    // Tampilkan fallback background
    if (fallbackBg) fallbackBg.style.display = 'block';
  }

  init() {
    const canvas = document.getElementById('three-about-canvas');
    if (!canvas) {
      this.activateFallback();
      return;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: !this.isMobile
      });
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.5));

      this.camera.position.z = this.isMobile ? 25 : 35;

      // Optimized lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0x4fc3f7, 0.6);
      directionalLight.position.set(5, 5, 15);
      this.scene.add(directionalLight);

      // Create story elements
      this.createFloatingIcons();
      this.createParticleBackground();
      
      window.addEventListener('resize', () => this.onWindowResize());

    } catch (error) {
      console.log('Three.js About error:', error);
      this.activateFallback();
    }
  }

  createFloatingIcons() {
    // Simple geometric shapes instead of complex ones
    const icons = [
      { shape: 'cube', color: 0xff6b6b, position: [-6, 2, 0], size: 1.2 },
      { shape: 'pyramid', color: 0x4fc3f7, position: [0, 4, 0], size: 1.3 },
      { shape: 'ring', color: 0x00ff88, position: [6, 1, 0], size: 1.1 },
      { shape: 'diamond', color: 0xffd700, position: [-4, -3, 0], size: 1.2 },
      { shape: 'sphere', color: 0xab47bc, position: [4, -2, 0], size: 1.1 }
    ];

    icons.forEach((icon, index) => {
      let geometry;

      switch(icon.shape) {
        case 'cube':
          geometry = new THREE.BoxGeometry(icon.size, icon.size, icon.size);
          break;
        case 'pyramid':
          geometry = new THREE.ConeGeometry(icon.size, icon.size * 2, 4);
          break;
        case 'ring':
          geometry = new THREE.TorusGeometry(icon.size, 0.3, 8, 12);
          break;
        case 'diamond':
          geometry = new THREE.OctahedronGeometry(icon.size);
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(icon.size, 8, 6);
          break;
      }

      const material = new THREE.MeshPhongMaterial({
        color: icon.color,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(icon.position[0], icon.position[1], icon.position[2]);
      
      mesh.userData = {
        originalY: icon.position[1],
        speed: 0.2 + Math.random() * 0.3,
        rotationSpeed: 0.003 + Math.random() * 0.007,
        floatHeight: 0.5 + Math.random() * 0.3
      };

      this.scene.add(mesh);
      this.elements.push(mesh);
    });

    // Simple connection dots instead of complex tubes
    this.createConnectionDots();
  }

  createConnectionDots() {
    // Create simple dots that move between elements
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.6
      });

      const dot = new THREE.Mesh(geometry, material);
      
      dot.userData = {
        progress: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        startElement: Math.floor(Math.random() * this.elements.length),
        endElement: Math.floor(Math.random() * this.elements.length)
      };

      this.scene.add(dot);
      this.particles.push(dot);
    }
  }

  createParticleBackground() {
    // Lightweight particle system
    const particleCount = this.isMobile ? 30 : 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 40;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x4fc3f7,
      size: 0.3,
      transparent: true,
      opacity: 0.4
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene.add(particleSystem);
    this.particleSystem = particleSystem;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Animate floating icons
    this.elements.forEach((element) => {
      const data = element.userData;
      
      // Floating animation
      element.position.y = data.originalY + Math.sin(time + data.speed) * data.floatHeight;
      
      // Rotation
      element.rotation.y += data.rotationSpeed;
      element.rotation.x += data.rotationSpeed * 0.7;
      
      // Subtle pulse
      const pulse = 0.95 + Math.sin(time * 2 + data.speed) * 0.05;
      element.scale.set(pulse, pulse, pulse);
    });

    // Animate connection dots
    this.particles.forEach((particle) => {
      const data = particle.userData;
      data.progress += data.speed;
      
      if (data.progress > Math.PI * 2) data.progress = 0;
      
      const startElement = this.elements[data.startElement];
      const endElement = this.elements[data.endElement];
      
      if (startElement && endElement) {
        const progress = (Math.sin(data.progress) + 1) / 2; // 0 to 1
        particle.position.lerpVectors(
          startElement.position,
          endElement.position,
          progress
        );
      }
    });

    // Slow scene rotation
    this.scene.rotation.y += 0.0003;

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Auto initialize
document.addEventListener('DOMContentLoaded', () => {
  new IxieraStory();
});