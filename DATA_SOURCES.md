# CommuteX Data Sources Documentation

This document details the data sources used throughout the CommuteX app and how they're indicated in the UI.

## Visual Indicators

The app uses color-coded dots to show data source reliability:

- 🟢 **Green Dot**: Real-time GTFS data from MTA feeds
- 🟡 **Yellow Dot**: Estimated data based on historical patterns
- 🔴 **Red Dot**: Fixed data that you have provided or static estimates

## Data Source Breakdown by Route Type

### 1. Real-Time GTFS Routes (Primary Source)

**Source**: Live MTA GTFS Real-Time feeds
**Feeds Used**:
- NQRW feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw`
- BDFM feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm`
- 123456S feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs`
- ACE feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace`
- L feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l`
- G feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g`
- JZ feed: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz`

**Route Step Data Sources**:
- 🔴 **Walk to station**: Fixed estimate (12-30 min based on route)
- 🟢 **Wait at station**: Real-time from GTFS trip updates 
- 🟢 **Transit time**: Real-time from GTFS stop time updates
- 🔴 **Final walk**: Fixed estimate (3-8 min based on destination)

**Confidence Level**: High

### 2. Estimated Routes (Fallback)

**Trigger**: When GTFS feeds fail or return no usable data
**Source**: Hardcoded estimates in `createEstimatedRoutes()` method

**Route Step Data Sources**:
- 🔴 **Walk to station**: Fixed estimate (same as above)
- 🟡 **Wait at station**: Random estimate (2-10 min)
- 🟡 **Transit time**: Fixed estimates:
  - F train: 28 minutes
  - R train: 35 minutes  
  - 4 train: 25 minutes
- 🔴 **Final walk**: Fixed estimate (same as above)

**Confidence Level**: Low

### 3. Transfer Routes

**Source**: Combination of real-time GTFS and estimates
**Processing**: `buildTransferRoute()` method

**Route Step Data Sources**:
- 🔴 **Walk to first station**: Fixed estimate
- 🟢/🟡 **Wait for first train**: Real-time if GTFS available, otherwise estimate
- 🟢/🟡 **First transit**: Real-time if GTFS available, otherwise estimate
- 🔴 **Transfer walk**: Fixed estimate (2-5 min)
- 🟢/🟡 **Wait for second train**: Real-time if GTFS available, otherwise estimate
- 🟢/🟡 **Second transit**: Real-time if GTFS available, otherwise estimate
- 🔴 **Final walk**: Fixed estimate

**Confidence Level**: Medium to High (depending on GTFS availability)

### 4. Bus Routes (B61)

**Source**: MTA Bus GTFS Real-Time feed
**Feed**: `https://bustime.mta.info/api/siri/vehicle-monitoring.pb`

**Route Step Data Sources**:
- 🔴 **Walk to bus stop**: Fixed estimate (10 min)
- 🟢 **Bus transit**: Real-time from GTFS bus feed
- 🔴 **Final walk**: Fixed estimate (2 min)

**Confidence Level**: High

### 5. Optimal Routes (Static GTFS Fallback)

**Trigger**: When all real-time feeds completely fail
**Source**: Static GTFS schedule data with pathfinding

**Route Step Data Sources**:
- 🔴 **Walk to station**: Fixed estimate
- 🟡 **Wait at station**: Schedule-based estimate
- 🔴 **Transit time**: Static GTFS schedule timing
- 🔴 **Final walk**: Fixed estimate

**Confidence Level**: Medium

## Fixed Data Sources (Red Dots)

### Walking Times
**Source**: Hardcoded in `StationMappingService.getStationMapping()`

- **F train**: 12 min to station, 8 min final walk
- **R train**: 30 min to station, 3 min final walk
- **4 train**: 25 min to station, 5 min final walk
- **A train**: 20 min to station, 4 min final walk
- **C train**: 22 min to station, 4 min final walk
- **G train**: 18 min to station, 6 min final walk
- **L train**: 15 min to station, 7 min final walk
- **B61 bus**: 10 min to stop, 2 min final walk

### Transfer Times
**Source**: Hardcoded in transfer route logic

- **Platform-to-platform transfers**: 2-5 minutes depending on stations
- **Station complex navigation**: Based on known station layouts

### Home/Work Addresses
**Source**: Fixed in `COMMUTE_DATA` constant

- **Home**: "42 Woodhull St, Brooklyn"
- **Work**: "512 W 22nd St, Manhattan" 
- **Target Arrival**: "9:00 AM"

## Real-Time Data Processing

### GTFS Feed Processing
1. **Fetch**: Retrieve protobuf data from MTA endpoints
2. **Parse**: Use gtfs-realtime-bindings to decode trip updates
3. **Filter**: Find relevant trips for specific routes and directions
4. **Calculate**: Extract departure times and delays from stop time updates
5. **Validate**: Ensure times are reasonable and in the future

### Error Handling
- **Feed Timeouts**: 10-second timeout per feed
- **Parse Failures**: Retry once, then fall back to estimates
- **Invalid Data**: Skip malformed trip updates
- **No Departures**: Use schedule-based estimates

### Update Frequency
- **Real-time data**: Refreshed every 30 seconds
- **User refresh**: Manual pull-to-refresh available
- **Cache duration**: No persistent caching (always fetch fresh data)

## Confidence Scoring

The app assigns confidence levels based on data source mix:

- **High**: Majority of route uses real-time GTFS data
- **Medium**: Mix of real-time and estimated data
- **Low**: Primarily estimated or fixed data

This information helps users understand the reliability of their route timing.