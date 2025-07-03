import React from 'react';
import { RealMTAService } from '../services/RealMTAService';
import { CommuteAppBase } from './shared/CommuteAppBase';

const AFTERNOON_COMMUTE_DATA = {
  work: '512 W 22nd St, Manhattan',
  home: '42 Woodhull St, Brooklyn',
  targetArrival: '7:00 PM',
};

export function AfternoonCommuteApp() {
  return (
    <CommuteAppBase 
      config={{
        title: 'Afternoon Commute',
        origin: AFTERNOON_COMMUTE_DATA.work,
        destination: AFTERNOON_COMMUTE_DATA.home,
        targetArrival: AFTERNOON_COMMUTE_DATA.targetArrival,
        calculateRoutes: (service: RealMTAService, origin: string, destination: string, targetArrival: string) => 
          service.calculateAfternoonRoutes(origin, destination, targetArrival)
      }}
    />
  );
}