/**
 * Transfer Hub Service for NYC Subway Route Planning
 * Manages major transfer stations and hub-based routing
 */

import { SubwayStation, StationDatabase } from './StationDatabase';

export interface TransferHub {
  id: string;
  name: string;
  lines: string[];
  coordinates: { lat: number; lng: number };
  transferTimes: { [lineFrom: string]: { [lineTo: string]: number } };
  priority: number; // 1-10, higher = more important
  isUserPriority: boolean; // true for user-specified hubs
}

export interface HubConnection {
  fromHub: string;
  toHub: string;
  line: string;
  travelTimeMinutes: number;
}

export class TransferHubService {
  private static hubs: Map<string, TransferHub> = new Map();
  private static initialized = false;

  // User-specified priority hubs (as requested)
  private static readonly PRIORITY_HUB_NAMES = [
    'Jay St-MetroTech',
    'Broadway-Lafayette St', 
    'Carroll St',
    'Hoyt-Schermerhorn Sts'
  ];

  // Major system transfer hubs
  private static readonly MAJOR_HUBS = [
    'Times Sq-42nd St',
    '14th St-Union Sq',
    'Atlantic Av-Barclays Ctr',
    '59th St-Columbus Circle',
    'Grand Central-42nd St',
    'Fulton St',
    'Herald Sq',
    '14th St-6th Ave',
    'W 4th St-Washington Sq',
    '14th St-8th Ave',
    '125th St'
  ];

  /**
   * Initialize the transfer hub system
   */
  static initialize(): void {
    if (this.initialized) return;

    this.loadTransferHubs();
    this.calculateTransferTimes();
    this.initialized = true;
  }

  /**
   * Load and classify transfer hubs from station database
   */
  private static loadTransferHubs(): void {
    const stations = StationDatabase.getAllStations();
    const stationGroups = this.groupStationsByName(stations);

    // Process each station group to identify transfer hubs
    for (const [stationName, stationList] of stationGroups.entries()) {
      const allLines = this.consolidateLines(stationList);
      
      // Consider as transfer hub if:
      // 1. User-specified priority hub
      // 2. Serves 3+ lines
      // 3. Is a known major hub
      if (this.shouldIncludeAsHub(stationName, allLines)) {
        const hub = this.createTransferHub(stationName, stationList, allLines);
        this.hubs.set(stationName, hub);
      }
    }

    console.log(`[TransferHubService] Loaded ${this.hubs.size} transfer hubs`);
  }

  /**
   * Group stations by name to handle station complexes
   */
  private static groupStationsByName(stations: SubwayStation[]): Map<string, SubwayStation[]> {
    const groups = new Map<string, SubwayStation[]>();
    
    for (const station of stations) {
      const normalizedName = this.normalizeStationName(station.name);
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(station);
    }
    
    return groups;
  }

  /**
   * Normalize station names to handle variations
   */
  private static normalizeStationName(name: string): string {
    return name
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Consolidate all lines served by a station complex
   */
  private static consolidateLines(stations: SubwayStation[]): string[] {
    const allLines = new Set<string>();
    stations.forEach(station => {
      station.lines.forEach(line => allLines.add(line));
    });
    return Array.from(allLines).sort();
  }

  /**
   * Determine if a station should be included as a transfer hub
   */
  private static shouldIncludeAsHub(stationName: string, lines: string[]): boolean {
    // Always include user-specified priority hubs
    if (this.PRIORITY_HUB_NAMES.includes(stationName)) {
      return true;
    }

    // Include major known hubs
    if (this.MAJOR_HUBS.some(hub => stationName.includes(hub) || hub.includes(stationName))) {
      return true;
    }

    // Include stations serving 3+ lines
    if (lines.length >= 3) {
      return true;
    }

    // Include F and A train stations with transfers
    if (lines.includes('F') || lines.includes('A')) {
      return lines.length >= 2;
    }

    return false;
  }

  /**
   * Create a TransferHub from station data
   */
  private static createTransferHub(
    name: string, 
    stations: SubwayStation[], 
    lines: string[]
  ): TransferHub {
    // Use the first station's coordinates (they should be very close)
    const coordinates = {
      lat: stations[0].lat,
      lng: stations[0].lng
    };

    // Determine priority based on user preferences and line count
    const isUserPriority = this.PRIORITY_HUB_NAMES.includes(name);
    const priority = this.calculateHubPriority(name, lines, isUserPriority);

    return {
      id: `hub_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name,
      lines,
      coordinates,
      transferTimes: {},
      priority,
      isUserPriority
    };
  }

  /**
   * Calculate hub priority based on importance
   */
  private static calculateHubPriority(name: string, lines: string[], isUserPriority: boolean): number {
    if (isUserPriority) {
      return 10; // Highest priority for user-specified hubs
    }

    // Major Manhattan hubs
    if (name.includes('Times Sq') || name.includes('Grand Central') || name.includes('Union Sq')) {
      return 9;
    }

    // Major Brooklyn hubs
    if (name.includes('Atlantic') || name.includes('Barclays')) {
      return 8;
    }

    // Based on number of lines
    if (lines.length >= 6) return 7;
    if (lines.length >= 4) return 6;
    if (lines.length >= 3) return 5;
    if (lines.length >= 2) return 4;
    
    return 3;
  }

  /**
   * Calculate transfer times between lines at each hub
   */
  private static calculateTransferTimes(): void {
    for (const hub of this.hubs.values()) {
      hub.transferTimes = this.getTransferTimesForHub(hub);
    }
  }

  /**
   * Get transfer times between lines at a specific hub
   */
  private static getTransferTimesForHub(hub: TransferHub): { [lineFrom: string]: { [lineTo: string]: number } } {
    const transferTimes: { [lineFrom: string]: { [lineTo: string]: number } } = {};

    // Special cases for known quick transfers
    const quickTransfers = this.getQuickTransferTimes(hub.name);

    for (const fromLine of hub.lines) {
      transferTimes[fromLine] = {};
      
      for (const toLine of hub.lines) {
        if (fromLine === toLine) {
          transferTimes[fromLine][toLine] = 0; // Same line
        } else if (quickTransfers[fromLine] && quickTransfers[fromLine][toLine] !== undefined) {
          transferTimes[fromLine][toLine] = quickTransfers[fromLine][toLine];
        } else {
          // Default transfer time based on hub size
          transferTimes[fromLine][toLine] = this.getDefaultTransferTime(hub);
        }
      }
    }

    return transferTimes;
  }

  /**
   * Get known quick transfer times for specific hubs
   */
  private static getQuickTransferTimes(hubName: string): { [lineFrom: string]: { [lineTo: string]: number } } {
    const quickTransfers: { [hubName: string]: { [lineFrom: string]: { [lineTo: string]: number } } } = {
      'Jay St-MetroTech': {
        'F': { 'A': 0, 'C': 0, 'R': 2 }, // Same platform F/A/C
        'A': { 'F': 0, 'C': 0, 'R': 2 },
        'C': { 'F': 0, 'A': 0, 'R': 2 },
        'R': { 'F': 2, 'A': 2, 'C': 2 }
      },
      'Hoyt-Schermerhorn Sts': {
        'A': { 'C': 1, 'G': 3 }, // Quick A/C transfer
        'C': { 'A': 1, 'G': 3 },
        'G': { 'A': 3, 'C': 3 }
      },
      'Carroll St': {
        'F': { 'G': 2 }, // Cross-platform transfer
        'G': { 'F': 2 }
      }
    };

    return quickTransfers[hubName] || {};
  }

  /**
   * Get default transfer time based on hub characteristics
   */
  private static getDefaultTransferTime(hub: TransferHub): number {
    // User priority hubs get optimistic transfer times
    if (hub.isUserPriority) {
      return 2;
    }

    // Large hubs take longer
    if (hub.lines.length >= 6) {
      return 5;
    } else if (hub.lines.length >= 4) {
      return 3;
    } else {
      return 2;
    }
  }

  /**
   * Get all transfer hubs
   */
  static getAllHubs(): TransferHub[] {
    this.initialize();
    return Array.from(this.hubs.values());
  }

  /**
   * Get hubs serving a specific line
   */
  static getHubsForLine(line: string): TransferHub[] {
    this.initialize();
    return Array.from(this.hubs.values())
      .filter(hub => hub.lines.includes(line))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get hubs that can connect two lines
   */
  static getConnectingHubs(lineFrom: string, lineTo: string): TransferHub[] {
    this.initialize();
    return Array.from(this.hubs.values())
      .filter(hub => hub.lines.includes(lineFrom) && hub.lines.includes(lineTo))
      .sort((a, b) => {
        // Prioritize user hubs, then by priority score
        if (a.isUserPriority && !b.isUserPriority) return -1;
        if (!a.isUserPriority && b.isUserPriority) return 1;
        return b.priority - a.priority;
      });
  }

  /**
   * Get transfer time between two lines at a hub
   */
  static getTransferTime(hubName: string, fromLine: string, toLine: string): number {
    this.initialize();
    const hub = this.hubs.get(hubName);
    if (!hub) {
      console.warn(`[TransferHubService] Hub not found: ${hubName}`);
      return 3; // Default transfer time
    }
    if (!hub.transferTimes[fromLine]) {
      console.warn(`[TransferHubService] No transfer times for ${fromLine} at ${hubName}`);
      return 3;
    }
    const transferTime = hub.transferTimes[fromLine][toLine];
    if (transferTime === undefined) {
      console.warn(`[TransferHubService] No transfer time from ${fromLine} to ${toLine} at ${hubName}`);
      return 3;
    }
    return transferTime;
  }

  /**
   * Find the best hub for connecting two stations
   */
  static findBestConnectingHub(fromStationLines: string[], toStationLines: string[]): TransferHub | null {
    this.initialize();
    
    let bestHub: TransferHub | null = null;
    let bestScore = -1;

    for (const hub of this.hubs.values()) {
      // Check if hub can connect the stations
      const canConnectFrom = hub.lines.some(line => fromStationLines.includes(line));
      const canConnectTo = hub.lines.some(line => toStationLines.includes(line));
      
      if (canConnectFrom && canConnectTo) {
        // Calculate score based on priority and transfer efficiency
        let score = hub.priority;
        
        // Bonus for user priority hubs
        if (hub.isUserPriority) {
          score += 10;
        }
        
        // Bonus for fewer total lines (more efficient transfers)
        score += Math.max(0, 10 - hub.lines.length);
        
        if (score > bestScore) {
          bestScore = score;
          bestHub = hub;
        }
      }
    }

    return bestHub;
  }
}