# AWS Amplify Gen 2 Quiz Application (React + Vite + TypeScript)

A production-ready template for building an AI-assisted quiz platform.  
Uses **AWS Amplify Gen 2** for backend services (Auth + Data + Storage + Lambda) and **React + Vite + MUI** for a modern, responsive UI.

---

## 🧭 Overview

This app lets authenticated users generate quizzes with the help of a Large Language Model, edit them in a structured UI, and let others attempt them with timed scoring and animated feedback.  
It demonstrates a complete Amplify Gen 2 stack—covering backend wiring, front-end data flow, and testing.

---

## ✳️ Key Features

### 🔐 Authentication

- Amplify Gen 2 User Pools via `defineAuth`
- Email-based sign-in/sign-up with custom `Authenticator` UI

### 🧠 AI Quiz Generation

- Lambda function (`quizGenerator`) calling **OpenAI GPT-4o**
- Downloads optional knowledge files from S3
- Streams progress through a `CreationProgress` model
- Writes generated quiz JSON directly into DynamoDB via the Amplify Data client

### 💾 Data Models (Amplify Data / DynamoDB)

- **Quiz** – main quiz definition with nested questions and answers
- **CreationProgress** – tracks Lambda generation status
- **QuizAttempt** – stores results of user attempts

### 📁 File Storage (S3)

- User-scoped folder `knowledge/{userId}/*`
- Upload/download handled in `KnowledgeFileModal` using `aws-amplify/storage`
- Lambda function authorized to read files for quiz generation

### 🎨 Front End (UI + UX)

- **React Router v6** structure with protected routes
- **MUI v5** theme (custom pink / blue palette, rounded edges)
- Animated countdown bars, confetti, sound effects
- Modular hooks and components for clear separation of logic/UI

### 🧪 Testing

- **Vitest + React Testing Library** for unit tests on utilities, hooks, and API layers
- Deterministic mocks for Amplify clients and timing hooks

---

## 🧩 Code Structure

```bash
amplify/
  backend.ts                # wires auth, data, functions, storage
  auth/resource.ts          # Cognito User Pool (email login)
  data/resource.ts          # defines models, mutations, auth rules
  storage/resource.ts       # S3 bucket rules
  functions/quizGenerator/  # Lambda source (handler + schema)

src/
  app/                      # app composition (router, providers, layout)
  components/               # reusable UI (ProtectedRoute, loaders, modals)
  features/
    quiz/
      api/                  # Amplify Data API wrappers (+ tests)
      hooks/                # encapsulated state logic (useQuiz, usePhaseTimer…)
      components/           # Quiz UI pieces (header, question, progress…)
      routes/               # route entry points (Home, Create, Edit, Attempt)
      utils/                # scoring math + helpers (+ tests)
      config.ts             # global quiz defaults
  lib/
    amplifyClient.ts        # singleton Amplify Data client
  theme.ts                  # MUI theme
  main.tsx / App.tsx        # entry point and router mount
```

---

## ⚙️ Data Flow

1. **User logs in** through Amplify Auth.
2. **Create Quiz**
   - optional file uploaded to S3 (`KnowledgeFileModal`)
   - user submits form → `useQuizCreation` → calls `generateQuiz` mutation
   - Lambda runs, posts progress updates (`CreationProgress`)
   - frontend subscribes and navigates to edit view on completion
3. **Edit Quiz** in form-based editor (`EditQuiz`).
4. **Attempt Quiz**
   - Timed phases (`usePhaseTimer`) + stepwise scoring (`useStepPoints`)
   - Results saved via `QuizAttempt.create()`.

---

## 🧰 Technologies

- **Frontend:** React 18, Vite, TypeScript, MUI 5
- **Backend:** AWS Amplify Gen 2 (Auth + Data + Functions + Storage)
- **AI:** OpenAI GPT-4o (JSON schema response format)
- **Database:** Amazon DynamoDB (via Amplify Data)
- **Storage:** Amazon S3
- **Testing:** Vitest + React Testing Library
- **Build/Deploy:** Amplify Hosting (“Gen 2” flows)

---

## 🚀 Development Setup

1. Install Node ≥ 18 and npm ≥ 9
2. `git clone <repo>`
3. `npm install`
4. `npm run dev` → http://localhost:5173
5. Ensure Amplify CLI is set up (`amplify pull --sandbox` or `amplify sandbox`)

---

## ☁️ Deployment

Run through Amplify Hosting Console or CLI:

```bash
amplify publish
```
