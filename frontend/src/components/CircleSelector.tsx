'use client'
import { useState, useRef, useEffect, useCallback } from 'react';

interface CircleSelectorProps {
    onSelect?: (value: string) => void
    isLateral: boolean
}

export default function CircleSelector({ onSelect, isLateral }: CircleSelectorProps) {
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

    // Position the words around the circle
    useEffect(() => {
        if (circleRef.current) {
            categories.forEach((item, index) => {
                const angle = index * increment;
                const wordElement = circleRef.current!.children[index] as HTMLDivElement;
                wordElement.style.transform = `rotate(${angle}deg) translateY(-${radius}px)`;
            });
        }
    }, [increment, categories, radius]);

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
            // Subtract deltaAngle to rotate in the desired direction
            const resultAngle = initialAngle.current - deltaAngle;
            setAngle(resultAngle);
            currentDragAngle.current = resultAngle;
        }
    }, []);

    const snapToNearestWord = () => {
        let rawAngle = currentDragAngle.current % 360;
        if (rawAngle < 0) rawAngle += 360;

        // Get the nearest index based on rawAngle
        const nearestIndex = Math.round(rawAngle / increment);
        // Invert the index so that the highlight ordering matches the visual wheel
        const invertedIndex = ((categories.length - nearestIndex) % categories.length + categories.length) % categories.length;
        
        setSelectedCategory(invertedIndex);
        // Use negative angle for consistency with handleWordClick
        setAngle(-invertedIndex * increment);

        if (onSelect) {
            onSelect(categories[invertedIndex]);
        }
    };

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        snapToNearestWord();
    }, []);

    const handleWordClick = (index: number) => {
        setSelectedCategory(index);
        setAngle(-index * increment);
        if (onSelect) {
            onSelect(categories[index]);
        }
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [angle, handleMouseMove, handleMouseUp]);

    return (
        <div
            className="relative z-[30] circle-selector instrument-serif flex justify-center items-center cursor-pointer w-[450px] h-[450px] rounded-full m-auto"
            // style={{ border: `0.5px solid white` }}
            onMouseDown={handleMouseDown}
        >
            {/* Inner white circle */}
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
                            transition: 'color 0.3s, opacity 0.3s'
                        }}
                        onClick={() => handleWordClick(index)}
                    >
                        <p className={isLateral ? 'rotate-90' : 'rotate-180'}
                        style={{                            
                            color: index === selectedCategory ? '#ffffff' : '#757575',
                            opacity: index === selectedCategory ? 1 : 0.7,}}>
                                {item} <span className='text-xs ml-2 text-white opacity-100'>{index + 1}</span></p>
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
                className="absolute top-[40px] w-[12px] h-[12px] rotate-180"
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
