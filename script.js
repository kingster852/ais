// Sample Aeronautical Data (POC)
const airportData = [
    { icao: "JFK", iata: "JFK", name: "John F Kennedy International Airport", city: "New York", country: "USA", lat: 40.6413, lon: -73.7781 },
    { icao: "LHR", iata: "LHR", name: "London Heathrow Airport", city: "London", country: "UK", lat: 51.4700, lon: -0.4543 },
    { icao: "DXB", iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE", lat: 25.2532, lon: 55.3657 },
    { icao: "HND", iata: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", lat: 35.5494, lon: 139.7798 },
    { icao: "SIN", iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", lat: 1.3644, lon: 103.9915 },
    { icao: "CDG", iata: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France", lat: 49.0097, lon: 2.5479 }
];

function searchAirport() {
    const input = document.getElementById('searchInput').value.toUpperCase();
    const resultsDiv = document.getElementById('results');
    
    if (!input) {
        resultsDiv.innerHTML = '<div class="placeholder-text">Please enter a search term.</div>';
        return;
    }

    const matches = airportData.filter(airport => 
        airport.icao.includes(input) || 
        airport.iata.includes(input) || 
        airport.name.toUpperCase().includes(input) ||
        airport.city.toUpperCase().includes(input)
    );

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="placeholder-text">No airports found matching your search.</div>';
        return;
    }

    let html = '';
    matches.forEach(airport => {
        html += `
            <div class="airport-card">
                <div class="airport-code">${airport.icao} / ${airport.iata}</div>
                <div class="airport-name">${airport.name}</div>
                <div class="airport-details">
                    City: ${airport.city}, Country: ${airport.country}<br>
                    Coordinates: ${airport.lat.toFixed(4)}, ${airport.lon.toFixed(4)}
                </div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
}

// Allow search on Enter key
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchAirport();
    }
});