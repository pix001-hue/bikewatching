import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrafficIndex, computeStationTraffic, minuteOfDay, formatTime } from './traffic.js';
const trips = [
 {start_station_id:'A',end_station_id:'B',started_at:'2024-03-01 23:45:00',ended_at:'2024-03-02 00:10:00'},
 {start_station_id:'B',end_station_id:'A',started_at:'2024-03-02 00:30:00',ended_at:'2024-03-02 01:00:00'},
 {start_station_id:'A',end_station_id:'A',started_at:'2024-03-02 12:00:00',ended_at:'2024-03-02 12:20:00'},
];
const stations = ['A','B','C'].map(short_name=>({short_name}));
const index = buildTrafficIndex(trips);
test('all-day arrivals and departures are conserved; unmatched stations are zero',()=>{
 const all = computeStationTraffic(stations,index);
 assert.deepEqual(all.map(s=>[s.departures,s.arrivals,s.totalTraffic]),[[2,2,4],[1,1,2],[0,0,0]]);
 assert.equal(all.reduce((sum,s)=>sum+s.totalTraffic,0),trips.length*2);
 assert.equal(stations[0].totalTraffic,undefined);
});
test('midnight wraps and arrivals use their own timestamp; upper endpoint excluded',()=>{
 const midnight=computeStationTraffic(stations,index,0);
 assert.deepEqual(midnight.map(s=>[s.departures,s.arrivals]),[[1,0],[1,1],[0,0]]);
 assert.deepEqual(midnight,computeStationTraffic(stations,index,1440));
});
test('minute indexing agrees with brute-force counts for every minute',()=>{
 for(let minute=0;minute<1440;minute++){
  const actual=computeStationTraffic(stations,index,minute);
  const matches=t=>((minuteOfDay(t)-minute+60+1440)%1440)<120;
  for(const s of actual){
   assert.equal(s.departures,trips.filter(t=>t.start_station_id===s.short_name&&matches(t.started_at)).length);
   assert.equal(s.arrivals,trips.filter(t=>t.end_station_id===s.short_name&&matches(t.ended_at)).length);
  }
 }
});
test('clock parsing and formatting are independent of viewer time zone',()=>{
 assert.equal(minuteOfDay('2024-03-10 08:30:00'),510);
 assert.equal(formatTime(1440),'12:00 AM');
 assert.equal(formatTime(-60),'11:00 PM');
 assert.throws(()=>minuteOfDay('2024-03-01 25:00:00'));
});
