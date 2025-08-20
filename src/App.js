import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WhiteboardProvider } from './contexts/WhiteboardContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import Whiteboard from './components/Whiteboard/Whiteboard';
import { useAuth } from './contexts/AuthContext';



// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Auth Route Component
const AuthRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Routes
const AppRoutes = () => {
  return (
    <Routes>
      {/* Direct test route - bypass everything */}
      <Route path="/test" element={
        <div style={{ padding: '20px', backgroundColor: 'orange', color: 'white', fontSize: '24px' }}>
          🧪 DIRECT TEST - This should definitely work!
          <br />
          If you see this orange background, React is working.
        </div>
      } />
      
      {/* Auth Routes */}
      <Route path="/auth" element={
        <AuthRoute>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Whiteboard</h1>
                  <p className="text-gray-600">Collaborate, create, and share your ideas</p>
                </div>
                <Register />
                <div className="mt-6 text-center">
                  <p className="text-gray-600">Already have an account?</p>
                  <Login />
                </div>
              </div>
            </div>
          </div>
        </AuthRoute>
      } />
      
      {/* Protected Routes with Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="whiteboard/:id" element={<Whiteboard />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <div>
      <AuthProvider>
        <WhiteboardProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </WhiteboardProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
