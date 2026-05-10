let airportData = {};
let map = null;
let currentMarkers = [];
let layerGroups = {};

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
        // Add zoom level display
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

    fetchAirportOSM(icao, data);
}

function clearLayers() {
    Object.keys(layerGroups).forEach(k => {
        layerGroups[k].clearLayers();
    });
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
}

async function fetchAirportOSM(icao, data) {
    const d = 0.05;
    const query = `[out:json][timeout:15];
    (
      way["aeroway"~"runway|taxiway|apron|helipad|terminal|gate"](${data.lat-d},${data.lon-d},${data.lat+d},${data.lon+d});
    );
    out body;
    >;
    out skel qt;`;

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

    // Create layer groups — major/minor taxiway labels for zoom LOD
    // NOTE: label layers are NOT added to map initially — updateLabelsByZoom controls them
    layerGroups = {
        runway: L.layerGroup().addTo(map),
        taxiway: L.layerGroup().addTo(map),
        apron: L.layerGroup().addTo(map),
        terminal: L.layerGroup().addTo(map),
        label_taxiway_major: L.layerGroup(),
        label_taxiway_minor: L.layerGroup(),
        label_runway: L.layerGroup()
    };

    const styles = {
        runway:  { color: '#2c2c2c', weight: 8, opacity: 0.9 },
        taxiway: { color: '#d4a017', weight: 3, opacity: 0.8 },
        apron:   { color: '#666', weight: 1, fillColor: '#bbb', fillOpacity: 0.25 },
        terminal: { color: '#004494', weight: 2, fillColor: '#0056b3', fillOpacity: 0.15 },
        helipad: { color: '#ff4444', weight: 2, fillColor: '#ff4444', fillOpacity: 0.3 }
    };

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
            const poly = L.polygon(coords, style).addTo(layerGroups[aeroway] || layerGroups.apron);
            poly.bindPopup(popupText);
        } else if (aeroway === 'taxiway' && ref) {
            const line = L.polyline(coords, style).addTo(layerGroups.taxiway);
            line.bindPopup(`Taxiway ${ref}`);

            // Calculate approximate length
            const latlngs = coords.map(c => L.latLng(c[0], c[1]));
            let length = 0;
            for (let i = 1; i < latlngs.length; i++) {
                length += latlngs[i-1].distanceTo(latlngs[i]);
            }

            const midIdx = Math.floor(coords.length / 2);
            const mid = coords[midIdx];
            if (mid) {
                const label = L.marker(mid, {
                    icon: L.divIcon({
                        html: `<span style="background:#d4a017;color:#000;padding:1px 5px;border-radius:3px;font-weight:bold;font-size:11px;">${ref}</span>`,
                        iconSize: [24, 18], className: ''
                    })
                });
                if (length > 400) {
                    label.addTo(layerGroups.label_taxiway_major);
                } else {
                    label.addTo(layerGroups.label_taxiway_minor);
                }
            }
        } else if (aeroway === 'runway') {
            const line = L.polyline(coords, style).addTo(layerGroups.runway);
            const label = ref || 'RWY';
            line.bindPopup(`Runway ${label}${name ? '<br>' + name : ''}`);

            const midIdx = Math.floor(coords.length / 2);
            const mid = coords[midIdx];
            if (mid) {
                L.marker(mid, {
                    icon: L.divIcon({
                        html: `<span style="background:#2c2c2c;color:#fff;padding:2px 7px;border-radius:3px;font-weight:bold;font-size:12px;">${label}</span>`,
                        iconSize: [50, 22], className: ''
                    })
                }).addTo(layerGroups.label_runway);
            }
        } else if (aeroway === 'taxiway') {
            const line = L.polyline(coords, style).addTo(layerGroups.taxiway);
            line.bindPopup('Taxiway');
        } else {
            const line = L.polyline(coords, style).addTo(map);
            line.bindPopup(popupText);
        }
    });

    // Center map on airport at zoom 13 for all airports
    map.setView([data.lat, data.lon], 13, { animate: false });

    // === LABEL TOGGLE BUTTON ON MAP ===
    let labelsVisible = true;
    const labelBtnCtrl = L.control({ position: 'topright' });
    labelBtnCtrl.onAdd = function() {
        const div = L.DomUtil.create('div', 'label-toggle-btn');
        div.innerHTML = '<button style="background:white;border:none;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:bold;border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,0.3);" id="labelBtn">🏷️ Labels</button>';
        return div;
    };
    labelBtnCtrl.addTo(map);

    document.getElementById('labelBtn').onclick = function() {
        labelsVisible = !labelsVisible;
        this.style.opacity = labelsVisible ? '1' : '0.4';
        syncLabels();
    };

    function syncLabels() {
        if (!labelsVisible) {
            toggleLabelGroup('label_runway', false);
            toggleLabelGroup('label_taxiway_major', false);
            toggleLabelGroup('label_taxiway_minor', false);
            return;
        }
        applyLabelsForZoom(map.getZoom());
    }

    // Apply labels and bind zoom changes
    syncLabels();
    if (window._oldZoomHandler) {
        map.off('zoomend', window._oldZoomHandler);
    }
    window._oldZoomHandler = function() { syncLabels(); };
    map.on('zoomend', window._oldZoomHandler);

    updateLayerCounts();
}

function applyLabelsForZoom(zoom) {
    const labelsEnabled = document.querySelector('[data-layer="taxiway_labels"]')?.checked !== false;
    toggleLabelGroup('label_runway', zoom >= 12);
    toggleLabelGroup('label_taxiway_major', labelsEnabled && zoom >= 13);
    toggleLabelGroup('label_taxiway_minor', labelsEnabled && zoom >= 14);
}

function toggleLabelGroup(name, visible) {
    const group = layerGroups[name];
    if (!group) return;
    if (visible && !map.hasLayer(group)) {
        map.addLayer(group);
    } else if (!visible && map.hasLayer(group)) {
        map.removeLayer(group);
    }
}

function toggleLabelsByZoom() {
    applyLabelsForZoom(map.getZoom());
}

function toggleLayer(layerName) {
    const group = layerGroups[layerName];
    if (!group) return;
    const visible = map.hasLayer(group);
    if (visible) {
        map.removeLayer(group);
    } else {
        map.addLayer(group);
    }
}

function updateLayerCounts() {
    if (layerGroups.runway) {
        document.getElementById('countRunways').innerText = layerGroups.runway.getLayers().length;
    }
    if (layerGroups.taxiway) {
        document.getElementById('countTaxiways').innerText = layerGroups.taxiway.getLayers().length;
    }
}

function changeAirport(icao) {
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    loadAirportMap(icao);
}

loadData();