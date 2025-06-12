# System Patterns

## System Architecture
- The system is built using a React frontend and Amplify backend.
- Main components include quiz creation, quiz attempt, authentication, and data storage.
- Components interact through API calls and state management.

## Key Technical Decisions
- Decided to use React for its component-based architecture and ease of development.
- Chose Amplify for authentication and data storage due to its scalability and integration capabilities.
- Implemented loaders to enhance user experience based on feedback.

## Design Patterns in Use
- Component-based architecture in React.
- State management using React hooks and context.
- API integration with Amplify.

## Component Relationships
- Quiz creation and attempt components interact with authentication and data storage components.
- Loaders are used within various components to improve user experience.
- Components communicate through API calls and state management.

## Critical Implementation Paths
- Quiz creation: Users can create quizzes, which are stored in the backend.
- Quiz attempt: Users can attempt quizzes, with their progress tracked and stored.
- Authentication: Users can sign up, log in, and manage their accounts securely.
- Data storage: Quiz data and user information are stored and managed using Amplify.
