let map = null;
let airportData = {};
let drawnLayers = [];

async function loadData() {
    try {
        const r = await fetch('data/airports.json');
        airportData = await r.json();
        const params = new URLSearchParams(window.location.search);
        const icao = params.get('icao') || 'HKG';
        initAirport(icao);
    } catch (e) {
        console.error("airports.json load failed:", e);
    }
}

function initAirport(icao) {
    const data = airportData[icao];
    if (!data) { alert("Airport not found!"); return; }

    document.getElementById('airportTitle').innerText = `${data.name} (${data.icao})`;
    document.getElementById('airportSubtitle').innerText = `${data.city}, ${data.country}`;
    document.getElementById('navName').innerText = data.iata + ' Map';
    document.getElementById('infoIcao').innerText = data.icao;
    document.getElementById('infoIata').innerText = data.iata;
    document.getElementById('infoElev').innerText = data.elev;
    document.getElementById('infoRunways').innerText = data.runways;
    document.getElementById('airportSelect').value = icao;

    clearAll();

    if (!map) {
        map = L.map('map').setView([data.lat, data.lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM'
        }).addTo(map);
    } else {
        map.setView([data.lat, data.lon], 13);
    }

    L.marker([data.lat, data.lon], {
        icon: L.divIcon({ html: '✈️', iconSize: [30, 30], className: '' })
    }).addTo(map);

    document.getElementById('osmStatus').innerText = '⏳ Fetching airport layout...';
    fetchOSM(data);
}

function clearAll() {
    drawnLayers.forEach(l => map.removeLayer(l));
    drawnLayers = [];
}

async function fetchOSM(data) {
    const d = 0.05;
    const query = `[out:json][timeout:15];
    (way["aeroway"~"runway|taxiway|apron|helipad|terminal|gate"](${data.lat-d},${data.lon-d},${data.lat+d},${data.lon+d}));
    out body; >; out skel qt;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const r = await fetch(url);
        const osm = await r.json();
        renderOSM(osm.elements);
    } catch (e) {
        console.error("OSM fetch failed:", e);
        document.getElementById('osmStatus').innerText = '⚠️ Failed to load OSM data';
    }
}

function renderOSM(elements) {
    if (!elements) return;

    const nodes = {};
    elements.forEach(el => { if (el.type === 'node') nodes[el.id] = [el.lat, el.lon]; });

    let rwyCount = 0, twyCount = 0, labelCount = 0;

    elements.forEach(el => {
        if (el.type !== 'way') return;
        const a = el.tags && el.tags.aeroway;
        if (!a) return;

        const coords = el.nodes.map(id => nodes[id]).filter(c => c);
        if (coords.length < 2) return;

        if (a === 'runway') {
            const line = L.polyline(coords, { color: '#2c2c2c', weight: 8, opacity: 0.9 }).addTo(map);
            drawnLayers.push(line);
            rwyCount++;

            const ref = el.tags.ref || '';
            if (ref) {
                const mid = coords[Math.floor(coords.length / 2)];
                const label = L.marker(mid, {
                    icon: L.divIcon({
                        html: `<span style="background:#2c2c2c;color:#fff;padding:2px 7px;border-radius:3px;font-weight:bold;font-size:12px;">${ref}</span>`,
                        iconSize: [50, 22], className: ''
                    })
                }).addTo(map);
                drawnLayers.push(label);
                labelCount++;
            }
        } else if (a === 'taxiway') {
            const line = L.polyline(coords, { color: '#d4a017', weight: 3, opacity: 0.8 }).addTo(map);
            drawnLayers.push(line);
            twyCount++;

            const ref = el.tags.ref || '';
            if (ref) {
                const mid = coords[Math.floor(coords.length / 2)];
                const label = L.marker(mid, {
                    icon: L.divIcon({
                        html: `<span style="background:#d4a017;color:#000;padding:1px 5px;border-radius:3px;font-weight:bold;font-size:11px;">${ref}</span>`,
                        iconSize: [24, 18], className: ''
                    })
                }).addTo(map);
                drawnLayers.push(label);
                labelCount++;
            }
        } else if (a === 'apron') {
            const poly = L.polygon(coords, { color: '#666', weight: 1, fillColor: '#bbb', fillOpacity: 0.25 }).addTo(map);
            drawnLayers.push(poly);
        } else if (a === 'terminal') {
            const poly = L.polygon(coords, { color: '#004494', weight: 1, fillColor: '#0056b3', fillOpacity: 0.12 }).addTo(map);
            drawnLayers.push(poly);
        }
    });

    document.getElementById('osmStatus').innerText = 
        `✅ Loaded — ${rwyCount} runways, ${twyCount} taxiways, ${labelCount} labels`;
}

function changeAirport(icao) {
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    initAirport(icao);
}

loadData();