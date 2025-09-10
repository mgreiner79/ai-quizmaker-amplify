// src/pages/CreateQuiz.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  InputLabel,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import QuizCreationProgress from '../components/QuizCreationProgress';
import { useNavigate, useLocation } from 'react-router-dom';
import KnowledgeFileModal from '../components/KnowledgeFileModal';

const client = generateClient<Schema>();

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefill the form if state was passed (e.g., when cloning)
  const initialPrompt = location.state?.prompt ?? '';
  const initialNumQuestions = location.state?.numQuestions ?? 5;
  const initialKnowledgeFileKey = location.state?.knowledgeFileKey ?? '';

  const [quizId] = useState(() => uuidv4());
  const [description, setDescription] = useState(initialPrompt);
  const [numQuestions, setNumQuestions] = useState<number>(initialNumQuestions);
  const [knowledgeFileKey, setKnowledgeFileKey] = useState(
    initialKnowledgeFileKey,
  );
  const [submitted, setSubmitted] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    try {
      await client.mutations.quizGenerator({
        quizId,
        prompt: description,
        numQuestions,
        knowledge: knowledgeFileKey,
      });
    } catch (error) {
      setSubmitted(false);
      console.error('Error creating quiz:', error);
    }
  };

  // Subscribe to the quiz creation event.
  useEffect(() => {
    if (!submitted) return;
    const sub = client.models.Quiz.onCreate({
      filter: { id: { eq: quizId } },
    }).subscribe({
      next: (event) => {
        console.log('Quiz created event received:', event);
        // Redirect once the quiz creation event is received.
        navigate(`/edit/${quizId}`);
      },
      error: (error) => console.warn('Subscription error:', error),
    });
    return () => sub.unsubscribe();
  }, [submitted, quizId, navigate]);

  return (
    <Container maxWidth="sm">
      {!submitted && (
        <Box mt={4}>
          <Typography variant="h4" gutterBottom>
            Create New Quiz
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Quiz Description"
              fullWidth
              multiline
              margin="normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={submitted}
            />
            <TextField
              label="Number of Questions"
              type="number"
              fullWidth
              margin="normal"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              required
              disabled={submitted}
            />
            <Box mt={2}>
              <InputLabel>Knowledge File (optional)</InputLabel>
              <Button
                variant="outlined"
                onClick={() => setOpenModal(true)}
                sx={{ mt: 1 }}
                disabled={submitted}
              >
                {knowledgeFileKey
                  ? `Change File (${knowledgeFileKey.split('/').pop()})`
                  : 'Select File'}
              </Button>
            </Box>
            <Box mt={4}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitted}
              >
                Create
              </Button>
            </Box>
          </form>
        </Box>
      )}

      {submitted && <QuizCreationProgress quizId={quizId} />}
      <KnowledgeFileModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSelect={(fileKey) => {
          setKnowledgeFileKey(fileKey);
          setOpenModal(false);
        }}
      />
    </Container>
  );
};

export default CreateQuiz;
