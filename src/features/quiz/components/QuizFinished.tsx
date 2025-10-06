import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export function QuizFinished({
  score,
  totalPossible,
  onHome,
}: {
  score: number;
  totalPossible: number;
  onHome: () => void;
}) {
  return (
    <Box mt={4}>
      <Typography variant="h4" gutterBottom>
        Quiz Completed!
      </Typography>
      <Typography variant="h5">Your Points: {score}</Typography>
      <Typography variant="h6">
        Total Possible Points: {totalPossible}
      </Typography>
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={onHome}>
          Go Home
        </Button>
      </Box>
    </Box>
  );
}
