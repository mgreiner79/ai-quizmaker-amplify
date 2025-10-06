// src/app/AuthedLayout.tsx
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
export default function AuthedLayout() {
  return (
    <Box>
      {/* AppBar / Nav goes here */}
      <Outlet />
    </Box>
  );
}
