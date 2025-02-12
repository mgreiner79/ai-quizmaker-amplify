import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateQuiz />} />
      <Route path="/edit/:quizId" element={<EditQuiz />} />
      {/* Future routes (e.g. quiz play, quiz view, etc.) can be added here */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
