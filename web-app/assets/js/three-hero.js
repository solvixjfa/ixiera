import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

class IxieraHero {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.renderer = null;
    this.websiteElements = [];
    this.mouseX = 0;
    this.mouseY = 0;
    
    this.init();
    this.animate();
    this.setupEventListeners();
  }

  init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.position.z = 40;

    // Professional lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4fc3f7, 0.8);
    directionalLight.position.set(30, 30, 50);
    this.scene.add(directionalLight);

    // Create website architecture visualization
    this.createWebsiteArchitecture();
    this.createDataFlow();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createWebsiteArchitecture() {
    const architectureGroup = new THREE.Group();

    // Frontend Layer (Website)
    const frontendGeometry = new THREE.BoxGeometry(12, 8, 1);
    const frontendMaterial = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });
    const frontend = new THREE.Mesh(frontendGeometry, frontendMaterial);
    frontend.position.set(-15, 0, 0);
    frontend.userData = { type: 'frontend' };
    architectureGroup.add(frontend);

    // Backend Layer (Server)
    const backendGeometry = new THREE.CylinderGeometry(4, 4, 6, 8);
    const backendMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8
    });
    const backend = new THREE.Mesh(backendGeometry, backendMaterial);
    backend.position.set(0, 0, 0);
    backend.userData = { type: 'backend' };
    architectureGroup.add(backend);

    // Database Layer
    const databaseGeometry = new THREE.CylinderGeometry(3, 5, 4, 8);
    const databaseMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.8
    });
    const database = new THREE.Mesh(databaseGeometry, databaseMaterial);
    database.position.set(15, 0, 0);
    database.userData = { type: 'database' };
    architectureGroup.add(database);

    // Add labels (simple planes with text)
    this.addLabel(frontend, "WEBSITE", architectureGroup);
    this.addLabel(backend, "SERVER", architectureGroup);
    this.addLabel(database, "DATABASE", architectureGroup);

    this.scene.add(architectureGroup);
    this.architectureGroup = architectureGroup;
  }

  addLabel(mesh, text, group) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const labelGeometry = new THREE.PlaneGeometry(8, 2);
    const label = new THREE.Mesh(labelGeometry, material);
    
    // Position label below the element
    label.position.copy(mesh.position);
    label.position.y = mesh.geometry.parameters.height / 2 + 6;
    
    group.add(label);
  }

  createDataFlow() {
    // Create data flow between elements
    this.dataParticles = [];

    // Frontend -> Backend particles
    this.createFlowParticles(-15, 0, 0, 0, 0.1);
    
    // Backend -> Database particles  
    this.createFlowParticles(0, 0, 15, 0, 0.1);
    
    // Database -> Frontend particles (feedback)
    this.createFlowParticles(15, 0, -15, 0, 0.15);
  }

  createFlowParticles(startX, startY, endX, endY, speed) {
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const material = new THREE.MeshPhongMaterial({
        color: 0x4fc3f7,
        emissive: 0x4fc3f7,
        emissiveIntensity: 0.3
      });

      const particle = new THREE.Mesh(geometry, material);
      
      // Stagger starting positions
      const progress = (i / particleCount) * 2 * Math.PI;
      particle.position.set(
        startX + Math.cos(progress) * 2,
        startY + Math.sin(progress) * 2,
        0
      );

      particle.userData = {
        startX, startY, endX, endY,
        progress: progress,
        speed: speed,
        radius: 2
      };

      this.scene.add(particle);
      this.dataParticles.push(particle);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate architecture slowly
    if (this.architectureGroup) {
      this.architectureGroup.rotation.y += 0.002;
    }

    // Animate data flow particles
    this.dataParticles.forEach(particle => {
      const data = particle.userData;
      data.progress += data.speed;
      
      // Circular motion between points
      const angle = data.progress;
      const radius = data.radius;
      
      particle.position.x = data.startX + (data.endX - data.startX) * (0.5 + 0.5 * Math.sin(angle));
      particle.position.y = data.startY + Math.cos(angle) * radius;
      
      // Pulsing effect
      const scale = 0.8 + Math.sin(data.progress * 2) * 0.2;
      particle.scale.set(scale, scale, scale);
    });

    // Subtle mouse interaction
    this.scene.rotation.y += this.mouseX * 0.0001;
    this.scene.rotation.x += this.mouseY * 0.0001;

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupEventListeners() {
    document.addEventListener('mousemove', (event) => {
      this.mouseX = (event.clientX - window.innerWidth / 2) / 100;
      this.mouseY = (event.clientY - window.innerHeight / 2) / 100;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IxieraHero();
});