// src/features/quiz/routes/QuizAttempt.tsx
import React, { useMemo, useState } from 'react';
import { Box, Button, Container, Skeleton, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import correctMp3 from '@/assets/correct.mp3';

// Hooks
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { useCreateAttempt } from '@/features/quiz/hooks/useCreateAttempt';
import { useStepPoints } from '@/features/quiz/hooks/useStepPoints';
import { useQuizDurations } from '@/features/quiz/hooks/useQuizDurations';
import { usePhaseTimer } from '@/features/quiz/hooks/usePhaseTimer';

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

  const { previewDurationMs, questionDurationMs } = useQuizDurations(
    currentQuestion,
    quiz,
  );

  const questionTimer = usePhaseTimer({
    active: phase === 'question' && !!currentQuestion,
    durationMs: questionDurationMs,
    restartKey: currentQuestion?.id,
    onEnd: () => {
      setPhase('explanation');
    },
    tickMs: 50, // or 100 if you want even fewer renders
  });

  const previewTimer = usePhaseTimer({
    active: phase === 'preview' && !!currentQuestion,
    durationMs: previewDurationMs,
    restartKey: currentQuestion?.id,
    onEnd: () => setPhase('question'),
  });

  const maxForQ = useMemo(
    () => (currentQuestion && quiz ? getMaxPoints(currentQuestion, quiz) : 0),
    [currentQuestion, quiz],
  );

  const pointsDisplay = useStepPoints({
    base: maxForQ,
    steps: QUIZ_DEFAULTS.decaySteps,
    progressElapsed: questionTimer.progressElapsed,
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

  if (loading)
    return (
      <Container>
        {/* Simple skeleton for attempt header & card */}
        <Box mt={4}>
          <Skeleton variant="text" width={220} height={40} />
          <Skeleton variant="rectangular" height={180} sx={{ mt: 2 }} />
        </Box>
      </Container>
    );
  if (!quiz) {
    return (
      <Container>
        <Box mt={6} textAlign="center">
          <Typography variant="h4" gutterBottom>
            We can’t open this quiz
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            It may not exist, be private, or you might not have permission to
            view it.
          </Typography>
          <Box mt={3}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to My Quizzes
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

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
            durationMs={previewDurationMs}
            active={phase === 'preview'}
          />
        )}

        {phase === 'question' && currentQuestion && (
          <QuizQuestion
            question={currentQuestion}
            pointsValue={pointsDisplay.value}
            pointsPrevious={pointsDisplay.previous}
            selectedAnswer={selectedAnswer}
            onAnswer={(answerId) => {
              const timeTakenSec =
                (questionDurationMs - questionTimer.remainingMs) / 1000;
              handleAnswer(answerId, Math.max(timeTakenSec, 0));
            }}
            remainingMs={questionTimer.remainingMs}
            durationMs={questionDurationMs}
            active={phase === 'question'}
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
