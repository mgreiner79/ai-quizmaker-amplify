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
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

// Define interfaces for local editing of quiz data.
interface EditableAnswer {
  id: string;
  text: string;
  message: string;
}

interface EditableQuestion {
  text: string;
  previewTime: number;
  answerTime: number;
  maxPoints: number;
  correctAnswerId: string;
  explanation: string;
  answers: EditableAnswer[];
}

interface EditableQuiz {
  id: string;
  title: string;
  description: string;
  previewTime: number;
  answerTime: number;
  maxPoints: number;
  questions: EditableQuestion[];
  knowledgeFileKey: string;
  owner: string;
}

const EditQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<EditableQuiz | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const fetchedQuiz = (await client.models.Quiz.get({ id: quizId! })).data;
        setQuiz(fetchedQuiz as EditableQuiz);
      } catch (error) {
        console.error('Error fetching quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const handleQuizChange = (field: keyof EditableQuiz, value: any) => {
    if (quiz) {
      setQuiz({
        ...quiz,
        [field]: value,
      });
    }
  };

  const handleQuestionChange = (
    index: number,
    field: keyof EditableQuestion,
    value: any
  ) => {
    if (quiz) {
      const updatedQuestions = [...quiz.questions];
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value,
      };
      setQuiz({
        ...quiz,
        questions: updatedQuestions,
      });
    }
  };

  const handleAnswerChange = (
    qIndex: number,
    aIndex: number,
    field: keyof EditableAnswer,
    value: any
  ) => {
    if (quiz) {
      const updatedQuestions = [...quiz.questions];
      const updatedAnswers = [...updatedQuestions[qIndex].answers];
      updatedAnswers[aIndex] = {
        ...updatedAnswers[aIndex],
        [field]: value,
      };
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex],
        answers: updatedAnswers,
      };
      setQuiz({
        ...quiz,
        questions: updatedQuestions,
      });
    }
  };

  const handleSave = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      // Save the updated quiz back to the backend.
      await client.models.Quiz.update(quiz);
      navigate('/');
    } catch (error) {
      console.error('Error saving quiz:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !quiz) {
    return (
      <Container>
        <Typography variant="h5" mt={4}>
          "Loading quiz..."
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          Edit Quiz
        </Typography>
        <TextField
          label="Quiz Title"
          fullWidth
          margin="normal"
          value={quiz.title}
          onChange={(e) => handleQuizChange('title', e.target.value)}
        />
        <TextField
          label="Quiz Description"
          fullWidth
          margin="normal"
          multiline
          value={quiz.description}
          onChange={(e) => handleQuizChange('description', e.target.value)}
        />
      </Box>
      <Box>
        {quiz.questions.map((question, qIndex) => (
          <Card key={qIndex} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Question {qIndex + 1}</Typography>
              <TextField
                label="Question Text"
                fullWidth
                margin="normal"
                value={question.text}
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
              />
              <Grid2 container spacing={2}>
                <Grid2 >
                  <TextField
                    label="Preview Time (sec)"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.previewTime}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, 'previewTime', parseInt(e.target.value))
                    }
                  />
                </Grid2>
                <Grid2 >
                  <TextField
                    label="Answer Time (sec)"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.answerTime}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, 'answerTime', parseInt(e.target.value))
                    }
                  />
                </Grid2>
                <Grid2 >
                  <TextField
                    label="Max Points"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={question.maxPoints}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, 'maxPoints', parseInt(e.target.value))
                    }
                  />
                </Grid2>
              </Grid2>
              <TextField
                label="Explanation"
                fullWidth
                margin="normal"
                multiline
                value={question.explanation}
                onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
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
                        handleAnswerChange(qIndex, aIndex, 'text', e.target.value)
                      }
                    />
                    <TextField
                      label={`Answer ${aIndex + 1} Message`}
                      fullWidth
                      margin="normal"
                      value={answer.message}
                      onChange={(e) =>
                        handleAnswerChange(qIndex, aIndex, 'message', e.target.value)
                      }
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box mt={4} display="flex" justifyContent="flex-end">
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Container>
  );
};

export default EditQuiz;
