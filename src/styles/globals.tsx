// src/styles/globals.ts
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';

/**
 * AppGlobalStyles centralizes non-component global CSS so we can
 * delete scattered .css files. Keep this lean and semantic.
 */
export function AppGlobalStyles() {
  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          'html, body, #root': { height: '100%' },

          // Gentle background similar to what you had
          body: {
            margin: 0,
            background:
              'linear-gradient(180deg, rgb(117, 81, 194), rgb(255, 255, 255))',
            fontSynthesis: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },

          // Sensible defaults for anchor tags
          a: { textDecoration: 'none' },

          // Optional utility resets you previously had globally
          ul: {
            paddingInlineStart: 0,
            marginBlockStart: 0,
            marginBlockEnd: 0,
            listStyleType: 'none',
          },
        }}
      />
    </>
  );
}
