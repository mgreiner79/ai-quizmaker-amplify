import * as React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';

type Props = {
  durationMs: number; // milliseconds
  active: boolean;
  restartKey?: string | number;
  height?: number;
  radius?: number;
  onEnd?: () => void;
  ariaLabel?: string;
};

const countdownShrink = keyframes({
  from: { transform: 'scaleX(1)' },
  to: { transform: 'scaleX(0)' },
});

export function CountdownBar({
  durationMs,
  active,
  restartKey,
  height = 12,
  radius = 10,
  onEnd,
  ariaLabel,
}: Props) {
  const key = `${restartKey ?? 'default'}-${durationMs}`;

  React.useEffect(() => {
    if (!active || durationMs <= 0) return;
    const t = window.setTimeout(() => onEnd?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [active, durationMs, onEnd, key]);

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
