export class MapManager {
    constructor(containerId) {
        const Llib = window.L;
        this.containerId = containerId;
        this.map = Llib.map(containerId).setView([20, 0], 2);
        Llib.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(this.map);

        this.routesLayer = Llib.layerGroup().addTo(this.map);
        this.pointsLayer = Llib.layerGroup().addTo(this.map);

        this.settings = {
            routes: {
                color: '#ff0000',
                width: 3,
                flowMode: 'directional',
                style: 'solid',
                curved: false,
                offsetMode: 'split', // 'split' or 'none'
                hoverVariable: null
            },
            points: {
                color: '#ffffff',
                size: 6
            }
        };
    }

    // Stub methods to keep interface with GlobeManager
    render() {}
    exportImage() {}
    updateBackgroundStyle() {}
    updateAtmosphereStyle() {}
    updateAtmosphere() {}
    setLightingPreset() {}
    updateSunPosition() {}
    updateLightIntensity() {}
    updateAmbientIntensity() {}
    setReduceGlare() {}
    handleResize() {
        if (this.map && this.map.invalidateSize) {
            this.map.invalidateSize();
        }
    }
    updateLightColor() {}

    setFlowMode(mode) {
        this.settings.routes.flowMode = mode;
    }

    clearRoutes() { this.routesLayer.clearLayers(); }
    clearPoints() { this.pointsLayer.clearLayers(); }

    updateRouteColor(color) {
        this.settings.routes.color = color;
        this.routesLayer.eachLayer(layer => {
            layer.setStyle({ color });
        });
    }

    updateRouteWidth(width) {
        this.settings.routes.width = width;
        this.routesLayer.eachLayer(layer => {
            layer.setStyle({ weight: width });
        });
    }

    updatePointColor(color) {
        this.settings.points.color = color;
        this.pointsLayer.eachLayer(layer => {
            if (layer.setStyle) {
                layer.setStyle({ color });
            }
        });
    }

    updatePointSize(size) {
        this.settings.points.size = size;
        // Leaflet circle markers use radius
        this.pointsLayer.eachLayer(layer => {
            if (layer.setRadius) layer.setRadius(size);
        });
    }

    updateLineStyle(style) {
        this.settings.routes.style = style;
        this.routesLayer.eachLayer(layer => {
            if (style === 'dash') {
                layer.setStyle({ dashArray: '5,5' });
            } else {
                layer.setStyle({ dashArray: null });
            }
        });
    }

    // New no-op or minimal implementations for UI compatibility
    updateRouteColorMode(mode) {
        this.settings.routes.colorMode = mode;
    }

    updateColorVariable(variable) {
        this.settings.routes.variable = variable;
    }

    updateColorRamp(ramp) {
        this.settings.routes.colorRamp = ramp;
    }

    updateCustomColors(startColor, endColor) {
        if (!this.settings.routes.customColors) {
            this.settings.routes.customColors = {};
        }
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

    updateWidthMode(mode) {
        this.settings.routes.widthMode = mode;
    }

    updateWidthVariable(variable) {
        this.settings.routes.widthVariable = variable;
    }

    updateWidthRange(min, max) {
        if (!this.settings.routes.widthRange) {
            this.settings.routes.widthRange = {};
        }
        this.settings.routes.widthRange.min = min;
        this.settings.routes.widthRange.max = max;
    }

    updateRouteThickness(thickness) {
        this.settings.routes.thickness = thickness;
        // Treat thickness as width for 2D map
        this.updateRouteWidth(thickness);
    }

    updateRouteHeight(height) {
        this.settings.routes.routeHeight = height;
    }

    updateArcHeight(height) {
        this.settings.routes.arcHeight = height;
    }

    updateDashSettings(dashSize, gapSize) {
        if (!this.settings.routes.dashSettings) {
            this.settings.routes.dashSettings = {};
        }
        this.settings.routes.dashSettings.dashSize = dashSize;
        this.settings.routes.dashSettings.gapSize = gapSize;
    }

    updateFlowSettings(speed, pulseType, gradient) {
        if (!this.settings.routes.animation) {
            this.settings.routes.animation = {};
        }
        this.settings.routes.animation.speed = speed;
        this.settings.routes.animation.pulseType = pulseType;
        this.settings.routes.animation.gradient = gradient;
    }

    togglePoints(visible) {
        this.settings.points.visible = visible;
        if (visible) {
            if (!this.map.hasLayer(this.pointsLayer)) {
                this.map.addLayer(this.pointsLayer);
            }
        } else if (this.map.hasLayer(this.pointsLayer)) {
            this.map.removeLayer(this.pointsLayer);
        }
    }

    updatePointSizeMode(mode) {
        this.settings.points.sizeMode = mode;
    }

    updatePointSizeVariable(variable) {
        this.settings.points.sizeVariable = variable;
    }

    updatePointSizeRange(min, max) {
        if (!this.settings.points.sizeRange) {
            this.settings.points.sizeRange = {};
        }
        this.settings.points.sizeRange.min = min;
        this.settings.points.sizeRange.max = max;
    }

    setCurvedPaths(enabled) {
        this.settings.routes.curved = enabled;
    }

    setOffsetMode(mode) {
        this.settings.routes.offsetMode = mode;
    }

    setHoverVariable(variable) {
        this.settings.routes.hoverVariable = variable;
    }

    // Compute points along great-circle path between two coordinates
    computeGreatCircle(start, end, segments = 64) {
        const toRad = Math.PI / 180;
        const toDeg = 180 / Math.PI;
        const lat1 = start[0] * toRad;
        const lon1 = start[1] * toRad;
        const lat2 = end[0] * toRad;
        const lon2 = end[1] * toRad;

        const d = 2 * Math.asin(Math.sqrt(
            Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
        ));

        if (d === 0) return [start, end];

        const coords = [];
        for (let i = 0; i <= segments; i++) {
            const f = i / segments;
            const A = Math.sin((1 - f) * d) / Math.sin(d);
            const B = Math.sin(f * d) / Math.sin(d);
            const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
            const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
            const z = A * Math.sin(lat1) + B * Math.sin(lat2);
            const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
            const lon = Math.atan2(y, x);
            coords.push([lat * toDeg, lon * toDeg]);
        }
        return coords;
    }

    createRouteCoords(start, end, offsetSign) {
        let s = start;
        let e = end;
        const dist = 0.3;
        if (offsetSign && this.settings.routes.offsetMode === 'split') {
            [s, e] = this.computeOffsetCoords(start, end, offsetSign, dist);
        }
        if (this.settings.routes.curved) {
            return this.computeGreatCircle(s, e);
        }
        return [s, e];
    }

    latLonToLatLng(lat, lon) {
        return [lat, lon];
    }

    // Helper to offset coordinates perpendicular to line
    computeOffsetCoords(start, end, sign, distDeg) {
        const toRad = Math.PI / 180;
        const lat1 = start[0];
        const lon1 = start[1];
        const lat2 = end[0];
        const lon2 = end[1];
        const dx = lon2 - lon1;
        const dy = lat2 - lat1;
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        const dLat = distDeg * Math.sin(angle);
        const dLon = distDeg * Math.cos(angle) / Math.cos(lat1 * toRad);
        return [
            [lat1 + sign * dLat, lon1 + sign * dLon],
            [lat2 + sign * dLat, lon2 + sign * dLon]
        ];
    }

    addConnections(points, edges) {
        this.clearRoutes();
        this.clearPoints();
        const Llib = window.L;
        const pointsMap = {};
        points.forEach(p => {
            pointsMap[p.id] = [p.lat, p.lon];
            const marker = Llib.circleMarker([p.lat, p.lon], {
                radius: this.settings.points.size,
                color: this.settings.points.color,
                weight: 1,
                fillOpacity: 0.8
            });
            marker.addTo(this.pointsLayer);
        });

        const pairMap = {};
        edges.forEach(e => {
            const key = [e.source, e.destination].sort().join('-');
            if (!pairMap[key]) pairMap[key] = { ab: [], ba: [] };
            if (e.source <= e.destination) pairMap[key].ab.push(e); else pairMap[key].ba.push(e);
        });

        const edgesToDraw = [];
        Object.keys(pairMap).forEach(key => {
            const { ab, ba } = pairMap[key];
            if (this.settings.routes.flowMode === 'total') {
                const list = ab.concat(ba);
                if (list.length === 0) return;
                const base = list[0];
                const agg = { ...base };
                for (let i = 1; i < list.length; i++) {
                    const e = list[i];
                    for (const k in e) {
                        if (typeof e[k] === 'number') {
                            agg[k] = (agg[k] || 0) + e[k];
                        }
                    }
                }
                agg._offset = 0;
                edgesToDraw.push(agg);
            } else {
                ab.forEach(e => { e._offset = 1; edgesToDraw.push(e); });
                ba.forEach(e => { e._offset = -1; edgesToDraw.push(e); });
            }
        });

        const allCoords = [];
        edgesToDraw.forEach(e => {
            const start = pointsMap[e.source];
            const end = pointsMap[e.destination];
            if (!start || !end) return;
            const coords = this.createRouteCoords(start, end, e._offset);
            const line = Llib.polyline(coords, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width,
                opacity: 0.8
            });
            if (this.settings.routes.hoverVariable && e[this.settings.routes.hoverVariable] !== undefined) {
                line.bindTooltip(String(e[this.settings.routes.hoverVariable]));
            }
            line.addTo(this.routesLayer);
            coords.forEach(c => allCoords.push(c));
        });

        this.updateLineStyle(this.settings.routes.style);
        if (allCoords.length > 0) {
            const bounds = Llib.latLngBounds(allCoords);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.map.invalidateSize();
        }
    }

    addTrajectoryPoints(data) {
        this.clearRoutes();
        this.clearPoints();
        const Llib = window.L;
        const routes = {};
        const allCoords = [];
        data.forEach(p => {
            if (!routes[p.route_id]) routes[p.route_id] = [];
            routes[p.route_id].push([p.lat, p.lon]);
            const marker = Llib.circleMarker([p.lat, p.lon], {
                radius: this.settings.points.size,
                color: this.settings.points.color,
                weight: 1,
                fillOpacity: 0.8
            });
            marker.addTo(this.pointsLayer);
            allCoords.push([p.lat, p.lon]);
        });
        Object.values(routes).forEach(path => {
            const coords = this.settings.routes.curved && path.length > 1 ?
                path.flatMap((p, i) => i < path.length - 1 ? this.computeGreatCircle(path[i], path[i + 1]).slice(0, -1) : [p]) :
                path;
            Llib.polyline(coords, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width
            }).addTo(this.routesLayer);
            coords.forEach(c => allCoords.push(c));
        });

        this.updateLineStyle(this.settings.routes.style);
        if (allCoords.length > 0) {
            const bounds = Llib.latLngBounds(allCoords);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.map.invalidateSize();
        }
    }

    addTrajectorySegments(data) {
        this.clearRoutes();
        this.clearPoints();
        const Llib = window.L;
        const allCoords = [];
        data.forEach(seg => {
            const coords = this.createRouteCoords([
                seg.start_lat,
                seg.start_lon
            ], [
                seg.end_lat,
                seg.end_lon
            ], 0);
            Llib.polyline(coords, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width
            }).addTo(this.routesLayer);
            coords.forEach(c => allCoords.push(c));
        });

        this.updateLineStyle(this.settings.routes.style);

        if (allCoords.length > 0) {
            const bounds = Llib.latLngBounds(allCoords);
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.map.invalidateSize();
        }
    }

    addOrderedTrajectories(data) {
        this.addTrajectorySegments(data);
    }
}
