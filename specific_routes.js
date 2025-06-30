#!/usr/bin/env node

// Script to get specific F and C train travel times
const https = require('https');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_FEEDS = {
  bdfm: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  ace: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace'
};

function fetchGTFSFeed(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
          resolve(feed);
        } catch (error) {
          resolve(null);
        }
      });
    });
    
    request.on('error', () => resolve(null));
    request.setTimeout(10000, () => {
      request.abort();
      resolve(null);
    });
  });
}

function findSpecificRoute(feed, routeId, fromStopId, toStopId, routeName) {
  console.log(`\n🚇 ${routeName} (${fromStopId} → ${toStopId})`);
  console.log('═'.repeat(50));
  
  const trips = [];
  const now = Math.floor(Date.now() / 1000);
  
  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.trip.routeId === routeId) {
      const trip = entity.tripUpdate;
      const stopTimes = trip.stopTimeUpdate || [];
      
      // Find the specific stops
      const fromStop = stopTimes.find(st => st.stopId === fromStopId);
      const toStop = stopTimes.find(st => st.stopId === toStopId);
      
      if (fromStop && toStop && fromStop.departure && toStop.arrival) {
        const departureTime = fromStop.departure.time;
        const arrivalTime = toStop.arrival.time;
        
        // Only include future trips
        if (departureTime > now) {
          const travelTime = Math.round((arrivalTime - departureTime) / 60);
          const minutesAway = Math.round((departureTime - now) / 60);
          
          trips.push({
            tripId: trip.trip.tripId,
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            travelTime: travelTime,
            minutesAway: minutesAway,
            departureFormatted: new Date(departureTime * 1000).toLocaleTimeString(),
            arrivalFormatted: new Date(arrivalTime * 1000).toLocaleTimeString()
          });
        }
      }
    }
  }
  
  // Sort by departure time
  trips.sort((a, b) => a.departureTime - b.departureTime);
  
  if (trips.length === 0) {
    console.log('❌ No upcoming trains found for this specific route');
    
    // Show what stops we do have for this route
    console.log('\n📋 Available stops for this route:');
    const availableStops = new Set();
    for (const entity of feed.entity) {
      if (entity.tripUpdate && entity.tripUpdate.trip.routeId === routeId) {
        const stopTimes = entity.tripUpdate.stopTimeUpdate || [];
        stopTimes.forEach(st => {
          if (st.stopId) availableStops.add(st.stopId);
        });
      }
    }
    
    const sortedStops = Array.from(availableStops).sort();
    console.log(sortedStops.join(', '));
    return;
  }
  
  console.log(`📊 Found ${trips.length} upcoming trains:`);
  
  // Show next 3 trains
  const next3 = trips.slice(0, 3);
  next3.forEach((trip, index) => {
    console.log(`\n${index + 1}. Trip ${trip.tripId}`);
    console.log(`   Departs ${fromStopId}: ${trip.departureFormatted} (${trip.minutesAway} min away)`);
    console.log(`   Arrives ${toStopId}: ${trip.arrivalFormatted}`);
    console.log(`   🕐 Travel Time: ${trip.travelTime} minutes`);
  });
  
  // Calculate average travel time
  if (next3.length > 0) {
    const avgTime = Math.round(next3.reduce((sum, t) => sum + t.travelTime, 0) / next3.length);
    console.log(`\n📈 Average travel time: ${avgTime} minutes`);
  }
}

async function main() {
  console.log('🎯 Specific Route Analysis: F and C Train Travel Times\n');
  
  // F Train: Carroll St → Jay St-MetroTech
  console.log('📡 Fetching F Train Data...');
  const bdfmFeed = await fetchGTFSFeed(GTFS_FEEDS.bdfm);
  
  if (bdfmFeed) {
    console.log(`✅ BDFM feed loaded (${bdfmFeed.entity.length} entities)`);
    
    findSpecificRoute(
      bdfmFeed, 
      'F', 
      'F18N',  // Carroll St northbound
      'F20N',  // Jay St-MetroTech northbound
      'F Train: Carroll St → Jay St-MetroTech (Northbound)'
    );
  }
  
  // C Train: Jay St-MetroTech → 23rd St-8th Ave
  console.log('\n📡 Fetching C Train Data...');
  const aceFeed = await fetchGTFSFeed(GTFS_FEEDS.ace);
  
  if (aceFeed) {
    console.log(`✅ ACE feed loaded (${aceFeed.entity.length} entities)`);
    
    findSpecificRoute(
      aceFeed,
      'C',
      'A41N',  // Jay St-MetroTech northbound (C train uses A stops)
      'A24N',  // 23rd St-8th Ave northbound  
      'C Train: Jay St-MetroTech → 23rd St-8th Ave (Northbound)'
    );
  }
}

main().catch(console.error);