let airportData = {};
let map = null;
let currentMarkers = [];

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('data/airports.json');
        airportData = await response.json();
        console.log("Airport data loaded.");
        
        const params = new URLSearchParams(window.location.search);
        const icao = params.get('icao') || 'HKG';
        
        loadAirportMap(icao);
    } catch (error) {
        console.error("Failed to load airport data:", error);
    }
}

function loadAirportMap(icao) {
    const data = airportData[icao];
    if (!data) {
        alert("Airport not found!");
        return;
    }

    // Update header info
    document.getElementById('airportTitle').innerText = `${data.name} (${data.icao})`;
    document.getElementById('airportSubtitle').innerText = `${data.city}, ${data.country}`;
    document.getElementById('infoIcao').innerText = data.icao;
    document.getElementById('infoIata').innerText = data.iata;
    document.getElementById('infoElev').innerText = data.elev;
    document.getElementById('infoCoords').innerText = `${data.lat}°N, ${data.lon}°E`;

    // Update runways
    const runwayInfo = document.getElementById('runwayInfo');
    if (data.runways) {
        const runways = data.runways.split(', ');
        runwayInfo.innerHTML = runways.map(r => `
            <div class="runway">
                <span class="runway-name">${r.split(' ')[0]}</span>
                <span class="runway-length">${r.split(' ').slice(1).join(' ')}</span>
            </div>
        `).join('');
    }

    // Update selector
    document.getElementById('airportSelect').value = icao;

    // Initialize or update map
    if (map) {
        map.setView([data.lat, data.lon], 15);
        clearMarkers();
    } else {
        map = L.map('map').setView([data.lat, data.lon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Add airport marker
    const airportIcon = L.divIcon({
        html: '✈️',
        iconSize: [30, 30],
        className: 'airport-marker'
    });

    const marker = L.marker([data.lat, data.lon], { icon: airportIcon }).addTo(map);
    marker.bindPopup(`
        <strong>${data.name}</strong><br>
        ICAO: ${data.icao} | IATA: ${data.iata}<br>
        Elevation: ${data.elev}
    `).openPopup();
    currentMarkers.push(marker);

    // Fetch real OSM data for this airport
    fetchAirportOSM(icao, data);
}

function clearMarkers() {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
}

// Fetch airport layout from OpenStreetMap Overpass API
async function fetchAirportOSM(icao, data) {
    const dLat = 0.05;
    const dLon = 0.05;
    const south = data.lat - dLat;
    const west = data.lon - dLon;
    const north = data.lat + dLat;
    const east = data.lon + dLon;

    const query = `[out:json][timeout:15];
    (
      way["aeroway"~"runway|taxiway|apron|helipad"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;`;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const osmData = await response.json();
        renderOSMData(osmData);
        document.getElementById('osmStatus').innerText = '✅ Airport layout loaded from OpenStreetMap';
    } catch (error) {
        console.error("Failed to fetch OSM data:", error);
        document.getElementById('osmStatus').innerText = '⚠️ Could not load OSM data';
    }
}

// Render OSM data on the map
function renderOSMData(osmData) {
    const elements = osmData.elements;
    if (!elements) return;

    // Build node lookup
    const nodes = {};
    elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = [el.lat, el.lon];
        }
    });

    // Style map for aeroway types
    const styles = {
        'runway': { color: '#2c2c2c', weight: 8, opacity: 0.9 },
        'taxiway': { color: '#d4a017', weight: 3, opacity: 0.8 },
        'apron': { color: '#888888', weight: 1, fillColor: '#cccccc', fillOpacity: 0.3 },
        'helipad': { color: '#ff4444', weight: 2, fillColor: '#ff4444', fillOpacity: 0.3 }
    };

    let hasTaxiways = false;

    elements.forEach(el => {
        if (el.type !== 'way') return;
        const aeroway = el.tags && el.tags.aeroway;
        if (!aeroway) return;

        const coords = el.nodes.map(id => nodes[id]).filter(c => c);
        if (coords.length < 2) return;

        const style = styles[aeroway] || { color: '#888888', weight: 2 };

        if (aeroway === 'apron') {
            const polygon = L.polygon(coords, style).addTo(map);
            polygon.bindPopup('Apron');
            currentMarkers.push(polygon);
        } else {
            const line = L.polyline(coords, style).addTo(map);
            line.bindPopup(`${aeroway.charAt(0).toUpperCase() + aeroway.slice(1)}`);
            currentMarkers.push(line);
            if (aeroway === 'taxiway') hasTaxiways = true;
        }
    });

    // Add label for runways
    elements.forEach(el => {
        if (el.type !== 'way') return;
        if (!el.tags || el.tags.aeroway !== 'runway') return;

        const coords = el.nodes.map(id => nodes[id]).filter(c => c);
        if (coords.length < 2) return;

        // Label at midpoint
        const midIdx = Math.floor(coords.length / 2);
        const mid = coords[midIdx];
        if (mid) {
            const label = el.tags.ref || 'RWY';
            L.marker(mid, {
                icon: L.divIcon({
                    html: `<span style="background:#2c2c2c;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:12px;">${label}</span>`,
                    iconSize: [50, 22], className: ''
                })
            }).addTo(map);
        }
    });

    // Zoom to fit all features
    const allCoords = [];
    elements.forEach(el => {
        if (el.type === 'way') {
            const coords = el.nodes.map(id => nodes[id]).filter(c => c);
            allCoords.push(...coords);
        }
    });
    if (allCoords.length > 0) {
        map.fitBounds(allCoords, { padding: [50, 50] });
    }
}

function changeAirport(icao) {
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    loadAirportMap(icao);
}

// Initialize
loadData();