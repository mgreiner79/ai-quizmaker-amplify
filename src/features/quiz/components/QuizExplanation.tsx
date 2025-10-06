import React from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '../types';

export function QuizExplanation({
  question,
  selectedAnswer,
  onNext,
  isLast,
}: {
  question: Question;
  selectedAnswer: string | null;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <Box mt={4}>
      <Typography variant="h5" gutterBottom>
        Explanation
      </Typography>

      <Typography variant="body1" gutterBottom>
        {question.explanation}
      </Typography>

      <Box mt={2} className={styles['explanation-cards-container']}>
        {question.answers.map((answer) => {
          if (!answer) return null;
          const isCorrect = answer.id === question.correctAnswerId;
          const isSelected = answer.id === selectedAnswer;
          const cardClass = `${styles['explanation-card']} ${
            isCorrect ? styles['correct'] : styles['incorrect']
          }`;

          return (
            <Card key={answer.id} className={cardClass}>
              {isSelected && (
                <Box className={styles['icon-overlay']}>
                  {isCorrect ? (
                    <CheckCircleIcon className={styles['correct-icon']} />
                  ) : (
                    <CancelIcon className={styles['incorrect-icon']} />
                  )}
                </Box>
              )}
              <CardContent>
                <Typography variant="body1">{answer.text}</Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={onNext}>
          {isLast ? 'Finish Quiz' : 'Next Question'}
        </Button>
      </Box>
    </Box>
  );
}
