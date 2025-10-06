// src/features/quiz/pages/QuizAttempt.tsx
import React, { useMemo, useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import coinPng from '@/assets/coin.png';
import correctMp3 from '@/assets/correct.mp3';

import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { useCreateAttempt } from '@/features/quiz/hooks/useCreateAttempt';
import { useQuizScoring } from '@/features/quiz/hooks/useQuizScoring';
import { useQuizTimers } from '@/features/quiz/hooks/useQuizTimers';
import { getMaxPoints } from '@/features/quiz/utils/quizHelpers';

import { QuizOverview } from '@/features/quiz/components/QuizOverview';
import { QuizPreview } from '@/features/quiz/components/QuizPreview';
import { QuizQuestion } from '@/features/quiz/components/QuizQuestion';
import { QuizExplanation } from '@/features/quiz/components/QuizExplanation';
import { QuizFinished } from '@/features/quiz/components/QuizFinished';

import type { Question } from '@/features/quiz/types';

type Phase = 'overview' | 'preview' | 'question' | 'explanation' | 'finished';

export default function QuizAttempt() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const { quiz, loading } = useQuiz(quizId);
  const { createAttempt } = useCreateAttempt();
  const { score, awardPoints } = useQuizScoring();

  const [phase, setPhase] = useState<Phase>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [attemptSubmitted, setAttemptSubmitted] = useState(false);

  const currentQuestion: Question | null =
    quiz?.questions?.[currentQuestionIndex] ?? null;

  const { progress, previewProgress, maxPointsState, oldMaxPoints } =
    useQuizTimers(phase, currentQuestion, quiz, {
      onPreviewComplete: () => setPhase('question'),
      onQuestionComplete: () => setPhase('explanation'),
    });

  const totalPossible = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.filter(Boolean).reduce((sum, q) => {
      return sum + getMaxPoints(q as Question, quiz);
    }, 0);
  }, [quiz]);

  const playCorrectSound = () => {
    const audio = new Audio(correctMp3);
    audio.play().catch(() => {});
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const startQuiz = () => setPhase('preview');

  const handleAnswer = (answerId: string, timeTakenSec: number) => {
    if (!currentQuestion || !quiz) return;

    // award points (returns awarded points if correct, else 0)
    const awarded = awardPoints(answerId, currentQuestion, quiz, timeTakenSec);

    if (awarded > 0) {
      triggerConfetti();
      playCorrectSound();
    }

    setSelectedAnswer(answerId);
    setUserAnswers((prev) => [...prev, answerId]);
    setPhase('explanation');
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    if (quiz && currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex((i) => i + 1);
      setPhase('preview');
    } else {
      setPhase('finished');
      if (quiz && !attemptSubmitted) {
        setAttemptSubmitted(true);
        createAttempt({
          quizId: quiz.id,
          userId: 'anonymous',
          score,
          totalPossible,
          answers: userAnswers,
        });
      }
    }
  };

  if (loading) return <Container>Loading quiz...</Container>;
  if (!quiz) return <Container>Error loading quiz.</Container>;

  const renderHeader = () => {
    if (phase === 'overview') return null;
    return (
      <Box className={styles['quiz-header']}>
        {phase !== 'finished' && (
          <Typography variant="h6">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
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
  };

  return (
    <div className={styles['quiz-attempt-wrapper']}>
      <Container maxWidth="md" className={styles['quiz-container']}>
        {renderHeader()}

        {phase === 'overview' && (
          <QuizOverview quiz={quiz} onStart={startQuiz} />
        )}

        {phase === 'preview' && currentQuestion && (
          <QuizPreview question={currentQuestion} progress={previewProgress} />
        )}

        {phase === 'question' && currentQuestion && (
          <QuizQuestion
            question={currentQuestion}
            progress={progress}
            maxPoints={maxPointsState ?? 0}
            oldMaxPoints={oldMaxPoints}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
          />
        )}

        {phase === 'explanation' && currentQuestion && (
          <QuizExplanation
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onNext={handleNext}
            isLast={quiz.questions.length === currentQuestionIndex + 1}
          />
        )}

        {phase === 'finished' && (
          <QuizFinished
            score={score}
            totalPossible={totalPossible}
            onHome={() => navigate('/')}
          />
        )}
      </Container>
    </div>
  );
}
