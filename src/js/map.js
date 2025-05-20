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
                flowMode: 'directional'
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

        const dist = 0.5; // degree offset
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
            let coords = [start, end];
            if (e._offset) {
                coords = this.computeOffsetCoords(start, end, e._offset, dist);
            }
            const line = Llib.polyline(coords, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width,
                opacity: 0.8
            });
            line.addTo(this.routesLayer);
            coords.forEach(c => allCoords.push(c));
        });

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
            Llib.polyline(path, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width
            }).addTo(this.routesLayer);
            path.forEach(c => allCoords.push(c));
        });

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
            const coords = [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]];
            Llib.polyline(coords, {
                color: this.settings.routes.color,
                weight: this.settings.routes.width
            }).addTo(this.routesLayer);
            coords.forEach(c => allCoords.push(c));
        });

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
