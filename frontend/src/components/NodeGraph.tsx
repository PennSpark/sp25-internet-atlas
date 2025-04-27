import { useNavigate, useSearchParams } from 'react-router-dom'
import CircleSelector from "./CircleSelector"
import Graph3D from './Graph3D'

export default function NodeGraph() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
  
    const descriptorX = searchParams.get('x') || "piece";
    const descriptorY = searchParams.get('y') || "piece";
  
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
        navigate('/')
    }

    return (
        <div className="relative w-full h-screen bg-black text-white">
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
                    selectedValue={descriptorX}
                    onSelect={(value) => handleSelectX(value)} />
                </div>
            </div>

            {/* Right Dial */}
            <div className="absolute -right-[400px] top-1/2 -translate-y-1/2 z-[20]">
                <div className="rotate-270">
                    <CircleSelector 
                    isLateral={true} 
                    selectedValue={descriptorY}
                    onSelect={(value) => handleSelectY(value)} />
                </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-[20]">
                <p className="text-[#757575] text-[24px] handjet">
                    Showing journey through sites that give
                    <span className="text-[#0b9b79] px-2">
                           [{descriptorX || 'piece'} and {descriptorY || 'piece'}]
                    </span>
                    vibe
                </p>
            </div>

            { descriptorX && descriptorY &&
            <Graph3D
                descriptorX={descriptorX}
                descriptorY={descriptorY}/>
        }       
        </div>
    )
} 