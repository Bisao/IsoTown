import { useRef, useEffect, useState } from 'react';

interface DraggablePosition {
  x: number;
  y: number;
}

export function useDraggable(initialPosition?: DraggablePosition) {
  const [position, setPosition] = useState<DraggablePosition>(
    initialPosition || { x: 0, y: 0 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;

      // Constrain to viewport
      const element = elementRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setIsDragging(true);
  };

  return {
    position,
    isDragging,
    elementRef,
    headerRef,
    handleMouseDown,
    setPosition
  };
}