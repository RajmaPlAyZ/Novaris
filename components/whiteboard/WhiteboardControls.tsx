'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PenTool, Eraser, Square, Circle, X } from 'lucide-react';

interface WhiteboardControlsProps {
  onToolChange: (tool: 'pen' | 'eraser' | 'rect' | 'circle') => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onClear: () => void;
  currentTool: 'pen' | 'eraser' | 'rect' | 'circle';
  currentColor: string;
  currentWidth: number;
}

export const WhiteboardControls = ({
  onToolChange,
  onColorChange,
  onWidthChange,
  onClear,
  currentTool,
  currentColor,
  currentWidth
}: WhiteboardControlsProps) => {
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isWidthOpen, setIsWidthOpen] = useState(false);

  return (
    <div className="flex items-center gap-x-2 p-2 bg-muted/50 backdrop-blur-sm rounded-lg">
      {/* Tools */}
      <div className="flex items-center gap-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToolChange('pen')}
          className={cn(currentTool === 'pen' && 'bg-primary/20 text-primary')}
          aria-label="Pen tool"
        >
          <PenTool className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToolChange('eraser')}
          className={cn(currentTool === 'eraser' && 'bg-primary/20 text-primary')}
          aria-label="Eraser tool"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToolChange('rect')}
          className={cn(currentTool === 'rect' && 'bg-primary/20 text-primary')}
          aria-label="Rectangle tool"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToolChange('circle')}
          className={cn(currentTool === 'circle' && 'bg-primary/20 text-primary')}
          aria-label="Circle tool"
        >
          <Circle className="h-4 w-4" />
        </Button>
      </div>

      {/* Color picker */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsColorOpen(!isColorOpen)}
          className={cn('w-8 h-8', {
            'bg-primary/20': !isColorOpen,
            'bg-primary/30': isColorOpen
          })}
          aria-label="Color picker"
        >
          <div className="h-4 w-4" style={{ backgroundColor: currentColor }} />
        </Button>
        {isColorOpen && (
          <div className="absolute left-0 mt-2 w-32 bg-popover border border-border/50 backdrop-blur rounded-md shadow-lg z-50 p-1">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-8 p-0 m-0 border-none bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Width slider */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsWidthOpen(!isWidthOpen)}
          className={cn('w-8 h-8', {
            'bg-primary/20': !isWidthOpen,
            'bg-primary/30': isWidthOpen
          })}
          aria-label="Width slider"
        >
          <div className="h-4 w-4" style={{
            backgroundColor: currentColor,
            width: `${currentWidth}px`,
            height: `${currentWidth}px`,
            borderRadius: '50%'
          }} />
        </Button>
        {isWidthOpen && (
          <div className="absolute left-0 mt-2 w-32 bg-popover border border-border/50 backdrop-blur rounded-md shadow-lg z-50 p-2">
            <div className="flex items-center gap-x-2">
              <span className="text-xs text-muted-foreground">Width:</span>
              <input
                type="range"
                min={1}
                max={10}
                value={currentWidth}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">{currentWidth}px</span>
            </div>
          </div>
        )}
      </div>

      {/* Clear button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onClear}
        className="ml-auto"
        aria-label="Clear whiteboard"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};