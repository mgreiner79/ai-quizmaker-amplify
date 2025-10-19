// src/features/quiz/routes/Home.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';

import { useQuizzes, type Quiz } from '@/features/quiz/hooks/useQuizzes';
import { deleteQuiz } from '@/features/quiz/api/quizzes';

const Home: React.FC = () => {
  const { quizzes, loading, error } = useQuizzes();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const navigate = useNavigate();

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const handleClone = (quiz: Quiz) => {
    navigate('/create', {
      state: {
        prompt: quiz.prompt,
        knowledgeFileKey: quiz.knowledgeFileKey,
        numQuestions: quiz.questions.length,
      },
    });
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    quiz: Quiz,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuiz(quiz);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuiz(null);
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

      {error && <Typography color="error">Failed to load quizzes.</Typography>}

      {!loading && !error && (
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
              <IconButton
                aria-label="more"
                onClick={(event) => handleMenuOpen(event, quiz)}
              >
                <MoreVertIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedQuiz) navigate(`/quiz/${selectedQuiz.id}`);
          }}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Attempt
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedQuiz) handleClone(selectedQuiz);
          }}
        >
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          Clone
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedQuiz) navigate(`/edit/${selectedQuiz.id}`);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedQuiz) handleDelete(selectedQuiz.id);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Home;
