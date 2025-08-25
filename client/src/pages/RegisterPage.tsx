import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Container,
  Fade,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { PhotoLibrary } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const RegisterContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2),
  background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, #0d1421 100%)`,
}));

const RegisterCard = styled(Card)(({ theme }) => ({
  maxWidth: 500,
  width: '100%',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[10],
  borderRadius: theme.spacing(2),
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
  '& .logo-icon': {
    fontSize: '3rem',
    color: theme.palette.primary.main,
    marginRight: theme.spacing(1),
  },
}));

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Clear submit error
    if (submitError) setSubmitError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await register({
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });
      
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      setSubmitError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RegisterContainer maxWidth={false}>
      <Fade in timeout={800}>
        <RegisterCard>
          <CardContent>
            <LogoBox>
              <PhotoLibrary className="logo-icon" />
              <Typography variant="h4" component="h1" fontWeight={600}>
                Lightroom Clone
              </Typography>
            </LogoBox>
            
            <Typography
              variant="h5"
              component="h2"
              align="center"
              gutterBottom
              sx={{ mb: 3 }}
            >
              Create Account
            </Typography>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  mb: 2,
                }}
              >
                <TextField
                  fullWidth
                  name="firstName"
                  label="First Name"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="given-name"
                />
                <TextField
                  fullWidth
                  name="lastName"
                  label="Last Name"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="family-name"
                />
              </Box>

              <TextField
                fullWidth
                margin="normal"
                name="username"
                label="Username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="username"
                error={!!errors.username}
                helperText={errors.username}
                autoFocus
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                margin="normal"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                margin="normal"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{
                  mb: 2,
                  height: 48,
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Create Account'
                )}
              </Button>

              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/login"
                    color="primary"
                    underline="hover"
                    fontWeight={500}
                  >
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </RegisterCard>
      </Fade>
    </RegisterContainer>
  );
};

export default RegisterPage;
