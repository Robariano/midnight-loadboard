import React from 'react';
import { Box } from '@mui/material';
import { Header } from './Header';

export const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
    <Header />
    <Box sx={{ flex: 1, px: { xs: 2, sm: 4, md: 8 }, py: 4, maxWidth: 900, mx: 'auto', width: '100%' }}>
      {children}
    </Box>
  </Box>
);
