import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WhiteboardContext = createContext();

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (!context) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
};

export const WhiteboardProvider = ({ children }) => {
  const [whiteboards, setWhiteboards] = useState([]);
  const [currentWhiteboard, setCurrentWhiteboard] = useState(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load whiteboards from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedWhiteboards = localStorage.getItem(`whiteboards_${user.id}`);
      if (savedWhiteboards) {
        try {
          const parsed = JSON.parse(savedWhiteboards);
          setWhiteboards(parsed);
        } catch (error) {
          console.error('Error parsing saved whiteboards:', error);
        }
      }
    }
  }, [user]);

  // Save whiteboards to localStorage whenever they change
  useEffect(() => {
    if (user && whiteboards.length > 0) {
      localStorage.setItem(`whiteboards_${user.id}`, JSON.stringify(whiteboards));
    }
  }, [whiteboards, user]);

  // Save elements to localStorage whenever they change
  useEffect(() => {
    if (user && currentWhiteboard && elements.length >= 0) {
      // Add a small delay to prevent interference with state updates
      const timeoutId = setTimeout(() => {
        console.log('Saving elements to localStorage:', elements);
        localStorage.setItem(`elements_${currentWhiteboard.id}`, JSON.stringify(elements));
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [elements, currentWhiteboard, user]);

  const createWhiteboard = async (title, description, isPublic = false) => {
    if (!user) {
      return { success: false, error: 'You must be logged in to create a whiteboard' };
    }

    const newWhiteboard = {
      id: `wb-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic,
      owner: { id: user.id, name: user.name, email: user.email },
      collaborators: [
        { id: user.id, name: user.name, email: user.email, role: 'owner' }
      ],
      invitedEmails: []
    };

    setWhiteboards(prev => [newWhiteboard, ...prev]);
    return { success: true, whiteboard: newWhiteboard };
  };

  const updateWhiteboard = async (id, updates) => {
    setWhiteboards(prev => 
      prev.map(wb => 
        wb.id === id 
          ? { ...wb, ...updates, updatedAt: new Date().toISOString() }
          : wb
      )
    );
    return { success: true };
  };

  const deleteWhiteboard = async (id) => {
    setWhiteboards(prev => prev.filter(wb => wb.id !== id));
    if (currentWhiteboard?.id === id) {
      setCurrentWhiteboard(null);
      setElements([]);
    }
    // Remove elements from localStorage
    localStorage.removeItem(`elements_${id}`);
    return { success: true };
  };

  const getWhiteboard = async (id) => {
    console.log('getWhiteboard called with ID:', id);
    console.log('Available whiteboards:', whiteboards);
    
    const whiteboard = whiteboards.find(wb => wb.id === id);
    console.log('Found whiteboard:', whiteboard);
    
    if (whiteboard) {
      setCurrentWhiteboard(whiteboard);
      
      // Load elements for this whiteboard
      const savedElements = localStorage.getItem(`elements_${id}`);
      if (savedElements) {
        try {
          const parsed = JSON.parse(savedElements);
          console.log('Loading saved elements:', parsed);
          setElements(parsed);
        } catch (error) {
          console.error('Error parsing saved elements:', error);
          setElements([]);
        }
      } else {
        console.log('No saved elements found, starting with empty array');
        setElements([]);
      }
      
      return { success: true, whiteboard };
    }
    
    console.error('Whiteboard not found with ID:', id);
    return { success: false, error: 'Whiteboard not found' };
  };

  const addElement = useCallback((element) => {
    // Use a more stable ID generation to prevent flickering
    const newElement = {
      ...element,
      id: element.id || `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    console.log('Adding element:', newElement);
    
    // Use functional update to prevent race conditions
    setElements(prev => {
      console.log('Current elements before adding:', prev);
      
      // Check if element with this ID already exists to prevent duplicates
      const exists = prev.find(el => el.id === newElement.id);
      if (exists) {
        console.log('Element already exists, not adding duplicate');
        return prev;
      }
      
      const updated = [...prev, newElement];
      console.log('Elements after adding:', updated);
      return updated;
    });
    
    return newElement;
  }, []); // No dependencies to prevent recreation

  const updateElement = (id, updates) => {
    setElements(prev => 
      prev.map(el => 
        el.id === id 
          ? { ...el, ...updates, updatedAt: new Date().toISOString() }
          : el
      )
    );
  };

  const deleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const inviteTeamMember = async (whiteboardId, email) => {
    if (!user) {
      return { success: false, error: 'You must be logged in to invite team members' };
    }

    const whiteboard = whiteboards.find(wb => wb.id === whiteboardId);
    if (!whiteboard) {
      return { success: false, error: 'Whiteboard not found' };
    }

    // Check if user is owner or collaborator
    const userRole = whiteboard.collaborators.find(c => c.id === user.id);
    if (!userRole || userRole.role === 'viewer') {
      return { success: false, error: 'You do not have permission to invite team members' };
    }

    // Add email to invited list if not already there
    if (!whiteboard.invitedEmails.includes(email.toLowerCase())) {
      const updatedWhiteboard = {
        ...whiteboard,
        invitedEmails: [...whiteboard.invitedEmails, email.toLowerCase()],
        updatedAt: new Date().toISOString()
      };

      setWhiteboards(prev => 
        prev.map(wb => wb.id === whiteboardId ? updatedWhiteboard : wb)
      );

      if (currentWhiteboard?.id === whiteboardId) {
        setCurrentWhiteboard(updatedWhiteboard);
      }

      return { success: true, message: `Invitation sent to ${email}` };
    }

    return { success: false, error: 'User already invited' };
  };

  const removeTeamMember = async (whiteboardId, memberId) => {
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    const whiteboard = whiteboards.find(wb => wb.id === whiteboardId);
    if (!whiteboard) {
      return { success: false, error: 'Whiteboard not found' };
    }

    // Check if user is owner
    const userRole = whiteboard.collaborators.find(c => c.id === user.id);
    if (!userRole || userRole.role !== 'owner') {
      return { success: false, error: 'Only owners can remove team members' };
    }

    const updatedWhiteboard = {
      ...whiteboard,
      collaborators: whiteboard.collaborators.filter(c => c.id !== memberId),
      updatedAt: new Date().toISOString()
    };

    setWhiteboards(prev => 
      prev.map(wb => wb.id === whiteboardId ? updatedWhiteboard : wb)
    );

    if (currentWhiteboard?.id === whiteboardId) {
      setCurrentWhiteboard(updatedWhiteboard);
    }

    return { success: true, message: 'Team member removed' };
  };

  const value = {
    whiteboards,
    currentWhiteboard,
    elements,
    loading,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    getWhiteboard,
    addElement,
    updateElement,
    deleteElement,
    inviteTeamMember,
    removeTeamMember
  };

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};
