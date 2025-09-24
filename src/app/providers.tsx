// src/app/providers.tsx
import { BrowserRouter } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme'; // or '@/styles/theme'

export function Providers({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <Authenticator.Provider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </Authenticator.Provider>
    </BrowserRouter>
  );
}
