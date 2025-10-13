import * as React from 'react';
import { Box } from '@mui/material';

type Props = {
  durationMs: number; // milliseconds
  active: boolean;
  restartKey?: string | number;
  height?: number;
  radius?: number;
  ariaLabel?: string;
};

export function CountdownBar({
  durationMs,
  active,
  restartKey,
  height = 12,
  radius = 10,
  ariaLabel,
}: Props) {
  return (
    <Box
      role="progressbar"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      <Box
        key={`${restartKey ?? 'default'}-${durationMs}`}
        sx={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: radius,
          background: 'linear-gradient(90deg, #ff4081 0%, #536dfe 100%)',

          // Start fully visible, then clip from the RIGHT toward 100%
          // The "round {radius}px" keeps the right cap rounded while it shrinks
          clipPath: `inset(0% 0% 0% 0% round ${radius}px)`,
          animation: `countdownClip ${Math.max(
            1,
            durationMs,
          )}ms linear forwards`,
          animationPlayState: active ? 'running' : 'paused',
          zIndex: 2,
          willChange: 'clip-path',

          '@keyframes countdownClip': {
            from: { clipPath: `inset(0% 0% 0% 0% round ${radius}px)` },
            to: { clipPath: `inset(0% 100% 0% 0% round ${radius}px)` },
          },
        }}
      />
    </Box>
  );
}
