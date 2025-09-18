// src/lib/useSubConnectionLog.ts
import { useEffect } from 'react';
import { Hub } from 'aws-amplify/utils';
import {
  CONNECTION_STATE_CHANGE,
  type ConnectionState,
} from 'aws-amplify/data';

export function useSubConnectionLog(
  enabled = process.env.NODE_ENV === 'development',
) {
  useEffect(() => {
    if (!enabled) return;
    const stop = Hub.listen('api', ({ payload }) => {
      if (payload.event === CONNECTION_STATE_CHANGE) {
        if (
          payload.data &&
          typeof payload.data === 'object' &&
          'connectionState' in payload.data
        ) {
          const state = (payload.data as { connectionState: ConnectionState })
            .connectionState;
          console.log('[Amplify Data] connection state:', state);
        }
      }
    });
    return () => stop(); // clean up on unmount
  }, [enabled]);
}
