let airportData = {};

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('data/airports.json');
        airportData = await response.json();
        console.log("Airport data loaded.");
    } catch (error) {
        console.error("Failed to load airport data:", error);
    }
}

function searchAirport() {
    const input = document.getElementById('searchInput').value.toUpperCase().trim();
    if (!input) return;
    
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

    document.getElementById('airportName').innerText = data.name;
    document.getElementById('airportCode').innerText = `${data.icao} / ${data.iata}`;

    document.getElementById('city').innerText = data.city;
    document.getElementById('country').innerText = data.country;
    document.getElementById('coords').innerText = `${data.lat}, ${data.lon}`;
    document.getElementById('elevation').innerText = data.elev;
    document.getElementById('runways').innerText = data.runways;

    document.getElementById('metarData').innerText = data.metar;

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

    switchTab('info');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchAirport();
});

// Initialize
loadData();