// Parse clock time directly: the source timestamps describe Boston wall time,
// and must not shift when a viewer is in another time zone.
export function minuteOfDay(timestamp) {
  const match = /[T ](\d{2}):(\d{2})/.exec(timestamp);
  if (!match) throw new Error(`Invalid ride timestamp: ${timestamp}`);
  const minute = Number(match[1]) * 60 + Number(match[2]);
  if (Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error('Invalid clock time');
  return minute;
}
export function buildTrafficIndex(trips) {
  const index = new Map();
  function add(id, kind, timestamp) {
    if (!id) return;
    if (!index.has(id)) index.set(id, { departures: new Uint32Array(1441), arrivals: new Uint32Array(1441) });
    index.get(id)[kind][minuteOfDay(timestamp) + 1]++;
  }
  for (const trip of trips) {
    add(trip.start_station_id, 'departures', trip.started_at);
    add(trip.end_station_id, 'arrivals', trip.ended_at);
  }
  // Prefix sums make each station/time query constant time.
  for (const entry of index.values()) for (const values of Object.values(entry)) {
    for (let i = 1; i <= 1440; i++) values[i] += values[i - 1];
  }
  return index;
}
export function windowCount(prefix, minute) {
  if (!prefix) return 0;
  if (minute === -1) return prefix[1440];
  const center = ((minute % 1440) + 1440) % 1440;
  const start = (center - 60 + 1440) % 1440;
  const end = (center + 60) % 1440;
  // Half-open [time - 60, time + 60): exactly 120 minute buckets.
  return start < end ? prefix[end] - prefix[start] : prefix[1440] - prefix[start] + prefix[end];
}
export function computeStationTraffic(stations, index, minute = -1) {
  return stations.map(station => {
    const entry = index.get(station.short_name);
    const departures = windowCount(entry?.departures, minute);
    const arrivals = windowCount(entry?.arrivals, minute);
    return { ...station, departures, arrivals, totalTraffic: departures + arrivals };
  });
}
export function formatTime(minute) {
  const m = ((minute % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
