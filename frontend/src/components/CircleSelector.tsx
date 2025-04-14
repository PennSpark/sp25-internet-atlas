'use client'
import { useState, useRef, useEffect, useCallback } from 'react';

const categories = ['piece', 'heavy', 'organic', 'ash', 'light', 'soft', 'silk', 'smooth', 'sharp', 'fuzzy'];

export default function CircleSelector() {
    const radius = 150;
    const increment = 360 / categories.length;
    const [angle, setAngle] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<number>(0);
    const circleRef = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const startAngle = useRef(0);
    const initialAngle = useRef(0);
    const currentDragAngle = useRef(0);


    useEffect(() => {
        if (circleRef.current) {
            categories.forEach((item, index) => {
                const angle = index * increment;
                const wordElement = circleRef.current!.children[index] as HTMLDivElement;
                wordElement.style.transform = `rotate(${angle}deg) translateY(-${radius}px)`;
            });
        }
    }, [increment]);

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
        }
    }, []);
    
    

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        snapToNearestWord();
    }, []);

    const getAngle = (mouseXPos: number, mouseYPos: number) => {
        const circleCenterX = window.innerWidth / 2;
        const circleCenterY = window.innerHeight / 2;
        const xOffset = mouseXPos - circleCenterX;
        const yOffset = mouseYPos - circleCenterY;
        const angleRad = Math.atan2(yOffset, xOffset);
        const angleDeg = (angleRad * 180) / Math.PI;
        return angleDeg;
    };

    const snapToNearestWord = () => {
        let rawAngle = currentDragAngle.current % 360;
        if (rawAngle < 0) rawAngle += 360;
    
        const nearestIndex = Math.round(rawAngle / increment) % categories.length;
        setSelectedCategory(nearestIndex);
        setAngle(-nearestIndex * increment);
    };
    
    

    const handleWordClick = (index: number) => {
        setSelectedCategory(index);
        setAngle(-index * increment);
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
            className="relative z-[30] circle-selector instrument-serif flex justify-center items-center cursor-pointer w-[300px] h-[300px] rounded-full border border-black m-auto"
            onMouseDown={handleMouseDown}
        >
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
                            color: 'white',
                        }}
                        onClick={() => handleWordClick(index)}
                    >
                        <p className='rotate-180'>{item}</p>
                    </div>
                ))}
            </div>

            <div
                className="absolute -top-10 w-[15px] h-[12px] rotate-180"
                style={{
                    backgroundImage: 'url(/wheel-arrow.svg',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',  
                }}
            />
        </div>
    );
}
