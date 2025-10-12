import React from 'react';
import { Box, Typography } from '@mui/material';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '../types';
import { ProgressBar } from '@/features/quiz/components/ProgressBar';

export function QuizPreview({
  question,
  progressPct,
}: {
  question: Question;
  progressPct: number; // 0..100
}) {
  return (
    <Box mt={4} className={styles['preview-section']}>
      <Typography variant="body1" gutterBottom>
        {question.text}
      </Typography>

      <Box mt={2} className={styles['progress-container']}>
        <ProgressBar
          value={progressPct}
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
