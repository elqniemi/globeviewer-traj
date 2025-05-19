// Globe Manager - Handles the Three.js globe rendering
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import * as SunCalc from 'suncalc';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class GlobeManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        // Set up Three.js scene
        this.scene = new THREE.Scene();
        
        // Set up camera
        this.setUpCamera();
        
        // Set up renderer
        this.setUpRenderer();
        
        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        
        // Post-processing for effects like glow
        this.setupPostProcessing();
        
        // Track if we have a legend
        this.legend = null;
        
        // Default styling settings
        this.settings = {
            routes: {
                colorMode: 'single',
                color: '#ff0000',
                width: 3,
                thickness: 0, // New thickness option for 3D lines
                style: 'solid',
                arcHeight: 0.4,
                variable: null,
                colorRamp: 'viridis',
                customColors: {
                    start: '#0000ff',
                    end: '#ff0000'
                },
                widthRange: {
                    min: 1,
                    max: 10
                },
                thicknessRange: { // New thickness range
                    min: 0,
                    max: 10
                },
                transform: 'none'
            },
            points: {
                visible: true,
                size: 2,
                color: '#ffffff',
                sizeMode: 'fixed',
                sizeVariable: null,
                sizeRange: {
                    min: 1,
                    max: 10
                },
                sizeTransform: 'none'
            },
            globe: {
                atmosphereStyle: 'realistic',
                atmosphereIntensity: 1.0,
                backgroundStyle: 'stars',
                backgroundColor: '#000000',
                lightingMode: 'preset',
                lightingPreset: 'day',
                reduceGlare: false
            }
        };
        
        // Create Earth first
        this.createEarth();
        
        // Set up lighting (needed before atmosphere)
        this.setUpLighting();
        
        // Now create atmosphere (which uses lighting)
        this.createAtmosphere();
        
        // Create stars background
        this.createBackground('stars');
        
        // Initialize tooltip
        this.initTooltip();
        
        // Create a container for routes and points
        this.routesGroup = new THREE.Group();
        this.pointsGroup = new THREE.Group();
        this.scene.add(this.routesGroup);
        this.scene.add(this.pointsGroup);
        
        // Set initial position
        this.camera.position.z = 4;
        this.controls.update();
        
        // Keep track of variable ranges for data-driven styling
        this.dataRanges = {
            color: { min: 0, max: 1 },
            width: { min: 0, max: 1 },
            pointSize: { min: 0, max: 1 }
        };
        
        // Post-processing effects state
        this.effectsEnabled = false;
    }
    
    setUpCamera() {
        const containerRect = this.container.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;
        const aspect = width / height;
        
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    }
    
    setUpRenderer() {
        const containerRect = this.container.getBoundingClientRect();
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // Required for taking screenshots
        });
        this.renderer.setSize(containerRect.width, containerRect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupPostProcessing() {
        const containerRect = this.container.getBoundingClientRect();
        
        // EffectComposer for post-processing effects
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom pass for glow effects
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(containerRect.width, containerRect.height),
            0.0,    // strength
            0.4,    // radius
            0.85    // threshold
        );
        this.composer.addPass(this.bloomPass);
        
        // Disable bloom initially
        this.bloomPass.enabled = false;
    }
    
    setUpLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x444444, 0.3);
        this.scene.add(this.ambientLight);
        
        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(5, 3, 5);
        this.sunLight.castShadow = true;
        
        // Better shadow quality
        const shadowMapSize = 2048;
        this.sunLight.shadow.mapSize.width = shadowMapSize;
        this.sunLight.shadow.mapSize.height = shadowMapSize;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -10;
        this.sunLight.shadow.camera.right = 10;
        this.sunLight.shadow.camera.top = 10;
        this.sunLight.shadow.camera.bottom = -10;
        this.sunLight.shadow.bias = -0.0005;
        
        this.scene.add(this.sunLight);
        
        // Hemisphere light for better ambient lighting that varies with direction
        this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.2);
        this.scene.add(this.hemisphereLight);
        
        // Additional lights for global lighting mode
        this.globalLights = [];
        
        // Create 4 additional lights for global illumination
        const positions = [
            new THREE.Vector3(-5, 0, 0),   // Left
            new THREE.Vector3(5, 0, 0),    // Right
            new THREE.Vector3(0, -5, 0),   // Bottom
            new THREE.Vector3(0, 5, 0)     // Top
        ];
        
        positions.forEach(position => {
            const light = new THREE.DirectionalLight(0xffffff, 0);
            light.position.copy(position);
            this.scene.add(light);
            this.globalLights.push(light);
        });
    }
    
    setLightingPreset(preset) {
        this.settings.globe.lightingPreset = preset;
        
        // First, disable all global lights
        this.globalLights.forEach(light => {
            light.intensity = 0;
        });
        
        switch (preset) {
            case 'day':
                this.ambientLight.intensity = 0.3;
                this.sunLight.intensity = 1;
                this.sunLight.position.set(5, 3, 5);
                this.sunLight.color.set(0xffffff);
                this.hemisphereLight.intensity = 0.2;
                break;
            case 'night':
                this.ambientLight.intensity = 0.1;
                this.sunLight.intensity = 0.05;
                this.sunLight.position.set(-5, -3, -5);
                this.sunLight.color.set(0xccccff);
                this.hemisphereLight.intensity = 0.05;
                break;
            case 'global':
                // Even lighting all around, no dark sides
                this.ambientLight.intensity = 0.5;
                this.sunLight.intensity = 0.7;
                this.sunLight.position.set(0, 0, 5); // From front
                this.sunLight.color.set(0xffffff);
                this.hemisphereLight.intensity = 0.3;
                
                // Enable additional lights for truly global illumination
                this.globalLights.forEach(light => {
                    light.intensity = 0.3;
                    light.color.set(0xffffff);
                });
                break;
            case 'view':
                // Light comes from the camera direction
                this.ambientLight.intensity = 0.3;
                this.sunLight.intensity = 0.9;
                // Position will be updated in render()
                this.sunLight.position.copy(this.camera.position);
                this.sunLight.color.set(0xffffff);
                this.hemisphereLight.intensity = 0.3;
                break;
        }
    }
    
    updateSunPosition(latitude, longitude) {
        // Only applicable for the "day" preset
        if (this.settings.globe.lightingPreset !== 'day') return;
        
        // Convert latitude and longitude to 3D position
        // latitude: -90 (south) to 90 (north)
        // longitude: -180 (west) to 180 (east)
        
        const phi = (90 - latitude) * (Math.PI / 180);
        const theta = (longitude + 180) * (Math.PI / 180);
        
        // Calculate position on a larger sphere (distance = 50 units)
        const distance = 50;
        const x = -distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.cos(phi);
        const z = distance * Math.sin(phi) * Math.sin(theta);
        
        this.sunLight.position.set(x, y, z);
    }
    
    updateLightIntensity(intensity) {
        // Update sun/main light intensity
        this.sunLight.intensity = intensity;
        
        // If in global mode, also update the additional lights
        if (this.settings.globe.lightingPreset === 'global') {
            const globalIntensity = intensity * 0.3; // Scale down for global lights
            this.globalLights.forEach(light => {
                light.intensity = globalIntensity;
            });
        }
    }
    
    updateLightColor(colorHex) {
        // Update sun/main light color
        this.sunLight.color.set(colorHex);
        
        // If in global mode, also update the additional lights
        if (this.settings.globe.lightingPreset === 'global') {
            this.globalLights.forEach(light => {
                light.color.set(colorHex);
            });
        }
    }
    
    setTimeBasedLighting(date) {
        // This method is now replaced by updateSunPosition
        console.warn('setTimeBasedLighting is deprecated, use updateSunPosition instead');
    }
    
    updateSunIntensity(intensity) {
        // This method is now replaced by updateLightIntensity
        console.warn('updateSunIntensity is deprecated, use updateLightIntensity instead');
        this.updateLightIntensity(intensity);
    }
    
    updateAmbientIntensity(intensity) {
        this.settings.globe.ambientIntensity = intensity;
        this.ambientLight.intensity = intensity;
    }
    
    setReduceGlare(reduce) {
        this.settings.globe.reduceGlare = reduce;
        
        if (reduce) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.8;
        } else {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
        }
    }
    
    createEarth() {
        // Earth geometry
        const radius = 1;
        const earthGeometry = new THREE.SphereGeometry(radius, 64, 64);
        
        // Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // Earth material with improved textures
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load('https://unpkg.com/three-globe@2.24.10/example/img/earth-blue-marble.jpg'),
            bumpMap: textureLoader.load('https://unpkg.com/three-globe@2.24.10/example/img/earth-topology.png'),
            bumpScale: 0.05,
            specularMap: textureLoader.load('https://unpkg.com/three-globe@2.24.10/example/img/earth-water.png'),
            specular: new THREE.Color('grey'),
            shininess: 15
        });
        
        // Night texture (visible on the dark side when using day/night lighting)
        const nightTexture = textureLoader.load('https://unpkg.com/three-globe@2.24.10/example/img/earth-night.jpg');
        
        // Create mesh
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);
        
        // Store night texture for later use
        this.earthTextures = {
            day: earthMaterial.map,
            night: nightTexture
        };
    }
    
    createAtmosphere() {
        this.atmosphereMesh = null;
        this.updateAtmosphereStyle(this.settings.globe.atmosphereStyle);
    }
    
    updateAtmosphereStyle(style) {
        this.settings.globe.atmosphereStyle = style;
        
        // Remove existing atmosphere if any
        if (this.atmosphereMesh) {
            this.scene.remove(this.atmosphereMesh);
            if (this.atmosphereMesh.material) {
                this.atmosphereMesh.material.dispose();
            }
            if (this.atmosphereMesh.geometry) {
                this.atmosphereMesh.geometry.dispose();
            }
        }
        
        if (style === 'none') {
            return;
        }
        
        const radius = 1;
        const atmosphereGeometry = new THREE.SphereGeometry(radius + 0.05, 64, 64);
        
        if (style === 'realistic') {
            // Define a default sun position if sunLight hasn't been created yet
            const sunPosition = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(5, 3, 5).normalize();
            
            // More realistic atmosphere shader based on atmospheric scattering
            const atmosphereMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    "cameraPos": { value: new THREE.Vector3(0, 0, 0) },
                    "sunPosition": { value: sunPosition },
                    "earthRadius": { value: radius },
                    "atmosphereRadius": { value: radius + 0.05 },
                    "intensity": { value: this.settings.globe.atmosphereIntensity },
                    "rayleighCoefficient": { value: new THREE.Vector3(5.5e-6, 13.0e-6, 22.4e-6) },
                    "mieCoefficient": { value: 3.0e-6 },
                    "rayleighScale": { value: 0.8 },
                    "mieScale": { value: 0.15 },
                    "sunIntensity": { value: 20.0 }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    varying vec3 vSunDirection;
                    varying float vSunfade;
                    varying vec3 vBetaR;
                    varying vec3 vBetaM;
                    varying float vSunE;

                    uniform vec3 cameraPos;
                    uniform vec3 sunPosition;
                    uniform float earthRadius;
                    uniform float atmosphereRadius;
                    uniform float rayleighScale;
                    uniform float mieScale;
                    uniform vec3 rayleighCoefficient;
                    uniform float mieCoefficient;
                    uniform float intensity;
                    uniform float sunIntensity;

                    const vec3 up = vec3(0.0, 1.0, 0.0);

                    const float e = 2.71828182845904523536028747135266249;
                    const float pi = 3.141592653589793238462643383279502884;

                    const float n = 1.0003;
                    const float N = 2.545E25;
                    const float pn = 0.035;
                    
                    const float rayleighZenithLength = 8.4E3;
                    const float mieZenithLength = 1.25E3;
                    const vec3 K = vec3(0.686, 0.678, 0.666);
                    const float v = 4.0;

                    float rayleighPhase(float cosTheta) {
                        return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
                    }

                    float miePhase(float cosTheta, float g) {
                        float g2 = pow(g, 2.0);
                        float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
                        return (1.0 - g2) * inverse;
                    }

                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;

                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        
                        vSunDirection = normalize(sunPosition);

                        float sunfade = 1.0 - clamp(1.0 - exp((earthRadius - atmosphereRadius) * 1.0), 0.0, 1.0);
                        vSunfade = sunfade;

                        float rayleighAttenuation = rayleighScale * intensity;
                        float mieAttenuation = mieScale * intensity;

                        vBetaR = rayleighCoefficient * rayleighAttenuation;
                        vBetaM = vec3(mieCoefficient) * mieAttenuation;

                        vSunE = sunIntensity;
                    }
                `,
                fragmentShader: `
                    varying vec3 vWorldPosition;
                    varying vec3 vSunDirection;
                    varying float vSunfade;
                    varying vec3 vBetaR;
                    varying vec3 vBetaM;
                    varying float vSunE;

                    uniform float earthRadius;
                    uniform float atmosphereRadius;
                    uniform vec3 cameraPos;

                    const float pi = 3.141592653589793238462643383279502884;
                    const float mieDirectionalG = 0.8;
                    const float v = 4.0; // Add the missing 'v' constant

                    vec3 totalMie(vec3 lambda, vec3 K, float T) {
                        float c = 0.2 * T;
                        return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
                    }

                    float rayleighPhase(float cosTheta) {
                        return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
                    }

                    float hgPhase(float cosTheta, float g) {
                        float g2 = pow(g, 2.0);
                        float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
                        return (1.0 - g2) * inverse;
                    }

                    void main() {
                        vec3 direction = normalize(vWorldPosition - cameraPos);

                        float depth = 5.0; // Number of ray steps
                        float outerEdge = depth * 0.25;
                        
                        float cosTheta = dot(direction, vSunDirection);
                        float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
                        float mPhase = hgPhase(cosTheta, mieDirectionalG);
                        
                        vec3 scatter = vSunE * (vBetaR * rPhase + vBetaM * mPhase);
                        
                        // Adjust color based on viewing angle
                        vec3 atmosphere = min(vec3(1.0), scatter * (1.0 + 1.0 * vSunfade));
                        
                        // Add blue-ish tint
                        vec3 tint = mix(vec3(0.1, 0.2, 1.0), vec3(1.0), min(1.0, scatter.b * 4.0));
                        atmosphere *= tint;
                        
                        // Boost atmosphere brightness at edges
                        float atmosphereEdge = 1.0 - max(0.0, dot(direction, normalize(vWorldPosition)));
                        atmosphere *= pow(atmosphereEdge, outerEdge);
                        
                        gl_FragColor = vec4(atmosphere, atmosphereEdge * 0.4 + 0.2);
                    }
                `,
                transparent: true,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            
        } else if (style === 'stylized') {
            // Original stylized atmosphere shader
            const atmosphereMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    "c": { value: 0.2 },
                    "p": { value: 4.0 },
                    glowColor: { value: new THREE.Color(0x3388ff) },
                    viewVector: { value: new THREE.Vector3(0, 0, 0) }
                },
                vertexShader: `
                    uniform vec3 viewVector;
                    uniform float c;
                    uniform float p;
                    varying float intensity;
                    void main() {
                        vec3 vNormal = normalize(normal);
                        vec3 vNormel = normalize(viewVector);
                        intensity = pow(c - dot(vNormal, vNormel), p);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    varying float intensity;
                    void main() {
                        vec3 glow = glowColor * intensity;
                        gl_FragColor = vec4(glow, 1.0);
                    }
                `,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });
            
            this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        }
        
        if (this.atmosphereMesh) {
            this.scene.add(this.atmosphereMesh);
            this.updateAtmosphere(this.settings.globe.atmosphereIntensity);
        }
    }
    
    updateAtmosphere(intensity) {
        if (!this.atmosphereMesh) return;
        
        this.settings.globe.atmosphereIntensity = intensity;
        
        if (this.settings.globe.atmosphereStyle === 'realistic') {
            this.atmosphereMesh.material.uniforms.intensity.value = intensity;
        } else if (this.settings.globe.atmosphereStyle === 'stylized') {
            this.atmosphereMesh.material.uniforms.c.value = 0.1 + (intensity * 0.1);
            this.atmosphereMesh.material.uniforms.p.value = 4.0 - (intensity * 0.5);
        }
    }
    
    createBackground(style) {
        // Clear any existing background
        if (this.stars) {
            this.scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
            this.stars = null;
        }
        
        if (this.skybox) {
            this.scene.remove(this.skybox);
            this.skybox.geometry.dispose();
            this.skybox.material.dispose();
            this.skybox = null;
        }
        
        // Store the style
        this.settings.globe.backgroundStyle = style;
        
        switch (style) {
            case 'stars':
                this.createStars();
                break;
            case 'space':
                this.createDeepSpace();
                break;
            case 'milky-way':
                this.createMilkyWay();
                break;
            case 'solid':
                // Just set the clear color
                this.renderer.setClearColor(this.settings.globe.backgroundColor);
                break;
        }
    }
    
    updateBackgroundStyle(style) {
        this.createBackground(style);
    }
    
    updateBackgroundColor(color) {
        this.settings.globe.backgroundColor = color;
        if (this.settings.globe.backgroundStyle === 'solid') {
            this.renderer.setClearColor(color);
        }
    }
    
    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.02,
            transparent: true
        });
        
        const starsCount = 10000;
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount * 3; i += 3) {
            // Random position in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 50 + Math.random() * 50; // Between 50 and 100
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
            
            // Random star color (white to blue-ish or yellow-ish)
            const colorType = Math.random();
            if (colorType < 0.6) {
                // White
                colors[i] = 1.0;
                colors[i + 1] = 1.0;
                colors[i + 2] = 1.0;
            } else if (colorType < 0.8) {
                // Blue-ish
                colors[i] = 0.7;
                colors[i + 1] = 0.8;
                colors[i + 2] = 1.0;
            } else {
                // Yellow-ish
                colors[i] = 1.0;
                colors[i + 1] = 0.9;
                colors[i + 2] = 0.7;
            }
            
            // Random star size
            sizes[i/3] = Math.random() * 0.01 + 0.01;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        starMaterial.vertexColors = true;
        starMaterial.sizeAttenuation = true;
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    createDeepSpace() {
        const textureLoader = new THREE.TextureLoader();
        const spaceTexture = textureLoader.load('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2371');
        
        const skyboxGeometry = new THREE.SphereGeometry(100, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            map: spaceTexture,
            side: THREE.BackSide,
            fog: false
        });
        
        this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(this.skybox);
        
        // Add some stars as well for depth
        this.createStars();
    }
    
    createMilkyWay() {
        const textureLoader = new THREE.TextureLoader();
        const milkyWayTexture = textureLoader.load('https://images.unsplash.com/photo-1506703719100-a0b3ea946e57?q=80&w=2370');
        
        const skyboxGeometry = new THREE.SphereGeometry(100, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            map: milkyWayTexture,
            side: THREE.BackSide,
            fog: false
        });
        
        this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(this.skybox);
    }
    
    handleResize() {
        const containerRect = this.container.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
    
    render() {
        // Update the camera position for atmosphere shader
        if (this.atmosphereMesh && this.settings.globe.atmosphereStyle === 'realistic') {
            this.atmosphereMesh.material.uniforms.cameraPos.value.copy(this.camera.position);
            
            // Check if sunLight exists before trying to access its position
            if (this.sunLight) {
                this.atmosphereMesh.material.uniforms.sunPosition.value.copy(this.sunLight.position).normalize();
            }
        }
        
        // Update the stylized atmosphere viewVector uniform 
        if (this.atmosphereMesh && this.settings.globe.atmosphereStyle === 'stylized') {
            this.atmosphereMesh.material.uniforms.viewVector.value = 
                new THREE.Vector3().subVectors(this.camera.position, this.atmosphereMesh.position);
        }
        
        // Update light position for view-based lighting preset
        if (this.settings.globe.lightingPreset === 'view' && this.sunLight) {
            // Position the light at the camera position
            this.sunLight.position.copy(this.camera.position);
        }
        
        // Update controls
        this.controls.update();
        
        // Render scene with post-processing if enabled
        if (this.effectsEnabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Convert lat/lon to 3D position
    latLonToVector3(lat, lon, radius = 1) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }
    
    // Apply value transform based on settings
    applyTransform(value, transformType) {
        switch (transformType) {
            case 'log':
                return Math.max(0, Math.log(value + 1));
            case 'sqrt':
                return Math.sqrt(value);
            case 'pow2':
                return Math.pow(value, 2);
            case 'norm':
                return value; // Normalization happens elsewhere
            default:
                return value;
        }
    }
    
    // Calculate data-driven style values
    calculateDataValue(value, min, max, targetMin, targetMax, transform) {
        // Apply transform first
        const transformedValue = this.applyTransform(value, transform);
        const transformedMin = this.applyTransform(min, transform);
        const transformedMax = this.applyTransform(max, transform);
        
        // Normalize to 0-1 range
        const normalizedValue = (transformedValue - transformedMin) / (transformedMax - transformedMin);
        
        // Map to target range
        return targetMin + normalizedValue * (targetMax - targetMin);
    }
    
    // Get color from a variable value and color ramp
    getColorFromValue(value, min, max, colorRamp, transform) {
        // Custom function to generate colors based on a value and color ramp
        const normalizedValue = this.calculateDataValue(value, min, max, 0, 1, transform);
        
        // Choose color based on ramp type
        switch (colorRamp) {
            case 'viridis':
                return this.viridisColormap(normalizedValue);
            case 'plasma':
                return this.plasmaColormap(normalizedValue);
            case 'inferno':
                return this.infernoColormap(normalizedValue);
            case 'magma':
                return this.magmaColormap(normalizedValue);
            case 'cividis':
                return this.cividisColormap(normalizedValue);
            case 'rainbow':
                return this.rainbowColormap(normalizedValue);
            case 'sinebow':
                return this.sinebowColormap(normalizedValue);
            case 'turbo':
                return this.turboColormap(normalizedValue);
            case 'red-blue':
                return this.interpolateColor(new THREE.Color(0xff0000), new THREE.Color(0x0000ff), normalizedValue);
            case 'red-yellow-green':
                if (normalizedValue < 0.5) {
                    return this.interpolateColor(new THREE.Color(0xff0000), new THREE.Color(0xffff00), normalizedValue * 2);
                } else {
                    return this.interpolateColor(new THREE.Color(0xffff00), new THREE.Color(0x00ff00), (normalizedValue - 0.5) * 2);
                }
            case 'custom':
                const startColor = new THREE.Color(this.settings.routes.customColors.start);
                const endColor = new THREE.Color(this.settings.routes.customColors.end);
                return this.interpolateColor(startColor, endColor, normalizedValue);
            default:
                return new THREE.Color(0xff0000);
        }
    }
    
    // Color interpolation method
    interpolateColor(color1, color2, factor) {
        const result = new THREE.Color();
        result.r = color1.r + factor * (color2.r - color1.r);
        result.g = color1.g + factor * (color2.g - color1.g);
        result.b = color1.b + factor * (color2.b - color1.b);
        return result;
    }
    
    // Various colormap implementations
    viridisColormap(t) {
        // Simplified Viridis colormap approximation
        const c0 = new THREE.Vector3(0.267, 0.004, 0.329);
        const c1 = new THREE.Vector3(0.283, 0.300, 0.406);
        const c2 = new THREE.Vector3(0.127, 0.563, 0.550);
        const c3 = new THREE.Vector3(0.369, 0.832, 0.294);
        const c4 = new THREE.Vector3(0.983, 0.945, 0.036);
        
        if (t < 0.25) {
            return new THREE.Color().setRGB(
                this.mix(c0.x, c1.x, t * 4), 
                this.mix(c0.y, c1.y, t * 4), 
                this.mix(c0.z, c1.z, t * 4)
            );
        } else if (t < 0.5) {
            return new THREE.Color().setRGB(
                this.mix(c1.x, c2.x, (t - 0.25) * 4), 
                this.mix(c1.y, c2.y, (t - 0.25) * 4), 
                this.mix(c1.z, c2.z, (t - 0.25) * 4)
            );
        } else if (t < 0.75) {
            return new THREE.Color().setRGB(
                this.mix(c2.x, c3.x, (t - 0.5) * 4), 
                this.mix(c2.y, c3.y, (t - 0.5) * 4), 
                this.mix(c2.z, c3.z, (t - 0.5) * 4)
            );
        } else {
            return new THREE.Color().setRGB(
                this.mix(c3.x, c4.x, (t - 0.75) * 4), 
                this.mix(c3.y, c4.y, (t - 0.75) * 4), 
                this.mix(c3.z, c4.z, (t - 0.75) * 4)
            );
        }
    }
    
    plasmaColormap(t) {
        // Simplified Plasma colormap approximation
        const c0 = new THREE.Vector3(0.050, 0.029, 0.527);
        const c1 = new THREE.Vector3(0.532, 0.000, 0.592);
        const c2 = new THREE.Vector3(0.881, 0.196, 0.394);
        const c3 = new THREE.Vector3(0.988, 0.497, 0.131);
        const c4 = new THREE.Vector3(0.940, 0.975, 0.131);
        
        if (t < 0.25) {
            return new THREE.Color().setRGB(
                this.mix(c0.x, c1.x, t * 4), 
                this.mix(c0.y, c1.y, t * 4), 
                this.mix(c0.z, c1.z, t * 4)
            );
        } else if (t < 0.5) {
            return new THREE.Color().setRGB(
                this.mix(c1.x, c2.x, (t - 0.25) * 4), 
                this.mix(c1.y, c2.y, (t - 0.25) * 4), 
                this.mix(c1.z, c2.z, (t - 0.25) * 4)
            );
        } else if (t < 0.75) {
            return new THREE.Color().setRGB(
                this.mix(c2.x, c3.x, (t - 0.5) * 4), 
                this.mix(c2.y, c3.y, (t - 0.5) * 4), 
                this.mix(c2.z, c3.z, (t - 0.5) * 4)
            );
        } else {
            return new THREE.Color().setRGB(
                this.mix(c3.x, c4.x, (t - 0.75) * 4), 
                this.mix(c3.y, c4.y, (t - 0.75) * 4), 
                this.mix(c3.z, c4.z, (t - 0.75) * 4)
            );
        }
    }
    
    infernoColormap(t) {
        // Simplified Inferno colormap
        const r = 0.8 - 1.4 * t + 0.6 * t * t + 0.8 * Math.pow(t, 3);
        const g = 0.1 + 0.5 * t - 0.4 * t * t + 0.1 * Math.pow(t, 3);
        const b = 0.5 - 2.0 * t + 2.1 * t * t - 0.6 * Math.pow(t, 3);
        return new THREE.Color(
            this.clamp(r, 0, 1),
            this.clamp(g, 0, 1),
            this.clamp(b, 0, 1)
        );
    }
    
    magmaColormap(t) {
        // Simplified Magma colormap
        const r = 0.2 + 1.9 * t - 0.5 * t * t;
        const g = 0.0 + 1.0 * t - 0.2 * t * t;
        const b = 0.4 + 0.8 * t - 1.2 * t * t + 0.4 * Math.pow(t, 3);
        return new THREE.Color(
            this.clamp(r, 0, 1),
            this.clamp(g, 0, 1),
            this.clamp(b, 0, 1)
        );
    }
    
    cividisColormap(t) {
        // Simplified Cividis colormap
        const r = -0.1 + 2.7 * t - 1.9 * t * t + 0.3 * Math.pow(t, 3);
        const g = 0.2 + 0.8 * t + 0.2 * t * t - 0.2 * Math.pow(t, 3);
        const b = 0.5 - 0.4 * t - 0.1 * t * t;
        return new THREE.Color(
            this.clamp(r, 0, 1),
            this.clamp(g, 0, 1),
            this.clamp(b, 0, 1)
        );
    }
    
    rainbowColormap(t) {
        // Simple rainbow colormap (HSL-based)
        return new THREE.Color().setHSL(1 - t, 1.0, 0.5);
    }
    
    sinebowColormap(t) {
        // Simplified Sinebow colormap
        const pi2 = Math.PI * 2;
        const r = Math.sin(pi2 * (t + 0.0) / 3);
        const g = Math.sin(pi2 * (t + 1.0) / 3);
        const b = Math.sin(pi2 * (t + 2.0) / 3);
        return new THREE.Color(
            this.clamp(r * r, 0, 1),
            this.clamp(g * g, 0, 1),
            this.clamp(b * b, 0, 1)
        );
    }
    
    turboColormap(t) {
        // Simplified Turbo colormap
        const r = 1.0 - 1.2 * Math.pow(t - 0.8, 2);
        const g = 1.8 * Math.pow(t, 0.8) * (1 - t);
        const b = 1.3 * Math.pow(1 - t, 1.2);
        return new THREE.Color(
            this.clamp(r, 0, 1),
            this.clamp(g, 0, 1),
            this.clamp(b, 0, 1)
        );
    }
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    mix(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    }
    
    // Clear existing routes and points
    clearRoutes() {
        while (this.routesGroup.children.length > 0) {
            const object = this.routesGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.routesGroup.remove(object);
        }
    }
    
    clearPoints() {
        while (this.pointsGroup.children.length > 0) {
            const object = this.pointsGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.pointsGroup.remove(object);
        }
    }
    
    // Add trajectory points (route_id, point_id, lat, lon, z)
    addTrajectoryPoints(trajectoryData, categories = null) {
        this.clearRoutes();
        
        // Find unique columns for variables
        const variableColumns = new Set();
        if (trajectoryData.length > 0) {
            Object.keys(trajectoryData[0]).forEach(key => {
                if (!['route_id', 'point_id', 'lat', 'lon', 'category'].includes(key) && 
                    typeof trajectoryData[0][key] === 'number') {
                    variableColumns.add(key);
                }
            });
        }
        
        // Update UI with available variables if needed
        this.updateVariableOptions([...variableColumns]);
        
        // Group points by route_id
        const routes = {};
        trajectoryData.forEach(point => {
            const routeId = point.route_id;
            if (!routes[routeId]) {
                routes[routeId] = [];
            }
            routes[routeId].push(point);
        });
        
        // Sort each route by point_id
        Object.values(routes).forEach(route => {
            route.sort((a, b) => a.point_id - b.point_id);
        });
        
        // Find min/max values for data-driven styling if needed
        if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
            this.calculateVariableRange(trajectoryData, this.settings.routes.variable, 'color');
        }
        
        if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
            this.calculateVariableRange(trajectoryData, this.settings.routes.widthVariable, 'width');
        }
        
        // Generate colors based on categories if needed
        const colors = {};
        let colorIndex = 0;
        const predefinedColors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
            0xffa500, 0x800080, 0x008000, 0x800000, 0x008080, 0x000080
        ];
        
        // Enable or disable glow effect
        this.setGlowEffect(this.settings.routes.style === 'glow');
        
        // Create lines for each route
        Object.entries(routes).forEach(([routeId, points]) => {
            const lineGeometry = new THREE.BufferGeometry();
            const positions = [];
            
            points.forEach(point => {
                const elevation = point.z !== undefined ? 1 + point.z / 500 : 1;
                const position = this.latLonToVector3(point.lat, point.lon, elevation);
                positions.push(position.x, position.y, position.z);
            });
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            // Determine line width based on settings
            let lineWidth = this.settings.routes.width;
            if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
                // Get average of the variable for this route
                const values = points.map(p => p[this.settings.routes.widthVariable]).filter(v => v !== undefined);
                if (values.length > 0) {
                    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                    lineWidth = this.calculateDataValue(
                        avgValue,
                        this.dataRanges.width.min,
                        this.dataRanges.width.max,
                        this.settings.routes.widthRange.min,
                        this.settings.routes.widthRange.max,
                        this.settings.routes.transform
                    );
                }
            }
            
            // Determine color based on settings
            let routeColor;
            
            if (this.settings.routes.colorMode === 'category' && categories && categories[routeId]) {
                const category = categories[routeId];
                if (!colors[category]) {
                    colors[category] = predefinedColors[colorIndex % predefinedColors.length];
                    colorIndex++;
                }
                routeColor = colors[category];
            } else if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
                // Get average of the variable for this route
                const values = points.map(p => p[this.settings.routes.variable]).filter(v => v !== undefined);
                if (values.length > 0) {
                    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                    routeColor = this.getColorFromValue(
                        avgValue,
                        this.dataRanges.color.min,
                        this.dataRanges.color.max,
                        this.settings.routes.colorRamp,
                        this.settings.routes.transform
                    );
                } else {
                    routeColor = new THREE.Color(this.settings.routes.color);
                }
            } else {
                routeColor = new THREE.Color(this.settings.routes.color);
            }
            
            // Create material based on line style
            let lineMaterial;
            
            switch(this.settings.routes.style) {
                case 'dash':
                    // Use custom dash settings if defined
                    const dashSettings = this.settings.routes.dashSettings || { dashSize: 0.1, gapSize: 0.05 };
                    
                    lineMaterial = new THREE.LineDashedMaterial({
                        color: routeColor,
                        linewidth: lineWidth,
                        scale: 1,
                        dashSize: dashSettings.dashSize,
                        gapSize: dashSettings.gapSize
                    });
                    break;
                case 'glow':
                    // Using normal line material but with bloom pass effect
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: routeColor,
                        linewidth: lineWidth,
                        transparent: true,
                        opacity: 0.8
                    });
                    break;
                case 'arrow':
                    // Use standard line material, arrows added separately
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: routeColor,
                        linewidth: lineWidth
                    });
                    break;
                default: // solid
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: routeColor,
                        linewidth: lineWidth
                    });
            }
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData = { 
                routeId,
                type: 'route',
                data: {
                    points: points
                }
            };
            
            // Compute line lengths for dashed lines
            if (this.settings.routes.style === 'dash') {
                line.computeLineDistances();
            }
            
            this.routesGroup.add(line);
            
            // Add arrows for arrow style
            if (this.settings.routes.style === 'arrow' && points.length > 1) {
                this.addArrowsToLine(points, routeColor, lineWidth);
            }
        });
        
        // Create legend based on color mode
        if (this.settings.routes.colorMode === 'category' && Object.keys(colors).length > 0) {
            this.createCategoryLegend(colors);
        } else if (this.settings.routes.colorMode === 'variable') {
            this.createContinuousLegend(
                this.settings.routes.variable,
                this.dataRanges.color.min,
                this.dataRanges.color.max,
                this.settings.routes.colorRamp
            );
        } else {
            this.removeLegend();
        }
    }
    
    // Add trajectory segments (segment_id, start_lat, start_lon, end_lat, end_lon)
    addTrajectorySegments(segmentData, categories = null) {
        this.clearRoutes();
        
        // Find unique columns for variables
        const variableColumns = new Set();
        if (segmentData.length > 0) {
            Object.keys(segmentData[0]).forEach(key => {
                if (!['segment_id', 'start_lat', 'start_lon', 'end_lat', 'end_lon', 'category'].includes(key) && 
                    typeof segmentData[0][key] === 'number') {
                    variableColumns.add(key);
                }
            });
        }
        
        // Add special calculated variables
        variableColumns.add('$length');
        
        // Update UI with available variables if needed
        this.updateVariableOptions([...variableColumns]);
        
        // Find min/max values for data-driven styling if needed
        if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
            if (this.settings.routes.variable === '$length') {
                // Calculate lengths for all segments
                this.dataRanges.color.min = Infinity;
                this.dataRanges.color.max = -Infinity;
                
                segmentData.forEach(segment => {
                    const startPos = this.latLonToVector3(segment.start_lat, segment.start_lon);
                    const endPos = this.latLonToVector3(segment.end_lat, segment.end_lon);
                    const length = startPos.distanceTo(endPos);
                    
                    this.dataRanges.color.min = Math.min(this.dataRanges.color.min, length);
                    this.dataRanges.color.max = Math.max(this.dataRanges.color.max, length);
                });
            } else {
                this.calculateVariableRange(segmentData, this.settings.routes.variable, 'color');
            }
        }
        
        if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
            if (this.settings.routes.widthVariable === '$length') {
                // Calculate lengths for all segments if not already done
                if (!this.dataRanges.width.hasOwnProperty('$length')) {
                    this.dataRanges.width.min = Infinity;
                    this.dataRanges.width.max = -Infinity;
                    
                    segmentData.forEach(segment => {
                        const startPos = this.latLonToVector3(segment.start_lat, segment.start_lon);
                        const endPos = this.latLonToVector3(segment.end_lat, segment.end_lon);
                        const length = startPos.distanceTo(endPos);
                        
                        this.dataRanges.width.min = Math.min(this.dataRanges.width.min, length);
                        this.dataRanges.width.max = Math.max(this.dataRanges.width.max, length);
                    });
                }
            } else {
                this.calculateVariableRange(segmentData, this.settings.routes.widthVariable, 'width');
            }
        }
        
        // Generate colors based on categories if needed
        const colors = {};
        let colorIndex = 0;
        const predefinedColors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
            0xffa500, 0x800080, 0x008000, 0x800000, 0x008080, 0x000080
        ];
        
        // Enable or disable glow effect
        this.setGlowEffect(this.settings.routes.style === 'glow');
        
        // Create lines for each segment
        segmentData.forEach(segment => {
            const lineGeometry = new THREE.BufferGeometry();
            
            const startPos = this.latLonToVector3(segment.start_lat, segment.start_lon);
            const endPos = this.latLonToVector3(segment.end_lat, segment.end_lon);
            
            const positions = [
                startPos.x, startPos.y, startPos.z,
                endPos.x, endPos.y, endPos.z
            ];
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            // Calculate segment length for special variables
            const length = startPos.distanceTo(endPos);
            
            // Determine line width based on settings
            let lineWidth = this.settings.routes.width;
            if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
                let value;
                if (this.settings.routes.widthVariable === '$length') {
                    value = length;
                } else {
                    value = segment[this.settings.routes.widthVariable];
                }
                
                if (value !== undefined) {
                    lineWidth = this.calculateDataValue(
                        value,
                        this.dataRanges.width.min,
                        this.dataRanges.width.max,
                        this.settings.routes.widthRange.min,
                        this.settings.routes.widthRange.max,
                        this.settings.routes.transform
                    );
                    
                    // Ensure width is applied properly
                    // WebGL may limit linewidth so we log for debug
                    console.log(`Variable width: ${value} -> ${lineWidth}`);
                }
            }
            
            // Determine color based on settings
            let segmentColor;
            
            if (this.settings.routes.colorMode === 'category' && categories && categories[segment.segment_id]) {
                const category = categories[segment.segment_id];
                if (!colors[category]) {
                    colors[category] = predefinedColors[colorIndex % predefinedColors.length];
                    colorIndex++;
                }
                segmentColor = colors[category];
            } else if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
                let value;
                if (this.settings.routes.variable === '$length') {
                    value = length;
                } else {
                    value = segment[this.settings.routes.variable];
                }
                
                if (value !== undefined) {
                    segmentColor = this.getColorFromValue(
                        value,
                        this.dataRanges.color.min,
                        this.dataRanges.color.max,
                        this.settings.routes.colorRamp,
                        this.settings.routes.transform
                    );
                } else {
                    segmentColor = new THREE.Color(this.settings.routes.color);
                }
            } else {
                segmentColor = new THREE.Color(this.settings.routes.color);
            }
            
            // Create material based on line style
            let lineMaterial;
            
            switch(this.settings.routes.style) {
                case 'dash':
                    // Use custom dash settings if defined
                    const dashSettings = this.settings.routes.dashSettings || { dashSize: 0.1, gapSize: 0.05 };
                    
                    lineMaterial = new THREE.LineDashedMaterial({
                        color: segmentColor,
                        linewidth: lineWidth,
                        scale: 1,
                        dashSize: dashSettings.dashSize,
                        gapSize: dashSettings.gapSize
                    });
                    break;
                case 'glow':
                    // Using normal line material but with bloom pass effect
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth,
                        transparent: true,
                        opacity: 0.8
                    });
                    break;
                case 'arrow':
                    // Use standard line material, arrows added separately
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth
                    });
                    break;
                default: // solid
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth
                    });
            }
            
            // Use tube geometry for 3D thickness if specified
            let line;
            const thickness = this.settings.routes.thickness || 0;
            
            if (thickness > 0) {
                try {
                    // Create points for a smoother tube
                    const curvePoints = [];
                    const tubeSegments = 12;
                    
                    for (let j = 0; j <= tubeSegments; j++) {
                        const t = j / tubeSegments;
                        const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
                        curvePoints.push(pos);
                    }
                    
                    // Create a smooth curve
                    const curve = new THREE.CatmullRomCurve3(curvePoints);
                    
                    // Create tube geometry
                    const tubeGeometry = new THREE.TubeGeometry(
                        curve,              // path
                        tubeSegments,       // tubularSegments
                        thickness * 0.01,   // radius
                        8,                  // radiusSegments
                        false               // closed
                    );
                    
                    // Create tube mesh
                    const tubeMaterial = new THREE.MeshBasicMaterial({
                        color: segmentColor,
                        transparent: this.settings.routes.style === 'glow',
                        opacity: this.settings.routes.style === 'glow' ? 0.8 : 1.0
                    });
                    
                    line = new THREE.Mesh(tubeGeometry, tubeMaterial);
                } catch (error) {
                    console.error("Error creating tube for ordered trajectory:", error);
                    // Fall back to regular line
                    line = new THREE.Line(lineGeometry, lineMaterial);
                }
            } else {
                line = new THREE.Line(lineGeometry, lineMaterial);
                
                // Compute line distances for dashed lines
                if (this.settings.routes.style === 'dash') {
                    line.computeLineDistances();
                }
            }
            
            line.userData = { 
                segmentId: segment.segment_id,
                type: 'segment',
                data: segment
            };
            
            this.routesGroup.add(line);
            
            // Add arrows for arrow style
            if (this.settings.routes.style === 'arrow') {
                // For segments, add a single arrow in the middle
                const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
                const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
                this.addArrow(midPoint, direction, segmentColor, lineWidth);
            }
        });
        
        // Create legend based on color mode
        if (this.settings.routes.colorMode === 'category' && Object.keys(colors).length > 0) {
            this.createCategoryLegend(colors);
        } else if (this.settings.routes.colorMode === 'variable') {
            this.createContinuousLegend(
                this.settings.routes.variable,
                this.dataRanges.color.min,
                this.dataRanges.color.max,
                this.settings.routes.colorRamp
            );
        } else {
            this.removeLegend();
        }
    }
    
    // Add OD Matrix (points + edges)
    addODMatrix(points, edges, categories = null) {
        this.clearRoutes();
        this.clearPoints();
        
        // Find unique columns for variables in edges
        const variableColumns = new Set();
        if (edges.length > 0) {
            Object.keys(edges[0]).forEach(key => {
                if (!['source', 'destination', 'category'].includes(key) && 
                    typeof edges[0][key] === 'number') {
                    variableColumns.add(key);
                }
            });
        }
        
        // Add special calculated variables
        variableColumns.add('$length');
        
        // Update UI with available variables if needed
        this.updateVariableOptions([...variableColumns]);
        
        // Find unique columns for point size variables
        const pointSizeVariables = new Set();
        if (points.length > 0) {
            Object.keys(points[0]).forEach(key => {
                if (!['id', 'lat', 'lon', 'name'].includes(key) && 
                    typeof points[0][key] === 'number') {
                    pointSizeVariables.add(key);
                }
            });
        }
        
        // Update UI with available point size variables if needed
        this.updatePointSizeOptions([...pointSizeVariables]);
        
        // Add points
        const pointsMap = {};
        
        // Find min/max values for data-driven styling if needed for points
        if (this.settings.points.sizeMode === 'variable' && this.settings.points.sizeVariable) {
            this.calculateVariableRange(points, this.settings.points.sizeVariable, 'pointSize');
        }
        
        // Create sphere geometry for points
        const pointMaterial = new THREE.MeshBasicMaterial({ 
            color: this.settings.points.color,
            transparent: true,
            opacity: 0.8
        });
        
        points.forEach(point => {
            const position = this.latLonToVector3(point.lat, point.lon);
            pointsMap[point.id] = position;
            
            // Determine point size
            let pointSize = this.settings.points.size;
            if (this.settings.points.sizeMode === 'variable' && this.settings.points.sizeVariable) {
                const value = point[this.settings.points.sizeVariable];
                if (value !== undefined) {
                    pointSize = this.calculateDataValue(
                        value,
                        this.dataRanges.pointSize.min,
                        this.dataRanges.pointSize.max,
                        this.settings.points.sizeRange.min,
                        this.settings.points.sizeRange.max,
                        this.settings.points.sizeTransform
                    );
                }
            }
            
            const sphereGeometry = new THREE.SphereGeometry(0.01 * pointSize, 16, 16);
            const sphere = new THREE.Mesh(sphereGeometry, pointMaterial.clone());
            sphere.position.copy(position);
            sphere.userData = { pointId: point.id, data: point };
            this.pointsGroup.add(sphere);
        });
        
        // Find min/max values for data-driven styling if needed for edges
        if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
            if (this.settings.routes.variable === '$length') {
                // Calculate lengths for all edges
                this.dataRanges.color.min = Infinity;
                this.dataRanges.color.max = -Infinity;
                
                edges.forEach(edge => {
                    if (pointsMap[edge.source] && pointsMap[edge.destination]) {
                        const startPos = pointsMap[edge.source];
                        const endPos = pointsMap[edge.destination];
                        const length = startPos.distanceTo(endPos);
                        
                        this.dataRanges.color.min = Math.min(this.dataRanges.color.min, length);
                        this.dataRanges.color.max = Math.max(this.dataRanges.color.max, length);
                    }
                });
            } else {
                this.calculateVariableRange(edges, this.settings.routes.variable, 'color');
            }
        }
        
        if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
            if (this.settings.routes.widthVariable === '$length') {
                // Calculate lengths for all edges if not already done
                if (this.dataRanges.width.min === undefined || this.dataRanges.width.max === undefined) {
                    this.dataRanges.width.min = Infinity;
                    this.dataRanges.width.max = -Infinity;
                    
                    edges.forEach(edge => {
                        if (pointsMap[edge.source] && pointsMap[edge.destination]) {
                            const startPos = pointsMap[edge.source];
                            const endPos = pointsMap[edge.destination];
                            const length = startPos.distanceTo(endPos);
                            
                            this.dataRanges.width.min = Math.min(this.dataRanges.width.min, length);
                            this.dataRanges.width.max = Math.max(this.dataRanges.width.max, length);
                        }
                    });
                }
            } else {
                this.calculateVariableRange(edges, this.settings.routes.widthVariable, 'width');
            }
        }
        
        // Generate colors based on categories if needed
        const colors = {};
        let colorIndex = 0;
        const predefinedColors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
            0xffa500, 0x800080, 0x008000, 0x800000, 0x008080, 0x000080
        ];
        
        // Enable or disable glow effect
        this.setGlowEffect(this.settings.routes.style === 'glow');
        
        // Create lines for each edge
        edges.forEach(edge => {
            if (pointsMap[edge.source] && pointsMap[edge.destination]) {
                const startPos = pointsMap[edge.source];
                const endPos = pointsMap[edge.destination];
                
                // Create a curved line
                const distance = startPos.distanceTo(endPos);
                
                // Calculate arc points based on arc height
                const curvePoints = [];

                // Determine number of segments based on angle between points
                const angle = startPos.angleTo(endPos);
                const segments = angle > Math.PI / 2 ? 100 : 50;

                const quaternionStart = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    startPos.clone().normalize()
                );
                const quaternionEnd = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    endPos.clone().normalize()
                );

                // Generate points along the great circle and raise them based on arc height
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const quaternionInterpolated = new THREE.Quaternion().slerpQuaternions(
                        quaternionStart,
                        quaternionEnd,
                        t
                    );

                    const surfacePos = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionInterpolated);
                    const elevation = this.settings.routes.arcHeight * Math.sin(Math.PI * t);
                    curvePoints.push(surfacePos.multiplyScalar(1 + elevation));
                }
                
                // Extract positions for line geometry
                const positions = [];
                curvePoints.forEach(p => {
                    positions.push(p.x, p.y, p.z);
                });
                
                const lineGeometry = new THREE.BufferGeometry();
                lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                
                // Calculate edge length for special variables
                const length = startPos.distanceTo(endPos);
                
                // Determine line width based on settings
                let lineWidth = this.settings.routes.width;
                if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
                    let value;
                    if (this.settings.routes.widthVariable === '$length') {
                        value = length;
                    } else {
                        value = edge[this.settings.routes.widthVariable];
                    }
                    
                    if (value !== undefined) {
                        lineWidth = this.calculateDataValue(
                            value,
                            this.dataRanges.width.min,
                            this.dataRanges.width.max,
                            this.settings.routes.widthRange.min,
                            this.settings.routes.widthRange.max,
                            this.settings.routes.transform
                        );
                        
                        // Ensure width is applied properly
                        // WebGL may limit linewidth so we log for debug
                        console.log(`Variable width: ${value} -> ${lineWidth}`);
                    }
                }
                
                // Ensure lineWidth is a valid value
                if (lineWidth === undefined || isNaN(lineWidth) || lineWidth <= 0) {
                    lineWidth = 1;
                    console.warn('Invalid lineWidth, using default value of 1');
                }
            
                // Determine color based on settings
                let edgeColor;
                
                if (this.settings.routes.colorMode === 'category' && categories && edge.category) {
                    const category = edge.category;
                    if (!colors[category]) {
                        colors[category] = predefinedColors[colorIndex % predefinedColors.length];
                        colorIndex++;
                    }
                    edgeColor = colors[category];
                } else if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
                    let value;
                    if (this.settings.routes.variable === '$length') {
                        value = length;
                    } else {
                        value = edge[this.settings.routes.variable];
                    }
                    
                    if (value !== undefined) {
                        edgeColor = this.getColorFromValue(
                            value,
                            this.dataRanges.color.min,
                            this.dataRanges.color.max,
                            this.settings.routes.colorRamp,
                            this.settings.routes.transform
                        );
                    } else {
                        edgeColor = new THREE.Color(this.settings.routes.color);
                    }
                } else {
                    edgeColor = new THREE.Color(this.settings.routes.color);
                }
                
                // Create material based on line style
                let lineMaterial;
                
                switch(this.settings.routes.style) {
                    case 'dash':
                        // Use custom dash settings if defined
                        const dashSettings = this.settings.routes.dashSettings || { dashSize: 0.1, gapSize: 0.05 };
                        
                        lineMaterial = new THREE.LineDashedMaterial({
                            color: edgeColor,
                            linewidth: lineWidth,
                            scale: 1,
                            dashSize: dashSettings.dashSize,
                            gapSize: dashSettings.gapSize
                        });
                        break;
                    case 'glow':
                        // Using normal line material but with bloom pass effect
                        lineMaterial = new THREE.LineBasicMaterial({
                            color: edgeColor,
                            linewidth: lineWidth,
                            transparent: true,
                            opacity: 0.8
                        });
                        break;
                    case 'arrow':
                        // Use standard line material, arrows added separately
                        lineMaterial = new THREE.LineBasicMaterial({
                            color: edgeColor,
                            linewidth: lineWidth
                        });
                        break;
                    default: // solid
                        lineMaterial = new THREE.LineBasicMaterial({
                            color: edgeColor,
                            linewidth: lineWidth
                        });
                }
                
                let line;
                
                // Use tube geometry for 3D thickness if specified
                const thickness = this.settings.routes.thickness || 0;
                
                if (thickness > 0) {
                    try {
                        // Create a series of points for smoother tube
                        const curvePoints = [];
                        const tubeSegments = 12;
                        
                        for (let i = 0; i <= tubeSegments; i++) {
                            const t = i / tubeSegments;
                            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
                            curvePoints.push(pos);
                        }
                        
                        // Create a smooth curve
                        const curve = new THREE.CatmullRomCurve3(curvePoints);
                        
                        // Create tube geometry
                        const tubeGeometry = new THREE.TubeGeometry(
                            curve,              // path
                            tubeSegments,       // tubularSegments
                            thickness * 0.01,   // radius
                            8,                  // radiusSegments
                            false               // closed
                        );
                        
                        // Create tube mesh
                        const tubeMaterial = new THREE.MeshBasicMaterial({
                            color: edgeColor,
                            transparent: this.settings.routes.style === 'glow',
                            opacity: this.settings.routes.style === 'glow' ? 0.8 : 1.0
                        });
                        
                        line = new THREE.Mesh(tubeGeometry, tubeMaterial);
                    } catch (error) {
                        console.error("Error creating tube for arc:", error);
                        // Fall back to regular line
                        line = new THREE.Line(lineGeometry, lineMaterial);
                        
                        // Compute line distances for dashed lines
                        if (this.settings.routes.style === 'dash') {
                            line.computeLineDistances();
                        }
                    }
                } else {
                    // Standard line
                    line = new THREE.Line(lineGeometry, lineMaterial);
                    
                    // Compute line distances for dashed lines
                    if (this.settings.routes.style === 'dash') {
                        line.computeLineDistances();
                    }
                }
                
                line.userData = { 
                    source: edge.source, 
                    destination: edge.destination,
                    type: 'edge',
                    data: edge
                };
                
                this.routesGroup.add(line);
                
                // Add arrows for arrow style
                if (this.settings.routes.style === 'arrow' && curvePoints && curvePoints.length > 2) {
                    try {
                        // For OD matrix edges, add an arrow at 2/3 of the curve
                        const pointIndex = Math.floor(curvePoints.length * 0.67);
                        if (curvePoints[pointIndex]) {
                            const arrowPosition = curvePoints[pointIndex];
                            
                            // Get direction by using adjacent points
                            const prevPoint = curvePoints[Math.max(0, pointIndex - 1)];
                            const nextPoint = curvePoints[Math.min(curvePoints.length - 1, pointIndex + 1)];
                            const tangent = new THREE.Vector3().subVectors(nextPoint, prevPoint).normalize();
                            
                            this.addArrow(arrowPosition, tangent, edgeColor, lineWidth);
                        }
                    } catch (error) {
                        console.error("Error adding arrow:", error);
                    }
                }
            }
        });
        
        // Create legend based on color mode
        if (this.settings.routes.colorMode === 'category' && Object.keys(colors).length > 0) {
            this.createCategoryLegend(colors);
        } else if (this.settings.routes.colorMode === 'variable') {
            this.createContinuousLegend(
                this.settings.routes.variable,
                this.dataRanges.color.min,
                this.dataRanges.color.max,
                this.settings.routes.colorRamp
            );
        } else {
            this.removeLegend();
        }
    }
    
    updateArcHeight(height) {
        this.settings.routes.arcHeight = height;
        
        // If we have OD matrix data, refresh the visualization immediately
        if (this.routesGroup.children.length > 0 && 
            this.routesGroup.children[0].userData && 
            this.routesGroup.children[0].userData.type === 'edge') {
            
            // Store references to all the current data
            const edges = [];
            const points = {};
            let categories = null;
            
            // Collect data from existing visualization
            this.routesGroup.children.forEach(line => {
                if (line.userData && line.userData.data) {
                    edges.push(line.userData.data);
                }
            });
            
            this.pointsGroup.children.forEach(point => {
                if (point.userData && point.userData.data) {
                    const data = point.userData.data;
                    points[data.id] = data;
                }
            });
            
            // Clear current visualization
            this.clearRoutes();
            
            // Redraw with new arc height
            if (Object.keys(points).length > 0 && edges.length > 0) {
                const pointsList = Object.values(points);
                this.addODMatrix(pointsList, edges, categories);
            }
        }
    }
    
    // Update route styling
    updateRouteColorMode(mode) {
        this.settings.routes.colorMode = mode;
    }
    
    updateRouteColor(color) {
        this.settings.routes.color = color;
        
        if (this.settings.routes.colorMode === 'single') {
            this.routesGroup.children.forEach(line => {
                if (line.material) {
                    line.material.color.set(color);
                }
            });
        }
    }
    
    updateRouteWidth(width) {
        console.log(`GlobeManager: Updating route width to ${width}`);
        
        // Store the setting
        this.settings.routes.width = width;
        
        if (this.settings.routes.widthMode === 'fixed') {
            // Apply immediately to all routes
            this.routesGroup.children.forEach(line => {
                if (line.material) {
                    // For standard lines (not tubes)
                    if (typeof line.material.linewidth !== 'undefined') {
                        line.material.linewidth = width;
                        line.material.needsUpdate = true;
                        
                        // If it's a LineDashedMaterial, recompute distances
                        if (line.material instanceof THREE.LineDashedMaterial) {
                            line.computeLineDistances();
                        }
                    }
                }
            });
            
            // For 3D tubes, we need to refresh when width changes
            // since width also affects arrow size and other elements
            if (this.settings.routes.thickness > 0) {
                this.refreshVisualization();
            }
            
            // Note: WebGL has limitations on line width
            if (width > 3) {
                console.warn(`Line width ${width} may be capped at 1.0 in WebGL in most browsers. Consider using thickness for wider lines.`);
            }
        }
    }
    
    updateRouteThickness(thickness) {
        console.log(`GlobeManager: Updating route thickness to ${thickness}`);
        
        // Store the previous value
        const previousThickness = this.settings.routes.thickness;
        this.settings.routes.thickness = thickness;
        
        // If thickness changed significantly, we need to recreate geometry
        if (Math.abs(previousThickness - thickness) > 0.01) {
            this.refreshVisualization();
        }
    }
    
    
    // Create legend for categories
    createLegend(colors) {
        this.removeLegend();
        
        const legend = document.createElement('div');
        legend.classList.add('legend');
        legend.innerHTML = '<div class="font-bold mb-2">Categories</div>';
        
        Object.entries(colors).forEach(([category, color]) => {
            const colorHex = '#' + new THREE.Color(color).getHexString();
            
            const item = document.createElement('div');
            item.classList.add('legend-item');
            
            const colorBox = document.createElement('div');
            colorBox.classList.add('legend-color');
            colorBox.style.backgroundColor = colorHex;
            
            const label = document.createElement('div');
            label.textContent = category;
            
            item.appendChild(colorBox);
            item.appendChild(label);
            legend.appendChild(item);
        });
        
        this.container.appendChild(legend);
        this.legend = legend;
    }
    
    // Create gradient legend
    createGradientLegend() {
        this.removeLegend();
        
        const legend = document.createElement('div');
        legend.classList.add('legend');
        legend.innerHTML = '<div class="font-bold mb-2">Sequence</div>';
        
        const gradientBox = document.createElement('div');
        gradientBox.style.height = '20px';
        gradientBox.style.width = '100%';
        gradientBox.style.background = 'linear-gradient(to right, #ff0000, #0000ff)';
        gradientBox.style.borderRadius = '2px';
        gradientBox.style.marginBottom = '4px';
        
        const labels = document.createElement('div');
        labels.style.display = 'flex';
        labels.style.justifyContent = 'space-between';
        
        const startLabel = document.createElement('div');
        startLabel.textContent = 'Start';
        startLabel.style.fontSize = '10px';
        
        const endLabel = document.createElement('div');
        endLabel.textContent = 'End';
        endLabel.style.fontSize = '10px';
        
        labels.appendChild(startLabel);
        labels.appendChild(endLabel);
        
        legend.appendChild(gradientBox);
        legend.appendChild(labels);
        
        this.container.appendChild(legend);
        this.legend = legend;
    }
    
    removeLegend() {
        if (this.legend && this.legend.parentNode) {
            this.legend.parentNode.removeChild(this.legend);
        }
        this.legend = null;
    }
    
    // Initialize tooltip for points
    initTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.classList.add('tooltip');
        document.body.appendChild(this.tooltip);
        
        // Raycaster for point intersection
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.1;
        
        // Add mouse move event listener
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mouseout', () => {
            this.tooltip.style.display = 'none';
        });
    }
    
    onMouseMove(event) {
        if (this.pointsGroup.children.length === 0) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const containerRect = this.container.getBoundingClientRect();
        
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - containerRect.left) / containerRect.width) * 2 - 1;
        mouse.y = -((event.clientY - containerRect.top) / containerRect.height) * 2 + 1;
        
        // Update the raycaster
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Find intersections with points
        const intersects = this.raycaster.intersectObjects(this.pointsGroup.children);
        
        if (intersects.length > 0) {
            const point = intersects[0].object;
            const pointData = point.userData.data;
            
            if (pointData) {
                let tooltipHTML = '<div class="font-bold">Point ID: ' + pointData.id + '</div>';
                
                // Add all properties to tooltip
                Object.entries(pointData).forEach(([key, value]) => {
                    if (key !== 'id') {
                        tooltipHTML += `<div>${key}: ${value}</div>`;
                    }
                });
                
                this.tooltip.innerHTML = tooltipHTML;
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = (event.clientX + 10) + 'px';
                this.tooltip.style.top = (event.clientY + 10) + 'px';
            }
        } else {
            this.tooltip.style.display = 'none';
        }
    }
    
    // Export image as PNG
    exportImage() {
        try {
            this.renderer.render(this.scene, this.camera);
            
            // Create a direct download link
            const link = document.createElement('a');
            link.download = 'globe-view.png';
            link.href = this.renderer.domElement.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            link.click();
        } catch (error) {
            console.error('Error exporting image:', error);
        }
    }
    
    // Add ordered trajectories
    addOrderedTrajectories(trajectoryData) {
        this.clearRoutes();
        
        // Find unique columns for variables
        const variableColumns = new Set();
        if (trajectoryData.length > 0) {
            Object.keys(trajectoryData[0]).forEach(key => {
                if (!['order', 'start_lat', 'start_lon', 'end_lat', 'end_lon'].includes(key) && 
                    typeof trajectoryData[0][key] === 'number') {
                    variableColumns.add(key);
                }
            });
        }
        
        // Add special calculated variables
        variableColumns.add('$length');
        variableColumns.add('$order');
        
        // Update UI with available variables if needed
        this.updateVariableOptions([...variableColumns]);
        
        // Sort trajectories by order
        trajectoryData.sort((a, b) => a.order - b.order);
        
        // Calculate segment lengths and prepare for data-driven styling
        const segmentLengths = [];
        
        for (let i = 0; i < trajectoryData.length; i++) {
            const segment = trajectoryData[i];
            const startPos = this.latLonToVector3(segment.start_lat, segment.start_lon);
            const endPos = this.latLonToVector3(segment.end_lat, segment.end_lon);
            const length = startPos.distanceTo(endPos);
            segmentLengths.push(length);
        }
        
        // Find min/max values for data-driven styling if needed
        if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
            if (this.settings.routes.variable === '$length') {
                this.dataRanges.color.min = Math.min(...segmentLengths);
                this.dataRanges.color.max = Math.max(...segmentLengths);
            } else if (this.settings.routes.variable === '$order') {
                this.dataRanges.color.min = 0;
                this.dataRanges.color.max = trajectoryData.length - 1;
            } else {
                this.calculateVariableRange(trajectoryData, this.settings.routes.variable, 'color');
            }
        }
        
        if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
            if (this.settings.routes.widthVariable === '$length') {
                this.dataRanges.width.min = Math.min(...segmentLengths);
                this.dataRanges.width.max = Math.max(...segmentLengths);
            } else if (this.settings.routes.widthVariable === '$order') {
                this.dataRanges.width.min = 0;
                this.dataRanges.width.max = trajectoryData.length - 1;
            } else {
                this.calculateVariableRange(trajectoryData, this.settings.routes.widthVariable, 'width');
            }
        }
        
        // Enable or disable glow effect
        this.setGlowEffect(this.settings.routes.style === 'glow');
        
        // Create line geometries for each segment
        for (let i = 0; i < trajectoryData.length; i++) {
            const segment = trajectoryData[i];
            const lineGeometry = new THREE.BufferGeometry();
            
            const startPos = this.latLonToVector3(segment.start_lat, segment.start_lon);
            const endPos = this.latLonToVector3(segment.end_lat, segment.end_lon);
            
            const positions = [
                startPos.x, startPos.y, startPos.z,
                endPos.x, endPos.y, endPos.z
            ];
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            // Determine color based on settings
            let segmentColor;
            
            if (this.settings.routes.colorMode === 'gradient') {
                // Calculate color based on position in sequence
                const ratio = i / (trajectoryData.length - 1);
                const startColor = new THREE.Color(0xff0000); // Red
                const endColor = new THREE.Color(0x0000ff); // Blue
                segmentColor = new THREE.Color().lerpColors(startColor, endColor, ratio);
            } else if (this.settings.routes.colorMode === 'variable' && this.settings.routes.variable) {
                let value;
                
                if (this.settings.routes.variable === '$length') {
                    value = segmentLengths[i];
                } else if (this.settings.routes.variable === '$order') {
                    value = i;
                } else {
                    value = segment[this.settings.routes.variable];
                }
                
                if (value !== undefined) {
                    segmentColor = this.getColorFromValue(
                        value,
                        this.dataRanges.color.min,
                        this.dataRanges.color.max,
                        this.settings.routes.colorRamp,
                        this.settings.routes.transform
                    );
                } else {
                    segmentColor = new THREE.Color(this.settings.routes.color);
                }
            } else {
                segmentColor = new THREE.Color(this.settings.routes.color);
            }
            
            // Determine line width based on settings
            let lineWidth = this.settings.routes.width;
            if (this.settings.routes.widthMode === 'variable' && this.settings.routes.widthVariable) {
                let value;
                
                if (this.settings.routes.widthVariable === '$length') {
                    value = segmentLengths[i];
                } else if (this.settings.routes.widthVariable === '$order') {
                    value = i;
                } else {
                    value = segment[this.settings.routes.widthVariable];
                }
                
                if (value !== undefined) {
                    lineWidth = this.calculateDataValue(
                        value,
                        this.dataRanges.width.min,
                        this.dataRanges.width.max,
                        this.settings.routes.widthRange.min,
                        this.settings.routes.widthRange.max,
                        this.settings.routes.transform
                    );
                }
            }
            
            // Create material based on line style
            let lineMaterial;
            
            switch(this.settings.routes.style) {
                case 'dash':
                    // Use custom dash settings if defined
                    const dashSettings = this.settings.routes.dashSettings || { dashSize: 0.1, gapSize: 0.05 };
                    
                    lineMaterial = new THREE.LineDashedMaterial({
                        color: segmentColor,
                        linewidth: lineWidth,
                        scale: 1,
                        dashSize: dashSettings.dashSize,
                        gapSize: dashSettings.gapSize
                    });
                    break;
                case 'glow':
                    // Using normal line material but with bloom pass effect
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth,
                        transparent: true,
                        opacity: 0.8
                    });
                    break;
                case 'arrow':
                    // Use standard line material, arrows added separately
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth
                    });
                    break;
                default: // solid
                    lineMaterial = new THREE.LineBasicMaterial({
                        color: segmentColor,
                        linewidth: lineWidth
                    });
            }
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData = { 
                order: i,
                type: 'ordered-segment',
                data: segment
            };
            
            // Compute line distances for dashed lines
            if (this.settings.routes.style === 'dash') {
                line.computeLineDistances();
            }
            
            this.routesGroup.add(line);
            
            // Add arrows for arrow style
            if (this.settings.routes.style === 'arrow') {
                const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
                const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
                this.addArrow(midPoint, direction, segmentColor, lineWidth);
            }
        }
        
        // Create a simple gradient legend for ordered trajectories
        if (this.settings.routes.colorMode === 'gradient') {
            this.createGradientLegend();
        } else if (this.settings.routes.colorMode === 'variable') {
            this.createContinuousLegend(
                this.settings.routes.variable,
                this.dataRanges.color.min,
                this.dataRanges.color.max,
                this.settings.routes.colorRamp
            );
        } else {
            this.removeLegend();
        }
    }
    
    // Update variable options in UI
    updateVariableOptions(variables) {
        // This will be implemented by the UI manager
        // Placeholder for potential event emitting
        if (typeof this.onVariablesUpdated === 'function') {
            this.onVariablesUpdated(variables, 'color');
        }
    }
    
    // Update point size variable options in UI
    updatePointSizeOptions(variables) {
        // This will be implemented by the UI manager
        // Placeholder for potential event emitting
        if (typeof this.onVariablesUpdated === 'function') {
            this.onVariablesUpdated(variables, 'pointSize');
        }
    }
    
    // Calculate min/max ranges for data-driven styling
    calculateVariableRange(data, variableName, rangeType) {
        if (!data || data.length === 0 || !variableName) return;
        
        // Extract values for the specified variable
        const values = data
            .map(item => item[variableName])
            .filter(value => value !== undefined && value !== null && !isNaN(value));
        
        if (values.length === 0) return;
        
        // Calculate min and max
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Store in appropriate range object
        this.dataRanges[rangeType].min = min;
        this.dataRanges[rangeType].max = max;
    }
    

    // Update route styling
    updateRouteColorMode(mode) {
        this.settings.routes.colorMode = mode;
    }
    
    updateRouteColor(color) {
        this.settings.routes.color = color;
        
        if (this.settings.routes.colorMode === 'single') {
            this.routesGroup.children.forEach(line => {
                if (line.material) {
                    line.material.color.set(color);
                }
            });
        }
    }
    
    
    updateWidthMode(mode) {
        this.settings.routes.widthMode = mode;
    }
    
    updateColorVariable(variable) {
        this.settings.routes.variable = variable;
    }
    
    updateWidthVariable(variable) {
        this.settings.routes.widthVariable = variable;
    }
    
    updateColorRamp(ramp) {
        this.settings.routes.colorRamp = ramp;
    }
    
    updateCustomColors(startColor, endColor) {
        this.settings.routes.customColors.start = startColor;
        this.settings.routes.customColors.end = endColor;
    }
    
    updateTransform(transform, type) {
        if (type === 'color') {
            this.settings.routes.transform = transform;
        } else if (type === 'width') {
            this.settings.routes.widthTransform = transform;
        } else if (type === 'pointSize') {
            this.settings.points.sizeTransform = transform;
        }
    }
    
    updateWidthRange(min, max) {
        this.settings.routes.widthRange.min = min;
        this.settings.routes.widthRange.max = max;
    }
    
    updateThicknessRange(min, max) {
        this.settings.routes.thicknessRange.min = min;
        this.settings.routes.thicknessRange.max = max;
        this.refreshVisualization();
    }
    
    updateLineStyle(style) {
        this.settings.routes.style = style;
        
        // Enable or disable glow effect
        this.setGlowEffect(style === 'glow');
    }
    
    // Set bloom effect for glowing lines
    setGlowEffect(enabled) {
        this.bloomPass.enabled = enabled;
        this.effectsEnabled = enabled;
    }
    
    // Add arrows to a line
    addArrowsToLine(points, color, lineWidth = 1) {
        if (points.length < 2) return;
        
        // Ensure lineWidth has a valid value
        if (lineWidth === undefined || isNaN(lineWidth) || lineWidth <= 0) {
            lineWidth = 1;
        }
        
        // Add arrows at regular intervals
        const arrowCount = Math.min(5, points.length - 1);
        const step = Math.floor((points.length - 1) / arrowCount);
        
        for (let i = step; i < points.length; i += step) {
            const startPoint = points[i-1];
            const endPoint = points[i];
            
            // Skip if point data is invalid
            if (!startPoint || !startPoint.lat || !startPoint.lon || 
                !endPoint || !endPoint.lat || !endPoint.lon) {
                continue;
            }
            
            const startPos = this.latLonToVector3(startPoint.lat, startPoint.lon);
            const endPos = this.latLonToVector3(endPoint.lat, endPoint.lon);
            
            const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
            const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            
            this.addArrow(midPoint, direction, color, lineWidth);
        }
    }
    
    // Add a single arrow
    addArrow(position, direction, color, lineWidth = 1) {
        // Ensure position and direction are valid
        if (!position || !direction) {
            console.warn('Invalid parameters for addArrow', { position, direction });
            return;
        }
        
        // Ensure lineWidth has a valid value
        if (lineWidth === undefined || isNaN(lineWidth) || lineWidth <= 0) {
            lineWidth = 1;
        }
        
        // Create arrow
        const arrowLength = 0.1 * lineWidth;
        const arrowGeometry = new THREE.ConeGeometry(0.02 * lineWidth, arrowLength, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        
        // Position the arrow
        arrow.position.copy(position);
        
        // Orient the arrow along the direction
        const axis = new THREE.Vector3(0, 1, 0);
        arrow.quaternion.setFromUnitVectors(axis, direction);
        arrow.rotateX(Math.PI / 2); // Rotate to point correctly
        
        // Add to routes group
        this.routesGroup.add(arrow);
    }
    
    // Update point styling
    togglePoints(visible) {
        this.settings.points.visible = visible;
        this.pointsGroup.visible = visible;
    }
    
    updatePointSizeMode(mode) {
        this.settings.points.sizeMode = mode;
    }
    
    updatePointSize(size) {
        this.settings.points.size = size;
        
        if (this.settings.points.sizeMode === 'fixed') {
            this.clearPoints();
            // Re-render points with new size (handled by UI manager)
        }
    }
    
    updatePointSizeVariable(variable) {
        this.settings.points.sizeVariable = variable;
    }
    
    updatePointSizeRange(min, max) {
        this.settings.points.sizeRange.min = min;
        this.settings.points.sizeRange.max = max;
    }
    
    updatePointColor(color) {
        this.settings.points.color = color;
        
        this.pointsGroup.children.forEach(point => {
            if (point.material) {
                point.material.color.set(color);
            }
        });
    }
    
    // Create legend for categories
    createCategoryLegend(colors) {
        this.removeLegend();
        
        const legend = document.createElement('div');
        legend.classList.add('legend');
        
        const title = document.createElement('div');
        title.classList.add('legend-title');
        title.textContent = 'Categories';
        legend.appendChild(title);
        
        Object.entries(colors).forEach(([category, color]) => {
            const colorHex = '#' + new THREE.Color(color).getHexString();
            
            const item = document.createElement('div');
            item.classList.add('legend-item');
            
            const colorBox = document.createElement('div');
            colorBox.classList.add('legend-color');
            colorBox.style.backgroundColor = colorHex;
            
            const label = document.createElement('div');
            label.textContent = category;
            
            item.appendChild(colorBox);
            item.appendChild(label);
            legend.appendChild(item);
        });
        
        this.container.appendChild(legend);
        this.legend = legend;
    }
    
    // Create continuous legend for variable-based coloring
    createContinuousLegend(variableName, min, max, colorRamp) {
        this.removeLegend();
        
        const legend = document.createElement('div');
        legend.classList.add('legend');
        
        // Format min/max values for display
        const formatValue = (val) => {
            if (Math.abs(val) < 0.01 || Math.abs(val) > 10000) {
                return val.toExponential(2);
            } else {
                return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
        };
        
        const displayMin = formatValue(min);
        const displayMax = formatValue(max);
        
        // Create title
        const title = document.createElement('div');
        title.classList.add('legend-title');
        title.textContent = variableName === '$length' ? 'Distance' : variableName;
        legend.appendChild(title);
        
        // Create gradient bar
        const continuousLegend = document.createElement('div');
        continuousLegend.classList.add('continuous-legend');
        
        const gradientBar = document.createElement('div');
        gradientBar.classList.add('gradient-bar');
        
        // Set gradient background based on color ramp
        let gradientStyle = '';
        
        if (colorRamp === 'custom') {
            gradientStyle = `linear-gradient(to right, ${this.settings.routes.customColors.start}, ${this.settings.routes.customColors.end})`;
        } else if (colorRamp === 'red-blue') {
            gradientStyle = 'linear-gradient(to right, #ff0000, #0000ff)';
        } else if (colorRamp === 'red-yellow-green') {
            gradientStyle = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00)';
        } else {
            // Approximate other color ramps
            switch (colorRamp) {
                case 'viridis':
                    gradientStyle = 'linear-gradient(to right, #440154, #414487, #2a788e, #22a884, #7ad151, #fde725)';
                    break;
                case 'plasma':
                    gradientStyle = 'linear-gradient(to right, #0d0887, #6a00a8, #b12a90, #e16462, #fca636, #f0f921)';
                    break;
                case 'inferno':
                    gradientStyle = 'linear-gradient(to right, #000004, #320a5a, #781c6d, #bb3754, #ed6925, #fcffa4)';
                    break;
                case 'magma':
                    gradientStyle = 'linear-gradient(to right, #000004, #2c105c, #711f81, #b63679, #ee605e, #fcfdbf)';
                    break;
                case 'cividis':
                    gradientStyle = 'linear-gradient(to right, #00204c, #2c456b, #666870, #9a8d72, #cdb567, #ffe945)';
                    break;
                case 'rainbow':
                    gradientStyle = 'linear-gradient(to right, #6e40aa, #be3caf, #fe4b83, #ff7847, #e2b72f, #aff05b)';
                    break;
                case 'turbo':
                    gradientStyle = 'linear-gradient(to right, #30123b, #4444a4, #1a9be2, #29deaf, #92ee5a, #fefe05, #faa107, #d12600, #7a0000)';
                    break;
                default:
                    gradientStyle = 'linear-gradient(to right, #000000, #ffffff)';
            }
        }
        
        gradientBar.style.background = gradientStyle;
        continuousLegend.appendChild(gradientBar);
        
        // Create min/max labels
        const labels = document.createElement('div');
        labels.classList.add('legend-labels');
        
        const minLabel = document.createElement('div');
        minLabel.textContent = displayMin;
        
        const maxLabel = document.createElement('div');
        maxLabel.textContent = displayMax;
        
        labels.appendChild(minLabel);
        labels.appendChild(maxLabel);
        
        continuousLegend.appendChild(labels);
        legend.appendChild(continuousLegend);
        
        this.container.appendChild(legend);
        this.legend = legend;
    }
    
    // Create gradient legend for ordered trajectories
    createGradientLegend() {
        this.removeLegend();
        
        const legend = document.createElement('div');
        legend.classList.add('legend');
        
        const title = document.createElement('div');
        title.classList.add('legend-title');
        title.textContent = 'Sequence';
        legend.appendChild(title);
        
        const gradientBox = document.createElement('div');
        gradientBox.classList.add('gradient-bar');
        gradientBox.style.background = 'linear-gradient(to right, #ff0000, #0000ff)';
        legend.appendChild(gradientBox);
        
        const labels = document.createElement('div');
        labels.classList.add('legend-labels');
        
        const startLabel = document.createElement('div');
        startLabel.textContent = 'Start';
        
        const endLabel = document.createElement('div');
        endLabel.textContent = 'End';
        
        labels.appendChild(startLabel);
        labels.appendChild(endLabel);
        
        legend.appendChild(labels);
        
        this.container.appendChild(legend);
        this.legend = legend;
    }
    
    updateDashSettings(dashSize, gapSize) {
        if (!this.settings.routes.dashSettings) {
            this.settings.routes.dashSettings = {};
        }
        
        this.settings.routes.dashSettings.dashSize = dashSize;
        this.settings.routes.dashSettings.gapSize = gapSize;
        
        // Update existing dashed lines
        this.routesGroup.children.forEach(line => {
            if (line.material && line.material instanceof THREE.LineDashedMaterial) {
                line.material.dashSize = dashSize;
                line.material.gapSize = gapSize;
                line.material.needsUpdate = true;
                
                // Recalculate line distances for the new dash pattern
                line.computeLineDistances();
            }
        });
    }
    
    
    // Helper method to refresh the current visualization with updated settings
    refreshVisualization() {
        // Store references to all the current data
        const routeData = [];
        const pointData = {};
        let categories = null;
        
        // Determine the current visualization type
        let visualizationType = null;
        
        if (this.routesGroup.children.length > 0) {
            const firstObject = this.routesGroup.children[0];
            if (firstObject.userData && firstObject.userData.type) {
                visualizationType = firstObject.userData.type;
            }
        }
        
        // Collect data from existing visualization
        if (visualizationType === 'edge') {
            // OD Matrix
            this.routesGroup.children.forEach(route => {
                if (route.userData && route.userData.data) {
                    routeData.push(route.userData.data);
                }
            });
            
            this.pointsGroup.children.forEach(point => {
                if (point.userData && point.userData.data) {
                    const data = point.userData.data;
                    pointData[data.id] = data;
                }
            });
            
            // Clear current visualization
            this.clearRoutes();
            this.clearPoints();
            
            // Redraw with new settings
            if (Object.keys(pointData).length > 0 && routeData.length > 0) {
                const pointsList = Object.values(pointData);
                this.addODMatrix(pointsList, routeData, categories);
            }
        } else if (visualizationType === 'route') {
            // Trajectory points
            const routes = {};
            
            this.routesGroup.children.forEach(route => {
                if (route.userData && route.userData.routeId && route.userData.data && route.userData.data.points) {
                    routes[route.userData.routeId] = route.userData.data.points;
                }
            });
            
            // Clear current visualization
            this.clearRoutes();
            
            // Flatten the points for trajectory data
            const trajectoryData = [];
            Object.keys(routes).forEach(routeId => {
                routes[routeId].forEach(point => {
                    trajectoryData.push({
                        ...point,
                        route_id: routeId
                    });
                });
            });
            
            // Redraw with new settings
            if (trajectoryData.length > 0) {
                this.addTrajectoryPoints(trajectoryData, categories);
            }
        } else if (visualizationType === 'segment') {
            // Trajectory segments
            this.routesGroup.children.forEach(segment => {
                if (segment.userData && segment.userData.data) {
                    routeData.push(segment.userData.data);
                }
            });
            
            // Clear current visualization
            this.clearRoutes();
            
            // Redraw with new settings
            if (routeData.length > 0) {
                this.addTrajectorySegments(routeData, categories);
            }
        } else if (visualizationType === 'ordered-segment') {
            // Ordered trajectories
            this.routesGroup.children.forEach(segment => {
                if (segment.userData && segment.userData.data) {
                    routeData.push(segment.userData.data);
                }
            });
            
            // Clear current visualization
            this.clearRoutes();
            
            // Redraw with new settings
            if (routeData.length > 0) {
                this.addOrderedTrajectories(routeData);
            }
        }
    }
} 