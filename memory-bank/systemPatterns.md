# System Patterns

## Architecture Overview

The application follows a fully serverless, component-based architecture:

- Front-end: React application bundled with Vite, served statically.
- Authentication: AWS Cognito (via Amplify Auth) for user sign-in and authorization.
- API: AWS AppSync GraphQL API provisioned by Amplify, handling data queries and mutations.
- Compute: AWS Lambda functions (quizGenerator, testFunction) in TypeScript to process content and generate quizzes via AI.
- Storage: AWS S3 bucket for storing user-uploaded assets and quiz data.
- CI/CD: Amplify Console handles automated builds and deployments based on `amplify.yml`.

## Design Patterns

- Higher-Order Component (HOC): `ProtectedRoute` wraps pages to enforce authentication.
- React Hooks: `useState` and `useEffect` manage component state and side effects in functional components.
- Context Provider: `ThemeProvider` (in `theme.tsx`) supplies global styling and theming.
- Factory Pattern: Amplify CLI v7+ (Gen 2) dynamically provisions backend resources defined in `backend.ts`.
- Observer: GraphQL subscriptions could be added to push real-time quiz updates.

## Component Relationships

- `src/main.tsx` initializes Amplify and mounts `<App />` within `BrowserRouter` and `ThemeProvider`.
- `App.tsx` defines routes: Home, Login, CreateQuiz, EditQuiz, QuizAttempt.
- Page components import shared UI components (`KnowledgeFileModal`, `QuizCreationProgress`, loaders).
- Backend `backend.ts` imports individual resource modules (`auth`, `data`, `storage`, `quizGenerator`) and ties them together.
- Lambdas communicate with AppSync via environment variables (`BUCKET_NAME`, `API_URL`).

## Critical Implementation Paths

1. Authentication Flow

   - User visits Login → Cognito hosted UI → callback → JWT stored in local storage → ProtectedRoute grants access.

2. Quiz Creation Flow

   - User uploads or enters content → GraphQL mutation `createQuiz` → Lambda `quizGenerator` triggered → AI processes text → Q&A stored in AppSync.

3. Quiz Attempt Flow

   - Front-end queries questions via GraphQL → displays one question at a time → user answers → local score calculation → final score shown.

4. Storage Integration
   - File uploads sent to S3 → Lambda reads from S3 bucket using environment variables → cleans up temporary files.
