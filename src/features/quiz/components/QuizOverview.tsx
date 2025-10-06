import { Box, Button, Typography } from '@mui/material';
import { Quiz } from '../types';

export function QuizOverview({
  quiz,
  onStart,
}: {
  quiz: Quiz;
  onStart: () => void;
}) {
  return (
    <Box mt={4}>
      <Typography variant="h4" gutterBottom>
        {quiz.title}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {quiz.description}
      </Typography>
      <Box mt={2}>
        <Button variant="contained" onClick={onStart}>
          Start Quiz
        </Button>
      </Box>
    </Box>
  );
}
