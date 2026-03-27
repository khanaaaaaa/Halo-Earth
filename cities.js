// Real geographic coordinates and UTC offsets
// Sunrise/sunset times vary by latitude — higher latitudes have more extreme seasons
const CITIES = {
  "London":     { lat: 51.507, lon: -0.128,  utc: 0,   desc: "51.5°N — rings arc at 38° above south horizon" },
  "Kathmandu":  { lat: 27.717, lon: 85.317,  utc: 5.75,desc: "27.7°N — rings arc at 62° above south horizon" },
  "Tokyo":      { lat: 35.689, lon: 139.692, utc: 9,   desc: "35.7°N — rings arc at 54° above south horizon" },
  "New York":   { lat: 40.713, lon: -74.006, utc: -5,  desc: "40.7°N — rings arc at 49° above south horizon" },
  "Sydney":     { lat: -33.868,lon: 151.209, utc: 10,  desc: "33.9°S — rings arc at 56° above north horizon" },
  "Singapore":  { lat: 1.352,  lon: 103.820, utc: 8,   desc: "1.4°N — rings arch nearly overhead at 89°" },
  "Cairo":      { lat: 30.033, lon: 31.233,  utc: 2,   desc: "30.0°N — rings arc at 60° above south horizon" },
  "Reykjavik":  { lat: 64.135, lon: -21.895, utc: 0,   desc: "64.1°N — rings arc at only 26° above horizon" },
};

// Scientific ring elevation formula:
// The ring plane is coplanar with Earth's equatorial plane.
// From latitude φ, the ring's highest point (directly above the equator)
// appears at elevation angle = 90° - |φ| above the equator-facing horizon.
// Southern hemisphere observers face north to see the peak; northern face south.
function getRingElevationDeg(lat) {
  return 90 - Math.abs(lat);
}

// Ring arc spans full 180° of azimuth (horizon to horizon)
// but only the portion above the observer's horizon is visible.
// At equator: full semicircle overhead. At poles: rings on horizon, invisible.
function getRingVisible(lat) {
  return Math.abs(lat) < 89.5;
}
