let airportData = {};
let map = null;
let allMarkers = [];
let layerGroups = {};

async function loadData() {
    try {
        const response = await fetch('data/airports.json');
        airportData = await response.json();
        const params = new URLSearchParams(window.location.search);
        const icao = params.get('icao') || 'HKG';
        loadAirportMap(icao);
    } catch (error) {
        console.error("Failed to load airport data:", error);
    }
}

function loadAirportMap(icao) {
    const data = airportData[icao];
    if (!data) { alert("Airport not found!"); return; }

    document.getElementById('airportTitle').innerText = `${data.name} (${data.icao})`;
    document.getElementById('airportSubtitle').innerText = `${data.city}, ${data.country}`;
    document.getElementById('infoIcao').innerText = data.icao;
    document.getElementById('infoIata').innerText = data.iata;
    document.getElementById('infoElev').innerText = data.elev;
    document.getElementById('infoCoords').innerText = `${data.lat}°N, ${data.lon}°E`;

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

    document.getElementById('airportSelect').value = icao;

    if (map) {
        map.setView([data.lat, data.lon], 13);
        clearLayers();
    } else {
        map = L.map('map', { zoomControl: true }).setView([data.lat, data.lon], 13);
        L.control.scale({ imperial: false, metric: true }).addTo(map);
        const zoomDisplay = L.control({ position: 'bottomleft' });
        zoomDisplay.onAdd = function() {
            const div = L.DomUtil.create('div', 'zoom-display');
            div.innerHTML = 'Zoom: <span id="zoomLevel">' + map.getZoom() + '</span>';
            map.on('zoomend', function() {
                document.getElementById('zoomLevel').innerText = map.getZoom();
            });
            return div;
        };
        zoomDisplay.addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    const airportIcon = L.divIcon({
        html: '✈️', iconSize: [30, 30], className: 'airport-marker'
    });

    const marker = L.marker([data.lat, data.lon], { icon: airportIcon }).addTo(map);
    marker.bindPopup(`<strong>${data.name}</strong><br>ICAO: ${data.icao} | IATA: ${data.iata}<br>Elevation: ${data.elev}`).openPopup();
    allMarkers.push(marker);

    fetchAirportOSM(icao, data);
}

function clearLayers() {
    Object.keys(layerGroups).forEach(k => {
        if (map.hasLayer(layerGroups[k])) map.removeLayer(layerGroups[k]);
    });
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];
}

async function fetchAirportOSM(icao, data) {
    const d = 0.05;
    const query = `[out:json][timeout:15];
    (way["aeroway"~"runway|taxiway|apron|helipad|terminal|gate"](${data.lat-d},${data.lon-d},${data.lat+d},${data.lon+d}));
    out body; >; out skel qt;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const osmData = await response.json();
        renderOSMData(osmData);
        document.getElementById('osmStatus').innerText = '✅ Airport layout loaded';
    } catch (error) {
        console.error("OSM fetch failed:", error);
        document.getElementById('osmStatus').innerText = '⚠️ Could not load airport layout';
    }
}

function renderOSMData(osmData) {
    const elements = osmData.elements;
    if (!elements) return;

    const nodes = {};
    elements.forEach(el => {
        if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
    });

    layerGroups = {
        runway: L.layerGroup().addTo(map),
        taxiway: L.layerGroup().addTo(map),
        apron: L.layerGroup().addTo(map),
        terminal: L.layerGroup().addTo(map),
        labels: L.layerGroup().addTo(map)
    };

    const styles = {
        runway:  { color: '#2c2c2c', weight: 8, opacity: 0.9 },
        taxiway: { color: '#d4a017', weight: 3, opacity: 0.8 },
        apron:   { color: '#666', weight: 1, fillColor: '#bbb', fillOpacity: 0.25 },
        terminal: { color: '#004494', weight: 2, fillColor: '#0056b3', fillOpacity: 0.15 },
        helipad: { color: '#ff4444', weight: 2, fillColor: '#ff4444', fillOpacity: 0.3 }
    };

    const labelMarkers = [];

    elements.forEach(el => {
        if (el.type !== 'way') return;
        const aeroway = el.tags && el.tags.aeroway;
        if (!aeroway) return;

        const coords = el.nodes.map(id => nodes[id]).filter(c => c);
        if (coords.length < 2) return;

        const style = styles[aeroway] || { color: '#888', weight: 2 };
        const ref = el.tags.ref || '';
        const name = el.tags.name || '';
        let popupText = aeroway.charAt(0).toUpperCase() + aeroway.slice(1);
        if (ref) popupText = `${ref} - ${popupText}`;

        if (aeroway === 'apron' || aeroway === 'terminal') {
            L.polygon(coords, style).addTo(layerGroups[aeroway] || layerGroups.apron).bindPopup(popupText);
        } else if (aeroway === 'runway') {
            const line = L.polyline(coords, style).addTo(layerGroups.runway);
            const labelText = ref || 'RWY';
            line.bindPopup(`Runway ${labelText}${name ? '<br>' + name : ''}`);
            const midIdx = Math.floor(coords.length / 2);
            const mid = coords[midIdx];
            if (mid) {
                const m = L.marker(mid, {
                    icon: L.divIcon({
                        html: `<span style="background:#2c2c2c;color:#fff;padding:2px 7px;border-radius:3px;font-weight:bold;font-size:12px;">${labelText}</span>`,
                        iconSize: [50, 22], className: ''
                    })
                });
                m._labelType = 'runway';
                labelMarkers.push(m);
            }
        } else if (aeroway === 'taxiway') {
            const line = L.polyline(coords, style).addTo(layerGroups.taxiway);
            line.bindPopup(ref ? `Taxiway ${ref}` : 'Taxiway');
            if (ref) {
                const midIdx = Math.floor(coords.length / 2);
                const mid = coords[midIdx];
                if (mid) {
                    const latlngs = coords.map(c => L.latLng(c[0], c[1]));
                    let length = 0;
                    for (let i = 1; i < latlngs.length; i++) length += latlngs[i-1].distanceTo(latlngs[i]);
                    const m = L.marker(mid, {
                        icon: L.divIcon({
                            html: `<span style="background:#d4a017;color:#000;padding:1px 5px;border-radius:3px;font-weight:bold;font-size:11px;">${ref}</span>`,
                            iconSize: [24, 18], className: ''
                        })
                    });
                    m._labelType = length > 400 ? 'major' : 'minor';
                    labelMarkers.push(m);
                }
            }
        } else {
            L.polyline(coords, style).addTo(map).bindPopup(popupText);
        }
    });

    // Store label markers for zoom-based visibility
    window._labelMarkers = labelMarkers;

    // Add all labels to the map immediately
    labelMarkers.forEach(m => m.addTo(layerGroups.labels));

    // Center map
    map.setView([data.lat, data.lon], 13, { animate: false });

    // Apply zoom-based visibility
    window._labelsOn = true;
    applyLabelVisibility();

    // Bind zoom changes (use named handler to avoid removing other listeners)
    if (window._labelZoomHandler) map.off('zoomend', window._labelZoomHandler);
    window._labelZoomHandler = function() { applyLabelVisibility(); };
    map.on('zoomend', window._labelZoomHandler);

    updateLayerCounts();
}

function toggleLabels() {
    window._labelsOn = !window._labelsOn;
    const btn = document.getElementById('labelToggleBtn');
    if (btn) btn.style.opacity = window._labelsOn ? '1' : '0.4';
    applyLabelVisibility();
}

function applyLabelVisibility() {
    const z = map.getZoom();
    const markers = window._labelMarkers || [];
    markers.forEach(m => {
        if (!window._labelsOn) { layerGroups.labels.removeLayer(m); return; }
        if (m._labelType === 'runway' && z >= 12) { layerGroups.labels.addLayer(m); }
        else if (m._labelType === 'major' && z >= 13) { layerGroups.labels.addLayer(m); }
        else if (m._labelType === 'minor' && z >= 14) { layerGroups.labels.addLayer(m); }
        else { layerGroups.labels.removeLayer(m); }
    });
}

function toggleLayer(layerName) {
    const group = layerGroups[layerName];
    if (!group) return;
    if (map.hasLayer(group)) map.removeLayer(group);
    else map.addLayer(group);
}

function updateLayerCounts() {
    if (layerGroups.runway) document.getElementById('countRunways').innerText = layerGroups.runway.getLayers().length;
    if (layerGroups.taxiway) document.getElementById('countTaxiways').innerText = layerGroups.taxiway.getLayers().length;
}

function changeAirport(icao) {
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    loadAirportMap(icao);
}

loadData();