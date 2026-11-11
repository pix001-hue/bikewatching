# Bikewatching: Boston in Motion

DSC 106 Lab 7, built with Mapbox GL JS 2.15.0, D3 7.9.0, HTML, CSS, and JavaScript modules.

## Preview

From this directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. Use an HTTP server, not a file:// URL. No npm installation or build is needed. Internet access is required for Mapbox, the CDN modules, and the course data (about 21 MB for rides). The supplied public Mapbox token is in map.js.

Run the computation checks:

```sh
npm run check
```

## Features

- Boston/Cambridge Mapbox map with pan, zoom, rotation, and reset.
- Both city bike networks as GeoJSON line layers; Cambridge future-only facilities are excluded.
- D3 SVG station circles projected through Mapbox on map movement and resize.
- Square-root radius scale for traffic (arrivals + departures); zero traffic has zero radius.
- Three equal-width departure-ratio bins: more arrivals, balanced, more departures; matching legend.
- Native title tooltips and custom hover/keyboard-focus tooltips with station name and exact counts.
- Time slider, all-day option, and 8 AM / noon / 5 PM presets.
- Independent arrival/departure filtering and a wrapping two-hour window, including midnight.
- Minute buckets stored as prefix sums, so filtering needs two lookups per station instead of scanning every ride.
- Responsive layout, loading/failure messages, labeled controls, and keyboard access.

Time windows use [selected time - 60 minutes, selected time + 60 minutes), matching the lab's optimized 120-bucket method. This includes the lower endpoint and excludes the upper endpoint. The CSV's clock times are read as Boston local time, independent of the viewer's timezone. The selected window aggregates every day in March; this is not a single day's traffic. All-day circle radii range from 0 to 25 px; filtered radii range from 0 to 50 px using the same full-data domain. This intentionally keeps zero-event stations invisible while enlarging nonzero traffic in filtered views.

A station event means one arrival or departure. A ride can contribute two events, and rides involving stations absent from the station snapshot are not assigned to other stations.

## Data sources

- Assignment: https://dsc106.com/labs/lab07/
- Stations: https://dsc106.com/labs/lab07/data/bluebikes-stations.json
- Rides: https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv
- Boston: https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson
- Boston official service fallback: https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Existing_Bike_Network_2022/FeatureServer/2
- Cambridge: https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson

Bike networks are reference layers from different dates, not a reconstruction of both cities' networks in March 2024.

## Publish to GitHub Pages

This folder must be its own repository, separate from the DSC106 portfolio. Create a public repository named `bikewatching` under the account that owns the portfolio (`pix001-hue`), upload this folder's contents at the repository root, then enable Settings → Pages → Deploy from a branch → main → /(root).

The intended URL is https://pix001-hue.github.io/bikewatching/ . This is a target URL, not a verified deployment. If the repository owner/name differs, update the Bikewatching `url` in `DSC106/lib/projects.json` accordingly.

Portfolio changes to upload separately:

- `DSC106/global.js`: render project URLs and resolve image paths relative to the portfolio root.
- `DSC106/lib/projects.json`: new Bikewatching entry and URL fields (empty for projects with no known website).

The user-provided real screenshot is installed at `DSC106/images/bikewatching.png` and referenced by the project entry. Upload this image along with the two portfolio files above.

## Verification status

Passed JavaScript syntax checks and four Node tests covering conservation, missing stations, midnight wrap, separate arrivals/departures, boundary behavior, every minute against a brute-force oracle, and timezone-independent parsing.

The user-provided screenshot confirms the map, station circles, green bike networks, legend, and time controls render. Its status shows 261,687 rides and 453 stations loaded, with 500,419 station events in the all-day view. Interactive behavior is not proven by a still screenshot. Automated browser interaction QA remains unavailable because the execution environment prevented local server binding and its browser access host was unavailable. GitHub deployment has not yet been verified.

Before recording, verify both bike networks load; drag/zoom/resize the map; hover a station; compare all day, 8 AM, and 5 PM; check midnight; and inspect the browser console for errors.

## One-minute recording script

Keep the MP4 under 60 seconds, use laptop screen recording, and explain aloud.

- 0–10 s: “This is Bikewatching, an interactive map of Bluebikes traffic around Boston and Cambridge in March 2024.” Show the whole page.
- 10–23 s: “Green lines show the cities' bike networks. Circles stay aligned as I pan and zoom. A larger circle means more arrivals and departures.” Pan, zoom, reset, then hover a station.
- 23–42 s: “The slider selects a two-hour window. Here is the morning, and here is the evening. Blue means more departures, orange more arrivals, and purple is balanced.” Select 8 AM, 5 PM, move the slider, and point to the legend.
- 42–49 s: “Any time brings back the full month.” Select All day.
- 49–59 s: “The most interesting thing I learned is that circle radius should use a square-root scale, so its area represents traffic accurately. Precomputing minute counts also keeps filtering fast.”
