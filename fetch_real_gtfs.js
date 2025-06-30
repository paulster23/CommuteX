#!/usr/bin/env node

// Script to fetch real MTA GTFS-RT data and analyze F and C train travel times
const https = require('https');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// MTA GTFS-RT feed URLs
const GTFS_FEEDS = {
  // F train is in BDFM feed
  bdfm: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  // C train is in ACE feed  
  ace: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace'
};

// Station stop IDs
const STATIONS = {
  'Carroll St': { F: 'F18' },
  'Jay St-MetroTech': { F: 'F20', C: 'A41' },
  '23rd St': { F: 'F22' },
  '23rd St-8th Ave': { C: 'A24' }
};

function fetchGTFSFeed(url) {
  console.log(`Fetching GTFS data from: ${url}`);
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
          console.log(`✅ Successfully fetched feed with ${feed.entity.length} entities`);
          resolve(feed);
        } catch (error) {
          console.error(`❌ Failed to decode GTFS feed: ${error.message}`);
          resolve(null);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`❌ Failed to fetch GTFS feed: ${error.message}`);
      resolve(null);
    });
    
    request.setTimeout(10000, () => {
      console.error(`❌ Request timeout for ${url}`);
      request.abort();
      resolve(null);
    });
  });
}

function analyzeTrainTimes(feed, trainRoute, fromStopId, toStopId, stationNames) {
  console.log(`\n🚇 Analyzing ${trainRoute} train: ${stationNames.from} → ${stationNames.to}`);
  console.log(`Stop IDs: ${fromStopId} → ${toStopId}`);
  
  const trips = [];
  const now = Math.floor(Date.now() / 1000);
  
  // Process trip updates
  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.trip.routeId === trainRoute) {
      const trip = entity.tripUpdate;
      const stopTimes = trip.stopTimeUpdate || [];
      
      // Find departures from origin station  
      const fromStop = stopTimes.find(st => st.stopId === fromStopId);
      const toStop = stopTimes.find(st => st.stopId === toStopId);
      
      if (fromStop && toStop && fromStop.departure && toStop.arrival) {
        const departureTime = fromStop.departure.time;
        const arrivalTime = toStop.arrival.time;
        
        // Only include future trips
        if (departureTime > now) {
          const travelTime = Math.round((arrivalTime - departureTime) / 60); // Convert to minutes
          const minutesAway = Math.round((departureTime - now) / 60);
          
          trips.push({
            tripId: trip.trip.tripId,
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            travelTime: travelTime,
            minutesAway: minutesAway,
            departureTimeFormatted: new Date(departureTime * 1000).toLocaleTimeString(),
            arrivalTimeFormatted: new Date(arrivalTime * 1000).toLocaleTimeString()
          });
        }
      }
    }
  }
  
  // Sort by departure time and take next 3
  trips.sort((a, b) => a.departureTime - b.departureTime);
  const next3 = trips.slice(0, 3);
  
  if (next3.length === 0) {
    console.log(`❌ No upcoming ${trainRoute} trains found for this route`);
    return;
  }
  
  console.log(`📋 Next ${next3.length} trains:`);
  next3.forEach((trip, index) => {
    console.log(`${index + 1}. Trip ${trip.tripId}`);
    console.log(`   Departs: ${trip.departureTimeFormatted} (${trip.minutesAway} min away)`);
    console.log(`   Arrives: ${trip.arrivalTimeFormatted}`);
    console.log(`   Travel Time: ${trip.travelTime} minutes`);
    console.log('');
  });
  
  return next3;
}

async function main() {
  console.log('🚇 Fetching Real MTA GTFS-RT Data for F and C Trains\n');
  console.log('═'.repeat(60));
  
  // Fetch F train data (BDFM feed)
  console.log('\n📡 Fetching F Train Data (BDFM Feed)...');
  const bdfmFeed = await fetchGTFSFeed(GTFS_FEEDS.bdfm);
  
  if (bdfmFeed) {
    analyzeTrainTimes(
      bdfmFeed, 
      'F', 
      STATIONS['Carroll St'].F, 
      STATIONS['Jay St-MetroTech'].F,
      { from: 'Carroll St', to: 'Jay St-MetroTech' }
    );
  }
  
  // Fetch C train data (ACE feed)  
  console.log('\n📡 Fetching C Train Data (ACE Feed)...');
  const aceFeed = await fetchGTFSFeed(GTFS_FEEDS.ace);
  
  if (aceFeed) {
    analyzeTrainTimes(
      aceFeed,
      'C',
      STATIONS['Jay St-MetroTech'].C,
      STATIONS['23rd St-8th Ave'].C,
      { from: 'Jay St-MetroTech', to: '23rd St-8th Ave' }
    );
  }
  
  console.log('\n═'.repeat(60));
  console.log('✅ Analysis complete!');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main().catch(console.error);