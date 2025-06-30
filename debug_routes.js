#!/usr/bin/env node

// Debug script to understand the GTFS data structure better
const https = require('https');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

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

function debugTrip(feed, routeId, targetStops) {
  console.log(`\n🔍 Debugging ${routeId} train trips with stops: ${targetStops.join(', ')}`);
  console.log('═'.repeat(60));
  
  const now = Math.floor(Date.now() / 1000);
  let tripCount = 0;
  
  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.trip.routeId === routeId) {
      const trip = entity.tripUpdate;
      const stopTimes = trip.stopTimeUpdate || [];
      
      // Check if this trip includes our target stops
      const hasTargetStops = targetStops.some(stopId => 
        stopTimes.some(st => st.stopId === stopId)
      );
      
      if (hasTargetStops && tripCount < 3) { // Show first 3 relevant trips
        tripCount++;
        console.log(`\n📍 Trip ${trip.trip.tripId}:`);
        
        // Sort stops by stop sequence for proper order
        const sortedStops = stopTimes
          .filter(st => st.stopId && (st.arrival || st.departure))
          .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
        
        console.log('   Stop Sequence:');
        sortedStops.forEach(st => {
          const arrivalTime = st.arrival ? new Date(st.arrival.time * 1000).toLocaleTimeString() : 'N/A';
          const departureTime = st.departure ? new Date(st.departure.time * 1000).toLocaleTimeString() : 'N/A';
          const sequence = st.stopSequence || '?';
          const isFuture = (st.departure?.time || st.arrival?.time || 0) > now;
          const status = isFuture ? '🟢' : '🔴';
          
          console.log(`   ${sequence}. ${st.stopId} - Arr: ${arrivalTime}, Dep: ${departureTime} ${status}`);
        });
        
        // Calculate travel times between consecutive target stops
        for (let i = 0; i < targetStops.length - 1; i++) {
          const fromStopId = targetStops[i];
          const toStopId = targetStops[i + 1];
          
          const fromStop = sortedStops.find(st => st.stopId === fromStopId);
          const toStop = sortedStops.find(st => st.stopId === toStopId);
          
          if (fromStop && toStop && fromStop.departure && toStop.arrival) {
            const travelTime = Math.round((toStop.arrival.time - fromStop.departure.time) / 60);
            console.log(`   ⏱️  ${fromStopId} → ${toStopId}: ${travelTime} minutes`);
          }
        }
      }
    }
  }
  
  if (tripCount === 0) {
    console.log('❌ No trips found with target stops');
  }
}

async function main() {
  console.log('🐛 Debug Analysis of F and C Train GTFS Data\n');
  
  // Debug F Train
  console.log('📡 Analyzing F Train (Carroll St & Jay St-MetroTech)...');
  const bdfmFeed = await fetchGTFSFeed('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm');
  
  if (bdfmFeed) {
    debugTrip(bdfmFeed, 'F', ['F18N', 'F20N', 'F18S', 'F20S']); // Check both directions
  }
  
  // Debug C Train  
  console.log('\n📡 Analyzing C Train (Jay St-MetroTech & 23rd St-8th Ave)...');
  const aceFeed = await fetchGTFSFeed('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace');
  
  if (aceFeed) {
    debugTrip(aceFeed, 'C', ['A41N', 'A24N', 'A41S', 'A24S']); // Check both directions
  }
}

main().catch(console.error);