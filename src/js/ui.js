// UI Manager - Handles user interactions and visualization updates

export class UIManager {
    constructor(globeManager, dataLoader) {
        this.globeManager = globeManager;
        this.dataLoader = dataLoader;
        
        // Track current data type
        this.currentDataType = 'trajectory-points';
        
        // For storing the color pickers
        this.colorPickers = null;
        
        // Initialize UI elements visibility
        this.updateUIForDataType('trajectory-points');
        
        // Add event listeners for UI controls
        this.initEventListeners();
        
        // Set up event handler for variables update
        this.globeManager.onVariablesUpdated = this.handleVariablesUpdated.bind(this);
    }
    
    // Set the color pickers from main.js
    setColorPickers(pickers) {
        this.colorPickers = pickers;
    }
    
    // Initialize event listeners for UI controls
    initEventListeners() {
        // Background style change
        document.getElementById('background-style').addEventListener('change', (e) => {
            this.globeManager.updateBackgroundStyle(e.target.value);
        });
        
        // Atmosphere style change
        document.getElementById('atmosphere-style').addEventListener('change', (e) => {
            this.globeManager.updateAtmosphereStyle(e.target.value);
        });
        
        // File inputs change
        document.getElementById('point-file').addEventListener('change', () => {
            const fileInput = document.getElementById('point-file');
            if (fileInput.files.length > 0) {
                // On file select, enable the Load Data button
                document.getElementById('load-data-btn').disabled = false;
            }
        });
        
        document.getElementById('edge-file').addEventListener('change', () => {
            const fileInput = document.getElementById('edge-file');
            if (fileInput.files.length > 0) {
                // On file select, enable the Load Data button
                document.getElementById('load-data-btn').disabled = false;
            }
        });
    }
    
    // Handle data type change
    handleDataTypeChange(dataType) {
        this.currentDataType = dataType;
        this.updateUIForDataType(dataType);
    }
    
    // Update UI elements based on selected data type
    updateUIForDataType(dataType) {
        this.currentDataType = dataType;
        
        // Reset UI elements
        document.getElementById('point-file-container').classList.remove('hidden');
        document.getElementById('edge-file-container').classList.add('hidden');
        document.getElementById('arc-height-container').classList.add('hidden');
        
        // Update UI based on data type
        switch (dataType) {
            case 'trajectory-points':
                document.getElementById('point-file').setAttribute('accept', '.csv');
                break;
            case 'trajectory-segments':
                document.getElementById('point-file').setAttribute('accept', '.csv');
                break;
            case 'od-matrix':
                document.getElementById('point-file').setAttribute('accept', '.csv');
                document.getElementById('edge-file-container').classList.remove('hidden');
                document.getElementById('arc-height-container').classList.remove('hidden');
                break;
            case 'ordered-trajectories':
                document.getElementById('point-file').setAttribute('accept', '.csv,.json,.geojson');
                break;
        }
        
        // Update color mode options based on data type
        if (dataType === 'ordered-trajectories') {
            // For ordered trajectories, add gradient option
            this.updateColorModeOptions(['single', 'gradient', 'variable']);
        } else {
            // For other types, add category option
            this.updateColorModeOptions(['single', 'category', 'variable']);
        }
        
        // Reset to defaults
        this.resetUIToDefaults();
    }
    
    // Reset UI to default settings
    resetUIToDefaults() {
        // Reset color mode to single
        document.getElementById('color-mode').value = 'single';
        document.getElementById('single-color-container').classList.remove('hidden');
        document.getElementById('variable-color-container').classList.add('hidden');
        
        // Reset width mode to fixed
        document.getElementById('width-mode').value = 'fixed';
        document.getElementById('fixed-width-container').classList.remove('hidden');
        document.getElementById('variable-width-container').classList.add('hidden');
        
        // Reset point size mode to fixed
        document.getElementById('point-size-mode').value = 'fixed';
        document.getElementById('fixed-point-size-container').classList.remove('hidden');
        document.getElementById('variable-point-size-container').classList.add('hidden');
        
        // Reset line style to solid
        document.getElementById('line-style').value = 'solid';
        
        // Reset route width
        const routeWidth = document.getElementById('route-width');
        routeWidth.value = 3;
        document.getElementById('route-width-value').textContent = '3';
        
        // Reset route thickness
        const routeThickness = document.getElementById('route-thickness');
        routeThickness.value = 0;
        document.getElementById('route-thickness-value').textContent = '0';

        // Reset route height
        const routeHeight = document.getElementById('route-height');
        routeHeight.value = 0;
        document.getElementById('route-height-value').textContent = '0';
        
        // Reset point size
        const pointSize = document.getElementById('point-size');
        pointSize.value = 2;
        document.getElementById('point-size-value').textContent = '2';
        
        // Reset arc height
        const arcHeight = document.getElementById('arc-height');
        arcHeight.value = 0.4;
        document.getElementById('arc-height-value').textContent = '0.4';
        
        // Reset point visibility
        document.getElementById('show-points').checked = true;
        
        // Reset color pickers if available
        if (this.colorPickers) {
            this.colorPickers.routeColorPicker.setColor('#ff0000');
            this.colorPickers.pointColorPicker.setColor('#ffffff');
            this.colorPickers.rampStartColorPicker.setColor('#0000ff');
            this.colorPickers.rampEndColorPicker.setColor('#ff0000');
        }
    }
    
    // Update color mode select options
    updateColorModeOptions(options) {
        const colorModeSelect = document.getElementById('color-mode');
        
        // Clear existing options
        colorModeSelect.innerHTML = '';
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            
            switch (option) {
                case 'single':
                    optionElement.textContent = 'Single Color';
                    break;
                case 'category':
                    optionElement.textContent = 'By Category';
                    break;
                case 'gradient':
                    optionElement.textContent = 'Gradient';
                    break;
                case 'variable':
                    optionElement.textContent = 'By Variable';
                    break;
            }
            
            colorModeSelect.appendChild(optionElement);
        });
    }
    
    // Handle variables update from GlobeManager
    handleVariablesUpdated(variables, type) {
        if (type === 'color' || type === 'width') {
            // Update the route variable selects
            const colorVariableSelect = document.getElementById('color-variable');
            const widthVariableSelect = document.getElementById('width-variable');
            
            // Clear existing options
            if (type === 'color') {
                colorVariableSelect.innerHTML = '';
            } else {
                widthVariableSelect.innerHTML = '';
            }
            
            // Add new options
            variables.forEach(variable => {
                const optionElement = document.createElement('option');
                optionElement.value = variable;
                optionElement.textContent = variable === '$length' ? 'Distance' : variable;
                
                if (type === 'color') {
                    colorVariableSelect.appendChild(optionElement);
                } else if (type === 'width') {
                    widthVariableSelect.appendChild(optionElement);
                }
            });
        } else if (type === 'pointSize') {
            // Update the point size variable select
            const pointSizeVariableSelect = document.getElementById('point-size-variable');
            pointSizeVariableSelect.innerHTML = '';
            
            // Add new options
            variables.forEach(variable => {
                const optionElement = document.createElement('option');
                optionElement.value = variable;
                optionElement.textContent = variable;
                pointSizeVariableSelect.appendChild(optionElement);
            });
        }
    }
    
    // Load data from CSV files
    async loadData() {
        try {
            this.showLoadingOverlay();
            
            const dataType = this.currentDataType;
            const pointFile = document.getElementById('point-file').files[0];
            const edgeFile = document.getElementById('edge-file').files[0];
            
            // Reset any existing data
            this.globeManager.clearRoutes();
            this.globeManager.clearPoints();
            
            // Check for required files
            if (!pointFile) {
                throw new Error('Please select a CSV file');
            }
            
            // Load data based on type
            switch (dataType) {
                case 'trajectory-points':
                    await this.loadTrajectoryPoints(pointFile);
                    break;
                case 'trajectory-segments':
                    await this.loadTrajectorySegments(pointFile);
                    break;
                case 'ordered-trajectories':
                    await this.loadOrderedTrajectories(pointFile);
                    break;
                case 'od-matrix':
                    if (!edgeFile) {
                        throw new Error('Please select both point and edge CSV files');
                    }
                    await this.loadODMatrix(pointFile, edgeFile);
                    break;
            }
            
            // Update the visualization with current settings
            this.refreshVisualization();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    // Load and process trajectory points data
    async loadTrajectoryPoints(file) {
        try {
            await this.dataLoader.loadTrajectoryPoints(file);
            
            const { data, categories } = this.dataLoader.getData('trajectory-points');
            
            if (!data || data.length === 0) {
                throw new Error('No valid trajectory points data found');
            }
            
            // Update globe with loaded data
            this.globeManager.addTrajectoryPoints(data, categories);
            
        } catch (error) {
            console.error('Error loading trajectory points:', error);
            throw error;
        }
    }
    
    // Load and process trajectory segments data
    async loadTrajectorySegments(file) {
        try {
            await this.dataLoader.loadTrajectorySegments(file);
            
            const { data, categories } = this.dataLoader.getData('trajectory-segments');
            
            if (!data || data.length === 0) {
                throw new Error('No valid trajectory segments data found');
            }
            
            // Update globe with loaded data
            this.globeManager.addTrajectorySegments(data, categories);
            
        } catch (error) {
            console.error('Error loading trajectory segments:', error);
            throw error;
        }
    }
    
    // Load and process ordered trajectories data
    async loadOrderedTrajectories(file) {
        try {
            await this.dataLoader.loadOrderedTrajectories(file);
            
            const { data } = this.dataLoader.getData('ordered-trajectories');
            
            if (!data || data.length === 0) {
                throw new Error('No valid ordered trajectories data found');
            }
            
            // Update globe with loaded data
            this.globeManager.addOrderedTrajectories(data);
            
        } catch (error) {
            console.error('Error loading ordered trajectories:', error);
            throw error;
        }
    }
    
    // Load and process OD Matrix data
    async loadODMatrix(pointsFile, edgesFile) {
        try {
            this.showLoadingOverlay();
            
            // Load points and edges
            await this.dataLoader.loadODPoints(pointsFile);
            await this.dataLoader.loadODEdges(edgesFile);
            
            const { points, edges, categories } = this.dataLoader.getData('od-matrix');
            
            if (!points || points.length === 0) {
                throw new Error('No valid point data found');
            }
            
            if (!edges || edges.length === 0) {
                throw new Error('No valid edge data found');
            }
            
            // Show arc height controls
            document.getElementById('arc-height-container').classList.remove('hidden');
            
            // Update globe with loaded data
            this.globeManager.addODMatrix(points, edges, categories);
            
            this.hideLoadingOverlay();
        } catch (error) {
            this.hideLoadingOverlay();
            this.showError(error.message);
        }
    }
    
    // Refresh visualization with current settings
    refreshVisualization() {
        if (!this.dataLoader.hasData(this.currentDataType)) {
            return;
        }
        
        // Get current settings
        this.updateGlobeSettings();
        
        // Re-render with current data
        const dataType = this.currentDataType;
        
        switch (dataType) {
            case 'trajectory-points': {
                const { data, categories } = this.dataLoader.getData('trajectory-points');
                this.globeManager.addTrajectoryPoints(data, categories);
                break;
            }
            case 'trajectory-segments': {
                const { data, categories } = this.dataLoader.getData('trajectory-segments');
                this.globeManager.addTrajectorySegments(data, categories);
                break;
            }
            case 'ordered-trajectories': {
                const { data } = this.dataLoader.getData('ordered-trajectories');
                this.globeManager.addOrderedTrajectories(data);
                break;
            }
            case 'od-matrix': {
                const { points, edges, categories } = this.dataLoader.getData('od-matrix');
                this.globeManager.addODMatrix(points, edges, categories);
                break;
            }
        }
    }
    
    // Update globe settings from UI values
    updateGlobeSettings() {
        // Route color settings
        const colorMode = document.getElementById('color-mode').value;
        this.globeManager.updateRouteColorMode(colorMode);
        
        if (colorMode === 'variable') {
            const colorVariable = document.getElementById('color-variable').value;
            const colorRamp = document.getElementById('color-ramp').value;
            const colorTransform = document.getElementById('color-transform').value;
            
            this.globeManager.updateColorVariable(colorVariable);
            this.globeManager.updateColorRamp(colorRamp);
            this.globeManager.updateTransform(colorTransform, 'color');
            
            if (colorRamp === 'custom' && this.colorPickers) {
                const startColor = this.colorPickers.rampStartColorPicker.getColor().toHEXA().toString();
                const endColor = this.colorPickers.rampEndColorPicker.getColor().toHEXA().toString();
                this.globeManager.updateCustomColors(startColor, endColor);
            }
        }
        
        // Route width settings
        const widthMode = document.getElementById('width-mode').value;
        this.globeManager.updateWidthMode(widthMode);
        
        if (widthMode === 'fixed') {
            const routeWidth = parseFloat(document.getElementById('route-width').value);
            this.globeManager.updateRouteWidth(routeWidth);
        } else {
            const widthVariable = document.getElementById('width-variable').value;
            const minWidth = parseFloat(document.getElementById('min-width').value);
            const maxWidth = parseFloat(document.getElementById('max-width').value);
            const widthTransform = document.getElementById('width-transform').value;
            
            this.globeManager.updateWidthVariable(widthVariable);
            this.globeManager.updateWidthRange(minWidth, maxWidth);
            this.globeManager.updateTransform(widthTransform, 'width');
        }
        
        // Line style
        const lineStyle = document.getElementById('line-style').value;
        this.globeManager.updateLineStyle(lineStyle);
        
        // 3D thickness
        const thickness = parseFloat(document.getElementById('route-thickness').value);
        this.globeManager.updateRouteThickness(thickness);

        // Route height
        const routeHeight = parseFloat(document.getElementById('route-height').value);
        this.globeManager.updateRouteHeight(routeHeight);
        
        // Arc height for OD matrix
        if (this.currentDataType === 'od-matrix') {
            const arcHeight = parseFloat(document.getElementById('arc-height').value);
            this.globeManager.updateArcHeight(arcHeight);
        }
        
        // Point styling
        const showPoints = document.getElementById('show-points').checked;
        this.globeManager.togglePoints(showPoints);
        
        const pointSizeMode = document.getElementById('point-size-mode').value;
        this.globeManager.updatePointSizeMode(pointSizeMode);
        
        if (pointSizeMode === 'fixed') {
            const pointSize = parseFloat(document.getElementById('point-size').value);
            this.globeManager.updatePointSize(pointSize);
        } else {
            const pointSizeVariable = document.getElementById('point-size-variable').value;
            const minPointSize = parseFloat(document.getElementById('min-point-size').value);
            const maxPointSize = parseFloat(document.getElementById('max-point-size').value);
            const pointSizeTransform = document.getElementById('point-size-transform').value;
            
            this.globeManager.updatePointSizeVariable(pointSizeVariable);
            this.globeManager.updatePointSizeRange(minPointSize, maxPointSize);
            this.globeManager.updateTransform(pointSizeTransform, 'pointSize');
        }
    }
    
    // Update color mode
    updateColorMode(mode) {
        document.getElementById('single-color-container').classList.toggle('hidden', mode !== 'single');
        document.getElementById('variable-color-container').classList.toggle('hidden', mode !== 'variable');
        
        this.globeManager.updateRouteColorMode(mode);
        this.refreshVisualization();
    }
    
    // Update width mode
    updateWidthMode(mode) {
        this.globeManager.updateWidthMode(mode);
        this.refreshVisualization();
    }
    
    // Update route styling
    updateRouteColor(color) {
        this.globeManager.updateRouteColor(color);
    }
    
    updateRouteWidth(width) {
        console.log(`UI: Updating route width to ${width}`);
        this.globeManager.updateRouteWidth(width);
    }
    
    updateLineStyle(style) {
        this.globeManager.updateLineStyle(style);
        this.refreshVisualization();
    }
    
    // Update point styling
    togglePoints(visible) {
        this.globeManager.togglePoints(visible);
    }
    
    updatePointSizeMode(mode) {
        this.globeManager.updatePointSizeMode(mode);
        this.refreshVisualization();
    }
    
    updatePointSize(size) {
        this.globeManager.updatePointSize(size);
        this.refreshVisualization();
    }
    
    updatePointColor(color) {
        this.globeManager.updatePointColor(color);
    }
    
    // Show loading overlay
    showLoadingOverlay() {
        // Check if overlay already exists
        let overlay = document.querySelector('.loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.classList.add('loading-overlay');
            
            const spinner = document.createElement('div');
            spinner.classList.add('spinning-loader');
            
            const message = document.createElement('span');
            message.textContent = 'Loading...';
            
            overlay.appendChild(spinner);
            overlay.appendChild(message);
            
            const container = document.getElementById('globe-container');
            container.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }
    }
    
    // Hide loading overlay
    hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    // Show error message
    showError(message) {
        alert('Error: ' + message);
        console.error('Error:', message);
    }
} 