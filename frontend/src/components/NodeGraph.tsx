import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CircleSelector from "./CircleSelector";
import Graph3D from './Graph3D';

export default function NodeGraph() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
  
    const descriptorX = searchParams.get('x');
    const descriptorY = searchParams.get('y');

    // Fix URL if missing x or y
    useEffect(() => {
      if (!descriptorX || !descriptorY) {
        const newParams = new URLSearchParams(searchParams);
        if (!descriptorX) newParams.set('x', 'piece');
        if (!descriptorY) newParams.set('y', 'light');
        setSearchParams(newParams, { replace: true }); // replace history so it doesn't mess with back button
      }
    }, [descriptorX, descriptorY, searchParams, setSearchParams]);

    const xValue = descriptorX || "piece";
    const yValue = descriptorY || "light";

    const handleSelectX = (value: string) => {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.set('x', value);
          return newParams;
        });
    };
      
    const handleSelectY = (value: string) => {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.set('y', value);
          return newParams;
        });
    };

    const handleLogoClick = () => {
        navigate('/');
    };

    return (
        <div className="relative w-[100svw] h-[100svh] bg-black text-white overflow-hidden">
            {/* Logo */}
            <div 
                className="absolute z-[20] top-8 left-8 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleLogoClick}
            >
                <div className="w-12 h-12">
                    <img src="/logo.png" alt="Logo" className="w-full h-full " />
                </div>
            </div>

            {/* Top Dial */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-[400px] z-[20]">
                <div className="rotate-180">
                    <CircleSelector 
                        isLateral={false} 
                        selectedValue={xValue}
                        onSelect={(value) => handleSelectX(value)}
                    />
                </div>
            </div>

            {/* Right Dial */}
            <div className="absolute -right-[400px] top-1/2 -translate-y-1/2 z-[20]">
                <div className="rotate-270">
                    <CircleSelector 
                        isLateral={true} 
                        selectedValue={yValue}
                        onSelect={(value) => handleSelectY(value)}
                    />
                </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-[20] select-none">
                <p className="text-[#757575] text-[24px] handjet">
                    Mapping web movement in
                    <span className="text-[#0b9b79] px-2">
                           [{xValue} and {yValue}]
                    </span>
                    atmospheres
                </p>
            </div>

            { xValue && yValue &&
              <Graph3D
                descriptorX={xValue}
                descriptorY={yValue}
              />
            }
        </div>
    )
}
