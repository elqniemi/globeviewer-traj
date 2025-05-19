# Globe Viewer

Interactive 3D globe visualization for displaying geographical routes and trajectories.

## Features

- **Flexible Data Input**: Import data in various formats via CSV:
  - Trajectory points (route_id, point_id, lat, lon, optional z)
  - Trajectory segments (segment_id, start_lat, start_lon, end_lat, end_lon)
  - OD Matrix (points with id, lat, lon + edges with source, destination)
  - Ordered trajectories with sequencing

- **Customizable Styling**:
  - Change route colors (single color, by category, or gradient)
  - Adjust line width and opacity
  - Toggle and style points
  - Adjust globe atmosphere and lighting

- **Interactive Controls**:
  - Orbit, pan, and zoom around the globe
  - Mouse-over tooltips for points
  - Export the current view as PNG

## Installation

Make sure you have [Bun](https://bun.sh/) installed.

```bash
# Clone the repository
git clone <repository-url>
cd globe-viewer

# Install dependencies
bun install

# Run the development server
bun run dev
```

## Usage

1. Select the type of data you want to visualize from the dropdown
2. Upload your CSV file(s)
3. Click "Load Data" to visualize on the globe
4. Use the controls panel to customize the visualization
5. Use the Export PNG button to save your visualization

## CSV File Formats

### Trajectory Points
```
route_id,point_id,lat,lon,z,category
1,0,37.7749,-122.4194,0,red
1,1,37.8,-122.5,0,red
2,0,40.7128,-74.0060,0,blue
2,1,41.0,-74.5,0,blue
```

### Trajectory Segments
```
segment_id,start_lat,start_lon,end_lat,end_lon,category
1,37.7749,-122.4194,40.7128,-74.0060,business
2,51.5074,-0.1278,48.8566,2.3522,leisure
```

### OD Matrix Points
```
id,lat,lon,name
1,37.7749,-122.4194,San Francisco
2,40.7128,-74.0060,New York
3,51.5074,-0.1278,London
```

### OD Matrix Edges
```
source,destination,weight,category
1,2,100,domestic
1,3,250,international
3,2,175,international
```

### Ordered Trajectories
```
order,start_lat,start_lon,end_lat,end_lon
0,37.7749,-122.4194,40.7128,-74.0060
1,40.7128,-74.0060,51.5074,-0.1278
2,51.5074,-0.1278,48.8566,2.3522
```

## Development

The application is built with:
- Vanilla JavaScript
- Three.js for 3D rendering
- Tailwind CSS for styling
- Vite for bundling

## License

MIT
