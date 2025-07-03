import React from 'react';
import { RealMTAService } from '../services/RealMTAService';
import { CommuteAppBase } from './shared/CommuteAppBase';

const COMMUTE_DATA = {
  home: '42 Woodhull St, Brooklyn',
  work: '512 W 22nd St, Manhattan',
  targetArrival: '9:00 AM',
};

export function CommuteApp() {
  return (
    <CommuteAppBase 
      config={{
        title: 'Morning Commute',
        origin: COMMUTE_DATA.home,
        destination: COMMUTE_DATA.work,
        targetArrival: COMMUTE_DATA.targetArrival,
        calculateRoutes: (service: RealMTAService, origin: string, destination: string, targetArrival: string) => 
          service.calculateRoutes(origin, destination, targetArrival),
        testId: 'app-container'
      }}
    />
  );
}
