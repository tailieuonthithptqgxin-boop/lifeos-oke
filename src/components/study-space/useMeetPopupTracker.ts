import { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '../../lib/apiClient';

export type PresenceState = 'IN_MEET' | 'STUDYING' | 'AWAY';

interface UseMeetPopupTrackerOptions {
  roomId: string | null;
  externalUrl?: string | null;
  onStateChange?: (state: PresenceState) => void;
}

export function useMeetPopupTracker({
  roomId,
  externalUrl,
  onStateChange
}: UseMeetPopupTrackerOptions) {
  const [isInMeet, setIsInMeet] = useState<boolean>(false);
  const popupWindowRef = useRef<Window | null>(null);
  const checkerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoomIdRef = useRef<string | null>(roomId);
  currentRoomIdRef.current = roomId;

  // Clear tracking interval
  const clearTracker = useCallback(() => {
    if (checkerIntervalRef.current) {
      clearInterval(checkerIntervalRef.current);
      checkerIntervalRef.current = null;
    }
  }, []);

  // Update server status helper
  const updateServerStatus = useCallback(async (state: PresenceState) => {
    const rid = currentRoomIdRef.current;
    if (!rid) return;

    try {
      await apiCall(`/api/study-space/rooms/${rid}/meet-status`, 'POST', {
        presenceState: state
      });
      onStateChange?.(state);
    } catch (err) {
      console.warn('Failed to update meet status on server:', err);
    }
  }, [onStateChange]);

  // Open Meet/Zoom in a neat corner popup
  const openMeetPopup = useCallback(() => {
    if (!externalUrl) {
      alert('Phòng học này chưa cấu hình đường dẫn Google Meet hoặc Zoom.');
      return;
    }

    // Clean URL validation
    let targetUrl = externalUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    // Window geometry: 500x650 corner popup
    const popupWidth = 500;
    const popupHeight = 650;
    const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;

    const left = screenLeft + screenWidth - popupWidth - 24;
    const top = screenTop + screenHeight - popupHeight - 48;

    const windowFeatures = `width=${popupWidth},height=${popupHeight},left=${Math.max(0, left)},top=${Math.max(0, top)},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;

    try {
      const newWin = window.open(targetUrl, 'GoogleMeetStudyWindow', windowFeatures);

      if (newWin) {
        popupWindowRef.current = newWin;
        setIsInMeet(true);

        // Notify server immediately that user entered Meet
        updateServerStatus('IN_MEET');

        // Clear any previous watcher
        clearTracker();

        // 3-second heartbeat to detect when user closes the popup window
        checkerIntervalRef.current = setInterval(() => {
          if (!popupWindowRef.current || popupWindowRef.current.closed) {
            clearTracker();
            popupWindowRef.current = null;
            setIsInMeet(false);

            // Revert back to STUDYING on server
            updateServerStatus('STUDYING');
          }
        }, 3000);
      } else {
        alert('Trình duyệt đã chặn pop-up. Vui lòng cấp quyền cho phép mở pop-up để tham gia cuộc gọi.');
      }
    } catch (err) {
      console.error('Error opening Meet popup:', err);
      window.open(targetUrl, '_blank');
      setIsInMeet(true);
      updateServerStatus('IN_MEET');
    }
  }, [externalUrl, clearTracker, updateServerStatus]);

  // Manually close Meet popup if user clicks in UI or leaves room
  const closeMeetPopup = useCallback(() => {
    clearTracker();
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      try {
        popupWindowRef.current.close();
      } catch (err) {
        console.warn('Could not close Meet popup:', err);
      }
    }
    popupWindowRef.current = null;
    setIsInMeet(false);
    updateServerStatus('STUDYING');
  }, [clearTracker, updateServerStatus]);

  // Explicit manual exit button: "Tôi đã rời Google Meet"
  const manualLeaveMeet = useCallback(() => {
    closeMeetPopup();
  }, [closeMeetPopup]);

  // Cleanup on unmount or roomId switch: Always automatically close Meet window
  useEffect(() => {
    return () => {
      clearTracker();
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        try {
          popupWindowRef.current.close();
        } catch {}
      }
      popupWindowRef.current = null;
    };
  }, [clearTracker]);

  return {
    isInMeet,
    openMeetPopup,
    closeMeetPopup,
    manualLeaveMeet
  };
}
