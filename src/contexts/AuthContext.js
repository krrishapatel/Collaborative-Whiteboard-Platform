import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already registered on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('whiteboard_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('whiteboard_user');
      }
    }
    setLoading(false);
  }, []);

  const register = async (name, email) => {
    try {
      // Create a new user
      const newUser = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`,
        createdAt: new Date().toISOString(),
        role: 'user'
      };

      // Save to localStorage (in a real app, this would go to a database)
      localStorage.setItem('whiteboard_user', JSON.stringify(newUser));
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const login = async (email) => {
    try {
      // Check if user exists in localStorage
      const savedUser = localStorage.getItem('whiteboard_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.email.toLowerCase() === email.toLowerCase()) {
          setUser(userData);
          setIsAuthenticated(true);
          return { success: true, user: userData };
        }
      }
      
      return { success: false, error: 'User not found. Please register first.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('whiteboard_user');
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('whiteboard_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Profile update failed' };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    register,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
