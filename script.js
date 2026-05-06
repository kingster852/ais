// Expanded Mock Database for Pilot POC
const airportData = {
    "JFK": {
        icao: "JFK", iata: "JFK", name: "John F Kennedy International", city: "New York", country: "USA",
        lat: 40.6413, lon: -73.7781, elev: "13 ft", runways: "4 (04L/22R, 04R/22L, 13L/31R, 13R/31L)",
        metar: "METAR KJFK 121551Z 28012KT 10SM FEW050 SCT250 22/14 A3005 RMK AO2 SLP176",
        notams: [
            "RWY 04R/22L CLOSED FOR MAINTENANCE UNTIL 1200Z",
            "TWY A BETWEEN A1 AND A2 CLOSED"
        ]
    },
    "LHR": {
        icao: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "UK",
        lat: 51.4700, lon: -0.4543, elev: "83 ft", runways: "2 (09L/27R, 09R/27L)",
        metar: "METAR EGLL 121520Z 24015KT 9999 SCT035 18/10 Q1015 NOSIG",
        notams: [
            "RADAR SERVICE LIMITED DUE TO MAINTENANCE",
            "BIRD ACTIVITY REPORTED IN VICINITY OF AIRPORT"
        ]
    },
    "DXB": {
        icao: "OMDB", iata: "DXB", name: "Dubai International", city: "Dubai", country: "UAE",
        lat: 25.2532, lon: 55.3657, elev: "62 ft", runways: "2 (12L/30R, 12R/30L)",
        metar: "METAR OMDB 121600Z 32008KT CAVOK 38/18 Q1008 NOSIG",
        notams: []
    },
    "HKG": {
        icao: "VHHH", iata: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "SAR",
        lat: 22.3080, lon: 113.9185, elev: "28 ft", runways: "2 (07L/25R, 07R/25L)",
        metar: "METAR VHHH 121600Z 18008KT 9999 FEW020 SCT040 30/26 Q1010 NOSIG",
        notams: [
            "RWY 07R/25L RESURFACING IN PROGRESS",
            "APRON 5 CLOSED FOR EXPANSION WORKS"
        ]
    }
};

function searchAirport() {
    const input = document.getElementById('searchInput').value.toUpperCase().trim();
    if (!input) return;
    
    // Search by ICAO, IATA, or Name
    const key = Object.keys(airportData).find(k => 
        airportData[k].icao === input || 
        airportData[k].iata === input || 
        airportData[k].name.toUpperCase().includes(input)
    );

    if (key) {
        loadAirport(key);
    } else {
        alert("Airport not found in database.");
    }
}

function loadAirport(code) {
    const data = airportData[code];
    if (!data) return;

    // Update Header
    document.getElementById('airportName').innerText = data.name;
    document.getElementById('airportCode').innerText = `${data.icao} / ${data.iata}`;

    // Update Info Tab
    document.getElementById('city').innerText = data.city;
    document.getElementById('country').innerText = data.country;
    document.getElementById('coords').innerText = `${data.lat}, ${data.lon}`;
    document.getElementById('elevation').innerText = data.elev;
    document.getElementById('runways').innerText = data.runways;

    // Update Weather Tab
    document.getElementById('metarData').innerText = data.metar;

    // Update NOTAMs Tab
    const notamsList = document.getElementById('notamsList');
    notamsList.innerHTML = '';
    if (data.notams.length > 0) {
        data.notams.forEach(n => {
            const li = document.createElement('li');
            li.innerText = n;
            notamsList.appendChild(li);
        });
    } else {
        notamsList.innerHTML = '<li>No active NOTAMs.</li>';
    }

    // Reset to Info tab
    switchTab('info');
}

function switchTab(tabName) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // Show selected
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Enter key support
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchAirport();
});