# AWS Amplify React+Vite Quiz Application

This repository provides a robust template for creating quiz applications using React, Vite, and AWS Amplify Gen2. It emphasizes secure authentication, scalable API integration, and efficient data storage, tailored for educators and students.

## Overview

This project aims to deliver a reliable and user-friendly quiz creation and attempt application. It leverages AWS Amplify Gen2 for backend services, ensuring secure authentication and data storage, while providing an intuitive user experience with enhanced UI components.

## Features

- **Quiz Creation**: Users can create quizzes using a large language model, called from a Lambda function, which auto-generates quiz content. The quizzes are securely stored in the backend.
- **Quiz Attempt**: Users can attempt quizzes, with progress tracked and stored.
- **Authentication**: Secure user authentication using Amplify Gen2.
- **API Integration**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **User Interface**: Enhanced with loaders for improved user experience.

## Code Structure

The code is organized into several key directories and files, particularly within the `amplify` directory, which handles backend services:

- **auth/**: Contains resources related to user authentication.
- **data/**: Manages data resources, including database configurations.
- **functions/**: Includes Lambda functions, such as the quiz generator that utilizes a large language model for auto-generating quiz content.
- **storage/**: Handles storage resources, including configurations for storing quiz data.
- **backend.ts**: Defines the backend setup, integrating authentication, data, quiz generation, and storage services.

## Technologies Used

- **React**: For building the frontend components.
- **Amplify Gen2**: For authentication and data storage.
- **TypeScript**: For type safety and improved development experience.
- **Vite**: For fast development and build processes.

## Development Setup

1. Install Node.js and npm.
2. Clone the repository.
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to start the development server.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of the Aplify documentation.

## Current Status

- Quiz creation functionality is implemented and working.
- Amplify authentication and data storage are integrated and functional.
- User interface enhancements with loaders are successfully implemented.
- Final stages of development focusing on quiz attempt functionality and performance optimization.

## Known Issues

- Performance optimizations are needed for large datasets.
- Thorough testing and debugging are required to ensure stability.

## License

This library is licensed under the MIT-0 License. See the LICENSE file for more information.
