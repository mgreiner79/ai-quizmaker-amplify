// src/features/quiz/routes/Home.tsx
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
  Menu,
  MenuItem,
  ListItemIcon,
  Snackbar,
  Alert,
  Skeleton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate, useLocation } from 'react-router-dom';

import { useQuizzes, type Quiz } from '@/features/quiz/hooks/useQuizzes';
import { deleteQuiz } from '@/features/quiz/api/quizzes';

const Home: React.FC = () => {
  const { quizzes, loading, error } = useQuizzes();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');

  const navigate = useNavigate();
  const location = useLocation();

  const showSnack = (
    msg: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setSnackMsg(msg);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };

  // 🔔 Flash message from navigation (e.g., after saving in EditQuiz)
  useEffect(() => {
    const toast = (location.state as any)?.toast as
      | { message: string; severity?: 'success' | 'error' | 'info' | 'warning' }
      | undefined;

    if (toast?.message) {
      showSnack(toast.message, toast.severity ?? 'info');

      // Clear the state so refresh/back doesn't replay it
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      showSnack('Quiz deleted', 'success');
    } catch (e) {
      showSnack('Failed to delete quiz', 'error');
    }
  };

  const handleClone = (quiz: Quiz) => {
    // Optional: toast before navigation
    showSnack('Cloning settings…', 'info');
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

  const LoadingList = (
    <List>
      {Array.from({ length: 5 }).map((_, i) => (
        <ListItem key={i} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="35%" height={28} />
            <Skeleton variant="text" width="55%" height={22} />
          </Box>
          <Skeleton variant="circular" width={40} height={40} />
        </ListItem>
      ))}
    </List>
  );

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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load quizzes.
        </Alert>
      )}

      {loading ? (
        LoadingList
      ) : (
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
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home;
