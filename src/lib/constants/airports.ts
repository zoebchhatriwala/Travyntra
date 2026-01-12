export interface Airport {
    code: string;
    name: string;
    city: string;
    country: string;
}

export const AIRPORTS: Airport[] = [
    // Major International Hubs
    { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States" },
    { code: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China" },
    { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates" },
    { code: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan" },
    { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States" },
    { code: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom" },
    { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
    { code: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands" },
    { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
    { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
    { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
    { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },
    { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
    { code: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
    { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
    { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States" },
    { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas-Fort Worth", country: "United States" },
    { code: "MAD", name: "Adolfo Suárez Madrid–Barajas Airport", city: "Madrid", country: "Spain" },
    { code: "BCN", name: "Josep Tarradellas Barcelona-El Prat Airport", city: "Barcelona", country: "Spain" },

    // Major Indian Airports
    { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "India" },
    { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },
    { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", country: "India" },
    { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India" },
    { code: "CCU", name: "Netaji Subhash Chandra Bose International Airport", city: "Kolkata", country: "India" },
    { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India" },
    { code: "COK", name: "Cochin International Airport", city: "Kochi", country: "India" },
    { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India" },
    { code: "GOI", name: "Dabolim Airport", city: "Goa", country: "India" },
    { code: "PNQ", name: "Pune Airport", city: "Pune", country: "India" },
    { code: "TRV", name: "Thiruvananthapuram International Airport", city: "Thiruvananthapuram", country: "India" },
    { code: "JAI", name: "Jaipur International Airport", city: "Jaipur", country: "India" },
    { code: "LKO", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", country: "India" },
    { code: "ATQ", name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", country: "India" },
    { code: "IXC", name: "Chandigarh International Airport", city: "Chandigarh", country: "India" },
];
