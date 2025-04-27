'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface CircleSelectorProps {
  onSelect?: (value: string) => void;
  isLateral: boolean;
  selectedValue: string;
}

export default function CircleSelector({ onSelect, isLateral, selectedValue }: CircleSelectorProps) {
  const radius = 250;
  const categories = ['piece', 'heavy', 'organic', 'ash', 'light', 'soft', 'silk', 'smooth', 'sharp', 'fuzzy'];
  const increment = 360 / categories.length;
  const [angle, setAngle] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startAngle = useRef(0);
  const initialAngle = useRef(0);
  const currentDragAngle = useRef(0);

  useEffect(() => {
    const newIndex = categories.indexOf(selectedValue);
    if (newIndex !== -1 && newIndex !== selectedCategory) {
      setSelectedCategory(newIndex);
      setAngle(-newIndex * increment);
    }
  }, [selectedValue, selectedCategory, categories, increment]);

  useEffect(() => {
    if (circleRef.current) {
      categories.forEach((_, index) => {
        const baseAngle = index * increment;
        const wordElement = circleRef.current!.children[index] as HTMLDivElement;
        wordElement.style.transform = `rotate(${baseAngle}deg) translateY(-${radius}px)`;
        if (index - selectedCategory === 1 || (index === 0 && selectedCategory === categories.length - 1)) {
          wordElement.style.transform = `rotate(${baseAngle - increment * 0.3}deg) translateY(-${radius}px)`;
        } else if (index - selectedCategory === -1 || (index === categories.length - 1 && selectedCategory === 0)) {
          wordElement.style.transform = `rotate(${baseAngle + increment * 0.3}deg) translateY(-${radius}px)`;
        }
      });
    }
  }, [increment, categories, radius, selectedCategory]);

  const getAngle = (mouseXPos: number, mouseYPos: number) => {
    const circleCenterX = window.innerWidth / 2;
    const circleCenterY = window.innerHeight / 2;
    const xOffset = mouseXPos - circleCenterX;
    const yOffset = mouseYPos - circleCenterY;
    const angleRad = Math.atan2(yOffset, xOffset);
    const angleDeg = (angleRad * 180) / Math.PI;
    return angleDeg;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startAngle.current = getAngle(e.clientX, e.clientY);
    initialAngle.current = angle;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      const newAngle = getAngle(e.clientX, e.clientY);
      const deltaAngle = newAngle - startAngle.current;
      const resultAngle = initialAngle.current - deltaAngle;
      setAngle(resultAngle);
      currentDragAngle.current = resultAngle;
      // Update for smooth dragging
      startAngle.current = newAngle;
      initialAngle.current = resultAngle;
    }
  }, []);

  const snapToNearestWord = () => {
    let rawAngle = currentDragAngle.current % 360;
    if (rawAngle < 0) rawAngle += 360;

    const nearestIndex = Math.round(rawAngle / increment);
    const invertedIndex = ((categories.length - nearestIndex) % categories.length + categories.length) % categories.length;

    if (invertedIndex !== selectedCategory) {
      setSelectedCategory(invertedIndex);
      setAngle(-invertedIndex * increment);
      if (onSelect && categories[invertedIndex] !== selectedValue) {
        onSelect(categories[invertedIndex]);
      }
    } else {
      setAngle(-invertedIndex * increment); // still snap rotation even if no new select
    }
  };

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    snapToNearestWord();
  }, []);

  const handleWordClick = (index: number) => {
    if (index !== selectedCategory) {
      setSelectedCategory(index);
      setAngle(-index * increment);
      if (onSelect && categories[index] !== selectedValue) {
        onSelect(categories[index]);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className="relative z-[30] circle-selector instrument-serif flex justify-center items-center cursor-pointer w-[450px] h-[450px] rounded-full m-auto"
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute w-[400px] h-[400px] rounded-[100%] bg-white"
        style={{
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />
      <div
        ref={circleRef}
        className="absolute flex justify-center items-center w-full h-full"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'center center',
        }}
      >
        {categories.map((item, index) => (
          <div
            key={index}
            className="absolute text-center text-lg cursor-pointer select-none"
            style={{
              transformOrigin: 'center center',
              transition: 'color 0.3s, opacity 0.3s',
            }}
            onClick={() => handleWordClick(index)}
          >
            <p
              className={isLateral ? 'rotate-90' : 'rotate-180'}
              style={{
                color: index === selectedCategory ? '#ffffff' : '#757575',
                opacity: index === selectedCategory ? 1 : 0.7,
              }}
            >
              {item} <span className="text-xs ml-2 text-white opacity-100">{index + 1}</span>
            </p>
          </div>
        ))}
      </div>

      <div
        className="absolute -top-18 w-[15px] h-[12px] rotate-180"
        style={{
          backgroundImage: 'url(/wheel-arrow.svg)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute top-[33px] w-[12px] h-[12px] rotate-180"
        style={{
          backgroundImage: 'url(/cross.svg)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}
