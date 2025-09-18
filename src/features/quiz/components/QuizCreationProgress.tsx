// src/features/quiz/components/QuizCreationProgress.tsx
import { Box, Typography } from '@mui/material';
import Loader from '@/components/loaders/TetrominoLoader';

const QuizCreationProgress = ({ message }: { message: string }) => {
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
      <Typography variant="h4" align="center">
        {message}
      </Typography>
      <Box mt={4}>
        <Loader />
      </Box>
    </Box>
  );
};

export default QuizCreationProgress;
