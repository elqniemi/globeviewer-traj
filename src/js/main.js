// Globe Viewer - Main Application

// Import dependencies
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GlobeManager } from './globe.js';
import { MapManager } from './map.js';
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
        this.mapManager = new MapManager('map');
        this.activeManager = this.globeManager;
        this.dataLoader = new DataLoader();
        this.uiManager = new UIManager(this.activeManager, this.dataLoader);
        
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
        const viewMode = document.getElementById('view-mode').value;
        this.switchViewMode(viewMode);

        // Set initial lighting mode
        const lightingMode = document.getElementById('lighting-mode').value;
        document.getElementById('day-controls').classList.toggle('hidden', lightingMode !== 'day');
        
        // Apply initial lighting preset
        this.activeManager.setLightingPreset(lightingMode);
        
        // Set initial sun position if in day mode
        if (lightingMode === 'day') {
            this.updateSunPosition();
        }
        
        // Set initial line style and dash controls visibility
        const lineStyle = document.getElementById('line-style').value;
        document.getElementById('dash-controls').classList.toggle('hidden', lineStyle !== 'dash');
        document.getElementById('flow-controls').classList.toggle('hidden', lineStyle !== 'flow');
    }
    
    setupEventListeners() {
        // Export PNG button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.activeManager.exportImage();
        });

        document.getElementById('view-mode').addEventListener('change', (e) => {
            this.switchViewMode(e.target.value);
        });
        
        // Data type change
        document.getElementById('data-type').addEventListener('change', (e) => {
            this.uiManager.handleDataTypeChange(e.target.value);
        });

        // Example data selection
        document.getElementById('example-select').addEventListener('change', (e) => {
            this.uiManager.loadExampleData(e.target.value);
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
            document.getElementById('flow-controls').classList.toggle('hidden', style !== 'flow');
            this.uiManager.updateLineStyle(style);
            const thick = parseFloat(document.getElementById('route-thickness').value);
            document.getElementById('thick-style-warning').classList.toggle('hidden', thick === 0);
        });
        
        // Route thickness (3D) control
        document.getElementById('route-thickness').addEventListener('input', (e) => {
            const thickness = parseFloat(e.target.value);
            document.getElementById('route-thickness-value').textContent = thickness;
            document.getElementById('thick-style-warning').classList.toggle('hidden', thickness === 0);
            this.activeManager.updateRouteThickness(thickness);
        });

        // Route height control
        document.getElementById('route-height').addEventListener('input', (e) => {
            const h = parseFloat(e.target.value);
            document.getElementById('route-height-value').textContent = h.toFixed(2);
            this.activeManager.updateRouteHeight(h);
        });
        
        // Dash controls
        document.getElementById('dash-size').addEventListener('change', () => {
            this.updateDashSettings();
        });
        
        document.getElementById('gap-size').addEventListener('change', () => {
            this.updateDashSettings();
        });

        // Flow controls
        document.getElementById('flow-speed').addEventListener('change', () => {
            this.updateFlowSettings();
        });

        document.getElementById('flow-pulse').addEventListener('change', () => {
            this.updateFlowSettings();
        });

        document.getElementById('flow-gradient').addEventListener('change', () => {
            this.updateFlowSettings();
        });
        
        // Arc height control (connections)
        document.getElementById('arc-height').addEventListener('input', (e) => {
            const height = parseFloat(e.target.value);
            document.getElementById('arc-height-value').textContent = height.toFixed(1);
            this.activeManager.updateArcHeight(height);
        });

        document.getElementById('flow-mode').addEventListener('change', (e) => {
            this.uiManager.updateFlowMode(e.target.value);
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
            this.activeManager.updateBackgroundStyle(e.target.value);
        });
        
        // Atmosphere style
        document.getElementById('atmosphere-style').addEventListener('change', (e) => {
            const isNone = e.target.value === 'none';
            document.getElementById('atmosphere-settings').classList.toggle('hidden', isNone);
            this.activeManager.updateAtmosphereStyle(e.target.value);
        });
        
        // Atmosphere intensity
        document.getElementById('atmosphere-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('atmosphere-intensity-value').textContent = intensity.toFixed(1);
            this.activeManager.updateAtmosphere(intensity);
        });
        
        // Lighting mode
        document.getElementById('lighting-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            // Show/hide day-specific controls
            document.getElementById('day-controls').classList.toggle('hidden', mode !== 'day');
            
            // Apply the selected lighting mode
            this.activeManager.setLightingPreset(mode);
            
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
            this.activeManager.updateLightIntensity(intensity);
        });
        
        document.getElementById('ambient-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('ambient-intensity-value').textContent = intensity.toFixed(1);
            this.activeManager.updateAmbientIntensity(intensity);
        });
        
        document.getElementById('reduce-glare').addEventListener('change', (e) => {
            this.activeManager.setReduceGlare(e.target.checked);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.activeManager.handleResize();
        });
    }
    
    updateSunPosition() {
        const latitude = parseFloat(document.getElementById('sun-ns').value);
        const longitude = parseFloat(document.getElementById('sun-ew').value);
        this.activeManager.updateSunPosition(latitude, longitude);
    }
    
    updateDashSettings() {
        const dashSize = parseFloat(document.getElementById('dash-size').value);
        const gapSize = parseFloat(document.getElementById('gap-size').value);
        this.activeManager.updateDashSettings(dashSize, gapSize);
    }

    updateFlowSettings() {
        const speed = parseFloat(document.getElementById('flow-speed').value);
        const pulse = document.getElementById('flow-pulse').value;
        const gradient = document.getElementById('flow-gradient').checked;
        this.activeManager.updateFlowSettings(speed, pulse, gradient);
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
            this.activeManager.updateBackgroundColor(hexColor);
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
            this.activeManager.updateLightColor(hexColor);
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

    switchViewMode(mode) {
        if (mode === 'map') {
            this.activeManager = this.mapManager;
            document.getElementById('globe-container').classList.add('hidden');
            document.getElementById('map-container').classList.remove('hidden');
            this.mapManager.handleResize();
        } else {
            this.activeManager = this.globeManager;
            document.getElementById('map-container').classList.add('hidden');
            document.getElementById('globe-container').classList.remove('hidden');
            this.globeManager.handleResize();
        }
        this.uiManager.setManager(this.activeManager);
        this.uiManager.refreshVisualization();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.activeManager.render();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GlobeViewerApp();

    const panel = document.getElementById('options-panel');
    const toggle = document.getElementById('options-toggle');
    if (panel && toggle) {
        toggle.addEventListener('click', () => {
            panel.classList.toggle('translate-y-full');
            panel.classList.toggle('md:translate-x-full');
        });
    }
});
