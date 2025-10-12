// /src/features/quiz/components/QuizHeader.tsx
import { Box, Typography } from '@mui/material';
import coinPng from '@/assets/coin.png';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';

export function QuizHeader({
  showProgressInfo,
  currentIndex,
  total,
  score,
  className,
}: {
  /** Show "Question X of Y" (hide on finished) */
  showProgressInfo: boolean;
  /** Zero-based index of current question */
  currentIndex: number;
  /** Total number of questions */
  total: number;
  /** Current accumulated points */
  score: number;
  /** Optional extra className for layout overrides */
  className?: string;
}) {
  return (
    <Box className={`${styles['quiz-header']} ${className ?? ''}`}>
      {showProgressInfo && (
        <Typography variant="h6">
          Question {currentIndex + 1} of {total}
        </Typography>
      )}

      <Box display="flex" alignItems="center">
        <img src={coinPng} alt="coin" className={styles['coin-icon']} />
        <Typography variant="h6" sx={{ ml: 1 }}>
          {score}
        </Typography>
      </Box>
    </Box>
  );
}
