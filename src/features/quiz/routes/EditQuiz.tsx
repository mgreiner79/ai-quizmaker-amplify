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
  Alert,
  Snackbar,
  Skeleton,
  Grid2,
} from '@mui/material';

import { useParams, useNavigate, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Derive "fromCreate" from either router state OR ?new=1
  const search = new URLSearchParams(location.search);
  const fromCreate =
    (location.state as any)?.fromCreate === true || search.get('new') === '1';

  const { quiz, loading, error, refetch } = useQuiz(quizId);
  const { save, saving, error: saveError } = useUpdateQuiz();

  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [dirty, setDirty] = useState(false);

  // Snackbar state
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');

  const showSnack = (
    msg: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setSnackMsg(msg);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };

  useEffect(() => {
    if (quiz && !dirty) setDraft(toQuizDraft(quiz));
  }, [quiz, dirty]);

  const disabled = loading || saving || !draft;

  // Button logic:
  // - From creation: Save is enabled even if not dirty
  // - From edit: Save requires dirty
  const showCancel = !fromCreate;
  const canSave = !!draft && !saving && (fromCreate || dirty);

  const handleQuizChange = <K extends keyof QuizDraft>(
    field: K,
    value: QuizDraft[K],
  ) => {
    if (!draft) return;
    setDirty(true);
    setDraft({ ...draft, [field]: value });
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
    answers[aIndex] = { ...answers[aIndex], [field]: value };
    questions[qIndex] = { ...questions[qIndex], answers };
    setDraft({ ...draft, questions });
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await save(draft as Quiz);
      setDirty(false);
      showSnack('Saved changes', 'success');
      // Navigate back after a short delay so the user sees the toast
      setTimeout(() => navigate('/'), 300);
    } catch (e) {
      showSnack('Failed to save changes', 'error');
    }
  };

  // Loading skeletons
  if (loading && !draft) {
    return (
      <Container maxWidth="md">
        <Box mt={4} mb={2}>
          <Skeleton variant="text" width={240} height={48} />
          <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
        </Box>
        {[...Array(3)].map((_, i) => (
          <Card key={i} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width={160} height={32} />
              <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
              <Grid2 container spacing={2} sx={{ mt: 1 }}>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid2>
              </Grid2>
              <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
              <Skeleton variant="rectangular" height={56} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Container>
    );
  }

  // Friendly 404/permission state (no redirect)
  if (!loading && (error || !quiz)) {
    return (
      <Container>
        <Box mt={6} textAlign="center">
          <Typography variant="h4" gutterBottom>
            We can’t open this quiz
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            It may not exist, or you might not have permission to view it.
          </Typography>
          <Box mt={3}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to My Quizzes
            </Button>
            <Button sx={{ ml: 2 }} onClick={refetch}>
              Retry
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!draft) {
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
                <Grid2 size={{ xs: 12, sm: 4 }}>
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

                <Grid2 size={{ xs: 12, sm: 4 }}>
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

                <Grid2 size={{ xs: 12, sm: 4 }}>
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
        {showCancel && (
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!canSave}
          sx={{ ml: showCancel ? 2 : 0 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EditQuiz;
