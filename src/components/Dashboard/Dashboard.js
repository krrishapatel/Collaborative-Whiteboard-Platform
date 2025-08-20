import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhiteboard } from '../../contexts/WhiteboardContext';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { whiteboards, createWhiteboard, deleteWhiteboard, inviteTeamMember } = useWhiteboard();
  const { user, logout } = useAuth();
  
  // Debug: Log whiteboards when they change
  useEffect(() => {
    console.log('Dashboard: Whiteboards loaded:', whiteboards);
  }, [whiteboards]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWhiteboard, setNewWhiteboard] = useState({ title: '', description: '', isPublic: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingTo, setInvitingTo] = useState(null);

  const handleCreateWhiteboard = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!newWhiteboard.title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    try {
      const result = await createWhiteboard(
        newWhiteboard.title,
        newWhiteboard.description,
        newWhiteboard.isPublic
      );

      if (result.success) {
        setShowCreateForm(false);
        setNewWhiteboard({ title: '', description: '', isPublic: false });
        // Navigate to the new whiteboard
        navigate(`/whiteboard/${result.whiteboard.id}`);
      } else {
        setError(result.error || 'Failed to create whiteboard');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteTeamMember = async (whiteboardId, email) => {
    console.log('handleInviteTeamMember called with:', whiteboardId, email);
    
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      console.log('Calling inviteTeamMember from context...');
      const result = await inviteTeamMember(whiteboardId, email);
      console.log('inviteTeamMember result:', result);
      
      if (result.success) {
        setInviteEmail('');
        setInvitingTo(null);
        setError('');
        setSuccess('Invitation sent to ' + email + '!');
        // Show success message
        alert(`Invitation sent to ${email}!`);
      } else {
        setError(result.error || 'Failed to invite team member');
      }
    } catch (error) {
      console.error('Error in handleInviteTeamMember:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleDeleteWhiteboard = async (whiteboardId) => {
    if (window.confirm('Are you sure you want to delete this whiteboard? This action cannot be undone.')) {
      try {
        await deleteWhiteboard(whiteboardId);
        // The whiteboards list will automatically update through the context
      } catch (error) {
        console.error('Error deleting whiteboard:', error);
        setError('Failed to delete whiteboard');
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Whiteboard Dashboard</h1>
              <span className="text-sm text-gray-500">Welcome, {user.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Whiteboard */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Whiteboards</h2>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setError('');
                setSuccess('');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              {showCreateForm ? 'Cancel' : 'Create New Whiteboard'}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Whiteboard</h3>
              <form onSubmit={handleCreateWhiteboard} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newWhiteboard.title}
                    onChange={(e) => setNewWhiteboard({ ...newWhiteboard, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter whiteboard title"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newWhiteboard.description}
                    onChange={(e) => setNewWhiteboard({ ...newWhiteboard, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter whiteboard description"
                    rows="3"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newWhiteboard.isPublic}
                    onChange={(e) => setNewWhiteboard({ ...newWhiteboard, isPublic: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                    Make this whiteboard public
                  </label>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                    {success}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Whiteboard'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Whiteboards List */}
        {whiteboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No whiteboards yet</h3>
            <p className="text-gray-500 mb-4">Create your first whiteboard to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Create Whiteboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whiteboards.map((whiteboard) => (
              <div key={whiteboard.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{whiteboard.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      whiteboard.isPublic 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {whiteboard.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  
                  {whiteboard.description && (
                    <p className="text-gray-600 text-sm mb-4">{whiteboard.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Created: {new Date(whiteboard.createdAt).toLocaleDateString()}</p>
                    <p>Collaborators: {whiteboard.collaborators.length}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {whiteboard.collaborators.map((collaborator) => (
                      <span
                        key={collaborator.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {collaborator.name}
                        {collaborator.role === 'owner' && (
                          <span className="ml-1 text-blue-600">👑</span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/whiteboard/${whiteboard.id}`)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Open
                    </button>
                    
                    {whiteboard.owner.id === user.id && (
                      <button
                        onClick={() => setInvitingTo(whiteboard.id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Invite
                      </button>
                    )}
                    
                    {whiteboard.owner.id === user.id && (
                      <button
                        onClick={() => handleDeleteWhiteboard(whiteboard.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Team Member Invitation */}
                  {invitingTo === whiteboard.id && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="flex space-x-2">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleInviteTeamMember(whiteboard.id, inviteEmail)}
                          className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => {
                            setInvitingTo(null);
                            setInviteEmail('');
                          }}
                          className="bg-gray-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
