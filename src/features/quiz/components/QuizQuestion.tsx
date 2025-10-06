import React, { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  LinearProgress,
  Typography,
} from '@mui/material';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '../types';

export function QuizQuestion({
  question,
  progress, // 0..100
  maxPoints, // current points available (discrete)
  oldMaxPoints, // previous value for fade effect (or null)
  selectedAnswer,
  onAnswer, // (answerId: string, timeTakenSec: number) => void
}: {
  question: Question;
  progress: number;
  maxPoints: number | null;
  oldMaxPoints: number | null;
  selectedAnswer: string | null;
  onAnswer: (answerId: string, timeTakenSec: number) => void;
}) {
  const startRef = useRef<number>(0);

  useEffect(() => {
    // mark the moment this question rendered
    startRef.current = performance.now();
  }, [question]);

  const handleClick = (answerId: string) => {
    if (selectedAnswer) return; // ignore if selection already made
    const elapsedMs = performance.now() - startRef.current;
    onAnswer(answerId, elapsedMs / 1000);
  };

  return (
    <Box mt={4} className={styles['fade-in']}>
      <Typography variant="body1" gutterBottom>
        {question.text}
      </Typography>

      <Box className={styles['answer-cards-container']}>
        {question.answers.map((answer) => {
          if (!answer) return null;
          const isSelected = selectedAnswer === answer.id;
          const isDim = !!selectedAnswer && selectedAnswer !== answer.id;

          return (
            <Card
              key={answer.id}
              className={`${styles['answer-card']} ${
                isSelected ? styles['selected'] : ''
              } ${isDim ? styles['unselected-dim'] : ''}`}
            >
              <CardActionArea onClick={() => handleClick(answer.id)}>
                <CardContent>
                  <Typography variant="body1">{answer.text}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* Smooth progress bar */}
      <Box mt={2} className={styles['progress-container']}>
        <LinearProgress
          variant="determinate"
          value={progress}
          className={styles['custom-linear-progress']}
        />
      </Box>

      {/* Points Available */}
      <Box className={styles['points-container']}>
        <Typography
          variant="subtitle1"
          align="center"
          className={styles['points-display']}
        >
          Points Available: {maxPoints ?? 0}
        </Typography>

        {oldMaxPoints !== null && (
          <Typography
            variant="subtitle1"
            align="center"
            className={`${styles['points-display']} ${styles['fading-text']}`}
          >
            Points Available: {oldMaxPoints}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
