import { Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
export default function NotFound() {
  const nav = useNavigate();
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Page not found
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        The page you’re looking for doesn’t exist.
      </Typography>
      <Button variant="contained" onClick={() => nav('/')}>
        Go Home
      </Button>
    </Container>
  );
}
