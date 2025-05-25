# Project Brief

## Project Name

AI QuizMaker Amplify

## Purpose

AI QuizMaker Amplify exists to simplify and accelerate the creation of quiz assessments by leveraging AI. It solves the problem of manual question authoring by allowing educators and content creators to upload or enter source material and automatically generate question-and-answer pairs.

## Goals

- Enable secure user authentication and authorization.
- Provide an intuitive interface for uploading or entering quiz source content.
- Integrate an AI-powered “quizGenerator” Lambda to produce high-quality, varied quiz questions.
- Offer a gamified quiz-taking experience with feedback and scoring.
- Deploy as a fully serverless solution using AWS Amplify for auth, API, storage, and compute.
- Establish CI/CD through Amplify Console for automated builds and deployments.

## Scope

### In Scope

- Front-end application built with React, TypeScript, and Vite.
- AWS Amplify backend (Cognito Auth, AppSync GraphQL API, S3 storage, Lambda functions).
- AI integration via serverless Lambda quizGenerator function.
- User flows for login, quiz creation, editing, and quiz attempt.
- Custom loaders and theming (CSS/SCSS).
- CI/CD configuration (amplify.yml).

### Out of Scope

- Detailed analytics or reporting beyond basic scoring.
- Multi-language support (initial release will be English only).
- Offline functionality.
- Enterprise deployment features (e.g., single-sign-on, advanced RBAC).
