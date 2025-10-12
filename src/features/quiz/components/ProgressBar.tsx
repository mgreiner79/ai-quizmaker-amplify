// src/features/quiz/components/ProgressBar.tsx
import * as React from 'react';
import LinearProgress, {
  LinearProgressProps,
} from '@mui/material/LinearProgress';
import { SxProps, Theme } from '@mui/material/styles';
import clsx from 'clsx';

export type ProgressBarProps = {
  value: number;
  height?: number;
  radius?: number;
  disableAnimation?: boolean;
  ariaLabel?: string;
  className?: string;
  sx?: SxProps<Theme>;
  muiProps?: Partial<LinearProgressProps>;
};

export const ProgressBar = React.memo(function ProgressBar({
  value,
  height = 12,
  radius = 10,
  disableAnimation = false,
  ariaLabel,
  className,
  sx,
  muiProps,
}: ProgressBarProps) {
  const v = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <LinearProgress
      variant="determinate"
      value={v}
      aria-label={ariaLabel}
      className={clsx(className)}
      sx={{
        width: '100%',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        // transparent track as requested
        backgroundColor: 'transparent',
        '& .MuiLinearProgress-bar': {
          borderRadius: radius,
          background: 'linear-gradient(90deg, #ff4081 0%, #536dfe 100%)',
          transition: disableAnimation ? 'none' : 'transform 120ms linear',
        },
        ...sx,
      }}
      {...muiProps}
    />
  );
});
