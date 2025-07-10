import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

interface WebPullToRefreshState {
  startY: number;
  currentY: number;
  isDragging: boolean;
  threshold: number;
}

interface UseWebPullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
  onDebugMessage?: (message: string) => void;
}

export function useWebPullToRefresh({ 
  onRefresh, 
  threshold = 80, 
  onDebugMessage 
}: UseWebPullToRefreshProps) {
  const [webPullToRefresh, setWebPullToRefresh] = useState<WebPullToRefreshState>({
    startY: 0,
    currentY: 0,
    isDragging: false,
    threshold
  });

  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === 'web' && e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      setWebPullToRefresh(prev => ({
        ...prev,
        startY: touch.clientY,
        currentY: touch.clientY,
        isDragging: true
      }));
      console.log('[useWebPullToRefresh] Web pull-to-refresh started at Y:', touch.clientY);
    }
  }, []);

  const handleWebTouchMove = useCallback((e: any) => {
    if (Platform.OS === 'web' && webPullToRefresh.isDragging && e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaY = touch.clientY - webPullToRefresh.startY;
      
      if (deltaY > 0) { // Only track downward pulls
        setWebPullToRefresh(prev => ({
          ...prev,
          currentY: touch.clientY
        }));
        
        const pullDistance = Math.max(0, deltaY);
        console.log('[useWebPullToRefresh] Web pull distance:', pullDistance);
        
        if (pullDistance > webPullToRefresh.threshold) {
          onDebugMessage?.(`Pull to refresh (${Math.round(pullDistance)}px)`);
        }
      }
    }
  }, [webPullToRefresh.isDragging, webPullToRefresh.startY, webPullToRefresh.threshold, onDebugMessage]);

  const handleWebTouchEnd = useCallback(async () => {
    if (Platform.OS === 'web' && webPullToRefresh.isDragging) {
      const pullDistance = webPullToRefresh.currentY - webPullToRefresh.startY;
      
      console.log('[useWebPullToRefresh] Web pull-to-refresh ended, distance:', pullDistance);
      
      if (pullDistance > webPullToRefresh.threshold) {
        console.log('[useWebPullToRefresh] Web pull-to-refresh threshold reached, triggering refresh');
        onDebugMessage?.('Web pull-to-refresh triggered!');
        await onRefresh();
      } else {
        onDebugMessage?.('');
      }
      
      setWebPullToRefresh(prev => ({
        ...prev,
        isDragging: false,
        startY: 0,
        currentY: 0
      }));
    }
  }, [webPullToRefresh, onRefresh, onDebugMessage]);

  const touchHandlers = Platform.OS === 'web' ? {
    onTouchStart: handleWebTouchStart,
    onTouchMove: handleWebTouchMove,
    onTouchEnd: handleWebTouchEnd
  } : {};

  return {
    touchHandlers,
    webPullToRefresh
  };
}