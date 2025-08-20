import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWhiteboard } from '../../contexts/WhiteboardContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

const Whiteboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [selectedTool, setSelectedTool] = useState('brush'); // Default to brush
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  
  // New state for enhanced tools
  const [brushType, setBrushType] = useState('round'); // round, square, calligraphy
  const [opacity, setOpacity] = useState(1);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  
  // Multi-select and drag state
  const [selectedElements, setSelectedElements] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [draggedElements, setDraggedElements] = useState(new Map());
  const [isDragging, setIsDragging] = useState(false);
  
  // Sticky note editing state
  const [editingNote, setEditingNote] = useState(null);
  const [editingText, setEditingText] = useState('');
  
  // Delete tool state
  const [isDeleteDragging, setIsDeleteDragging] = useState(false);
  const [deleteStartPos, setDeleteStartPos] = useState(null);
  
  // Resize state
  const [resizeStartPos, setResizeStartPos] = useState(null);
  const [resizeElement, setResizeElement] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);

  
  const { getWhiteboard, currentWhiteboard, addElement, elements, setElements, deleteElement } = useWhiteboard();
  const { joinRoom, leaveRoom, activeUsers } = useSocket();
  const { user } = useAuth();

  // Debug: Log when elements change
  useEffect(() => {
    console.log('Elements changed in Whiteboard component:', elements);
  }, [elements]);

  // Auto-redirect if whiteboard fails to load
  useEffect(() => {
    if (!currentWhiteboard) {
      const timer = setTimeout(() => {
        console.log('Whiteboard failed to load, redirecting to dashboard');
        navigate('/dashboard');
      }, 3000); // Wait 3 seconds before redirecting
      
      return () => clearTimeout(timer);
    }
  }, [currentWhiteboard, navigate]);

  // Load whiteboard and join room
  useEffect(() => {
    if (id) {
      console.log('Whiteboard component: Loading whiteboard with ID:', id);
      getWhiteboard(id);
      joinRoom(id);
      
      return () => {
        leaveRoom();
      };
    }
  }, [id]); // Remove function dependencies that cause re-runs

  // Initialize canvas when component mounts
  useEffect(() => {
    // Initialize canvas when component mounts
    const timer = setTimeout(() => {
      initializeCanvas();
    }, 100); // Small delay to ensure DOM is ready
    
    // Handle window resize
    const handleResize = () => {
      setTimeout(initializeCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update canvas properties when they change
  useEffect(() => {
    if (canvas && canvas.ctx) {
      canvas.ctx.strokeStyle = color;
      canvas.ctx.lineWidth = brushSize;
    }
  }, [canvas, color, brushSize]);

  // Initialize canvas with proper dimensions
  const initializeCanvas = () => {
    if (canvasRef.current && containerRef.current) {
      const canvasElement = canvasRef.current;
      const container = containerRef.current;
      
      // Get the full container dimensions
      const containerRect = container.getBoundingClientRect();
      
      // Set canvas size to fill the entire container
      canvasElement.width = containerRect.width;
      canvasElement.height = containerRect.height;
      
      // Also set CSS dimensions to match
      canvasElement.style.width = containerRect.width + 'px';
      canvasElement.style.height = containerRect.height + 'px';
      
      console.log('Canvas initialized:', containerRect.width, 'x', containerRect.height);
      
      const ctx = canvasElement.getContext('2d');
      
      // Set drawing properties
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      
      const newCanvas = {
        element: canvasElement,
        width: containerRect.width,
        height: containerRect.height,
        ctx: ctx
      };
      
      setCanvas(newCanvas);
    }
  };

  if (!currentWhiteboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Whiteboard</h2>
          <p className="text-gray-600 mb-4">Please wait while we prepare your collaborative space...</p>
          <p className="text-sm text-gray-500">If this takes too long, you'll be redirected to the dashboard.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getMousePos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Get position relative to the canvas container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Ensure position is within canvas bounds
    const boundedX = Math.max(0, Math.min(x, rect.width));
    const boundedY = Math.max(0, Math.min(y, rect.height));
    
    return { x: boundedX, y: boundedY };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    console.log('Mouse down at:', pos);
    console.log('Selected tool:', selectedTool);
    
    // Prevent action if position is invalid
    if (pos.x === 0 && pos.y === 0) return;
    
    if (selectedTool === 'select') {
      // Check if clicking on an element first
      const clickedElement = findElementAtPosition(pos);
      if (clickedElement) {
        // Select the clicked element
        selectElement(clickedElement.id, e.ctrlKey || e.metaKey);
        return;
      }
      
      // Start selection or dragging
      setIsSelecting(true);
      setSelectionStart(pos);
      setSelectionEnd(pos);
      return;
    }
    
    if (selectedTool === 'sticky') {
      // Place sticky note immediately
      console.log('Placing sticky note at:', pos);
      placeStickyNoteAtPosition(pos.x, pos.y);
      return;
    }
    
    if (['rectangle', 'circle', 'arrow', 'line', 'text'].includes(selectedTool)) {
      // Place shape immediately
      console.log('Placing shape at:', pos);
      placeShapeAtPosition(pos.x, pos.y, selectedTool);
      return;
    }
    
    if (selectedTool === 'brush' && canvas) {
      setIsDrawing(true);
      setLastPoint(pos);
      
      // Start a new path
      canvas.ctx.beginPath();
      canvas.ctx.moveTo(pos.x, pos.y);
      
      console.log('Started drawing at:', pos);
    }
    
    if (selectedTool === 'eraser' && canvas) {
      // Eraser functionality
      const ctx = canvas.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    
    if (selectedTool === 'delete') {
      // Start delete dragging
      setIsDeleteDragging(true);
      setDeleteStartPos(pos);
      return;
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    
    if (isSelecting && selectedTool === 'select') {
      // Update selection box
      setSelectionEnd(pos);
    }
    
    if (isDragging) {
      // Update dragged elements
      updateDraggedElements(pos);
    }
    
    if (isResizing) {
      // Update resize
      updateResize(pos);
    }
    
    if (isDeleteDragging && selectedTool === 'delete') {
      // Handle delete dragging - erase parts of shapes
      handleDeleteDrag(pos);
    }
    
    if (isDrawing && selectedTool === 'brush' && canvas && lastPoint) {
      // Use enhanced brush drawing
      drawBrushStroke(canvas.ctx, lastPoint, pos, brushType, brushSize, color, opacity);
      
      // Add element to state for persistence
      addElement({
        type: 'brush-stroke',
        start: { x: lastPoint.x, y: lastPoint.y },
        end: { x: pos.x, y: pos.y },
        brushType,
        color,
        brushSize,
        opacity,
        userId: user?.id,
        timestamp: Date.now()
      });
      
      setLastPoint(pos);
      console.log('Drawing to:', pos);
    }
  };

  const handleMouseUp = (e) => {
    if (isSelecting && selectedTool === 'select') {
      // Finish selection
      if (selectionStart && selectionEnd) {
        selectElementsInBox(selectionStart, selectionEnd);
      }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    if (isDragging) {
      // Finish dragging
      finishDragging();
    }
    
    if (isResizing) {
      // Finish resizing
      finishResize();
    }
    
    if (isDeleteDragging) {
      // Finish delete dragging
      setIsDeleteDragging(false);
      setDeleteStartPos(null);
    }
    
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      console.log('Stopped drawing');
    }
  };

  const clearCanvas = () => {
    if (canvas && canvas.ctx) {
      // Clear the visual canvas
      canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Clear all elements by deleting them one by one
      elements.forEach(element => {
        if (element.id) {
          // Use the deleteElement function from context
          deleteElement(element.id);
        }
      });
      
      // Clear any selections
      setSelectedElements(new Set());
      setSelectedElement(null);
      
      console.log('Canvas and all elements cleared');
    }
  };

  const findElementAtPosition = (pos) => {
    // Check elements in reverse order (top to bottom) to find the topmost element
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'sticky') {
        // Check if click is within sticky note bounds
        if (pos.x >= element.x && pos.x <= element.x + 128 && 
            pos.y >= element.y && pos.y <= element.y + 128) {
          return element;
        }
      } else if (element.type === 'rectangle' || element.type === 'circle') {
        // Check if click is within shape bounds
        if (pos.x >= element.x && pos.x <= element.x + (element.width || 100) && 
            pos.y >= element.y && pos.y <= element.y + (element.height || 100)) {
          return element;
        }
      } else if (element.type === 'brush-stroke') {
        // For brush strokes, check if click is near the line
        const distance = distanceToLine(pos, element.start, element.end);
        if (distance <= (element.brushSize || 3) + 5) { // Add some tolerance
          return element;
        }
      }
    }
    return null;
  };

  const distanceToLine = (point, lineStart, lineEnd) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleDeleteDrag = (currentPos) => {
    if (!deleteStartPos) return;
    
    // Check if we're dragging over any shapes to erase parts
    elements.forEach(element => {
      if (['rectangle', 'circle', 'arrow', 'line', 'text'].includes(element.type)) {
        // Check if delete path intersects with the shape
        if (isDeletePathIntersectingShape(deleteStartPos, currentPos, element)) {
          // Erase part of the shape by creating a "hole"
          erasePartOfShape(element, deleteStartPos, currentPos);
        }
      }
    });
    
    // Update start position for next frame
    setDeleteStartPos(currentPos);
  };

  const isDeletePathIntersectingShape = (start, end, shape) => {
    if (shape.type === 'arrow' || shape.type === 'line') {
      // For arrows and lines, check if delete path intersects the line
      return lineIntersectsLine(start, end, 
        { x: shape.x, y: shape.y }, 
        { x: shape.x + (shape.width || 50), y: shape.y + (shape.height || 50) }
      );
    } else if (shape.type === 'text') {
      // For text, check if delete path intersects the text bounds
      const textBounds = {
        left: shape.x,
        right: shape.x + 100, // Approximate text width
        top: shape.y,
        bottom: shape.y + 30  // Approximate text height
      };
      return lineIntersectsRect(start, end, textBounds);
    } else {
      // For rectangles and circles, check if delete path intersects with the shape bounds
      const shapeBounds = {
        left: shape.x,
        right: shape.x + (shape.width || 100),
        top: shape.y,
        bottom: shape.y + (shape.height || 100)
      };
      return lineIntersectsRect(start, end, shapeBounds);
    }
  };

  const lineIntersectsRect = (start, end, rect) => {
    // Check if line segment intersects with rectangle
    const lines = [
      { x1: rect.left, y1: rect.top, x2: rect.right, y2: rect.top },     // Top
      { x1: rect.right, y1: rect.top, x2: rect.right, y2: rect.bottom }, // Right
      { x1: rect.right, y1: rect.bottom, x2: rect.left, y2: rect.bottom }, // Bottom
      { x1: rect.left, y1: rect.bottom, x2: rect.left, y2: rect.top }    // Left
    ];
    
    for (const line of lines) {
      if (linesIntersect(start, end, { x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 })) {
        return true;
      }
    }
    return false;
  };

  const linesIntersect = (p1, p2, p3, p4) => {
    const det = (a, b, c, d) => a * d - b * c;
    const delta = det(p2.x - p1.x, p4.x - p3.x, p2.y - p1.y, p4.y - p3.y);
    
    if (delta === 0) return false;
    
    const s = det(p4.x - p3.x, p4.x - p1.x, p4.y - p3.y, p4.y - p1.y) / delta;
    const t = det(p2.x - p1.x, p4.x - p1.x, p2.y - p1.y, p4.y - p1.y) / delta;
    
    return s >= 0 && s <= 1 && t >= 0 && t <= 1;
  };

  const lineIntersectsLine = (p1, p2, p3, p4) => {
    const uA = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
    const uB = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));

    return uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1;
  };

  const erasePartOfShape = (shape, start, end) => {
    // For now, we'll just delete the entire shape if it's intersected
    // In a more advanced implementation, you could create complex shapes with holes
    console.log('Erasing part of shape:', shape.id);
    
    // Delete the entire shape for now
    deleteElement(shape.id);
  };

  const startResize = (element, handle, startPos) => {
    setIsResizing(true);
    setResizeElement(element);
    setResizeHandle(handle);
    setResizeStartPos(startPos);
  };

  const updateResize = (currentPos) => {
    if (!isResizing || !resizeElement || !resizeStartPos) return;
    
    const deltaX = currentPos.x - resizeStartPos.x;
    const deltaY = currentPos.y - resizeStartPos.y;
    
    // Update element dimensions based on handle
    const updatedElement = { ...resizeElement };
    
    switch (resizeHandle) {
      case 'nw': // top-left
        updatedElement.x += deltaX;
        updatedElement.y += deltaY;
        updatedElement.width = Math.max(20, updatedElement.width - deltaX);
        updatedElement.height = Math.max(20, updatedElement.height - deltaY);
        break;
      case 'ne': // top-right
        updatedElement.y += deltaY;
        updatedElement.width = Math.max(20, updatedElement.width + deltaX);
        updatedElement.height = Math.max(20, updatedElement.height - deltaY);
        break;
      case 'sw': // bottom-left
        updatedElement.x += deltaX;
        updatedElement.width = Math.max(20, updatedElement.width - deltaX);
        updatedElement.height = Math.max(20, updatedElement.height + deltaY);
        break;
      case 'se': // bottom-right
        updatedElement.width = Math.max(20, updatedElement.width + deltaX);
        updatedElement.height = Math.max(20, updatedElement.height + deltaY);
        break;
      case 'n': // top
        updatedElement.y += deltaY;
        updatedElement.height = Math.max(20, updatedElement.height - deltaY);
        break;
      case 's': // bottom
        updatedElement.height = Math.max(20, updatedElement.height + deltaY);
        break;
      case 'e': // right
        updatedElement.width = Math.max(20, updatedElement.width + deltaX);
        break;
      case 'w': // left
        updatedElement.x += deltaX;
        updatedElement.width = Math.max(20, updatedElement.width - deltaX);
        break;
    }
    
    // Update the element in the context
    // For now, we'll just update the local state
    const elementIndex = elements.findIndex(el => el.id === resizeElement.id);
    if (elementIndex !== -1) {
      const newElements = [...elements];
      newElements[elementIndex] = updatedElement;
      // You might want to call updateElement from context here
    }
    
    setResizeElement(updatedElement);
  };

  const finishResize = () => {
    setIsResizing(false);
    setResizeElement(null);
    setResizeHandle(null);
    setResizeStartPos(null);
  };

  const handleStickyNoteDoubleClick = (element) => {
    setEditingNote(element.id);
    setEditingText(element.text);
  };

  const handleStickyNoteSave = (elementId) => {
    // Update the element text
    const updatedElement = elements.find(el => el.id === elementId);
    if (updatedElement) {
      updatedElement.text = editingText;
      // You might want to call updateElement from context here
      console.log('Updated sticky note text:', editingText);
    }
    
    // Exit editing mode
    setEditingNote(null);
    setEditingText('');
  };

  const handleStickyNoteCancel = () => {
    setEditingNote(null);
    setEditingText('');
  };

  const addStickyNote = () => {
    // Set sticky note as the current tool
    setSelectedTool('sticky');
  };

  const placeStickyNoteAtPosition = (x, y) => {
    console.log('placeStickyNoteAtPosition called with:', x, y);
    const note = {
      type: 'sticky',
      x: Math.max(0, x - 64), // Ensure note doesn't go off-screen
      y: Math.max(0, y - 64),
      text: 'Double-click to edit',
      color: '#fef3c7',
      userId: user?.id,
      id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // More stable ID
    };
    console.log('Created note with position:', note.x, note.y);
    
    // Add element and ensure it's added to the state
    const addedElement = addElement(note);
    console.log('Added element result:', addedElement);
    
    // Keep the sticky note tool selected - don't switch back to brush
    // setSelectedTool('brush');
  };

  const addShape = (shapeType) => {
    // Set shape as the current tool
    setSelectedTool(shapeType);
  };

  const placeShapeAtPosition = (x, y, shapeType) => {
    console.log('placeShapeAtPosition called with:', x, y, shapeType);
    
    let shape;
    
    switch (shapeType) {
      case 'rectangle':
        shape = {
          type: 'rectangle',
          x: Math.max(0, x - 50),
          y: Math.max(0, y - 50),
          width: 100,
          height: 100,
          color,
          fillColor,
          strokeWidth,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        break;
      case 'circle':
        shape = {
          type: 'circle',
          x: Math.max(0, x - 50),
          y: Math.max(0, y - 50),
          width: 100,
          height: 100,
          color,
          fillColor,
          strokeWidth,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        break;
      case 'arrow':
        shape = {
          type: 'arrow',
          x: Math.max(0, x - 25),
          y: Math.max(0, y - 25),
          width: 50,
          height: 50,
          color,
          strokeWidth,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        break;
      case 'line':
        shape = {
          type: 'line',
          x: Math.max(0, x - 25),
          y: Math.max(0, y - 25),
          width: 50,
          height: 50,
          color,
          strokeWidth,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        break;
      case 'text':
        shape = {
          type: 'text',
          x: Math.max(0, x - 25),
          y: Math.max(0, y - 25),
          text: 'Double click to edit',
          color,
          fontSize: 16,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        break;
      default:
        shape = {
          type: shapeType,
          x: Math.max(0, x - 50),
          y: Math.max(0, y - 50),
          width: 100,
          height: 100,
          color,
          fillColor,
          strokeWidth,
          userId: user?.id,
          id: `${shapeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }
    
    console.log('Created shape with position:', shape.x, shape.y);
    
    // Add element and ensure it's added to the state
    const addedElement = addElement(shape);
    console.log('Added element result:', addedElement);
    
    // Keep the shape tool selected - don't switch back to brush
    // setSelectedTool('brush');
  };

  // Enhanced brush drawing with different brush types
  const drawBrushStroke = (ctx, start, end, brushType, size, color, opacity) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    
    switch (brushType) {
      case 'round':
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        break;
      case 'square':
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        break;
      case 'calligraphy':
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Simulate calligraphy by varying line width
        const pressure = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.lineWidth = size * pressure;
        break;
    }
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  };

  // Multi-select and drag functions
  const selectElement = (elementId, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements(prev => {
        const newSet = new Set(prev);
        if (newSet.has(elementId)) {
          newSet.delete(elementId);
        } else {
          newSet.add(elementId);
        }
        return newSet;
      });
    } else {
      setSelectedElements(new Set([elementId]));
    }
  };

  const selectElementsInBox = (start, end) => {
    const selected = new Set();
    elements.forEach(element => {
      let elementCenter;
      
      if (element.type === 'brush-stroke') {
        // For brush strokes, use the midpoint between start and end
        elementCenter = {
          x: (element.start.x + element.end.x) / 2,
          y: (element.start.y + element.end.y) / 2
        };
      } else {
        // For shapes and notes, use center of bounding box
        elementCenter = {
          x: element.x + (element.width || 0) / 2,
          y: element.y + (element.height || 0) / 2
        };
      }
      
      if (elementCenter.x >= Math.min(start.x, end.x) &&
          elementCenter.x <= Math.max(start.x, end.x) &&
          elementCenter.y >= Math.min(start.y, end.y) &&
          elementCenter.y <= Math.max(start.y, end.y)) {
        selected.add(element.id);
      }
    });
    setSelectedElements(selected);
  };

  const startDragging = (elementId, startPos) => {
    setIsDragging(true);
    setDraggedElements(new Map([[elementId, startPos]]));
  };

  const updateDraggedElements = (currentPos) => {
    if (!isDragging) return;
    
    setDraggedElements(prev => {
      const newMap = new Map();
      prev.forEach((startPos, elementId) => {
        const deltaX = currentPos.x - startPos.x;
        const deltaY = currentPos.y - startPos.y;
        newMap.set(elementId, { deltaX, deltaY });
      });
      return newMap;
    });
  };

  const finishDragging = () => {
    if (!isDragging) return;
    
    // Update element positions
    draggedElements.forEach((delta, elementId) => {
      const element = elements.find(el => el.id === elementId);
      if (element) {
        const updatedElement = {
          ...element,
          x: element.x + delta.deltaX,
          y: element.y + delta.deltaY
        };
        // Update element in context
        // This would need to be implemented in the context
      }
    });
    
    setIsDragging(false);
    setDraggedElements(new Map());
  };

  const deleteSelectedElements = () => {
    if (selectedElements.size === 0) return;
    
    if (window.confirm(`Delete ${selectedElements.size} selected element(s)?`)) {
      selectedElements.forEach(elementId => {
        // Delete element from context
        deleteElement(elementId);
      });
      setSelectedElements(new Set());
      console.log(`Deleted ${selectedElements.size} elements`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTool('select')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'select' ? 'bg-blue-100 text-blue-600 border-2 border-blue-400' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Select & Move Elements"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedTool('brush')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'brush' ? 'bg-green-100 text-green-600 border-2 border-green-400' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Draw with Brush"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedTool('eraser')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'eraser' ? 'bg-red-100 text-red-600 border-2 border-red-400' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Eraser"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            <button
              onClick={() => setSelectedTool('delete')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'delete' ? 'bg-red-100 text-red-600 border-2 border-red-400' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Delete Tool - Drag to delete parts of shapes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          {/* Brush Type Selector */}
          {selectedTool === 'brush' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Brush:</label>
              <select
                value={brushType}
                onChange={(e) => setBrushType(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="calligraphy">Calligraphy</option>
              </select>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Fill:</label>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Size:</label>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600 w-8">{brushSize}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Opacity:</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600 w-8">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={addStickyNote}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'sticky'
                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Sticky Note"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          <button
            onClick={() => addShape('rectangle')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'rectangle'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Rectangle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
          </button>
          
          <button
            onClick={() => addShape('circle')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'circle'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </button>
          
          <button
            onClick={() => addShape('arrow')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'arrow'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Arrow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          
          <button
            onClick={() => addShape('line')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'line'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Line"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </button>
          
          <button
            onClick={() => addShape('text')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'text'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Add Text"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          
          {/* Clear Canvas Button - More prominent and different from delete */}
          <div className="border-l border-gray-300 mx-2"></div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the entire whiteboard? This action cannot be undone.')) {
                clearCanvas();
              }
            }}
            className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm transition-colors font-medium text-xs"
            title="Clear Entire Canvas"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
          
          {/* Multi-select and delete buttons */}
          {selectedElements.size > 0 && (
            <>
              <div className="border-l border-gray-300 mx-2"></div>
              <button
                onClick={deleteSelectedElements}
                className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200"
                title={`Delete ${selectedElements.size} selected element(s)`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="ml-1 text-xs">{selectedElements.size}</span>
              </button>
              
              <button
                onClick={() => setSelectedElements(new Set())}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                title="Clear selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex">
        {/* Main Canvas Container - Takes most of the screen */}
        <div 
          ref={containerRef}
          className={`flex-1 relative bg-white overflow-hidden ${
            selectedTool === 'delete' ? 'cursor-crosshair' : ''
          }`}
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          {/* Current Tool Indicator */}
          <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md z-50 border border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Tool:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                selectedTool === 'brush' ? 'bg-green-100 text-green-800' :
                selectedTool === 'select' ? 'bg-blue-100 text-blue-800' :
                selectedTool === 'eraser' ? 'bg-red-100 text-red-800' :
                selectedTool === 'delete' ? 'bg-red-100 text-red-800' :
                selectedTool === 'sticky' ? 'bg-yellow-100 text-yellow-800' :
                selectedTool === 'rectangle' ? 'bg-blue-100 text-blue-800' :
                selectedTool === 'circle' ? 'bg-blue-100 text-blue-800' :
                selectedTool === 'arrow' ? 'bg-blue-100 text-blue-800' :
                selectedTool === 'line' ? 'bg-blue-100 text-blue-800' :
                selectedTool === 'text' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedTool === 'brush' ? '🖌️ Brush' :
                 selectedTool === 'select' ? '👆 Select' :
                 selectedTool === 'eraser' ? '🧽 Eraser' :
                 selectedTool === 'delete' ? '🗑️ Delete' :
                 selectedTool === 'sticky' ? '📝 Sticky Note' :
                 selectedTool === 'rectangle' ? '⬜ Rectangle' :
                 selectedTool === 'circle' ? '⭕ Circle' :
                 selectedTool === 'arrow' ? '➡️ Arrow' :
                 selectedTool === 'line' ? '📏 Line' :
                 selectedTool === 'text' ? '📝 Text' :
                 selectedTool}
              </span>
            </div>
          </div>
          
          {/* Delete Tool Visual Feedback */}
          {isDeleteDragging && selectedTool === 'delete' && (
            <div className="absolute inset-0 pointer-events-none z-40">
              <svg className="w-full h-full">
                <line
                  x1={deleteStartPos?.x || 0}
                  y1={deleteStartPos?.y || 0}
                  x2={deleteStartPos?.x || 0}
                  y2={deleteStartPos?.y || 0}
                  stroke="red"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
              </svg>
            </div>
          )}
          
          {/* Selection Box */}
          {isSelecting && selectedTool === 'select' && selectionStart && selectionEnd && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-100 bg-opacity-20 pointer-events-none"
              style={{
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y),
                zIndex: 30
              }}
            />
          )}
          
          {/* Resize Handles for Selected Elements */}
          {selectedElements.size > 0 && elements.map(element => {
            if (selectedElements.has(element.id) && ['rectangle', 'circle', 'sticky'].includes(element.type)) {
              return (
                <div key={`resize-${element.id}`} className="absolute pointer-events-none" style={{ zIndex: 25 }}>
                  {/* Corner handles */}
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize pointer-events-auto"
                    style={{ left: element.x - 6, top: element.y - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'nw', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize pointer-events-auto"
                    style={{ left: element.x + (element.width || 100) - 6, top: element.y - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'ne', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize pointer-events-auto"
                    style={{ left: element.x - 6, top: element.y + (element.height || 100) - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'sw', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-se-resize pointer-events-auto"
                    style={{ left: element.x + (element.width || 100) - 6, top: element.y + (element.height || 100) - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'se', getMousePos(e));
                    }}
                  />
                  
                  {/* Edge handles */}
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-n-resize pointer-events-auto"
                    style={{ left: element.x + (element.width || 100) / 2 - 6, top: element.y - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'n', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-s-resize pointer-events-auto"
                    style={{ left: element.x + (element.width || 100) / 2 - 6, top: element.y + (element.height || 100) - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 's', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-e-resize pointer-events-auto"
                    style={{ left: element.x + (element.width || 100) - 6, top: element.y + (element.height || 100) / 2 - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'e', getMousePos(e));
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-w-resize pointer-events-auto"
                    style={{ left: element.x - 6, top: element.y + (element.height || 100) / 2 - 6 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(element, 'w', getMousePos(e));
                    }}
                  />
                </div>
              );
            }
            return null;
          })}
          
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 ${
              selectedTool === 'brush' ? 'cursor-crosshair' : 'cursor-pointer'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              display: 'block',
              touchAction: 'none'
            }}
          />
          
          {/* Render elements */}
          {elements.map((element) => (
            <div key={element.id} className="absolute pointer-events-none" style={{ left: 0, top: 0 }}>
              {element.type === 'sticky' && (
                <div
                  className={`w-32 h-32 bg-yellow-200 border-2 rounded-lg p-2 shadow-lg cursor-move pointer-events-auto ${
                    selectedElements.has(element.id) ? 'border-blue-500 ring-2 ring-blue-300' : 'border-yellow-400'
                  }`}
                  style={{ 
                    position: 'absolute',
                    left: `${element.x}px`, 
                    top: `${element.y}px`,
                    zIndex: 10
                  }}
                >
                  {editingNote === element.id ? (
                    // Editing mode
                    <div className="w-full h-full flex flex-col">
                      <textarea
                        className="w-full h-20 bg-transparent border-none resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        placeholder="Type here..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleStickyNoteSave(element.id);
                          } else if (e.key === 'Escape') {
                            handleStickyNoteCancel();
                          }
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <button
                          onClick={() => handleStickyNoteSave(element.id)}
                          className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleStickyNoteCancel}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div 
                      className="w-full h-full cursor-pointer"
                      onDoubleClick={() => handleStickyNoteDoubleClick(element)}
                    >
                      <div className="w-full h-full bg-transparent text-sm text-gray-800 leading-relaxed">
                        {element.text}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {element.type === 'rectangle' && (
                <div
                  className={`border-2 pointer-events-none ${
                    selectedElements.has(element.id) ? 'ring-2 ring-blue-300' : ''
                  }`}
                  style={{
                    position: 'absolute',
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    borderColor: selectedElements.has(element.id) ? '#3b82f6' : element.color,
                    backgroundColor: element.fillColor || 'transparent',
                    borderWidth: `${element.strokeWidth || 2}px`,
                    zIndex: 20
                  }}
                />
              )}
              
              {element.type === 'circle' && (
                <div
                  className={`border-2 rounded-full pointer-events-none ${
                    selectedElements.has(element.id) ? 'ring-2 ring-blue-300' : ''
                  }`}
                  style={{
                    position: 'absolute',
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    borderColor: selectedElements.has(element.id) ? '#3b82f6' : element.color,
                    backgroundColor: element.fillColor || 'transparent',
                    borderWidth: `${element.strokeWidth || 2}px`,
                    zIndex: 20
                  }}
                />
              )}
              
              {element.type === 'arrow' && (
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    zIndex: 20
                  }}
                  viewBox="0 0 50 50"
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={element.color} />
                    </marker>
                  </defs>
                  <line
                    x1="5" y1="25" x2="45" y2="25"
                    stroke={element.color}
                    strokeWidth={element.strokeWidth || 2}
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              )}
              
              {element.type === 'line' && (
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    zIndex: 20
                  }}
                  viewBox="0 0 50 50"
                >
                  <line
                    x1="5" y1="25" x2="45" y2="25"
                    stroke={element.color}
                    strokeWidth={element.strokeWidth || 2}
                  />
                </svg>
              )}
              
              {element.type === 'text' && (
                <div
                  className="absolute pointer-events-none cursor-text"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    color: element.color,
                    fontSize: `${element.fontSize || 16}px`,
                    fontFamily: 'Arial, sans-serif',
                    zIndex: 20
                  }}
                >
                  {element.text}
                </div>
              )}
            </div>
          ))}
          

        </div>
        
        {/* Sidebar - Smaller and collapsible */}
        <div className="w-72 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Whiteboard</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Title:</strong> {currentWhiteboard.title}</p>
              <p><strong>Description:</strong> {currentWhiteboard.description || 'No description'}</p>
              <p><strong>Created:</strong> {new Date(currentWhiteboard.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Users ({activeUsers.length})</h3>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Elements ({elements.length})</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Lines: {elements.filter(el => el.type === 'line').length}</p>
              <p>Shapes: {elements.filter(el => ['rectangle', 'circle'].includes(el.type)).length}</p>
              <p>Notes: {elements.filter(el => el.type === 'sticky').length}</p>
            </div>
          </div>

          {/* Debug Info */}
          {canvas && (
            <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
              <h4 className="font-semibold mb-1">Canvas Info:</h4>
              <p>Size: {canvas.width} × {canvas.height}</p>
              <p>Tool: {selectedTool}</p>
              <p>Drawing: {isDrawing ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
