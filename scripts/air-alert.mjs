// Air alert watcher — runs on a GitHub Actions schedule.
// Blends the same PurpleAir sensors as the app (raw readings, 10-minute
// average, closest counting most). When the blended AQI drops below the
// family limit, sends a push notification via ntfy.sh. Re-arms once the
// air climbs back above REARM so one smoke wobble can't spam the phone.

import fs from "node:fs";

const KEY = "F0A0551A-953B-11F1-9E30-4201AC1DC129";
const NTFY_TOPIC = "moyie-springs-air-3x7k";
const LIMIT = 100;   // alert when the air drops below this (fires at 99 or lower)
const REARM = 105;   // re-arm for the next alert once air rises above this
const LAT = 48.7266, LON = -116.1902;
const STATE_FILE = "alert-state.json";

// Only alert during waking hours (7am–9pm Pacific)
const hour = Number(
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false })
    .format(new Date())
);
if (hour < 7 || hour >= 21) {
  console.log("Quiet hours (" + hour + "h Pacific) — skipping check.");
  process.exit(0);
}

function pm25ToAqi(c) {
  const bp = [[0,9.0,0,50],[9.1,35.4,51,100],[35.5,55.4,101,150],
              [55.5,125.4,151,200],[125.5,225.4,201,300],[225.5,500.4,301,500]];
  c = Math.max(0, c);
  for (const b of bp) if (c <= b[1]) return Math.round((c - b[0]) / (b[1] - b[0]) * (b[3] - b[2]) + b[2]);
  return 500;
}
function distMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const s = Math.sin(dLat/2)**2 + Math.cos(lat1*toR) * Math.cos(lat2*toR) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const url = "https://api.purpleair.com/v1/sensors" +
  "?fields=" + encodeURIComponent("name,latitude,longitude,pm2.5_10minute") +
  "&location_type=0&max_age=7200" +
  "&nwlng=-116.65&nwlat=48.95&selng=-115.75&selat=48.55";

const res = await fetch(url, { headers: { "X-API-Key": KEY } });
if (!res.ok) {
  console.log("PurpleAir returned HTTP " + res.status + " — skipping this run.");
  process.exit(0);
}
const data = await res.json();
const fi = {};
(data.fields || []).forEach((f, i) => { fi[f] = i; });
const sensors = (data.data || [])
  .map(row => {
    const raw = row[fi["pm2.5_10minute"]];
    if (raw == null) return null;
    return { dist: distMiles(LAT, LON, row[fi.latitude], row[fi.longitude]), aqi: pm25ToAqi(raw) };
  })
  .filter(Boolean)
  .sort((a, b) => a.dist - b.dist)
  .slice(0, 5);

if (!sensors.length) {
  console.log("No sensors reporting — skipping this run.");
  process.exit(0);
}
let wsum = 0, sum = 0;
for (const s of sensors) {
  const w = 1 / (s.dist * s.dist + 0.25);
  wsum += w; sum += s.aqi * w;
}
const aqi = Math.round(sum / wsum);

let state = { armed: true };
try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}

console.log("Blended AQI: " + aqi + " · armed: " + state.armed);

if (aqi < LIMIT && state.armed) {
  const msg = "The air just dropped below " + LIMIT + " — it's " + aqi +
              " right now in Moyie Springs. Good time to get outside! 🍃";
  const r = await fetch("https://ntfy.sh/" + NTFY_TOPIC, {
    method: "POST",
    headers: { Title: "Moyie Air - time to get outside!", Priority: "high", Tags: "leaves" },
    body: msg
  });
  console.log("Alert sent (ntfy HTTP " + r.status + ")");
  state.armed = false;
} else if (aqi > REARM && !state.armed) {
  const msg = "The air just climbed above " + REARM + " — it's " + aqi +
              " right now in Moyie Springs. Time to head back inside. 😷";
  const r = await fetch("https://ntfy.sh/" + NTFY_TOPIC, {
    method: "POST",
    headers: { Title: "Moyie Air - time to head back in", Priority: "high", Tags: "warning" },
    body: msg
  });
  console.log("Back-inside alert sent (ntfy HTTP " + r.status + ")");
  state.armed = true;
}

fs.writeFileSync(STATE_FILE, JSON.stringify(state) + "\n");
