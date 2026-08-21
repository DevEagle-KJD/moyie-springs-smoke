# Moyie Springs Smoke & Air Quality

A single-page web app for **Moyie Springs, Idaho** (Boundary County, 48.727°N 116.190°W) that answers two questions during fire season:

1. **Is the smoke going to blow out of here, and when?**
2. **How bad is the air going to be over the next 7 days?**

## What it shows

- **Air quality right now** — US EPA AQI, PM2.5 and PM10, color-coded to the official EPA scale, with plain-English health advice.
- **Wind right now** — speed, gusts, and a compass showing which way the wind is moving.
- **Getting outdoors** — the heart of the app: for each of the next 7 days, the chance you can get outside with the AQI below your personal limit (default **100**, adjustable and remembered by your browser). Shows how many daytime hours (7am–9pm) are forecast under the limit, the best stretch of the day, and a verdict: Good chance / Decent chance / Brief window / Unlikely. A headline tells you the next hour you're likely able to step out.
- **Smoke-clearing outlook** — scans the next 48 hours for "clearing windows": times when wind speed and atmospheric mixing depth (boundary-layer height) are high enough to ventilate smoke out of the valley. Rain hours get a bonus since precipitation scrubs smoke from the air. Also tells you whether the AQI forecast is trending better or worse over the next 24 hours.
- **7-day air quality prediction** — daily peak AQI forecast, plus each day's dominant wind direction and max wind speed.
- **Next 24 hours** — hour-by-hour AQI and wind strip.

## Data sources (all free & open, no API keys)

- **[Open-Meteo](https://open-meteo.com/)** — open-source weather API:
  - [Weather Forecast API](https://open-meteo.com/en/docs) — wind speed/direction/gusts, boundary-layer height, precipitation (blend of NOAA GFS/HRRR and other national weather models).
  - [Air Quality API](https://open-meteo.com/en/docs/air-quality-api) — US AQI, PM2.5, PM10 with a 7-day forecast, based on NOAA GEFS-Aerosol and Copernicus CAMS atmospheric models (these model wildfire smoke transport).
- **[PurpleAir](https://www.purpleair.com/)** (optional) — real-time readings from the neighborhood air sensors around Moyie Springs. Needs a free API read key from [develop.purpleair.com](https://develop.purpleair.com/): paste it once into the app and the "right now" number switches from the model estimate to live sensor data (distance-weighted average of the nearest outdoor sensors, 10-minute averaging, with the US EPA conversion applied — the same Barkjohn correction AirNow's Fire & Smoke Map uses, and the "US EPA" option on the PurpleAir map). The key is stored only in your browser, and the 7-day forecast still comes from the models.
- **[NIFC WFIGS](https://data-nifc.opendata.arcgis.com/)** — the National Interagency Fire Center's live feed of active US wildfire incidents (name, location, acres, containment).
- **[BC Wildfire Service](https://wildfiresituation.nrs.gov.bc.ca/)** — live active-fire feed for British Columbia, since Moyie Springs sits ~20 miles from the border and BC fires are a frequent smoke source.

### Where's-the-smoke-from logic

The app pulls every active fire of 100+ acres within ~300 miles (US + BC), computes each fire's compass bearing and distance from Moyie Springs, and weighs it by `acres ÷ distance²`. A fire is "upwind" when its bearing is within ~50° of the direction the wind is blowing **from**. Each day of the forecast gets a tag: 🍃 wind from a direction with no big fires, 🌫️ some fires that way, or 🔥 wind straight from fire country — so you can see at a glance when a wind shift should bring clean air, which is usually what opens the door to getting outside.

No build step, no dependencies, no keys. The page calls the APIs directly from your browser.

## How to use it

- **Locally:** just open `index.html` in any browser.
- **On the web:** enable GitHub Pages for this repo (Settings → Pages → deploy from branch), and it will be live at `https://<username>.github.io/idaho-blog/`.

## How the smoke-clearing score works

Ventilation rate = wind speed × boundary-layer height (how deep the atmosphere is mixing). Thresholds are adapted from National Weather Service ventilation categories:

| Ventilation (m²/s) | Rating |
|---|---|
| ≥ 4700 | Good — smoke should blow out |
| 2350–4700 | Fair — some clearing |
| 1175–2350 | Marginal |
| < 1175 | Poor — smoke likely lingers |

Any hour with ≥ 0.5 mm of rain gets bumped up one category. In practice for the Moyie/Kootenai valley: warm, breezy afternoons clear smoke; calm, cool nights trap it.

> ⚠️ Forecasts are model predictions, not measurements. During active fires nearby, conditions can change faster than models update. Not medical advice.
