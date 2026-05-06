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

// Draw HKIA runways (approximate real positions)
function drawHKIARunways(data) {
    const baseLat = data.lat;
    const baseLon = data.lon;

    // Runway 07L/25R (Northern runway)
    const rw07L25R = L.polyline([
        [baseLat + 0.0030, baseLon - 0.0150],
        [baseLat - 0.0020, baseLon + 0.0160]
    ], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rw07L25R.bindPopup('Runway 07L/25R<br>3,800m × 60m');
    currentMarkers.push(rw07L25R);

    // Runway 07R/25L (Southern runway)
    const rw07R25L = L.polyline([
        [baseLat - 0.0005, baseLon - 0.0145],
        [baseLat - 0.0055, baseLon + 0.0165]
    ], { color: '#2c2c2c', weight: 8 }).addTo(map);
    rw07R25L.bindPopup('Runway 07R/25L<br>3,800m × 60m');
    currentMarkers.push(rw07R25L);

    // Runway labels
    L.marker([baseLat + 0.0035, baseLon - 0.0155], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([baseLat - 0.0025, baseLon + 0.0165], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([baseLat + 0.0000, baseLon - 0.0150], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">07R</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
    L.marker([baseLat - 0.0060, baseLon + 0.0170], {
        icon: L.divIcon({ html: '<span style="font-weight:bold;color:#fff;text-shadow:1px 1px 2px #000;">25L</span>', iconSize: [40, 20], className: '' })
    }).addTo(map);
}

// Draw HKIA taxiways (approximate real layout)
function drawHKIATaxiways(data) {
    const baseLat = data.lat;
    const baseLon = data.lon;

    // Taxiway style
    const taxiStyle = { color: '#d4a017', weight: 3, opacity: 0.8 };
    const taxiLabelStyle = { color: '#fff', fontWeight: 'bold', fontSize: '11px', textShadow: '1px 1px 2px #000' };

    // Taxiway A - Parallel to 07L/25R (north side)
    const twA = L.polyline([
        [baseLat + 0.0050, baseLon - 0.0140],
        [baseLat + 0.0050, baseLon + 0.0150]
    ], taxiStyle).addTo(map);
    twA.bindPopup('Taxiway A - Parallel to RWY 07L/25R');
    currentMarkers.push(twA);

    // Taxiway B - Parallel to 07R/25L (south side)
    const twB = L.polyline([
        [baseLat - 0.0025, baseLon - 0.0140],
        [baseLat - 0.0025, baseLon + 0.0150]
    ], taxiStyle).addTo(map);
    twB.bindPopup('Taxiway B - Parallel to RWY 07R/25L');
    currentMarkers.push(twB);

    // Taxiway C - Connector between runways
    const twC = L.polyline([
        [baseLat + 0.0050, baseLon - 0.0050],
        [baseLat - 0.0025, baseLon - 0.0050]
    ], taxiStyle).addTo(map);
    twC.bindPopup('Taxiway C - Connector');
    currentMarkers.push(twC);

    // Taxiway D - Connector between runways (middle)
    const twD = L.polyline([
        [baseLat + 0.0050, baseLon + 0.0020],
        [baseLat - 0.0025, baseLon + 0.0020]
    ], taxiStyle).addTo(map);
    twD.bindPopup('Taxiway D - Connector');
    currentMarkers.push(twD);

    // Taxiway E - Connector between runways (east)
    const twE = L.polyline([
        [baseLat + 0.0050, baseLon + 0.0090],
        [baseLat - 0.0025, baseLon + 0.0090]
    ], taxiStyle).addTo(map);
    twE.bindPopup('Taxiway E - Connector');
    currentMarkers.push(twE);

    // Taxiway F - Terminal access (north of 07L/25R)
    const twF = L.polyline([
        [baseLat + 0.0050, baseLon - 0.0020],
        [baseLat + 0.0080, baseLon - 0.0020]
    ], taxiStyle).addTo(map);
    twF.bindPopup('Taxiway F - Terminal Access');
    currentMarkers.push(twF);

    // Taxiway G - Terminal access (middle)
    const twG = L.polyline([
        [baseLat + 0.0050, baseLon + 0.0050],
        [baseLat + 0.0080, baseLon + 0.0050]
    ], taxiStyle).addTo(map);
    twG.bindPopup('Taxiway G - Terminal Access');
    currentMarkers.push(twG);

    // Taxiway H - Terminal access (east)
    const twH = L.polyline([
        [baseLat + 0.0050, baseLon + 0.0120],
        [baseLat + 0.0080, baseLon + 0.0120]
    ], taxiStyle).addTo(map);
    twH.bindPopup('Taxiway H - Terminal Access');
    currentMarkers.push(twH);

    // Taxiway J - Rapid exit taxiway from 07L
    const twJ = L.polyline([
        [baseLat + 0.0010, baseLon - 0.0080],
        [baseLat + 0.0050, baseLon - 0.0080]
    ], { ...taxiStyle, dashArray: '5,5' }).addTo(map);
    twJ.bindPopup('Taxiway J - Rapid Exit from RWY 07L');
    currentMarkers.push(twJ);

    // Taxiway K - Rapid exit taxiway from 07R
    const twK = L.polyline([
        [baseLat - 0.0020, baseLon - 0.0080],
        [baseLat - 0.0025, baseLon - 0.0080]
    ], { ...taxiStyle, dashArray: '5,5' }).addTo(map);
    twK.bindPopup('Taxiway K - Rapid Exit from RWY 07R');
    currentMarkers.push(twK);

    // Taxiway L - Rapid exit taxiway from 25R
    const twL = L.polyline([
        [baseLat + 0.0010, baseLon + 0.0080],
        [baseLat + 0.0050, baseLon + 0.0080]
    ], { ...taxiStyle, dashArray: '5,5' }).addTo(map);
    twL.bindPopup('Taxiway L - Rapid Exit from RWY 25R');
    currentMarkers.push(twL);

    // Taxiway M - Rapid exit taxiway from 25L
    const twM = L.polyline([
        [baseLat - 0.0020, baseLon + 0.0080],
        [baseLat - 0.0025, baseLon + 0.0080]
    ], { ...taxiStyle, dashArray: '5,5' }).addTo(map);
    twM.bindPopup('Taxiway M - Rapid Exit from RWY 25L');
    currentMarkers.push(twM);

    // Add taxiway labels
    const taxiLabels = [
        { label: 'A', pos: [baseLat + 0.0055, baseLon - 0.0100] },
        { label: 'B', pos: [baseLat - 0.0020, baseLon - 0.0100] },
        { label: 'C', pos: [baseLat + 0.0015, baseLon - 0.0055] },
        { label: 'D', pos: [baseLat + 0.0015, baseLon + 0.0015] },
        { label: 'E', pos: [baseLat + 0.0015, baseLon + 0.0085] },
        { label: 'F', pos: [baseLat + 0.0065, baseLon - 0.0025] },
        { label: 'G', pos: [baseLat + 0.0065, baseLon + 0.0045] },
        { label: 'H', pos: [baseLat + 0.0065, baseLon + 0.0115] },
        { label: 'J', pos: [baseLat + 0.0030, baseLon - 0.0085] },
        { label: 'K', pos: [baseLat - 0.0015, baseLon - 0.0085] },
        { label: 'L', pos: [baseLat + 0.0030, baseLon + 0.0075] },
        { label: 'M', pos: [baseLat - 0.0015, baseLon + 0.0075] }
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