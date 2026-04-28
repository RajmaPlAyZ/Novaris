import { useState, useEffect, useCallback } from 'react';
import { useConvexAuth } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

interface WhiteboardPoint {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

interface WhiteboardStroke {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
  timestamp: number;
}

interface WhiteboardShape {
  id: string;
  type: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  timestamp: number;
}

interface WhiteboardObject {
  id: string;
  type: 'stroke' | 'shape';
  data: WhiteboardStroke | WhiteboardShape;
}

export const useWhiteboard = (documentId: Id<'documents'>) => {
  const { isAuthenticated } = useConvexAuth();
  const [whiteboardObjects, setWhiteboardObjects] = useState<WhiteboardObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing whiteboard data
  const whiteboardData = useQuery(
    api.whiteboard.getByDocumentId,
    { documentId }
  );
  const dataLoading = whiteboardData === undefined;

  // Mutations
  const addObject = useMutation(api.whiteboard.addObject);
  const clearWhiteboard = useMutation(api.whiteboard.clear);
  const removeObject = useMutation(api.whiteboard.removeObject);

  useEffect(() => {
    if (!dataLoading && whiteboardData) {
      setWhiteboardObjects(whiteboardData.objects || []);
      setIsLoading(false);
      setError(null);
    } else if (dataLoading) {
      setIsLoading(true);
    }
  }, [whiteboardData, dataLoading]);

  useEffect(() => {
    if (error) {
      setIsLoading(false);
    }
  }, [error]);

  const addWhiteboardObject = useCallback(async (object: {
    type: 'stroke' | 'shape';
    data: WhiteboardStroke | WhiteboardShape;
  }) => {
    if (!isAuthenticated) return;

    try {
      await addObject({
        documentId,
        object
      });
    } catch (err) {
      console.error('Failed to add whiteboard object:', err);
      setError('Failed to add object to whiteboard');
    }
  }, [isAuthenticated, documentId, addObject]);

  const clearWhiteboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await clearWhiteboard({ documentId });
      setWhiteboardObjects([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear whiteboard:', err);
      setError('Failed to clear whiteboard');
    }
  }, [isAuthenticated, documentId, clearWhiteboard]);

  const removeWhiteboardObject = useCallback(async (objectId: string) => {
    if (!isAuthenticated) return;

    try {
      await removeObject({
        documentId,
        objectId
      });
      setWhiteboardObjects(prev => prev.filter(obj => obj.id !== objectId));
      setError(null);
    } catch (err) {
      console.error('Failed to remove whiteboard object:', err);
      setError('Failed to remove object from whiteboard');
    }
  }, [isAuthenticated, documentId, removeObject]);

  // Optimistic update for local state
  const optimisticAddObject = useCallback((object: {
    type: 'stroke' | 'shape';
    data: WhiteboardStroke | WhiteboardShape;
  }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticObject: WhiteboardObject = {
      id: tempId,
      type: object.type,
      data: object.data
    };

    setWhiteboardObjects(prev => [...prev, optimisticObject]);

    // Actually add to server
    addWhiteboardObject(object).then(() => {
      // Replace temp ID with real ID after server confirmation
      // This would need to be handled by the server returning the real ID
      // For now, we'll keep the temp ID - in a real implementation,
      // the server would return the actual ID and we'd update accordingly
    }).catch(() => {
      // Rollback optimistic update on failure
      setWhiteboardObjects(prev => prev.filter(obj => obj.id !== tempId));
    });
  }, [addWhiteboardObject]);

  return {
    whiteboardObjects,
    isLoading,
    error,
    addWhiteboardObject: optimisticAddObject,
    clearWhiteboard: clearWhiteboardData,
    removeWhiteboardObject,
    isAuthenticated
  };
};