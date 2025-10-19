// src/features/quiz/components/QuizPreview.tsx
import { Box, Typography } from '@mui/material';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '../types';
import { CountdownBar } from '@/features/quiz/components/CountdownBar';

export function QuizPreview({
  question,
  durationMs,
  active,
}: {
  question: Question;
  durationMs: number;
  active: boolean;
}) {
  return (
    <Box mt={4} className={styles['preview-section']}>
      <Typography variant="body1" gutterBottom>
        {question.text}
      </Typography>

      <Box mt={2} className={styles['progress-container']}>
        <CountdownBar
          restartKey={question?.id}
          durationMs={durationMs}
          active={active}
          height={16}
          ariaLabel="Preview Time Remaining"
        />
      </Box>

      <Box className={styles['get-ready-container']}>
        <Typography variant="h5" className={styles['get-ready-text']}>
          Get Ready!
        </Typography>
      </Box>
    </Box>
  );
}
