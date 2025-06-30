#!/usr/bin/env node

// Script to analyze real MTA GTFS-RT data structure
const https = require('https');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const GTFS_FEEDS = {
  bdfm: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  ace: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace'
};

function fetchGTFSFeed(url) {
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

function analyzeStopIds(feed, routeFilter) {
  console.log(`\n📋 Analyzing stop IDs for ${routeFilter} trains:`);
  
  const stopIds = new Set();
  const stations = new Map();
  
  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.trip.routeId === routeFilter) {
      const trip = entity.tripUpdate;
      const stopTimes = trip.stopTimeUpdate || [];
      
      for (const stopTime of stopTimes) {
        if (stopTime.stopId) {
          stopIds.add(stopTime.stopId);
          
          // Try to guess station names from stop IDs
          if (stopTime.stopId.includes('18') || stopTime.stopId.includes('Carroll')) {
            stations.set(stopTime.stopId, 'Possibly Carroll St');
          } else if (stopTime.stopId.includes('20') || stopTime.stopId.includes('Jay')) {
            stations.set(stopTime.stopId, 'Possibly Jay St-MetroTech');
          } else if (stopTime.stopId.includes('22') || stopTime.stopId.includes('23')) {
            stations.set(stopTime.stopId, 'Possibly 23rd St area');
          }
        }
      }
    }
  }
  
  console.log(`Found ${stopIds.size} unique stop IDs for ${routeFilter} trains:`);
  const sortedStopIds = Array.from(stopIds).sort();
  
  sortedStopIds.forEach(stopId => {
    const guess = stations.get(stopId) || '';
    console.log(`  ${stopId} ${guess}`);
  });
  
  return sortedStopIds;
}

function findTravelTimes(feed, routeFilter) {
  console.log(`\n🕐 Analyzing travel times for ${routeFilter} trains:`);
  
  const travelTimes = [];
  const now = Math.floor(Date.now() / 1000);
  
  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.trip.routeId === routeFilter) {
      const trip = entity.tripUpdate;
      const stopTimes = trip.stopTimeUpdate || [];
      
      // Sort by stop sequence if available
      stopTimes.sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
      
      // Look for consecutive stops to calculate travel times
      for (let i = 0; i < stopTimes.length - 1; i++) {
        const currentStop = stopTimes[i];
        const nextStop = stopTimes[i + 1];
        
        if (currentStop.departure && nextStop.arrival) {
          const departureTime = currentStop.departure.time;
          const arrivalTime = nextStop.arrival.time;
          
          if (departureTime > now && arrivalTime > departureTime) {
            const travelTime = Math.round((arrivalTime - departureTime) / 60);
            
            travelTimes.push({
              fromStop: currentStop.stopId,
              toStop: nextStop.stopId,
              travelTime: travelTime,
              departureTime: new Date(departureTime * 1000).toLocaleTimeString(),
              arrivalTime: new Date(arrivalTime * 1000).toLocaleTimeString(),
              tripId: trip.trip.tripId
            });
          }
        }
      }
    }
  }
  
  // Group by stop pairs
  const stopPairs = new Map();
  travelTimes.forEach(tt => {
    const key = `${tt.fromStop} → ${tt.toStop}`;
    if (!stopPairs.has(key)) {
      stopPairs.set(key, []);
    }
    stopPairs.get(key).push(tt);
  });
  
  console.log(`Found ${stopPairs.size} unique stop pairs with travel times:`);
  
  for (const [stopPair, times] of stopPairs) {
    if (times.length > 0) {
      const avgTime = Math.round(times.reduce((sum, t) => sum + t.travelTime, 0) / times.length);
      console.log(`  ${stopPair}: ${avgTime} min avg (${times.length} trips)`);
      
      // Show first few examples
      times.slice(0, 2).forEach(tt => {
        console.log(`    Trip ${tt.tripId}: ${tt.departureTime} → ${tt.arrivalTime} (${tt.travelTime} min)`);
      });
    }
  }
  
  return stopPairs;
}

async function main() {
  console.log('🔍 Analyzing Real MTA GTFS-RT Data Structure\n');
  console.log('═'.repeat(60));
  
  // Analyze F train data
  console.log('\n📡 Fetching F Train Data (BDFM Feed)...');
  const bdfmFeed = await fetchGTFSFeed(GTFS_FEEDS.bdfm);
  
  if (bdfmFeed) {
    console.log(`✅ Successfully fetched BDFM feed with ${bdfmFeed.entity.length} entities`);
    analyzeStopIds(bdfmFeed, 'F');
    findTravelTimes(bdfmFeed, 'F');
  }
  
  // Analyze C train data
  console.log('\n📡 Fetching C Train Data (ACE Feed)...');
  const aceFeed = await fetchGTFSFeed(GTFS_FEEDS.ace);
  
  if (aceFeed) {
    console.log(`✅ Successfully fetched ACE feed with ${aceFeed.entity.length} entities`);
    analyzeStopIds(aceFeed, 'C');
    findTravelTimes(aceFeed, 'C');
  }
  
  console.log('\n═'.repeat(60));
  console.log('✅ Analysis complete!');
}

main().catch(console.error);