// src/components/QuizCreationProgress.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Loader from './loaders/TetrominoLoader';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface QuizProgressEvent {
  id: string;
  correlationId: string;
  message: string;
  createdAt: string;
}

interface QuizCreationProgressProps {
  quizId: string;
  onProgressStart?: () => void;
}

const QuizCreationProgress: React.FC<QuizCreationProgressProps> = ({
  quizId,
}) => {
  const [progressMessage, setProgressMessage] = useState<string>('Warming up');
  const hasNotified = useRef(false);

  useEffect(() => {
    const sub = client.models.CreationProgress.onCreate({
      filter: {
        correlationId: { eq: quizId },
      },
    }).subscribe({
      next: (event) => {
        const newMessage = (event as QuizProgressEvent).message;
        // When the first progress message arrives, notify the parent.
        if (!hasNotified.current && newMessage) {
          hasNotified.current = true;
        }
        setProgressMessage(newMessage);
      },
      error: (error) => console.warn('Subscription error:', error),
    });
    return () => sub.unsubscribe();
  }, [quizId]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      minHeight="100vh"
      width="100%"
      pt={4}
      px={2}
    >
      {/* Progress message at the top */}
      <Typography variant="h4" align="center">
        {progressMessage}
      </Typography>
      {/* Loader positioned below the progress message */}
      <Box mt={4}>
        <Loader />
      </Box>
    </Box>
  );
};

export default QuizCreationProgress;
