// Data Loader - Handles CSV parsing and data preparation

export class DataLoader {
    constructor() {
        this.data = {
            trajectoryPoints: null,
            trajectorySegments: null,
            orderedTrajectories: null,
            connections: {
                points: null,
                edges: null
            }
        };
        
        this.categories = {
            trajectoryPoints: {},
            trajectorySegments: {},
            connections: {}
        };
    }
    
    // Parse CSV file into array of objects
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    // Get the file content
                    const content = event.target.result;
                    
                    // Split into lines and remove empty lines
                    const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
                    
                    // Extract headers from the first line
                    const headers = lines[0].split(',').map(header => header.trim());
                    
                    // Parse each line into an object
                    const data = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = this.parseCSVLine(lines[i]);
                        
                        if (values.length === headers.length) {
                            const obj = {};
                            headers.forEach((header, index) => {
                                let value = values[index];
                                
                                // Convert numeric values to numbers
                                if (!isNaN(value) && value !== '') {
                                    value = parseFloat(value);
                                }
                                
                                obj[header] = value;
                            });
                            data.push(obj);
                        }
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
    
    // Parse a CSV line, handling quoted values correctly
    parseCSVLine(line) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        result.push(currentValue.trim());
        
        return result;
    }
    
    // Load trajectory points data from CSV
    async loadTrajectoryPoints(file) {
        try {
            const data = await this.parseCSV(file);
            
            // Validate required columns
            const requiredColumns = ['route_id', 'point_id', 'lat', 'lon'];
            if (!this.validateColumns(data[0], requiredColumns)) {
                throw new Error('Missing required columns for trajectory points. Required: ' + requiredColumns.join(', '));
            }
            
            // Check for category column
            const hasCategory = 'category' in data[0];
            
            // Reset categories
            this.categories.trajectoryPoints = {};
            
            // Extract categories if available
            if (hasCategory) {
                data.forEach(point => {
                    if (point.category) {
                        this.categories.trajectoryPoints[point.route_id] = point.category;
                    }
                });
            }
            
            this.data.trajectoryPoints = data;
            return data;
        } catch (error) {
            console.error('Error loading trajectory points:', error);
            throw error;
        }
    }
    
    // Load trajectory segments data from CSV
    async loadTrajectorySegments(file) {
        try {
            const data = await this.parseCSV(file);
            
            // Validate required columns
            const requiredColumns = ['segment_id', 'start_lat', 'start_lon', 'end_lat', 'end_lon'];
            if (!this.validateColumns(data[0], requiredColumns)) {
                throw new Error('Missing required columns for trajectory segments. Required: ' + requiredColumns.join(', '));
            }
            
            // Check for category column
            const hasCategory = 'category' in data[0];
            
            // Reset categories
            this.categories.trajectorySegments = {};
            
            // Extract categories if available
            if (hasCategory) {
                data.forEach(segment => {
                    if (segment.category) {
                        this.categories.trajectorySegments[segment.segment_id] = segment.category;
                    }
                });
            }
            
            this.data.trajectorySegments = data;
            return data;
        } catch (error) {
            console.error('Error loading trajectory segments:', error);
            throw error;
        }
    }
    
    // Load ordered trajectories data from CSV
    async loadOrderedTrajectories(file) {
        try {
            const data = await this.parseCSV(file);
            
            // Validate required columns
            const requiredColumns = ['order', 'start_lat', 'start_lon', 'end_lat', 'end_lon'];
            if (!this.validateColumns(data[0], requiredColumns)) {
                throw new Error('Missing required columns for ordered trajectories. Required: ' + requiredColumns.join(', '));
            }
            
            // Sort by order
            data.sort((a, b) => a.order - b.order);
            
            this.data.orderedTrajectories = data;
            return data;
        } catch (error) {
            console.error('Error loading ordered trajectories:', error);
            throw error;
        }
    }
    
    // Load connection points from CSV
    async loadConnectionPoints(file) {
        try {
            const data = await this.parseCSV(file);
            
            // Validate required columns
            const requiredColumns = ['id', 'lat', 'lon'];
            if (!this.validateColumns(data[0], requiredColumns)) {
                throw new Error('Missing required columns for connection points. Required: ' + requiredColumns.join(', '));
            }
            
            this.data.connections.points = data;
            return data;
        } catch (error) {
            console.error('Error loading connection points:', error);
            throw error;
        }
    }
    
    // Load connection edges from CSV
    async loadConnectionEdges(file) {
        try {
            const data = await this.parseCSV(file);
            
            // Validate required columns
            const requiredColumns = ['source', 'destination'];
            if (!this.validateColumns(data[0], requiredColumns)) {
                throw new Error('Missing required columns for connection edges. Required: ' + requiredColumns.join(', '));
            }
            
            // Check for category column
            const hasCategory = 'category' in data[0];
            
            // Reset categories
            this.categories.connections = {};
            
            // Extract categories if available
            if (hasCategory) {
                data.forEach(edge => {
                    if (edge.category) {
                        const key = `${edge.source}-${edge.destination}`;
                        this.categories.connections[key] = edge.category;
                    }
                });
            }
            
            this.data.connections.edges = data;
            return data;
        } catch (error) {
            console.error('Error loading connection edges:', error);
            throw error;
        }
    }
    
    // Validate that an object has all required columns
    validateColumns(obj, requiredColumns) {
        return requiredColumns.every(column => column in obj);
    }
    
    // Get loaded data by type
    getData(type) {
        switch (type) {
            case 'trajectory-points':
                return {
                    data: this.data.trajectoryPoints,
                    categories: this.categories.trajectoryPoints
                };
            case 'trajectory-segments':
                return {
                    data: this.data.trajectorySegments,
                    categories: this.categories.trajectorySegments
                };
            case 'ordered-trajectories':
                return {
                    data: this.data.orderedTrajectories
                };
            case 'connections':
                return {
                    points: this.data.connections.points,
                    edges: this.data.connections.edges,
                    categories: this.categories.connections
                };
            default:
                return null;
        }
    }
    
    // Check if data is loaded for a specific type
    hasData(type) {
        switch (type) {
            case 'trajectory-points':
                return !!this.data.trajectoryPoints;
            case 'trajectory-segments':
                return !!this.data.trajectorySegments;
            case 'ordered-trajectories':
                return !!this.data.orderedTrajectories;
            case 'connections':
                return !!this.data.connections.points && !!this.data.connections.edges;
            default:
                return false;
        }
    }
    
    // Clear all loaded data
    clearData() {
        this.data = {
            trajectoryPoints: null,
            trajectorySegments: null,
            orderedTrajectories: null,
            connections: {
                points: null,
                edges: null
            }
        };
        
        this.categories = {
            trajectoryPoints: {},
            trajectorySegments: {},
            connections: {}
        };
    }
} 