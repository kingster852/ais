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
        // HKIA specific runway layout
        const rw1 = L.polyline([
            [data.lat + 0.0025, data.lon - 0.0135],
            [data.lat - 0.0025, data.lon + 0.0135]
        ], { color: '#333', weight: 4 }).addTo(map);
        
        const rw2 = L.polyline([
            [data.lat - 0.0015, data.lon - 0.0125],
            [data.lat - 0.0065, data.lon + 0.0145]
        ], { color: '#333', weight: 4 }).addTo(map);
        
        currentMarkers.push(rw1, rw2);
    }
}

function clearMarkers() {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
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