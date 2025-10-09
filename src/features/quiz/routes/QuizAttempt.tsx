// src/features/quiz/pages/QuizAttempt.tsx

import React, { useMemo, useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import coinPng from '@/assets/coin.png';
import correctMp3 from '@/assets/correct.mp3';

// Hooks
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { useCreateAttempt } from '@/features/quiz/hooks/useCreateAttempt';
import { useQuizPhaseTimers } from '@/features/quiz/hooks/useQuizPhaseTimers';
import { usePointsDisplay } from '@/features/quiz/hooks/usePointsDisplay';

// Utils
import { getMaxPoints } from '@/features/quiz/utils/quizHelpers';
import { computeAwardForAnswer } from '@/features/quiz/utils/quizScoring';

// Components
import { QuizHeader } from '@/features/quiz/components/QuizHeader';
import { QuizOverview } from '@/features/quiz/components/QuizOverview';
import { QuizPreview } from '@/features/quiz/components/QuizPreview';
import { QuizQuestion } from '@/features/quiz/components/QuizQuestion';
import { QuizExplanation } from '@/features/quiz/components/QuizExplanation';
import { QuizFinished } from '@/features/quiz/components/QuizFinished';

import { QUIZ_DEFAULTS } from '@/features/quiz/config';
import styles from '@/features/quiz/routes/QuizAttempt.module.css';
import type { Question } from '@/features/quiz/types';

type Phase = 'overview' | 'preview' | 'question' | 'explanation' | 'finished';

export default function QuizAttempt() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { quiz, loading } = useQuiz(quizId);
  const { createAttempt } = useCreateAttempt();

  const [phase, setPhase] = useState<Phase>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [attemptSubmitted, setAttemptSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion: Question | null =
    quiz?.questions?.[currentQuestionIndex] ?? null;

  const timers = useQuizPhaseTimers(
    phase,
    currentQuestion,
    quiz,
    () => setPhase('question'),
    () => setPhase('explanation'),
  );

  const maxForQ = useMemo(
    () => (currentQuestion && quiz ? getMaxPoints(currentQuestion, quiz) : 0),
    [currentQuestion, quiz],
  );

  const pointsDisplay = usePointsDisplay({
    base: maxForQ,
    steps: QUIZ_DEFAULTS.decaySteps,
    progressElapsed: timers.questionElapsed01,
    fadeMs: QUIZ_DEFAULTS.pointsFadeMs,
  });

  const totalPossible = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions
      .filter(Boolean)
      .reduce((sum, q) => sum + getMaxPoints(q as Question, quiz), 0);
  }, [quiz]);

  const playCorrectSound = () => {
    const audio = new Audio(correctMp3);
    audio.play().catch(() => {});
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const handleStart = () => setPhase('preview');

  const handleAnswer = (answerId: string, timeTakenSec: number) => {
    if (!currentQuestion || !quiz) return;
    const wasCorrect = answerId === currentQuestion.correctAnswerId;
    if (wasCorrect) {
      triggerConfetti();
      playCorrectSound();
    }

    const pts = computeAwardForAnswer(
      answerId,
      currentQuestion,
      quiz,
      timeTakenSec,
      QUIZ_DEFAULTS.decaySteps,
    );

    setScore((s) => s + pts);
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

  return (
    <div className={styles['quiz-attempt-wrapper']}>
      <Container maxWidth="md" className={styles['quiz-container']}>
        {phase !== 'overview' && (
          <QuizHeader
            showProgressInfo={phase !== 'finished'}
            currentIndex={currentQuestionIndex}
            total={quiz.questions.length}
            score={score}
          />
        )}

        {phase === 'overview' && (
          <QuizOverview quiz={quiz} onStart={handleStart} />
        )}

        {phase === 'preview' && currentQuestion && (
          <QuizPreview
            question={currentQuestion}
            progress={timers.previewProgressPct}
          />
        )}

        {phase === 'question' && currentQuestion && (
          <QuizQuestion
            question={currentQuestion}
            progressPct={timers.questionProgressPct}
            pointsValue={pointsDisplay.value}
            pointsPrevious={pointsDisplay.previous}
            selectedAnswer={selectedAnswer}
            onAnswer={(answerId) => {
              const timeTakenSec =
                (timers.questionDurationMs - timers.questionRemainingMs) / 1000;
              handleAnswer(answerId, Math.max(timeTakenSec, 0));
            }}
            remainingMs={timers.questionRemainingMs}
            durationMs={timers.questionDurationMs}
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
