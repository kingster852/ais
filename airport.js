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
    // Accurate HKIA runway thresholds
    // RWY 07L/25R: Northern runway
    const rwy07L25R = L.polyline([
        [22.3136, 113.9050],
        [22.3041, 113.9340]
    ], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rwy07L25R.bindPopup('Runway 07L/25R<br>3,800m × 60m');
    currentMarkers.push(rwy07L25R);

    // RWY 07R/25L: Southern runway
    const rwy07R25L = L.polyline([
        [22.3085, 113.9056],
        [22.2990, 113.9346]
    ], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rwy07R25L.bindPopup('Runway 07R/25L<br>3,800m × 60m');
    currentMarkers.push(rwy07R25L);

    // Runway labels
    L.marker([22.3143, 113.9046], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.3034, 113.9344], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.3092, 113.9052], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([22.2983, 113.9350], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
}

// Draw HKIA taxiways aligned with runway geometry
function drawHKIATaxiways(data) {
    const taxiStyle = { color: '#d4a017', weight: 3, opacity: 0.8 };
    const rapidStyle = { ...taxiStyle, dashArray: '8,6' };

    // === PARALLEL TAXIWAYS (aligned with runways) ===

    // Taxiway A - ~180m north of RWY 07L/25R
    const twA = L.polyline([
        [22.3152, 113.9055],
        [22.3057, 113.9345]
    ], taxiStyle).addTo(map);
    twA.bindPopup('Taxiway A - Parallel to RWY 07L/25R');
    currentMarkers.push(twA);

    // Taxiway B - ~150m south of RWY 07R/25L
    const twB = L.polyline([
        [22.3067, 113.9050],
        [22.2972, 113.9340]
    ], taxiStyle).addTo(map);
    twB.bindPopup('Taxiway B - Parallel to RWY 07R/25L');
    currentMarkers.push(twB);

    // Taxiway C - Between runways (midfield)
    const twC = L.polyline([
        [22.3108, 113.9140],
        [22.3060, 113.9140]
    ], taxiStyle).addTo(map);
    twC.bindPopup('Taxiway C - Midfield Connector');
    currentMarkers.push(twC);

    // Taxiway D - Between runways (center)
    const twD = L.polyline([
        [22.3108, 113.9185],
        [22.3060, 113.9185]
    ], taxiStyle).addTo(map);
    twD.bindPopup('Taxiway D - Center Connector');
    currentMarkers.push(twD);

    // Taxiway E - Between runways (east)
    const twE = L.polyline([
        [22.3108, 113.9230],
        [22.3060, 113.9230]
    ], taxiStyle).addTo(map);
    twE.bindPopup('Taxiway E - East Connector');
    currentMarkers.push(twE);

    // === TERMINAL APRON TAXIWAYS ===

    // Taxiway F - Terminal frontage (west)
    const twF = L.polyline([
        [22.3152, 113.9125],
        [22.3170, 113.9125]
    ], taxiStyle).addTo(map);
    twF.bindPopup('Taxiway F - Terminal West');
    currentMarkers.push(twF);

    // Taxiway G - Terminal frontage (center)
    const twG = L.polyline([
        [22.3152, 113.9185],
        [22.3170, 113.9185]
    ], taxiStyle).addTo(map);
    twG.bindPopup('Taxiway G - Terminal Center');
    currentMarkers.push(twG);

    // Taxiway H - Terminal frontage (east)
    const twH = L.polyline([
        [22.3152, 113.9250],
        [22.3170, 113.9250]
    ], taxiStyle).addTo(map);
    twH.bindPopup('Taxiway H - Terminal East');
    currentMarkers.push(twH);

    // === RAPID EXIT TAXIWAYS ===

    // Taxiway J - Rapid exit RWY 07L (west side)
    const twJ = L.polyline([
        [22.3115, 113.9105],
        [22.3152, 113.9105]
    ], rapidStyle).addTo(map);
    twJ.bindPopup('Taxiway J - Rapid Exit RWY 07L');
    currentMarkers.push(twJ);

    // Taxiway K - Rapid exit RWY 07R (west side)
    const twK = L.polyline([
        [22.3070, 113.9105],
        [22.3067, 113.9105]
    ], rapidStyle).addTo(map);
    twK.bindPopup('Taxiway K - Rapid Exit RWY 07R');
    currentMarkers.push(twK);

    // Taxiway L - Rapid exit RWY 25R (east side)
    const twL = L.polyline([
        [22.3065, 113.9275],
        [22.3057, 113.9275]
    ], rapidStyle).addTo(map);
    twL.bindPopup('Taxiway L - Rapid Exit RWY 25R');
    currentMarkers.push(twL);

    // Taxiway M - Rapid exit RWY 25L (east side)
    const twM = L.polyline([
        [22.3015, 113.9275],
        [22.2972, 113.9275]
    ], rapidStyle).addTo(map);
    twM.bindPopup('Taxiway M - Rapid Exit RWY 25L');
    currentMarkers.push(twM);

    // === ADDITIONAL CONNECTORS ===
    // Taxiway N - West cross connector
    const twN = L.polyline([
        [22.3152, 113.9065],
        [22.3067, 113.9065]
    ], taxiStyle).addTo(map);
    twN.bindPopup('Taxiway N - West Cross');
    currentMarkers.push(twN);

    // Taxiway P - East cross connector
    const twP = L.polyline([
        [22.3057, 113.9310],
        [22.2972, 113.9310]
    ], taxiStyle).addTo(map);
    twP.bindPopup('Taxiway P - East Cross');
    currentMarkers.push(twP);

    // Taxiway Q - Terminal ramp access
    const twQ = L.polyline([
        [22.3152, 113.9155],
        [22.3170, 113.9155]
    ], taxiStyle).addTo(map);
    twQ.bindPopup('Taxiway Q - Terminal Ramp');
    currentMarkers.push(twQ);

    // Taxiway R - Terminal ramp access
    const twR = L.polyline([
        [22.3152, 113.9215],
        [22.3170, 113.9215]
    ], taxiStyle).addTo(map);
    twR.bindPopup('Taxiway R - Terminal Ramp');
    currentMarkers.push(twR);

    // === TAXIWAY LABELS ===
    const taxiLabels = [
        { label: 'A', pos: [22.3160, 113.9200] },
        { label: 'B', pos: [22.2955, 113.9200] },
        { label: 'C', pos: [22.3085, 113.9138] },
        { label: 'D', pos: [22.3085, 113.9185] },
        { label: 'E', pos: [22.3085, 113.9235] },
        { label: 'F', pos: [22.3160, 113.9120] },
        { label: 'G', pos: [22.3160, 113.9185] },
        { label: 'H', pos: [22.3160, 113.9255] },
        { label: 'J', pos: [22.3135, 113.9100] },
        { label: 'K', pos: [22.3065, 113.9100] },
        { label: 'L', pos: [22.3055, 113.9280] },
        { label: 'M', pos: [22.2995, 113.9280] },
        { label: 'N', pos: [22.3110, 113.9060] },
        { label: 'P', pos: [22.3015, 113.9315] }
    ];

    taxiLabels.forEach(tl => {
        L.marker(tl.pos, {
            icon: L.divIcon({
                html: `<span style="background:#d4a017;color:#000;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:11px;">${tl.label}</span>`,
                iconSize: [20, 18],
                className: ''
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