let airportData = {};
let map = null;
let currentMarkers = [];

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('data/airports.json');
        airportData = await response.json();
        console.log("Airport data loaded.");
        
        // Get ICAO from URL parameter, default to HKG
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
        map.setView([data.lat, data.lon], 14);
        clearMarkers();
    } else {
        map = L.map('map').setView([data.lat, data.lon], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Add airport marker
    const hkiaIcon = L.divIcon({
        html: '✈️',
        iconSize: [30, 30],
        className: 'airport-marker'
    });

    const marker = L.marker([data.lat, data.lon], { icon: hkiaIcon }).addTo(map);
    marker.bindPopup(`
        <strong>${data.name}</strong><br>
        ICAO: ${data.icao} | IATA: ${data.iata}<br>
        Elevation: ${data.elev}
    `).openPopup();
    currentMarkers.push(marker);

    // Draw approximate runway lines (simplified for POC)
    if (icao === 'HKG') {
        drawHKIARunways(data);
        drawHKIATaxiways(data);
    }
}

function clearMarkers() {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
}

// Draw HKIA runways and taxiways with georeferenced coordinates
function drawHKIARunways(data) {
    // RWY 07L/25R: Northern runway (SW→NE)
    const rwy25R = [22.3136, 113.9050];
    const rwy07L = [22.3041, 113.9340];
    const rwy07L25R = L.polyline([rwy25R, rwy07L], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rwy07L25R.bindPopup('Runway 07L/25R<br>3,800m × 60m');
    currentMarkers.push(rwy07L25R);

    // RWY 07R/25L: Southern runway (SW→NE)
    const rwy25L = [22.3085, 113.9056];
    const rwy07R = [22.2990, 113.9346];
    const rwy07R25L = L.polyline([rwy25L, rwy07R], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rwy07R25L.bindPopup('Runway 07R/25L<br>3,800m × 60m');
    currentMarkers.push(rwy07R25L);

    // Runway labels
    L.marker([22.3143, 113.9046], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.3034, 113.9344], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.3092, 113.9052], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.2983, 113.9350], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);

    // Return runway endpoints for taxiway calculations
    return { rwy25R, rwy07L, rwy25L, rwy07R };
}

// Draw HKIA taxiways properly aligned with runway geometry
function drawHKIATaxiways(data) {
    const taxiStyle = { color: '#d4a017', weight: 3, opacity: 0.8 };
    const rapidStyle = { ...taxiStyle, dashArray: '8,6' };

    // Runway endpoints (for vector calculations)
    const rwyN_SW = [22.3136, 113.9050];  // 25R threshold (SW end)
    const rwyN_NE = [22.3041, 113.9340];  // 07L threshold (NE end)
    const rwyS_SW = [22.3085, 113.9056];  // 25L threshold (SW end)
    const rwyS_NE = [22.2990, 113.9346];  // 07R threshold (NE end)

    // Runway direction vector (from SW to NE)
    const dlat = rwyN_NE[0] - rwyN_SW[0];  // -0.0095
    const dlon = rwyN_NE[1] - rwyN_SW[1];  //  0.0290
    const len = Math.sqrt(dlat*dlat + dlon*dlon);

    // Unit direction vector
    const udlat = dlat / len;
    const udlon = dlon / len;

    // Perpendicular unit vector (pointing north = left of runway direction SW→NE)
    const up_lat = -udlon;  // -0.9505
    const up_lon =  udlat;  // -0.3114

    // offset = 200m perpendicular distance from runway centerline
    // At 22°N: 1°lat ≈ 111320m, 1°lon ≈ 103194m
    const offsetDeg = 200 / 111320;  // ~0.0018° in lat direction
    // Adjust perpendicular offset for lat/lon ratio
    const perp_lat_offset = up_lat * offsetDeg;
    const perp_lon_offset = up_lon * offsetDeg * (111320 / 103194);

    // === TAXIWAY A: ~200m north of RWY 07L/25R ===
    const twA = L.polyline([
        [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
        [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset]
    ], taxiStyle).addTo(map);
    twA.bindPopup('Taxiway A - Parallel to RWY 07L/25R');
    currentMarkers.push(twA);

    // === TAXIWAY B: ~200m south of RWY 07R/25L ===
    const twB = L.polyline([
        [rwyS_SW[0] - perp_lat_offset, rwyS_SW[1] - perp_lon_offset],
        [rwyS_NE[0] - perp_lat_offset, rwyS_NE[1] - perp_lon_offset]
    ], taxiStyle).addTo(map);
    twB.bindPopup('Taxiway B - Parallel to RWY 07R/25L');
    currentMarkers.push(twB);

    // Interpolate point on a parallel line at given longitude
    function pointOnLine(sw, ne, lon) {
        const onSW = sw[1] <= ne[1] ? sw : ne;
        const onNE = sw[1] > ne[1] ? sw : ne;
        const t = (lon - onSW[1]) / (onNE[1] - onSW[1]);
        return [onSW[0] + t * (onNE[0] - onSW[0]), lon];
    }

    // === CONNECTOR TAXIWAYS (between A and B, roughly perpendicular) ===
    const connectors = [
        { id: 'C', lon: 113.9090 },
        { id: 'D', lon: 113.9145 },
        { id: 'E', lon: 113.9200 },
        { id: 'F', lon: 113.9255 }
    ];

    connectors.forEach(c => {
        const top = pointOnLine(
            [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
            [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset],
            c.lon
        );
        const bot = pointOnLine(
            [rwyS_SW[0] - perp_lat_offset, rwyS_SW[1] - perp_lon_offset],
            [rwyS_NE[0] - perp_lat_offset, rwyS_NE[1] - perp_lon_offset],
            c.lon
        );
        const line = L.polyline([top, bot], taxiStyle).addTo(map);
        line.bindPopup(`Taxiway ${c.id} - Cross Connector`);
        currentMarkers.push(line);

        // Label
        L.marker([(top[0] + bot[0]) / 2, c.lon + 0.0008], {
            icon: L.divIcon({
                html: `<span style="background:#d4a017;color:#000;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:11px;">${c.id}</span>`,
                iconSize: [20, 18], className: ''
            })
        }).addTo(map);
    });

    // === TERMINAL APRON TAXIWAYS (north of Taxiway A) ===
    // Push further north by 1.5x the offset
    const termNorthSW = [rwyN_SW[0] + perp_lat_offset * 2.5, rwyN_SW[1] + perp_lon_offset * 2.5];
    const termNorthNE = [rwyN_NE[0] + perp_lat_offset * 2.5, rwyN_NE[1] + perp_lon_offset * 2.5];

    const terminalTaxiways = [
        { id: 'G', lon: 113.9090 },
        { id: 'H', lon: 113.9145 },
        { id: 'J', lon: 113.9200 },
        { id: 'K', lon: 113.9255 }
    ];

    terminalTaxiways.forEach(t => {
        const bot = pointOnLine(
            [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
            [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset],
            t.lon
        );
        const top = pointOnLine(termNorthSW, termNorthNE, t.lon);
        const line = L.polyline([bot, top], taxiStyle).addTo(map);
        line.bindPopup(`Taxiway ${t.id} - Terminal Access`);
        currentMarkers.push(line);

        L.marker([(top[0] + bot[0]) / 2, t.lon + 0.0008], {
            icon: L.divIcon({
                html: `<span style="background:#d4a017;color:#000;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:11px;">${t.id}</span>`,
                iconSize: [20, 18], className: ''
            })
        }).addTo(map);
    });

    // === RAPID EXIT TAXIWAYS ===
    // Rapid exit J: from Taxiway A toward RWY 07L/25R at ~30° angle
    const jBot = pointOnLine(
        [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
        [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset],
        113.9080
    );
    const jTop = pointOnLine(rwyN_SW, rwyN_NE, 113.9095);
    const twJ = L.polyline([jBot, jTop], rapidStyle).addTo(map);
    twJ.bindPopup('Rapid Exit J - RWY 07L/25R');
    currentMarkers.push(twJ);

    // Rapid exit L: from Taxiway A toward RWY 07L/25R (east side)
    const lBot = pointOnLine(
        [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
        [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset],
        113.9290
    );
    const lTop = pointOnLine(rwyN_SW, rwyN_NE, 113.9305);
    const twL = L.polyline([lBot, lTop], rapidStyle).addTo(map);
    twL.bindPopup('Rapid Exit L - RWY 07L/25R');
    currentMarkers.push(twL);

    // Rapid exit K: from Taxiway B toward RWY 07R/25L (west side)
    const kBot = pointOnLine(
        [rwyS_SW[0] - perp_lat_offset, rwyS_SW[1] - perp_lon_offset],
        [rwyS_NE[0] - perp_lat_offset, rwyS_NE[1] - perp_lon_offset],
        113.9080
    );
    const kTop = pointOnLine(rwyS_SW, rwyS_NE, 113.9095);
    const twK = L.polyline([kBot, kTop], rapidStyle).addTo(map);
    twK.bindPopup('Rapid Exit K - RWY 07R/25L');
    currentMarkers.push(twK);

    // Rapid exit M: from Taxiway B toward RWY 07R/25L (east side)
    const mBot = pointOnLine(
        [rwyS_SW[0] - perp_lat_offset, rwyS_SW[1] - perp_lon_offset],
        [rwyS_NE[0] - perp_lat_offset, rwyS_NE[1] - perp_lon_offset],
        113.9290
    );
    const mTop = pointOnLine(rwyS_SW, rwyS_NE, 113.9305);
    const twM = L.polyline([mBot, mTop], rapidStyle).addTo(map);
    twM.bindPopup('Rapid Exit M - RWY 07R/25L');
    currentMarkers.push(twM);

    // Label remaining
    const extraLabels = [
        { label: 'A', pos: pointOnLine(
            [rwyN_SW[0] + perp_lat_offset, rwyN_SW[1] + perp_lon_offset],
            [rwyN_NE[0] + perp_lat_offset, rwyN_NE[1] + perp_lon_offset],
            113.9220
        )},
        { label: 'B', pos: pointOnLine(
            [rwyS_SW[0] - perp_lat_offset, rwyS_SW[1] - perp_lon_offset],
            [rwyS_NE[0] - perp_lat_offset, rwyS_NE[1] - perp_lon_offset],
            113.9220
        )}
    ];

    extraLabels.forEach(tl => {
        L.marker(tl.pos, {
            icon: L.divIcon({
                html: `<span style="background:#d4a017;color:#000;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:11px;">${tl.label}</span>`,
                iconSize: [20, 18], className: ''
            })
        }).addTo(map);
    });
}

function changeAirport(icao) {
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    
    loadAirportMap(icao);
}

// Initialize
loadData();