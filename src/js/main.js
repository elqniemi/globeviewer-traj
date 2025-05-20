// Globe Viewer - Main Application

// Import dependencies
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GlobeManager } from './globe.js';
import { DataLoader } from './data.js';
import { UIManager } from './ui.js';

// Make THREE available globally for other modules
window.THREE = THREE;
// Make OrbitControls available globally
window.OrbitControls = OrbitControls;

// Main application class
class GlobeViewerApp {
    constructor() {
        // Initialize components
        this.globeManager = new GlobeManager('globe-scene');
        this.dataLoader = new DataLoader();
        this.uiManager = new UIManager(this.globeManager, this.dataLoader);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
        
        // Initialize color pickers
        this.initColorPickers();
        
        // Initialize UI state
        this.initUIState();
    }
    
    initUIState() {
        // Set initial lighting mode
        const lightingMode = document.getElementById('lighting-mode').value;
        document.getElementById('day-controls').classList.toggle('hidden', lightingMode !== 'day');
        
        // Apply initial lighting preset
        this.globeManager.setLightingPreset(lightingMode);
        
        // Set initial sun position if in day mode
        if (lightingMode === 'day') {
            this.updateSunPosition();
        }
        
        // Set initial line style and dash controls visibility
        const lineStyle = document.getElementById('line-style').value;
        document.getElementById('dash-controls').classList.toggle('hidden', lineStyle !== 'dash');
    }
    
    setupEventListeners() {
        // Export PNG button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.globeManager.exportImage();
        });
        
        // Data type change
        document.getElementById('data-type').addEventListener('change', (e) => {
            this.uiManager.handleDataTypeChange(e.target.value);
        });
        
        // Load data button
        document.getElementById('load-data-btn').addEventListener('click', () => {
            this.uiManager.loadData();
        });
        
        // Route styling controls
        
        // Color mode change
        document.getElementById('color-mode').addEventListener('change', (e) => {
            this.uiManager.updateColorMode(e.target.value);
        });
        
        // Variable-based color controls
        document.getElementById('color-variable').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('color-ramp').addEventListener('change', (e) => {
            const isCustom = e.target.value === 'custom';
            const mode = document.getElementById('color-mode').value;
            if (mode === 'variable') {
                document.getElementById('custom-ramp-container').classList.toggle('hidden', !isCustom);
            }
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('color-transform').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        // Width mode change
        document.getElementById('width-mode').addEventListener('change', (e) => {
            const isVariable = e.target.value === 'variable';
            document.getElementById('fixed-width-container').classList.toggle('hidden', isVariable);
            document.getElementById('variable-width-container').classList.toggle('hidden', !isVariable);
            this.uiManager.updateWidthMode(e.target.value);
        });
        
        // Fixed width control
        document.getElementById('route-width').addEventListener('input', (e) => {
            const width = parseFloat(e.target.value);
            document.getElementById('route-width-value').textContent = width;
            this.uiManager.updateRouteWidth(width);
        });
        
        // Variable width controls
        document.getElementById('width-variable').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('min-width').addEventListener('change', (e) => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('max-width').addEventListener('change', (e) => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('width-transform').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        // Line style
        document.getElementById('line-style').addEventListener('change', (e) => {
            const style = e.target.value;
            // Show dash controls only when dash style is selected
            document.getElementById('dash-controls').classList.toggle('hidden', style !== 'dash');
            this.uiManager.updateLineStyle(style);
            const thick = parseFloat(document.getElementById('route-thickness').value);
            document.getElementById('thick-style-warning').classList.toggle('hidden', thick === 0);
        });
        
        // Route thickness (3D) control
        document.getElementById('route-thickness').addEventListener('input', (e) => {
            const thickness = parseFloat(e.target.value);
            document.getElementById('route-thickness-value').textContent = thickness;
            document.getElementById('thick-style-warning').classList.toggle('hidden', thickness === 0);
            this.globeManager.updateRouteThickness(thickness);
        });

        // Route height control
        document.getElementById('route-height').addEventListener('input', (e) => {
            const h = parseFloat(e.target.value);
            document.getElementById('route-height-value').textContent = h.toFixed(2);
            this.globeManager.updateRouteHeight(h);
        });
        
        // Dash controls
        document.getElementById('dash-size').addEventListener('change', () => {
            this.updateDashSettings();
        });
        
        document.getElementById('gap-size').addEventListener('change', () => {
            this.updateDashSettings();
        });
        
        // Arc height control (OD Matrix)
        document.getElementById('arc-height').addEventListener('input', (e) => {
            const height = parseFloat(e.target.value);
            document.getElementById('arc-height-value').textContent = height.toFixed(1);
            this.globeManager.updateArcHeight(height);
        });
        
        // Point styling controls
        document.getElementById('show-points').addEventListener('change', (e) => {
            this.uiManager.togglePoints(e.target.checked);
        });
        
        // Point size mode
        document.getElementById('point-size-mode').addEventListener('change', (e) => {
            const isVariable = e.target.value === 'variable';
            document.getElementById('fixed-point-size-container').classList.toggle('hidden', isVariable);
            document.getElementById('variable-point-size-container').classList.toggle('hidden', !isVariable);
            this.uiManager.updatePointSizeMode(e.target.value);
        });
        
        // Fixed point size
        document.getElementById('point-size').addEventListener('input', (e) => {
            const size = parseFloat(e.target.value);
            document.getElementById('point-size-value').textContent = size;
            this.uiManager.updatePointSize(size);
        });
        
        // Variable point size controls
        document.getElementById('point-size-variable').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('min-point-size').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('max-point-size').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        document.getElementById('point-size-transform').addEventListener('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        // Globe settings
        
        // Background style
        document.getElementById('background-style').addEventListener('change', (e) => {
            const isSolid = e.target.value === 'solid';
            document.getElementById('bg-color-container').classList.toggle('hidden', !isSolid);
            this.globeManager.updateBackgroundStyle(e.target.value);
        });
        
        // Atmosphere style
        document.getElementById('atmosphere-style').addEventListener('change', (e) => {
            const isNone = e.target.value === 'none';
            document.getElementById('atmosphere-settings').classList.toggle('hidden', isNone);
            this.globeManager.updateAtmosphereStyle(e.target.value);
        });
        
        // Atmosphere intensity
        document.getElementById('atmosphere-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('atmosphere-intensity-value').textContent = intensity.toFixed(1);
            this.globeManager.updateAtmosphere(intensity);
        });
        
        // Lighting mode
        document.getElementById('lighting-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            // Show/hide day-specific controls
            document.getElementById('day-controls').classList.toggle('hidden', mode !== 'day');
            
            // Apply the selected lighting mode
            this.globeManager.setLightingPreset(mode);
            
            // Update sun position if day is selected
            if (mode === 'day') {
                this.updateSunPosition();
            }
        });
        
        // Sun position controls (day mode)
        document.getElementById('sun-ns').addEventListener('input', () => {
            this.updateSunPosition();
        });
        
        document.getElementById('sun-ew').addEventListener('input', () => {
            this.updateSunPosition();
        });
        
        // Common lighting controls
        document.getElementById('light-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('light-intensity-value').textContent = intensity.toFixed(1);
            this.globeManager.updateLightIntensity(intensity);
        });
        
        document.getElementById('ambient-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('ambient-intensity-value').textContent = intensity.toFixed(1);
            this.globeManager.updateAmbientIntensity(intensity);
        });
        
        document.getElementById('reduce-glare').addEventListener('change', (e) => {
            this.globeManager.setReduceGlare(e.target.checked);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.globeManager.handleResize();
        });
    }
    
    updateSunPosition() {
        const latitude = parseFloat(document.getElementById('sun-ns').value);
        const longitude = parseFloat(document.getElementById('sun-ew').value);
        this.globeManager.updateSunPosition(latitude, longitude);
    }
    
    updateDashSettings() {
        const dashSize = parseFloat(document.getElementById('dash-size').value);
        const gapSize = parseFloat(document.getElementById('gap-size').value);
        this.globeManager.updateDashSettings(dashSize, gapSize);
    }
    
    initColorPickers() {
        // Route color picker
        const routeColorPicker = Pickr.create({
            el: '#route-color-picker',
            theme: 'nano',
            default: '#ff0000',
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        routeColorPicker.on('change', (color) => {
            const hexColor = color.toHEXA().toString();
            this.uiManager.updateRouteColor(hexColor);
        });
        
        // Custom color ramp start color
        const rampStartColorPicker = Pickr.create({
            el: '#ramp-start-color',
            theme: 'nano',
            default: '#0000ff',
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        rampStartColorPicker.on('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        // Custom color ramp end color
        const rampEndColorPicker = Pickr.create({
            el: '#ramp-end-color',
            theme: 'nano',
            default: '#ff0000',
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        rampEndColorPicker.on('change', () => {
            this.uiManager.refreshVisualization();
        });
        
        // Point color picker
        const pointColorPicker = Pickr.create({
            el: '#point-color-picker',
            theme: 'nano',
            default: '#ffffff',
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        pointColorPicker.on('change', (color) => {
            const hexColor = color.toHEXA().toString();
            this.uiManager.updatePointColor(hexColor);
        });
        
        // Background color picker
        const bgColorPicker = Pickr.create({
            el: '#bg-color-picker',
            theme: 'nano',
            default: '#000000',
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        bgColorPicker.on('change', (color) => {
            const hexColor = color.toHEXA().toString();
            this.globeManager.updateBackgroundColor(hexColor);
        });
        
        // Light color picker
        const lightColorPicker = Pickr.create({
            el: '#light-color-picker',
            theme: 'nano',
            default: '#ffffff',
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        
        lightColorPicker.on('change', (color) => {
            const hexColor = color.toHEXA().toString();
            this.globeManager.updateLightColor(hexColor);
        });
        
        // Store color pickers for later access
        this.colorPickers = {
            routeColorPicker,
            rampStartColorPicker,
            rampEndColorPicker,
            pointColorPicker,
            bgColorPicker,
            lightColorPicker
        };
        
        // Add them to the UI manager
        this.uiManager.setColorPickers(this.colorPickers);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.globeManager.render();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GlobeViewerApp();
}); 