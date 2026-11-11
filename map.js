import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { buildTrafficIndex, computeStationTraffic, formatTime } from './traffic.js';

mapboxgl.accessToken = 'pk.eyJ1IjoicGluZ3poYW5neHUiLCJhIjoiY213Ynh5ODZoMDA5cDMwcTNwd2R5ZDc4aiJ9.sCxNRki152Ec6x_vH1pMEQ';
const initialView = { center: [-71.09415, 42.36027], zoom: 12 };
const status = document.querySelector('#status');
const slider = document.querySelector('#time-slider');
const tooltip = document.querySelector('#tooltip');
const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/light-v11', ...initialView, minZoom: 5, maxZoom: 18 });
map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
document.querySelector('#reset-map').addEventListener('click', () => map.flyTo({ ...initialView, bearing: 0, pitch: 0 }));
const svg = d3.select('#map svg.stations');
const flow = d3.scaleQuantize().domain([0, 1]).range(['#d88135', '#9977a9', '#267ba0']);
const comma = d3.format(',');
const sources = [
  ['boston', 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'],
  ['cambridge', 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'],
];
// The ArcGIS download endpoint may redirect or be unavailable. Query its
// underlying official layer, with pagination, as a fallback for Boston.
async function loadLanes(id, url) {
  try {
    const data = await d3.json(url);
    if (data.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');
    return data;
  } catch (error) {
    if (id !== 'boston') throw error;
    const features = [];
    for (let offset = 0; ; offset += 1000) {
      const params = new URLSearchParams({ where: '1=1', outFields: '*', outSR: '4326', f: 'geojson', resultOffset: String(offset), resultRecordCount: '1000' });
      const page = await d3.json(`https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Existing_Bike_Network_2022/FeatureServer/2/query?${params}`);
      if (!Array.isArray(page.features)) throw new Error('Boston GeoJSON unavailable');
      features.push(...page.features);
      if (page.features.length < 1000) break;
    }
    return { type: 'FeatureCollection', features };
  }
}
const warnings = new Set();
let summary = 'Loading map and ride data…';
function showStatus() { status.textContent = [summary, ...warnings].join(' · '); }
map.on('error', event => {
  console.error('Mapbox error:', event.error?.message);
  warnings.add('Some map data could not load. Check your connection and reload.');
  showStatus();
});
map.on('load', async () => {
  // Independent lane requests must not prevent stations from loading.
  for (const [id, url] of sources) {
    loadLanes(id, url).then(data => {
      if (data.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');
      // Cambridge's source also contains future facilities; show existing ones only.
      if (id === 'cambridge') data.features = data.features.filter(feature => Number(feature.properties.ExistingFacility) > 0);
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({ id: `${id}-bike-lanes`, type: 'line', source: id,
        paint: { 'line-color': '#47a66e', 'line-width': 2.4, 'line-opacity': 0.6 } });
    }).catch(error => {
      console.error(`${id} lanes:`, error);
      warnings.add(`${id === 'boston' ? 'Boston' : 'Cambridge'} bike network unavailable`);
      showStatus();
    });
  }
  try {
    summary = 'Loading March rides (about 21 MB)…'; showStatus();
    const [json, trips] = await Promise.all([
      d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json'),
      d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'),
    ]);
    const stations = json.data.stations.filter(s => Number.isFinite(+s.lon) && Number.isFinite(+s.lat));
    const index = buildTrafficIndex(trips);
    const allStations = computeStationTraffic(stations, index);
    const radius = d3.scaleSqrt().domain([0, d3.max(allStations, s => s.totalTraffic) || 1]).range([0, 25]);
    // Draw small stations last so they remain reachable over large circles.
    const circles = svg.selectAll('circle').data(allStations, s => s.short_name).join('circle')
      .attr('tabindex', 0).attr('role', 'img')
      .sort((a, b) => b.totalTraffic - a.totalTraffic);
    circles.append('title');
    let activeStation = null;
    function hideTooltip() { activeStation = null; tooltip.hidden = true; }
    function showTooltip(event, station) {
      activeStation = station.short_name;
      tooltip.replaceChildren();
      const title = document.createElement('strong'); title.textContent = station.name;
      const counts = document.createElement('div'); counts.className = 'numbers';
      counts.textContent = `${comma(station.totalTraffic)} station events\n${comma(station.departures)} departures · ${comma(station.arrivals)} arrivals`;
      tooltip.append(title, counts); tooltip.hidden = false;
      const wrap = document.querySelector('.map-wrap').getBoundingClientRect();
      const point = map.project([+station.lon, +station.lat]);
      const x = event?.clientX ? event.clientX - wrap.left : point.x;
      const y = event?.clientY ? event.clientY - wrap.top : point.y;
      tooltip.style.left = `${Math.max(8, Math.min(x + 16, wrap.width - tooltip.offsetWidth - 8))}px`;
      tooltip.style.top = `${Math.max(8, Math.min(y + 12, wrap.height - tooltip.offsetHeight - 8))}px`;
    }
    circles.on('mouseenter focus', showTooltip).on('mousemove', showTooltip)
      .on('mouseleave blur', hideTooltip).on('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
    function updatePositions() {
      circles.each(function(station) {
        const { x, y } = map.project([+station.lon, +station.lat]);
        d3.select(this).attr('cx', x).attr('cy', y);
      });
    }
    map.on('move', () => { updatePositions(); hideTooltip(); });
    map.on('resize', updatePositions);
    function update() {
      const minute = Number(slider.value);
      const filtered = computeStationTraffic(stations, index, minute);
      radius.range(minute === -1 ? [0, 25] : [0, 50]);
      circles.data(filtered, s => s.short_name)
        .attr('r', s => radius(s.totalTraffic))
        .style('--station-color', s => s.totalTraffic ? flow(s.departures / s.totalTraffic) : '#9977a9')
        .attr('tabindex', s => s.totalTraffic ? 0 : -1)
        .attr('aria-label', s => `${s.name}: ${comma(s.totalTraffic)} station events, ${comma(s.departures)} departures, ${comma(s.arrivals)} arrivals`)
        .select('title').text(s => `${s.name}: ${comma(s.totalTraffic)} trips (${comma(s.departures)} departures, ${comma(s.arrivals)} arrivals)`);
      const selected = document.querySelector('#selected-time');
      selected.hidden = minute === -1;
      selected.textContent = minute === -1 ? '' : formatTime(minute);
      if (minute !== -1) selected.dateTime = `${String(Math.floor((minute % 1440) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      document.querySelector('#any-time').hidden = minute !== -1;
      slider.setAttribute('aria-valuetext', minute === -1 ? 'Any time' : formatTime(minute));
      document.querySelector('#time-heading').textContent = minute === -1 ? 'Every hour, together' : `${formatTime(minute)} in motion`;
      document.querySelector('#window-label').textContent = minute === -1 ? 'All rides throughout March 2024' : `${formatTime(minute - 60)} – ${formatTime(minute + 60)} · Boston local time`;
      for (const button of document.querySelectorAll('[data-minute]')) button.setAttribute('aria-pressed', Number(button.dataset.minute) === minute);
      const total = d3.sum(filtered, s => s.totalTraffic);
      summary = `${comma(trips.length)} rides loaded · ${comma(stations.length)} stations · ${comma(total)} station events in selected time range`;
      showStatus();
      if (activeStation) showTooltip(null, filtered.find(s => s.short_name === activeStation));
      updatePositions();
    }
    slider.disabled = false;
    slider.addEventListener('input', update);
    for (const button of document.querySelectorAll('[data-minute]')) {
      button.disabled = false;
      button.addEventListener('click', () => { slider.value = button.dataset.minute; update(); });
    }
    update();
  } catch (error) {
    console.error('Unable to initialize station data:', error);
    summary = 'Ride data could not load. Check your internet connection and reload this page.';
    showStatus();
  }
});
