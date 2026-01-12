export interface TrainStation {
    code: string;
    name: string;
    city: string;
}

export const TRAIN_STATIONS: TrainStation[] = [
    // Major Indian Railway Stations
    { code: "NDLS", name: "New Delhi Railway Station", city: "New Delhi" },
    { code: "CSMT", name: "Chhatrapati Shivaji Maharaj Terminus", city: "Mumbai" },
    { code: "HWH", name: "Howrah Junction", city: "Kolkata" },
    { code: "MAS", name: "Chennai Central", city: "Chennai" },
    { code: "SBC", name: "KSR Bengaluru City Junction", city: "Bengaluru" },
    { code: "SC", name: "Secunderabad Junction", city: "Hyderabad" },
    { code: "ADI", name: "Ahmedabad Junction", city: "Ahmedabad" },
    { code: "PNBE", name: "Patna Junction", city: "Patna" },
    { code: "PUNE", name: "Pune Junction", city: "Pune" },
    { code: "JP", name: "Jaipur Junction", city: "Jaipur" },
    { code: "LKO", name: "Lucknow Charbagh NR", city: "Lucknow" },
    { code: "BCT", name: "Mumbai Central", city: "Mumbai" },
    { code: "NZM", name: "Hazrat Nizamuddin", city: "New Delhi" },
    { code: "SDAH", name: "Sealdah", city: "Kolkata" },
    { code: "BBS", name: "Bhubaneswar", city: "Bhubaneswar" },
    { code: "GKP", name: "Gorakhpur Junction", city: "Gorakhpur" },
    { code: "CNB", name: "Kanpur Central", city: "Kanpur" },
    { code: "BSB", name: "Varanasi Junction", city: "Varanasi" },
    { code: "ASR", name: "Amritsar Junction", city: "Amritsar" },
    { code: "TVC", name: "Thiruvananthapuram Central", city: "Thiruvananthapuram" },
    { code: "ERS", name: "Ernakulam Junction", city: "Kochi" },
    { code: "BPL", name: "Bhopal Junction", city: "Bhopal" },
    { code: "NGP", name: "Nagpur Junction", city: "Nagpur" },
    { code: "VSKP", name: "Visakhapatnam Junction", city: "Visakhapatnam" },
    { code: "GHY", name: "Guwahati", city: "Guwahati" },
];
