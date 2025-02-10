import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  components: {
    MuiButton: { defaultProps: { variant: 'contained' } },
    MuiCard: { styleOverrides: { root: { padding: '1rem' } } },
  },
});
