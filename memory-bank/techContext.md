# Tech Context

## Technologies Used

- React (v18) with TypeScript for building the front-end UI.
- Vite as the build tool and development server.
- AWS Amplify CLI v7+ (Gen 2) for backend infrastructure:
  - Cognito for authentication.
  - AppSync GraphQL API for data operations.
  - S3 for storage.
  - Lambda functions (quizGenerator, testFunction) for compute.
- AWS SDK and OpenAI SDK (`openai`) in Lambda for AI integration.
- PDFReader (`pdfreader`) for parsing uploaded documents.
- Material UI (`@mui/material`, `@mui/icons-material`) and Emotion (`@emotion/react`, `@emotion/styled`) for styling components.
- Canvas-Confetti for celebratory animations.
- React Router (`react-router-dom`) for client-side routing.

## Development Setup

1. Install Node.js (>=16) and npm.
2. Clone the repository.
3. Run `npm install` at the project root.
4. Configure Amplify:
   - `amplify pull` to sync backend resources locally.
   - `amplify mock` (if needed) for local testing.
5. Start front-end dev server: `npm run dev`.
6. Access at `http://localhost:3000` (default Vite port).

## Technical Constraints

- Fully serverless design must rely on AWS managed services.
- Initial release supports English-only content generation.
- No offline or PWA functionality planned for the MVP.
- Platform targets modern browsers; no IE11 support.

## Dependencies

- Core: `react`, `react-dom`, `react-router-dom`, `aws-amplify`, `aws-sdk`.
- UI & Styling: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `canvas-confetti`.
- AI & Parsing: `openai`, `pdfreader`.
- Dev: `vite`, `typescript`, `eslint`, `prettier`, `@aws-amplify/backend`, `aws-cdk`, `sass-embedded`.

## Tool Usage Patterns

- Amplify CLI v7+ (Gen 2) for provisioning backend resources (`amplify/backend.ts`).
- Vite for local development and production builds (`npm run dev` / `npm run build`).
- ESLint and Prettier integrated via `npm run lint`.
- CI/CD driven by `amplify.yml` in the repository root.
