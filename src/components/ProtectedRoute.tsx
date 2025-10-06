// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

export default function ProtectedRoute() {
  const { user, route } = useAuthenticator((c) => [c.user, c.route]);
  const location = useLocation();
  const isAuthed = route === 'authenticated' && !!user;

  if (!isAuthed) {
    // Preserve intended destination so login can send the user back
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
