'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Folder, Plus } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';

interface TemplateGalleryProps {
  onTemplateSelect: (template: any) => void;
}

export const TemplateGallery = ({ onTemplateSelect }: TemplateGalleryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState<string>(''); // JSON string of variables
  const [isCreating, setIsCreating] = useState(false);
  const { templates, setTemplates, isLoading, error } = useTemplates();

  const handleCreateTemplate = async () => {
    setIsCreating(true);
    try {
      const variablesObj = variables ? JSON.parse(variables) : {};
      // In a real implementation, we would save the template via a mutation
      // For now, we'll just simulate creation
      const newTemplate = {
        id: `temp_${Date.now()}`,
        title,
        content,
        variables: variablesObj,
        createdAt: Date.now()
      };

      // Add to local state (in reality, this would come from server)
      setTemplates(prev => [newTemplate, ...prev]);

      // Reset form
      setTitle('');
      setContent('');
      setVariables('{}');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create template:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    onTemplateSelect(template);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-80 sm:w-96">
          <DialogHeader>
            <DialogTitle>Template Gallery</DialogTitle>
            <DialogDescription>
              Choose a template or create a new one
            </DialogDescription>
          </DialogHeader>

          {!isLoading && templates.length > 0 ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Your Templates</h3>
                <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                  <Plus className="h-3 w-3" />
                  New Template
                </Button>
              </div>

              <div className="space-y-3">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left px-3 py-2"
                  >
                    <div className="flex items-center gap-x-3">
                      <Folder className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{template.title}</div>
                        {template.variables && Object.keys(template.variables).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Variables: {Object.keys(template.variables).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              {isLoading && <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-2"></div>}
              {isLoading ? (
                <p>Loading templates...</p>
              ) : (
                <p>No templates yet. Create your first template!</p>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded">
              Error loading templates: {error}
            </div>
          )}

          {/* Create Template Form */}
          {isOpen && !isCreating && (
            <div className="p-4 space-y-4">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Input
                  placeholder="Template title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                />

                <Textarea
                  placeholder="Template content (use {{variable_name}} for variables)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-32"
                />

                <Input
                  placeholder='Variables as JSON (e.g., {"date": "{{date}}", "project": "{{project}}"})'
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isCreating || !title.trim()}
                  className="ml-auto"
                >
                  {isCreating ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
    </Dialog>
  );
};