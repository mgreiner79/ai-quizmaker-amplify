import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '../types';

export function QuizPreview({
  question,
  progress,
}: {
  question: Question;
  progress: number; // 0..100
}) {
  return (
    <Box mt={4} className={styles['preview-section']}>
      <Typography variant="body1" gutterBottom>
        {question.text}
      </Typography>

      <Box mt={2} className={styles['progress-container']}>
        <LinearProgress
          variant="determinate"
          value={progress}
          className={styles['custom-linear-progress']}
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
