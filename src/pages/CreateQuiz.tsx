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
import { uploadData } from 'aws-amplify/storage';
import QuizCreationProgress from '../components/QuizCreationProgress';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [quizId] = useState(() => uuidv4());
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [progressStarted, setProgressStarted] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setKnowledgeFile(event.target.files[0]);
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    let knowledgeFileKey = '';
    setSubmitted(true);
    try {
      if (knowledgeFile) {
        const arrayBuffer = await readFileAsArrayBuffer(knowledgeFile);
        const result = uploadData({
          data: arrayBuffer,
          path: `knowledge/${knowledgeFile.name}`,
        });
        knowledgeFileKey = (await result.result).path;
      }
      // Call the mutation and capture the returned quiz object.
      await client.mutations.quizGenerator({
        quizId,
        description,
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
      filter: {
        id: { eq: quizId },
      },
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
      {(!submitted) && (
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
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                disabled={submitted}
              />
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

      {submitted && (
        <QuizCreationProgress
          quizId={quizId}
          onProgressStart={() => setProgressStarted(true)}
        />
      )}
    </Container>
  );
};

export default CreateQuiz;
