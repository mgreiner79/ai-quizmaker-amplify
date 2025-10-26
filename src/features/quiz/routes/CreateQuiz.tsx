// src/pages/CreateQuiz.tsx
import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  InputLabel,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useLocation } from 'react-router-dom';

import { useQuizCreation } from '@/features/quiz/hooks/useQuizCreation';
import QuizCreationProgress from '@/features/quiz/components/QuizCreationProgress';
import KnowledgeFileModal from '@/features/quiz/components/KnowledgeFileModal';

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefill for cloning flows
  const initialPrompt = location.state?.prompt ?? '';
  const initialNumQuestions = location.state?.numQuestions ?? 5;
  const initialKnowledgeFileKey = location.state?.knowledgeFileKey ?? '';

  const [quizId] = useState(() => uuidv4());
  const [description, setDescription] = useState(initialPrompt);
  const [numQuestions, setNumQuestions] = useState<number>(initialNumQuestions);
  const [knowledgeFileKey, setKnowledgeFileKey] = useState(
    initialKnowledgeFileKey,
  );
  const [openModal, setOpenModal] = useState(false);

  const { start, submitted, loading, error, message } = useQuizCreation(
    quizId,
    () => {
      navigate(`/edit/${quizId}?new=1`, { state: { fromCreate: true } });
    },
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await start({
      quizId,
      prompt: description,
      numQuestions,
      knowledge: knowledgeFileKey || undefined,
    });
  };

  return (
    <Container maxWidth="sm">
      {!submitted && (
        <Box mt={4}>
          <Typography variant="h4" gutterBottom>
            Create New Quiz
          </Typography>

          {error && (
            <Typography color="error" gutterBottom>
              Error creating quiz. Please try again.
            </Typography>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Quiz Description"
              fullWidth
              multiline
              margin="normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              label="Number of Questions"
              type="number"
              fullWidth
              margin="normal"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              required
              disabled={loading}
            />
            <Box mt={2}>
              <InputLabel>Knowledge File (optional)</InputLabel>
              <Button
                variant="outlined"
                onClick={() => setOpenModal(true)}
                sx={{ mt: 1 }}
                disabled={loading}
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
                disabled={loading}
              >
                {loading ? 'Starting…' : 'Create'}
              </Button>
            </Box>
          </form>
        </Box>
      )}

      {submitted && <QuizCreationProgress message={message} />}

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
