import { useState, useEffect } from 'react';

export interface Template {
  id: string;
  title: string;
  content: string;
  variables: Record<string, string>;
  createdAt: number;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  return { templates, setTemplates, isLoading, error };
}
