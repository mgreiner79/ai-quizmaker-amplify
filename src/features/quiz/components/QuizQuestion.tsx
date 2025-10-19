// src/features/quiz/components/QuizQuestion.tsx
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from '@mui/material';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '@/features/quiz/types';
import { CountdownBar } from '@/features/quiz/components/CountdownBar';

export interface QuizQuestionQprops {
  question: Question;
  pointsValue: number; // current points available
  pointsPrevious: number | null; // faded value
  selectedAnswer: string | null;
  onAnswer: (answerId: string, timeTakenSec: number) => void;
  remainingMs: number;
  durationMs: number;
  active: boolean;
}

export function QuizQuestion({
  question,
  pointsValue,
  pointsPrevious,
  selectedAnswer,
  onAnswer,
  remainingMs,
  durationMs,
  active,
}: QuizQuestionQprops) {
  const handleSelect = (answerId: string) => {
    if (selectedAnswer) return;
    const timeTakenSec = (durationMs - remainingMs) / 1000;
    onAnswer(answerId, Math.max(timeTakenSec, 0));
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
          const dimOther = selectedAnswer && !isSelected;

          return (
            <Card
              key={answer.id}
              className={`${styles['answer-card']} ${
                isSelected ? styles['selected'] : ''
              } ${dimOther ? styles['unselected-dim'] : ''}`}
            >
              <CardActionArea onClick={() => handleSelect(answer.id)}>
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
        <CountdownBar
          restartKey={question?.id}
          durationMs={durationMs}
          active={active}
          height={16}
          ariaLabel="Question Time Remaining"
        />
      </Box>

      {/* Points Available */}
      <Box className={styles['points-container']}>
        <Typography
          variant="subtitle1"
          align="center"
          className={styles['points-display']}
        >
          Points Available: {Math.round(pointsValue)}
        </Typography>

        {pointsPrevious !== null && (
          <Typography
            key={`fade-${pointsPrevious}`}
            variant="subtitle1"
            align="center"
            className={`${styles['points-display']} ${styles['fading-text']}`}
          >
            Points Available: {Math.round(pointsPrevious)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
