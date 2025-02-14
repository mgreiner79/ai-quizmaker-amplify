// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Destructure 'user' and 'route' from the authenticator context.
  // The `route` property indicates the current auth state.
  const { user, route } = useAuthenticator((context) => [context.user, context.route]);

  // If the user is not authenticated, redirect to the login page.
  if (route !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
