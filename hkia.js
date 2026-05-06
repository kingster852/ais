// Initialize map centered on HKIA
const map = L.map('map').setView([22.3080, 113.9185], 14);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// HKIA Airport marker
const hkiaIcon = L.divIcon({
    html: '✈️',
    iconSize: [30, 30],
    className: 'airport-marker'
});

const hkiaMarker = L.marker([22.3080, 113.9185], { icon: hkiaIcon }).addTo(map);
hkiaMarker.bindPopup(`
    <strong>Hong Kong International Airport</strong><br>
    ICAO: VHHH | IATA: HKG<br>
    Elevation: 28 ft
`).openPopup();

// Draw runway 07L/25R (approximate)
const runway07L25R = L.polyline([
    [22.3105, 113.9050],
    [22.3055, 113.9320]
], {
    color: '#333',
    weight: 4,
    opacity: 0.8
}).addTo(map);

runway07L25R.bindPopup('Runway 07L/25R<br>Length: 3,800 m');

// Draw runway 07R/25L (approximate)
const runway07R25L = L.polyline([
    [22.3065, 113.9060],
    [22.3015, 113.9330]
], {
    color: '#333',
    weight: 4,
    opacity: 0.8
}).addTo(map);

runway07R25L.bindPopup('Runway 07R/25L<br>Length: 3,800 m');

// Add terminal area
const terminalArea = L.circle([22.3080, 113.9185], {
    color: '#0056b3',
    fillColor: '#0056b3',
    fillOpacity: 0.2,
    radius: 500
}).addTo(map);

terminalArea.bindPopup('Terminal Area');

// Add airport boundary (approximate)
const airportBoundary = L.polygon([
    [22.3150, 113.9000],
    [22.3150, 113.9400],
    [22.3000, 113.9400],
    [22.3000, 113.9000]
], {
    color: '#0056b3',
    fillColor: '#0056b3',
    fillOpacity: 0.05,
    weight: 2
}).addTo(map);

airportBoundary.bindPopup('Hong Kong International Airport Boundary');