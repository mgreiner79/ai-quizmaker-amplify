import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardActionArea,
  CardContent,
  AppBar,
  Toolbar,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

type Phase = 'overview' | 'preview' | 'question' | 'explanation' | 'finished';

const QuizAttempt: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Schema['Quiz']['type'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [phase, setPhase] = useState<Phase>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [previewTimer, setPreviewTimer] = useState<number>(0);
  const [answerTimer, setAnswerTimer] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [attemptSubmitted, setAttemptSubmitted] = useState<boolean>(false);
  const defaultPoints = 3000;
  const defaultAnswerTime = 30;
  const defaultPreviewTime = 10;
  const nSteps = 5;

  // Refs for timer intervals (we clear them on phase changes/unmount)
  const previewIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const answerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch quiz data on mount
  useEffect(() => {
    if (!quizId) {
      navigate('/');
      return;
    }
    const fetchQuiz = async () => {
      try {
        // Assumes the client exposes a get method for models.Quiz.
        const fetchedQuiz = await client.models.Quiz.get(
          { id: quizId },
          {
            authMode: 'apiKey',
          },
        );
        if (!fetchedQuiz.data) {
          console.error('Quiz not found');
          navigate('/');
          return;
        } else {
          const data = fetchedQuiz.data;
          setQuiz(data);
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
      if (answerIntervalRef.current) clearInterval(answerIntervalRef.current);
    };
  }, [quizId, navigate]);

  // Get the current question (if any)
  const currentQuestion: Schema['Question']['type'] | null = quiz?.questions
    ? quiz.questions[currentQuestionIndex] ?? null
    : null;

  // Called when the user clicks the "Start Quiz" button.
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

  // Handle the preview phase timer countdown.
  useEffect(() => {
    if (phase === 'preview') {
      previewIntervalRef.current = setInterval(() => {
        setPreviewTimer((prev) => {
          if (prev <= 1) {
            clearInterval(previewIntervalRef.current!);
            // Transition to the answer phase.
            setPhase('question');
            setAnswerTimer(currentQuestion?.answerTime || defaultAnswerTime);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, [phase, currentQuestion]);

  // Handle the answer phase timer countdown.
  useEffect(() => {
    if (phase === 'question') {
      answerIntervalRef.current = setInterval(() => {
        setAnswerTimer((prev) => {
          if (prev <= 1) {
            clearInterval(answerIntervalRef.current!);
            // If no answer was selected, record an empty answer.
            if (!selectedAnswer) {
              setUserAnswers((prevAnswers) => [...prevAnswers, '']);
            }
            setPhase('explanation');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (answerIntervalRef.current) clearInterval(answerIntervalRef.current);
    };
  }, [phase, selectedAnswer]);

  // Called when the user selects an answer.
  const handleAnswerSelect = (answerId: string) => {
    if (phase !== 'question' || selectedAnswer) return;
    setSelectedAnswer(answerId);
    if (answerIntervalRef.current) clearInterval(answerIntervalRef.current);

    // Calculate how long the user took to answer.
    const answerDuration = currentQuestion?.answerTime || defaultAnswerTime;
    const timeTaken = answerDuration - answerTimer;

    let pointsAwarded = 0;
    if (answerId === currentQuestion?.correctAnswerId) {
      // Each step lasts:
      const stepDuration = answerDuration / nSteps;
      // Determine how many steps have passed.
      const stepsPassed = Math.floor(timeTaken / stepDuration);
      // Calculate points based on the number of steps passed.
      const maxPoints = currentQuestion?.maxPoints || defaultPoints;
      const deductionPerStep = maxPoints / nSteps;
      pointsAwarded = Math.max(maxPoints - stepsPassed * deductionPerStep, 0);
    }

    setScore((prev) => prev + pointsAwarded);
    setUserAnswers((prevAnswers) => [...prevAnswers, answerId]);
    setPhase('explanation');
  };

  // When the user clicks "Next" after the explanation.
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    if (quiz && currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      // Begin the next question's preview phase.
      setPhase('preview');
      const previewTime =
        quiz.questions[currentQuestionIndex + 1]?.previewTime ||
        quiz.previewTime;
      setPreviewTimer(previewTime);
    } else {
      setPhase('finished');
    }
  };

  // When quiz is finished, optionally submit the attempt to the backend.
  useEffect(() => {
    if (phase === 'finished' && quiz && !attemptSubmitted) {
      const totalPossible = quiz.questions.reduce(
        (sum, q) => sum + (q?.maxPoints || defaultPoints),
        0,
      );
      const submitAttempt = async () => {
        try {
          await client.models.QuizAttempt.create(
            {
              quizId: quiz.id,
              score,
              totalPossible,
              answers: userAnswers,
            },
            {
              authMode: 'apiKey',
            },
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

  // A top–right score display using an AppBar.
  const renderScoreDisplay = () => (
    <AppBar position="static" color="default" sx={{ mb: 2 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {quiz.title}
        </Typography>
        <Typography variant="h6">Score: {score}</Typography>
      </Toolbar>
    </AppBar>
  );

  return (
    <Container maxWidth="md">
      {phase !== 'overview' && renderScoreDisplay()}

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
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Get Ready!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Question Preview
          </Typography>
          <Typography variant="body1" gutterBottom>
            {currentQuestion.text}
          </Typography>
          <Typography variant="h4" color="secondary">
            {previewTimer}
          </Typography>
        </Box>
      )}

      {phase === 'question' && currentQuestion && (
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Question
          </Typography>
          <Typography variant="body1" gutterBottom>
            {currentQuestion.text}
          </Typography>
          <Box mt={2} mb={2}>
            <Typography variant="h6">Time Remaining: {answerTimer}s</Typography>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {currentQuestion.answers.map(
              (answer) =>
                answer && (
                  <Card
                    key={answer.id}
                    sx={{
                      width: 'calc(50% - 8px)',
                      border:
                        selectedAnswer === answer.id
                          ? '2px solid green'
                          : '1px solid #ccc',
                      opacity:
                        selectedAnswer && selectedAnswer !== answer.id
                          ? 0.5
                          : 1,
                    }}
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
        </Box>
      )}

      {phase === 'explanation' && currentQuestion && (
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Explanation
          </Typography>
          <Typography variant="body1" gutterBottom>
            {currentQuestion.text}
          </Typography>
          <Box mt={2}>
            {currentQuestion.answers.map((answer) => {
              if (!answer) return null;
              const isCorrect = answer.id === currentQuestion.correctAnswerId;
              const isSelected = answer.id === selectedAnswer;
              return (
                <Card
                  key={answer.id}
                  sx={{
                    mb: 1,
                    border: isCorrect ? '2px solid green' : '1px solid #ccc',
                    backgroundColor:
                      isSelected && !isCorrect ? '#ffcccc' : 'inherit',
                  }}
                >
                  <CardContent>
                    <Typography variant="body1">{answer.text}</Typography>
                    {isCorrect && (
                      <Typography variant="caption" color="textSecondary">
                        {currentQuestion.explanation}
                      </Typography>
                    )}
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
          <Typography variant="h5">Your Score: {score}</Typography>
          <Typography variant="h6">
            Total Possible Score:{' '}
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
  );
};

export default QuizAttempt;
