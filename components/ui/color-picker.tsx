import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'color'> {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange, className, ...props }: ColorPickerProps) {
  return (
    <input
      type="color"
      value={color}
      onChange={(e) => onChange(e.target.value)}
      className={cn("cursor-pointer border-0 p-0", className)}
      {...props}
    />
  );
}
