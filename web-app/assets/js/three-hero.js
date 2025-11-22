import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

class IxieraHero {
  constructor() {
    console.log('=== IXIERA AGENCY THREE.JS HERO INIT ===');
    
    this.isMobile = window.innerWidth < 768;
    console.log('📱 Mobile detection:', this.isMobile);
    
    // Performance check
    if (!this.checkCompatibility()) {
      this.activateFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = null;
    
    this.techParticles = [];
    this.aiOrbs = [];
    this.dataStreams = [];
    this.connectionNodes = [];
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.animationId = null;
    this.frameCount = 0;
    
    this.currentSettings = this.isMobile ? {
      particleCount: 6,
      orbCount: 3,
      nodeCount: 4,
      resolution: 0.6,
      enableMouse: false,
      quality: 'low'
    } : {
      particleCount: 12,
      orbCount: 5,
      nodeCount: 8,
      resolution: 0.85,
      enableMouse: true,
      quality: 'medium'
    };
    
    console.log('⚙️ Agency Settings:', this.currentSettings);
    
    this.init();
    this.setupEventListeners();
  }

  checkCompatibility() {
    console.log('🔍 Checking WebGL support...');
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        console.log('❌ WebGL not supported');
        return false;
      }
      
      const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      console.log('✅ WebGL supported - Max textures:', maxTextures);
      return true;
      
    } catch (e) {
      console.log('❌ WebGL error:', e.message);
      return false;
    }
  }

  activateFallback() {
    console.log('🔄 Activating fallback...');
    
    const canvas = document.getElementById('three-canvas');
    const fallbackImg = document.getElementById('hero-fallback-bg');
    
    if (canvas) canvas.style.display = 'none';
    if (fallbackImg) fallbackImg.style.display = 'block';
  }

  init() {
    const canvas = document.getElementById('three-canvas');
    console.log('🎯 Initializing agency canvas:', canvas);
    
    if (!canvas) {
      console.log('❌ Canvas not found');
      this.activateFallback();
      return;
    }

    try {
      canvas.style.display = 'block';
      const fallbackImg = document.getElementById('hero-fallback-bg');
      if (fallbackImg) fallbackImg.style.display = 'none';

      this.renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: !this.isMobile,
        powerPreference: 'high-performance',
        precision: this.isMobile ? 'mediump' : 'highp'
      });

      this.renderer.setSize(
        window.innerWidth * this.currentSettings.resolution, 
        window.innerHeight * this.currentSettings.resolution
      );
      
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.2));
      
      // PERBAIKAN: Ganti outputEncoding dengan outputColorSpace
      if (this.renderer.outputColorSpace !== undefined) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      
      this.camera.position.z = this.isMobile ? 20 : 30;
      this.camera.position.y = this.isMobile ? 2 : 4;

      this.setupEnhancedLighting();
      this.createTechParticles();
      this.createAIOrbs();
      this.createConnectionNetwork();
      this.createDataStreams();
      
      if (!this.isMobile) {
        this.createFloatingUIElements();
      }

      window.addEventListener('resize', () => this.onWindowResize());
      
      console.log('✅ Agency Three.js fully initialized');
      this.animate();
      
    } catch (error) {
      console.log('❌ Three.js initialization failed:', error);
      this.activateFallback();
    }
  }

  setupEnhancedLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x4a86e8, 1.2);
    mainLight.position.set(5, 10, 15);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    const aiLight1 = new THREE.PointLight(0x00ffaa, 0.8, 50);
    aiLight1.position.set(-10, 5, -8);
    this.scene.add(aiLight1);

    const aiLight2 = new THREE.PointLight(0x7e57c2, 0.7, 50);
    aiLight2.position.set(12, -3, 10);
    this.scene.add(aiLight2);

    const uiLight = new THREE.PointLight(0xff6b35, 0.6, 40);
    uiLight.position.set(0, 8, -5);
    this.scene.add(uiLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.4, 60);
    fillLight.position.set(0, 0, 20);
    this.scene.add(fillLight);
  }

  createTechParticles() {
    const particleGroup = new THREE.Group();
    
    const colors = [0x4FC3F7, 0x00FF88, 0x7E57C2, 0xFF6B6B, 0x00E5FF, 0xFFD740];
    
    for (let i = 0; i < this.currentSettings.particleCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geometry = new THREE.OctahedronGeometry(size, 0);
      const material = new THREE.MeshPhongMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        emissive: colors[Math.floor(Math.random() * colors.length)],
        emissiveIntensity: 0.3
      });

      const particle = new THREE.Mesh(geometry, material);
      
      const radius = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particle.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta) * 0.5,
        radius * Math.cos(phi)
      );
      
      particle.userData = {
        originalPosition: particle.position.clone(),
        speed: 0.001 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.3 + Math.random() * 1.0,
        rotationSpeed: 0.01 + Math.random() * 0.02
      };
      
      particleGroup.add(particle);
      this.techParticles.push(particle);
    }
    
    this.scene.add(particleGroup);
    this.particleGroup = particleGroup;
    
    console.log('💫 Created', this.techParticles.length, 'tech particles');
  }

  createAIOrbs() {
    const orbGroup = new THREE.Group();
    
    const orbPositions = [
      { x: -6, y: 2, z: -4 },
      { x: 6, y: -1, z: -4 },
      { x: 0, y: 4, z: 0 },
      { x: -4, y: -3, z: 5 },
      { x: 5, y: 3, z: 3 },
      { x: -5, y: 0, z: 6 }
    ].slice(0, this.currentSettings.orbCount);
    
    const orbColors = [0x4FC3F7, 0x00FF88, 0x7E57C2, 0xFF6B6B, 0x00E5FF, 0xFFD740];
    const orbLabels = ['AI', 'Chatbot', 'Management', 'Web App', 'Integration', 'Software'];
    
    orbPositions.forEach((pos, i) => {
      const radius = 1.8 + Math.random() * 0.8;
      const geometry = new THREE.SphereGeometry(radius, 16, 14);
      const material = new THREE.MeshPhongMaterial({
        color: orbColors[i],
        transparent: true,
        opacity: 0.8,
        shininess: 80,
        wireframe: i % 2 === 0,
        emissive: orbColors[i],
        emissiveIntensity: 0.4
      });

      const orb = new THREE.Mesh(geometry, material);
      orb.position.set(pos.x, pos.y, pos.z);
      
      orb.userData = {
        label: orbLabels[i],
        rotationSpeed: 0.003 + Math.random() * 0.008,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        originalScale: 1,
        phase: Math.random() * Math.PI * 2,
        hoverIntensity: 0
      };
      
      orbGroup.add(orb);
      this.aiOrbs.push(orb);
    });
    
    this.scene.add(orbGroup);
    this.orbGroup = orbGroup;
    
    console.log('🔮 Created', this.aiOrbs.length, 'AI service orbs');
  }

  createConnectionNetwork() {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4FC3F7,
      transparent: true,
      opacity: 0.4,
      linewidth: 2
    });
    
    this.aiOrbs.forEach((orb, i) => {
      const nextOrb = this.aiOrbs[(i + 1) % this.aiOrbs.length];
      const geometry = new THREE.BufferGeometry().setFromPoints([
        orb.position,
        nextOrb.position
      ]);
      
      const line = new THREE.Line(geometry, lineMaterial);
      this.scene.add(line);
      this.connectionNodes.push(line);
    });
    
    if (this.aiOrbs.length > 3) {
      for (let i = 0; i < this.aiOrbs.length - 2; i += 2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          this.aiOrbs[i].position,
          this.aiOrbs[i + 2].position
        ]);
        
        const line = new THREE.Line(geometry, lineMaterial);
        this.scene.add(line);
        this.connectionNodes.push(line);
      }
    }
    
    console.log('🔗 Created network with', this.connectionNodes.length, 'connections');
  }

  createDataStreams() {
    const streamMaterial = new THREE.LineBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.5,
      linewidth: 2
    });

    for (let i = 0; i < 3; i++) {
      const points = [];
      const radius = 10 + i * 2;
      const segments = 20;
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * 0.5,
          Math.sin(angle) * radius * 0.3
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const stream = new THREE.Line(geometry, streamMaterial);
      stream.userData = { speed: 0.002 + i * 0.001, offset: Math.random() * Math.PI * 2 };
      this.scene.add(stream);
      this.dataStreams.push(stream);
    }
  }

  createFloatingUIElements() {
    this.floatingElements = [];
    
    const serviceShapes = [
      () => new THREE.BoxGeometry(1.5, 0.4, 0.2),
      () => new THREE.CylinderGeometry(0.8, 0.8, 0.15, 6),
      () => new THREE.TorusGeometry(1.0, 0.15, 10, 20),
      () => new THREE.OctahedronGeometry(0.9, 0),
      () => new THREE.ConeGeometry(0.8, 1.5, 4)
    ];

    const elementColors = [0x4FC3F7, 0x00FF88, 0x7E57C2, 0xFF6B6B, 0x00E5FF];

    serviceShapes.forEach((createShape, i) => {
      const geometry = createShape();
      const material = new THREE.MeshPhongMaterial({
        color: elementColors[i],
        transparent: true,
        opacity: 0.7,
        wireframe: true,
        emissive: elementColors[i],
        emissiveIntensity: 0.3
      });

      const element = new THREE.Mesh(geometry, material);
      
      const radius = 12 + i * 1.5;
      const angle = (i / serviceShapes.length) * Math.PI * 2;
      element.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 2 + 6,
        Math.sin(angle) * radius * 0.5
      );
      
      element.userData = {
        angle: angle,
        radius: radius,
        speed: 0.08 + Math.random() * 0.1,
        rotationSpeed: 0.008 + Math.random() * 0.015,
        floatHeight: 0.8 + Math.random() * 1.2,
        serviceType: ['Website', 'Chatbot', 'AI', 'System', 'Integration'][i]
      };
      
      this.scene.add(element);
      this.floatingElements.push(element);
    });
    
    console.log('✨ Created', this.floatingElements.length, 'floating service elements');
  }

  animate() {
    try {
      this.animationId = requestAnimationFrame(() => this.animate());
      this.frameCount++;

      const shouldAnimate = !this.isMobile || this.frameCount % 2 === 0;

      if (shouldAnimate) {
        this.techParticles.forEach(particle => {
          const data = particle.userData;
          data.phase += data.speed;
          
          particle.position.x = data.originalPosition.x + Math.sin(data.phase) * data.amplitude;
          particle.position.y = data.originalPosition.y + Math.cos(data.phase * 1.5) * data.amplitude * 0.7;
          particle.position.z = data.originalPosition.z + Math.sin(data.phase * 0.8) * data.amplitude;
          
          particle.rotation.x += data.rotationSpeed;
          particle.rotation.y += data.rotationSpeed * 1.3;
        });

        this.aiOrbs.forEach(orb => {
          const data = orb.userData;
          data.phase += data.pulseSpeed;
          
          const scale = data.originalScale + Math.sin(data.phase) * 0.2;
          orb.scale.setScalar(scale);
          
          orb.rotation.x += data.rotationSpeed;
          orb.rotation.y += data.rotationSpeed * 1.1;
          
          if (data.hoverIntensity > 0) {
            orb.position.y += Math.sin(this.frameCount * 0.1) * 0.02 * data.hoverIntensity;
            data.hoverIntensity *= 0.95;
          }
        });

        this.dataStreams.forEach(stream => {
          const data = stream.userData;
          data.offset += data.speed;
          stream.rotation.y = data.offset;
        });

        if (this.floatingElements && !this.isMobile) {
          this.floatingElements.forEach(element => {
            const data = element.userData;
            data.angle += data.speed * 0.01;
            
            element.position.x = Math.cos(data.angle) * data.radius;
            element.position.z = Math.sin(data.angle) * data.radius * 0.5;
            element.position.y = 6 + Math.sin(data.angle * 3) * data.floatHeight;
            
            element.rotation.x += data.rotationSpeed;
            element.rotation.y += data.rotationSpeed * 1.2;
          });
        }

        if (this.particleGroup) {
          this.particleGroup.rotation.y += 0.0003;
          this.particleGroup.rotation.x += 0.0001;
        }

        if (this.particleGroup && this.currentSettings.enableMouse) {
          const targetX = this.mouseX * 0.00002;
          const targetY = this.mouseY * 0.000025;
          
          this.particleGroup.rotation.x += (targetY - this.particleGroup.rotation.x) * 0.05;
          this.particleGroup.rotation.y += (targetX - this.particleGroup.rotation.y) * 0.05;
        }
      }

      this.renderer.render(this.scene, this.camera);
      
    } catch (error) {
      console.log('❌ Animation error:', error);
      cancelAnimationFrame(this.animationId);
      this.activateFallback();
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    const newWidth = window.innerWidth * this.currentSettings.resolution;
    const newHeight = window.innerHeight * this.currentSettings.resolution;
    this.renderer.setSize(newWidth, newHeight);
  }

  setupEventListeners() {
    if (this.currentSettings.enableMouse) {
      let rafId;
      
      const onMouseMove = (event) => {
        if (rafId) return;
        
        rafId = requestAnimationFrame(() => {
          this.mouseX = (event.clientX - window.innerWidth / 2);
          this.mouseY = (event.clientY - window.innerHeight / 2);
          rafId = null;
        });
      };
      
      document.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
          console.log('⏸️ Animation paused');
        } else if (entry.isIntersecting && !this.animationId) {
          this.animate();
          console.log('▶️ Animation resumed');
        }
      });
    }, { threshold: 0.1 });

    const heroSection = document.getElementById('hero');
    if (heroSection) {
      observer.observe(heroSection);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    });
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    console.log('🧹 Agency Three.js cleaned up');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded - setting up Ixiera Agency Three.js');
  
  let heroInstance = null;
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !heroInstance) {
      console.log('👀 Hero section in viewport - initializing Agency Three.js');
      
      setTimeout(() => {
        heroInstance = new IxieraHero();
      }, 300);
      
    } else if (!entries[0].isIntersecting && heroInstance) {
      console.log('👋 Hero section out of view - cleaning up');
      heroInstance.destroy();
      heroInstance = null;
    }
  }, { 
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    observer.observe(heroSection);
  }
});