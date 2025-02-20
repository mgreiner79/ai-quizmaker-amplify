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
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import confetti from 'canvas-confetti';
import './QuizAttempt.css';

const client = generateClient<Schema>();

type Phase = 'overview' | 'preview' | 'question' | 'explanation' | 'finished';

const QuizAttempt: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Schema['Quiz']['type'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [phase, setPhase] = useState<Phase>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [_previewTimer, setPreviewTimer] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [attemptSubmitted, setAttemptSubmitted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [previewProgress, setPreviewProgress] = useState<number>(100);
  const previewStartTimeRef = useRef<number>(0);

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

  // Fetch quiz data on mount
  useEffect(() => {
    if (!quizId) {
      navigate('/');
      return;
    }
    const fetchQuiz = async () => {
      try {
        const fetchedQuiz = await client.models.Quiz.get(
          { id: quizId },
          { authMode: 'apiKey' },
        );
        if (!fetchedQuiz.data) {
          console.error('Quiz not found');
          navigate('/');
          return;
        } else {
          setQuiz(fetchedQuiz.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setLoading(false);
      }
    };
    fetchQuiz();

    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [quizId, navigate]);

  const currentQuestion: Schema['Question']['type'] | null = quiz?.questions
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

  // Play cheering sound (ensure cheer.mp3 exists in your public folder)
  const playCorrectSound = () => {
    const audio = new Audio('/correct.mp3');
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
      setPreviewTimer(currentQuestion.previewTime || defaultPreviewTime);
    }
  };

  // Preview countdown: update once per second
  useEffect(() => {
    if (phase === 'preview') {
      previewIntervalRef.current = setInterval(() => {
        setPreviewTimer((prev) => {
          if (prev <= 1) {
            clearInterval(previewIntervalRef.current!);
            setPhase('question');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'preview' && currentQuestion) {
      const totalPreviewTime =
        (currentQuestion.previewTime || defaultPreviewTime) * 1000; // total time in ms
      previewStartTimeRef.current = Date.now();

      const updatePreviewProgress = () => {
        const elapsed = Date.now() - previewStartTimeRef.current;
        const remaining = totalPreviewTime - elapsed;
        const newProgress = Math.max((remaining / totalPreviewTime) * 100, 0);
        setPreviewProgress(newProgress);
        if (remaining > 0) {
          requestAnimationFrame(updatePreviewProgress);
        }
      };

      const id = requestAnimationFrame(updatePreviewProgress);
      return () => cancelAnimationFrame(id);
    }
  }, [phase, currentQuestion]);

  // Smooth progress bar update using requestAnimationFrame
  useEffect(() => {
    if (phase === 'question' && currentQuestion) {
      const totalTime =
        (currentQuestion.answerTime || defaultAnswerTime) * 1000; // total time in ms
      questionStartTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - questionStartTimeRef.current;
        const remaining = totalTime - elapsed;
        const newProgress = Math.max((remaining / totalTime) * 100, 0);
        setProgress(newProgress);
        if (remaining > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setPhase('explanation');
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [phase, currentQuestion]);

  // Compute and update the available points (in steps)
  useEffect(() => {
    if (phase === 'question' && currentQuestion) {
      const maxForQuestion = currentQuestion.maxPoints || defaultPoints;
      const totalTime =
        (currentQuestion.answerTime || defaultAnswerTime) * 1000; // in ms
      const stepDuration = totalTime / nSteps;
      const elapsed = Date.now() - questionStartTimeRef.current;
      const stepsPassed = Math.floor(elapsed / stepDuration);
      // Decrease points in steps; remain constant until a step boundary is reached.
      const newMax = Math.max(
        maxForQuestion - stepsPassed * (maxForQuestion / nSteps),
        0,
      );
      if (maxPointsState === null) {
        setMaxPointsState(newMax);
      } else if (newMax !== maxPointsState) {
        setOldMaxPoints(maxPointsState);
        setMaxPointsState(newMax);
        setTimeout(() => {
          setOldMaxPoints(null);
        }, 500); // animation duration matches CSS
      }
    }
  }, [progress, phase, currentQuestion, maxPointsState]);

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (phase !== 'question' || selectedAnswer) return;
    setSelectedAnswer(answerId);
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);

    const totalTime = (currentQuestion?.answerTime || defaultAnswerTime) * 1000;
    const elapsed = Date.now() - questionStartTimeRef.current;
    const timeTaken = elapsed / 1000;

    let pointsAwarded = 0;
    if (answerId === currentQuestion?.correctAnswerId) {
      triggerConfetti();
      playCorrectSound();
      const stepDuration = totalTime / nSteps / 1000; // in seconds
      const stepsPassed = Math.floor(timeTaken / stepDuration);
      const maxForQuestion = currentQuestion?.maxPoints || defaultPoints;
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
      const previewTime =
        quiz.questions[currentQuestionIndex + 1]?.previewTime ||
        quiz.previewTime;
      setPreviewTimer(previewTime);
      setProgress(100);
    } else {
      setPhase('finished');
    }
  };

  // When finished, submit the quiz attempt
  useEffect(() => {
    if (phase === 'finished' && quiz && !attemptSubmitted) {
      const totalPossible = quiz.questions.reduce(
        (sum, q) => sum + (q?.maxPoints || defaultPoints),
        0,
      );
      const submitAttempt = async () => {
        try {
          await client.models.QuizAttempt.create(
            { quizId: quiz.id, score, totalPossible, answers: userAnswers },
            { authMode: 'apiKey' },
          );
          setAttemptSubmitted(true);
        } catch (error) {
          console.error('Error submitting quiz attempt:', error);
        }
      };
      submitAttempt();
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
        <Box className="quiz-header">
          {phase !== 'finished' && (
            <Typography variant="h6">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </Typography>
          )}
          <Box display="flex" alignItems="center">
            <img src="/coin.png" alt="coin" className="coin-icon" />
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
    <div className="quiz-attempt-wrapper">
      <Container maxWidth="md" className="quiz-container">
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
          <Box mt={4} className="preview-section">
            <Typography variant="body1" gutterBottom>
              {currentQuestion.text}
            </Typography>
            <Box mt={2} className="progress-container">
              <LinearProgress
                variant="determinate"
                value={previewProgress}
                className="custom-linear-progress"
              />
            </Box>
            <Box className="get-ready-container">
              <Typography variant="h5" className="get-ready-text">
                Get Ready!
              </Typography>
            </Box>
          </Box>
        )}

        {phase === 'question' && currentQuestion && (
          <Box mt={4} className="fade-in">
            <Typography variant="body1" gutterBottom>
              {currentQuestion.text}
            </Typography>
            <Box className="answer-cards-container">
              {currentQuestion.answers.map(
                (answer) =>
                  answer && (
                    <Card
                      key={answer.id}
                      className={`answer-card ${
                        selectedAnswer === answer.id ? 'selected' : ''
                      } ${
                        selectedAnswer && selectedAnswer !== answer.id
                          ? 'unselected-dim'
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
            <Box mt={2} className="progress-container">
              <LinearProgress
                variant="determinate"
                value={progress}
                className="custom-linear-progress"
              />
            </Box>
            {/* Display "points available" below the progress bar */}
            <Box className="points-container">
              <Typography
                variant="subtitle1"
                align="center"
                className="points-display"
              >
                Points Available: {maxPointsState}
              </Typography>
              {oldMaxPoints !== null && (
                <Typography
                  variant="subtitle1"
                  align="center"
                  className="points-display fading-text"
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
            <Box mt={2} className="explanation-cards-container">
              {currentQuestion.answers.map((answer) => {
                if (!answer) return null;
                const isCorrect = answer.id === currentQuestion.correctAnswerId;
                const isSelected = answer.id === selectedAnswer;
                const cardClass = `explanation-card ${
                  isCorrect ? 'correct' : 'incorrect'
                }`;
                return (
                  <Card key={answer.id} className={cardClass}>
                    {/* Overlay icon on the selected answer */}
                    {isSelected && (
                      <Box className="icon-overlay">
                        {isCorrect ? (
                          <CheckCircleIcon className="correct-icon" />
                        ) : (
                          <CancelIcon className="incorrect-icon" />
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
              Total Possible Points:{' '}
              {quiz.questions.reduce(
                (sum, q) => sum + (q?.maxPoints || defaultPoints),
                0,
              )}
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
