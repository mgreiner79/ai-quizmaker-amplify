import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  InputLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { uploadData } from "aws-amplify/storage";
import QuizCreationProgress from '../components/QuizCreationProgress';

const client = generateClient<Schema>();

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [quizId] = useState(() => uuidv4());
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true)
    try {
      if (knowledgeFile) {
        // Upload the knowledge file to S3 (the bucket is defined in Amplify storage configuration)
        const arrayBuffer = await readFileAsArrayBuffer(knowledgeFile);
        const result = uploadData({
          data: arrayBuffer,
          path: `knowledge/${knowledgeFile.name}`,
        });
        knowledgeFileKey = (await result.result).path;
      }

      // Call the quiz generator mutation; note that the backend expects
      // description, numQuestions, and knowledge (the file key or empty string)
      const resp = await client.mutations.quizGenerator({
        quizId,
        description,
        numQuestions,
        knowledge: knowledgeFileKey,
      });
      // Redirect to the edit page so the user can modify the auto-generated quiz.
      navigate(`/edit/${resp.data?.id}`);
    } catch (error) {
      setSubmitted(false)
      console.error('Error creating quiz:', error);
    } 
  };

  return (
    <Container maxWidth="sm">
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
          />
          <TextField
            label="Number of Questions"
            type="number"
            fullWidth
            margin="normal"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            required
          />
          <Box mt={2}>
            <InputLabel>Knowledge File (optional)</InputLabel>
            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileChange} />
          </Box>
          <Box mt={4}>
            <Button type="submit" variant="contained" color="primary" disabled={submitted}>
              Create
            </Button>
            {submitted && <QuizCreationProgress quizId={quizId} />}
          </Box>
        </form>
      </Box>
    </Container>
  );
};

export default CreateQuiz;
