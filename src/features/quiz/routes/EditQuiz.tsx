// src/features/quiz/routes/EditQuiz.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid2,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { useUpdateQuiz } from '@/features/quiz/hooks/useUpdateQuiz';
import type {
  Answer,
  QuestionDraft,
  Quiz,
  QuizDraft,
} from '@/features/quiz/types';
import { toQuizDraft } from '@/features/quiz/types';

const EditQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const { quiz, loading, error, refetch } = useQuiz(quizId);
  const { save, saving, error: saveError } = useUpdateQuiz();

  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (quiz && !dirty) setDraft(toQuizDraft(quiz));
  }, [quiz, dirty]);

  const disabled = loading || saving || !draft;

  const handleQuizChange = <K extends keyof QuizDraft>(
    field: K,
    value: QuizDraft[K],
  ) => {
    if (!draft) return;
    setDirty(true);
    setDraft({
      ...draft,
      [field]: value,
    });
  };

  const handleQuestionChange = <
    K extends Exclude<keyof QuestionDraft, 'answers'>,
  >(
    index: number,
    field: K,
    value: QuestionDraft[K],
  ) => {
    if (!draft) return;
    setDirty(true);

    const questions = draft.questions.slice();
    const current = questions[index];
    const patch = { [field]: value } as Pick<QuestionDraft, typeof field>;
    const next: QuestionDraft = { ...current, ...patch };
    questions[index] = next;
    setDraft({ ...draft, questions });
  };

  const handleAnswerChange = <K extends keyof Answer>(
    qIndex: number,
    aIndex: number,
    field: K,
    value: Answer[K],
  ) => {
    if (!draft) return;
    setDirty(true);
    const questions = draft.questions.slice();
    const answers = questions[qIndex].answers.slice();
    answers[aIndex] = {
      ...answers[aIndex],
      [field]: value,
    };
    questions[qIndex] = {
      ...questions[qIndex],
      answers: answers,
    };
    setDraft({
      ...draft,
      questions,
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      // Save the updated quiz back to the backend.
      await save(draft as Quiz);
      setDirty(false);
      navigate('/');
    } catch (error) {
      console.error('Error saving quiz:', error);
      // error is shown via saveError Alert below
    }
  };

  if (loading && !draft) {
    return (
      <Container>
        <Typography variant="h5" mt={4}>
          "Loading quiz..."
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box mt={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load quiz. Please try again.
          </Alert>
          <Button variant="contained" onClick={refetch}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!draft) {
    // Should be rare, but avoids rendering undefined values
    return (
      <Container>
        <Typography variant="h6" mt={4}>
          No quiz found.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          Edit Quiz
        </Typography>

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to save changes. Please try again.
          </Alert>
        )}

        <TextField
          label="Quiz Title"
          fullWidth
          margin="normal"
          value={draft.title}
          onChange={(e) => handleQuizChange('title', e.target.value)}
          disabled={disabled}
        />
        <TextField
          label="Quiz Description"
          fullWidth
          margin="normal"
          multiline
          value={draft.description}
          onChange={(e) => handleQuizChange('description', e.target.value)}
          disabled={disabled}
        />
      </Box>
      <Box>
        {draft.questions.map((question, qIndex) => (
          <Card key={qIndex} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Question {qIndex + 1}</Typography>
              <TextField
                label="Question Text"
                fullWidth
                margin="normal"
                value={question.text}
                onChange={(e) =>
                  handleQuestionChange(qIndex, 'text', e.target.value)
                }
                disabled={disabled}
              />
              <Grid2 container spacing={2}>
                <Grid2>
                  <TextField
                    label="Preview Time (sec)"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.previewTime}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        'previewTime',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={disabled}
                  />
                </Grid2>
                <Grid2>
                  <TextField
                    label="Answer Time (sec)"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.answerTime}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        'answerTime',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={disabled}
                  />
                </Grid2>
                <Grid2>
                  <TextField
                    label="Max Points"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.maxPoints}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        'maxPoints',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={disabled}
                  />
                </Grid2>
              </Grid2>
              <TextField
                label="Explanation"
                fullWidth
                margin="normal"
                multiline
                value={question.explanation}
                onChange={(e) =>
                  handleQuestionChange(qIndex, 'explanation', e.target.value)
                }
                disabled={disabled}
              />
              <Box mt={2}>
                <Typography variant="subtitle1">Answers</Typography>
                {question.answers.map((answer, aIndex) => (
                  <Box key={answer.id} mb={1}>
                    <TextField
                      label={`Answer ${aIndex + 1} Text`}
                      fullWidth
                      margin="normal"
                      value={answer.text}
                      onChange={(e) =>
                        handleAnswerChange(
                          qIndex,
                          aIndex,
                          'text',
                          e.target.value,
                        )
                      }
                      disabled={disabled}
                    />
                    <TextField
                      label={`Answer ${aIndex + 1} Message`}
                      fullWidth
                      margin="normal"
                      value={answer.message}
                      onChange={(e) =>
                        handleAnswerChange(
                          qIndex,
                          aIndex,
                          'message',
                          e.target.value,
                        )
                      }
                      disabled={disabled}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box mt={4} display="flex" justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Container>
  );
};

export default EditQuiz;
