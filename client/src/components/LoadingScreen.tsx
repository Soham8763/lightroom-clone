import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const LoadingScreen: React.FC = () => {
  return (
    <LoadingContainer>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
        Loading...
      </Typography>
    </LoadingContainer>
  );
};

export default LoadingScreen;
