// src/pages/QuizAttempt.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardActionArea,
  CardContent,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useParams, useNavigate } from 'react-router-dom';
import confetti, { create } from 'canvas-confetti';
import styles from '@/features/quiz/routesQuizAttempt.module.css';
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { useCreateAttempt } from '@/features/quiz/hooks/useCreateAttempt';
import { Question, Quiz } from '@/features/quiz/types';
import correctMp3 from '@/assets/correct.mp3';
import coinPng from '@/assets/coin.png';
import { Nullable } from 'node_modules/@aws-amplify/data-schema/dist/esm/ModelField';

type Phase = 'overview' | 'preview' | 'question' | 'explanation' | 'finished';

const QuizAttempt: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const { quiz, loading: quizLoading } = useQuiz(quizId);
  const [loading, setLoading] = useState<boolean>(true);
  const [phase, setPhase] = useState<Phase>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [attemptSubmitted, setAttemptSubmitted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [previewProgress, setPreviewProgress] = useState<number>(100);
  const previewStartTimeRef = useRef<number>(0);
  const { createAttempt, saving, error } = useCreateAttempt();
  const rafIdRef = useRef<number | null>(null);
  const phaseStartMsRef = useRef<number>(0);

  // State to track available points in discrete steps.
  // maxPointsState is the current available points.
  // oldMaxPoints is used to animate the previous value.
  const [maxPointsState, setMaxPointsState] = useState<number | null>(null);
  const [oldMaxPoints, setOldMaxPoints] = useState<number | null>(null);

  const defaultPoints = 3000;
  const defaultAnswerTime = 20; // seconds
  const defaultPreviewTime = 5;
  const nSteps = 5;

  // Refs for timers and animation
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  // helpers
  const getPreviewTime = (
    q: Question | null,
    quiz: Quiz | null | undefined,
  ): number => q?.previewTime ?? quiz?.previewTime ?? defaultPreviewTime;

  const getAnswerTime = (
    q: Question | null,
    quiz: Quiz | null | undefined,
  ): number => q?.answerTime ?? quiz?.answerTime ?? defaultAnswerTime;

  const getMaxPoints = (
    q: Question | null,
    quiz: Quiz | null | undefined,
  ): number => q?.maxPoints ?? quiz?.maxPoints ?? defaultPoints;

  // Fetch quiz data on mount
  useEffect(() => {
    if (!quizId) {
      navigate('/');
      return;
    }
    if (!quizLoading) {
      setLoading(false);
    }
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [quizId, navigate]);

  const currentQuestion: Question | null = quiz?.questions
    ? quiz.questions[currentQuestionIndex] ?? null
    : null;

  // Trigger confetti blast
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const playCorrectSound = () => {
    const audio = new Audio(correctMp3);
    audio.play().catch((error) => {
      console.error('Audio playback failed:', error);
    });
  };

  // Start Quiz: transition from overview to preview
  const startQuiz = () => {
    if (
      quiz &&
      quiz.questions &&
      quiz.questions.length > 0 &&
      currentQuestion
    ) {
      setPhase('preview');
    }
  };

  // Preview countdown: update once per second

  useEffect(() => {
    if (phase !== 'preview' || !currentQuestion) return;

    // init
    phaseStartMsRef.current = performance.now();
    const totalMs = getPreviewTime(currentQuestion, quiz) * 1000;

    const tick = (now: number) => {
      const elapsed = now - phaseStartMsRef.current;
      const remaining = Math.max(totalMs - elapsed, 0);
      setPreviewProgress((remaining / totalMs) * 100);

      if (remaining <= 0) {
        setPhase('question');
        return;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [phase, currentQuestion, quiz]);

  // Question phase: manage timer and points decay
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return;

    phaseStartMsRef.current = performance.now();
    const totalMs = getAnswerTime(currentQuestion, quiz) * 1000;
    const maxForQ = getMaxPoints(currentQuestion, quiz);
    const steps = 5;
    const stepSize = maxForQ / steps;

    // initialize deterministically at question start
    setOldMaxPoints(null);
    setMaxPointsState(maxForQ);

    const tick = (now: number) => {
      const elapsed = now - phaseStartMsRef.current;
      const remaining = Math.max(totalMs - elapsed, 0);

      // progress bar [0..100]
      setProgress((remaining / totalMs) * 100);

      // points in discrete steps
      const stepsPassed = Math.floor((elapsed / totalMs) * steps);
      const newMax = Math.max(maxForQ - stepsPassed * stepSize, 0);

      setMaxPointsState((prev) => {
        if (prev == null) return newMax; // first frame
        if (prev !== newMax) {
          setOldMaxPoints(prev);
          // clear the fade after 500ms
          setTimeout(() => setOldMaxPoints(null), 500);
        }
        return newMax;
      });

      if (remaining <= 0) {
        setPhase('explanation');
        return;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [phase, currentQuestion, quiz]);

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (phase !== 'question' || selectedAnswer) return;
    setSelectedAnswer(answerId);
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);

    const totalTime = getAnswerTime(currentQuestion, quiz) * 1000;
    const elapsed = Date.now() - questionStartTimeRef.current;
    const timeTaken = elapsed / 1000;

    let pointsAwarded = 0;
    if (answerId === currentQuestion?.correctAnswerId) {
      triggerConfetti();
      playCorrectSound();
      const stepDuration = totalTime / nSteps / 1000; // in seconds
      const stepsPassed = Math.floor(timeTaken / stepDuration);
      const maxForQuestion = getMaxPoints(currentQuestion, quiz);
      const deductionPerStep = maxForQuestion / nSteps;
      pointsAwarded = Math.max(
        maxForQuestion - stepsPassed * deductionPerStep,
        0,
      );
    }

    setScore((prev) => prev + pointsAwarded);
    setUserAnswers((prev) => [...prev, answerId]);
    setPhase('explanation');
  };

  // Handle transition to the next question
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    if (quiz && currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setPhase('preview');
      setProgress(100);
    } else {
      setPhase('finished');
    }
  };

  const totalPossible = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions
      .filter(Boolean)
      .reduce((sum, q) => sum + getMaxPoints(q as Question, quiz), 0);
  }, [quiz]);

  // When finished, submit the quiz attempt
  useEffect(() => {
    if (phase === 'finished' && quiz && !attemptSubmitted) {
      const totalPossible = quiz.questions
        .filter(Boolean)
        .reduce((sum, q) => sum + getMaxPoints(q as Question, quiz), 0);
      createAttempt({
        quizId: quiz.id,
        userId: 'anonymous',
        score,
        totalPossible,
        answers: userAnswers,
      });
    }
  }, [phase, quiz, score, userAnswers, attemptSubmitted]);

  if (loading) {
    return (
      <Container>
        <Typography>Loading quiz...</Typography>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container>
        <Typography>Error loading quiz.</Typography>
      </Container>
    );
  }

  // Header that shows (when quiz is in progress) the question number on the left and points on the right.
  const renderHeader = () => {
    if (phase !== 'overview') {
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
    }
    return null;
  };

  return (
    <div className={styles['quiz-attempt-wrapper']}>
      <Container maxWidth="md" className={styles['quiz-container']}>
        {renderHeader()}

        {phase === 'overview' && (
          <Box mt={4}>
            <Typography variant="h4" gutterBottom>
              {quiz.title}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {quiz.description}
            </Typography>
            <Box mt={2}>
              <Button variant="contained" color="primary" onClick={startQuiz}>
                Start Quiz
              </Button>
            </Box>
          </Box>
        )}

        {phase === 'preview' && currentQuestion && (
          <Box mt={4} className={styles['preview-section']}>
            <Typography variant="body1" gutterBottom>
              {currentQuestion.text}
            </Typography>
            <Box mt={2} className={styles['progress-container']}>
              <LinearProgress
                variant="determinate"
                value={previewProgress}
                className={styles['custom-linear-progress']}
              />
            </Box>
            <Box className={styles['get-ready-container']}>
              <Typography variant="h5" className={styles['get-ready-text']}>
                Get Ready!
              </Typography>
            </Box>
          </Box>
        )}

        {phase === 'question' && currentQuestion && (
          <Box mt={4} className={styles['fade-in']}>
            <Typography variant="body1" gutterBottom>
              {currentQuestion.text}
            </Typography>
            <Box className={styles['answer-cards-container']}>
              {currentQuestion.answers.map(
                (answer) =>
                  answer && (
                    <Card
                      key={answer.id}
                      className={`${styles['answer-card']} ${
                        selectedAnswer === answer.id ? styles['selected'] : ''
                      } ${
                        selectedAnswer && selectedAnswer !== answer.id
                          ? styles['unselected-dim']
                          : ''
                      }`}
                    >
                      <CardActionArea
                        onClick={() => handleAnswerSelect(answer.id)}
                      >
                        <CardContent>
                          <Typography variant="body1">{answer.text}</Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ),
              )}
            </Box>
            {/* Smooth progress bar below the answer options */}
            <Box mt={2} className={styles['progress-container']}>
              <LinearProgress
                variant="determinate"
                value={progress}
                className={styles['custom-linear-progress']}
              />
            </Box>
            {/* Display "points available" below the progress bar */}
            <Box className={styles['points-container']}>
              <Typography
                variant="subtitle1"
                align="center"
                className={styles['points-display']}
              >
                Points Available: {maxPointsState}
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
        )}

        {phase === 'explanation' && currentQuestion && (
          <Box mt={4}>
            <Typography variant="h5" gutterBottom>
              Explanation
            </Typography>
            {/* Display the explanation text */}
            <Typography variant="body1" gutterBottom>
              {currentQuestion.explanation}
            </Typography>
            <Box mt={2} className={styles['explanation-cards-container']}>
              {currentQuestion.answers.map((answer) => {
                if (!answer) return null;
                const isCorrect = answer.id === currentQuestion.correctAnswerId;
                const isSelected = answer.id === selectedAnswer;
                const cardClass = `${styles['explanation-card']} ${
                  isCorrect ? styles['correct'] : styles['incorrect']
                }`;
                return (
                  <Card key={answer.id} className={cardClass}>
                    {/* Overlay icon on the selected answer */}
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
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextQuestion}
              >
                {quiz.questions.length === currentQuestionIndex + 1
                  ? 'Finish Quiz'
                  : 'Next Question'}
              </Button>
            </Box>
          </Box>
        )}

        {phase === 'finished' && (
          <Box mt={4}>
            <Typography variant="h4" gutterBottom>
              Quiz Completed!
            </Typography>
            <Typography variant="h5">Your Points: {score}</Typography>
            <Typography variant="h6">
              Total Possible Points: {totalPossible ?? ' '}
            </Typography>
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/')}
              >
                Go Home
              </Button>
            </Box>
          </Box>
        )}
      </Container>
    </div>
  );
};

export default QuizAttempt;
function useMemo(
  arg0: () => number,
  arg1: ({
    title: string;
    id: string;
    description: string;
    previewTime: number;
    answerTime: number;
    maxPoints: number;
    questions: (
      | {
          text: string;
          previewTime: number;
          answerTime: number;
          maxPoints: number;
          correctAnswerId: string;
          explanation: string;
          answers: (
            | { id: string; text: string; message: string }
            | null
            | undefined
          )[];
        }
      | null
      | undefined
    )[];
    owner: string;
    prompt?: Nullable<string> | undefined;
    knowledgeFileKey?: Nullable<string> | undefined;
    readonly createdAt: string;
    readonly updatedAt: string;
  } | null)[],
) {
  throw new Error('Function not implemented.');
}
