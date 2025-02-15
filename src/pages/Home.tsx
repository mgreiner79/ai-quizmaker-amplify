import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

const Home: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Array<Schema['Quiz']['type']>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to the Quiz model; any changes update the list in real time.
    const subscription = client.models.Quiz.observeQuery().subscribe({
      next: (data) => {
        const sortedItems = [...data.items].sort((a, b) => {
          // Adjust the field name if necessary (e.g. updatedAt)
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setQuizzes(sortedItems);
      },
      error: (err) => console.error(err),
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleDelete = async (quizId: string) => {
    try {
      await client.models.Quiz.delete({ id: quizId });
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  return (
    <Container>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={4}
        mb={2}
      >
        <Typography variant="h4">My Quizzes</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/create')}
        >
          Create New Quiz
        </Button>
      </Box>
      <List>
        {quizzes.map((quiz) => (
          <ListItem
            key={quiz.id}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ListItemText
                primary={quiz.title}
                secondary={quiz.description}
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                aria-label="attempt"
                onClick={() => navigate(`/quiz/${quiz.id}`)}
              >
                <PlayArrowIcon />
              </IconButton>
              <IconButton
                aria-label="edit"
                onClick={() => navigate(`/edit/${quiz.id}`)}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                aria-label="delete"
                onClick={() => handleDelete(quiz.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default Home;
