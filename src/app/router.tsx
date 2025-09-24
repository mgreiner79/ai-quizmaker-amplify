import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthedLayout from './AuthedLayout';

const Home = lazy(() => import('@/features/quiz/routes/Home'));
const CreateQuiz = lazy(() => import('@/features/quiz/routes/CreateQuiz'));
const EditQuiz = lazy(() => import('@/features/quiz/routes/EditQuiz'));
const QuizAttempt = lazy(() => import('@/pages/QuizAttempt'));
const LoginPage = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/app/NotFound'));

const Fallback = () => <div style={{ padding: 24 }}>Loading...</div>;

export function AppRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/quiz/:id" element={<QuizAttempt />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateQuiz />} />
            <Route path="/edit/:id" element={<EditQuiz />} />
          </Route>
        </Route>
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
