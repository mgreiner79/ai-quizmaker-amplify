// src/app/providers.tsx
import { BrowserRouter } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/styles/theme';
import { AppGlobalStyles } from '@/styles/globals';

export function Providers({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <Authenticator.Provider>
        <ThemeProvider theme={theme}>
          <AppGlobalStyles />
          {children}
        </ThemeProvider>
      </Authenticator.Provider>
    </BrowserRouter>
  );
}
