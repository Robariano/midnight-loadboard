import React from 'react';
import { AppBar, Box, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export const Header: React.FC = () => (
  <AppBar
    position="static"
    data-testid="header"
    sx={{
      background: 'linear-gradient(90deg, #0a0a1a 0%, #111128 100%)',
      borderBottom: '1px solid #2a2a4a',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: 'none',
      px: 4,
      py: 1.5,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <LocalShippingIcon sx={{ color: '#7c6af7', fontSize: 32 }} />
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px' }}>
          Midnight Lace
        </Typography>
        <Typography variant="caption" sx={{ color: '#7c6af7', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
          Loadboard
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 6px #4caf50' }} />
      <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
        Standalone
      </Typography>
    </Box>
  </AppBar>
);
