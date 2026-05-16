let map = L.map('map').setView([22.3080, 113.9185], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OSM'
}).addTo(map);

// *** BYPASS ALL FETCHES — test label first ***
setTimeout(function() {
    L.marker([22.3080, 113.9185], {
        icon: L.divIcon({
            html: '<b style="background:red;color:#fff;padding:5px 15px;font-size:18px;">TEST</b>',
            iconSize: [80, 30], className: ''
        })
    }).addTo(map);
    document.getElementById('status').innerText = '🔴 Test label should be visible';
}, 2000);

let airportData = {};
let drawn = [];

async function init() {
    try {
        const r = await fetch('data/airports.json');
        airportData = await r.json();
        const p = new URLSearchParams(window.location.search);
        const icao = p.get('icao') || 'HKG';
        loadAirport(icao);
    } catch (e) {
        document.getElementById('status').innerText = '⚠️ airports.json failed';
    }
}

function loadAirport(icao) {
    const d = airportData[icao];
    if (!d) return;

    document.getElementById('title').innerText = `${d.name} (${d.icao}/${d.iata})`;
    document.getElementById('select').value = icao;

    drawn.forEach(l => map.removeLayer(l));
    drawn = [];
    map.setView([d.lat, d.lon], 13);
    document.getElementById('status').innerText = '⏳ Loading OSM...';

    const b = 0.05;
    const q = `[out:json][timeout:15];
    (way["aeroway"~"runway|taxiway|apron|terminal"](${d.lat-b},${d.lon-b},${d.lat+b},${d.lon+b}));
    out body; >; out skel qt;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(osm => render(d, osm.elements))
        .catch(e => { document.getElementById('status').innerText = '⚠️ OSM failed'; });
}

function render(data, elements) {
    if (!elements) return;

    const nodes = {};
    elements.forEach(el => { if (el.type === 'node') nodes[el.id] = [el.lat, el.lon]; });

    let rw = 0, tw = 0, lb = 0;

    elements.forEach(el => {
        if (el.type !== 'way') return;
        const a = el.tags && el.tags.aeroway;
        if (!a) return;
        const coords = el.nodes.map(id => nodes[id]).filter(c => c);
        if (coords.length < 2) return;

        if (a === 'runway') {
            const line = L.polyline(coords, { color: '#2c2c2c', weight: 8 }).addTo(map);
            drawn.push(line); rw++;
            const ref = el.tags.ref || 'RWY';
            const mid = coords[Math.floor(coords.length/2)];
            line.bindTooltip(`<b>${ref}</b>`, {
                permanent: true, direction: 'center',
                className: 'rwy-label-tip', opacity: 1
            }).openTooltip();
            lb++;
        } else if (a === 'taxiway') {
            const line = L.polyline(coords, { color: '#d4a017', weight: 3 }).addTo(map);
            drawn.push(line); tw++;
            const ref = el.tags.ref;
            if (ref) {
                const mid = coords[Math.floor(coords.length/2)];
                const m = L.marker(mid, {
                    opacity: 0,
                    icon: L.divIcon({ html: '', iconSize: [1, 1], className: '' })
                }).addTo(map).bindTooltip(`<b>${ref}</b>`, {
                    permanent: true, direction: 'center',
                    className: 'twy-label-tip', opacity: 1
                });
                m.openTooltip();
                drawn.push(m);
                lb++;
            }
        } else if (a === 'apron') {
            const p = L.polygon(coords, { color: '#666', weight: 1, fillColor: '#bbb', fillOpacity: 0.25 }).addTo(map);
            drawn.push(p);
        } else if (a === 'terminal') {
            const p = L.polygon(coords, { color: '#004494', weight: 1, fillColor: '#0056b3', fillOpacity: 0.12 }).addTo(map);
            drawn.push(p);
        }
    });

    document.getElementById('status').innerText = `✅ ${rw} runways, ${tw} taxiways, ${lb} labels`;
}

function changeAirport(icao) {
    const url = new URL(window.location);
    url.searchParams.set('icao', icao);
    window.history.pushState({}, '', url);
    loadAirport(icao);
}

init();