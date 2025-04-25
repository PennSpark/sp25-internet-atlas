import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CircleSelector from "./CircleSelector"
import Graph3D from './Graph3D'

export default function NodeGraph() {
    const [descriptorX, setDescriptorX] = useState<string | null>("piece")
    const [descriptorY, setDescriptorY] = useState<string | null>("fuzzy")
    const navigate = useNavigate()

    const handleLogoClick = () => {
        navigate('/')
    }

    return (
        <div className="relative w-full h-screen bg-black text-white">
            {/* Logo */}
            <div 
                className="absolute z-[20] top-8 left-8 cursor-pointer hover:opacity-80 transition-opacity select-none"
                onClick={handleLogoClick}
            >
                <div className="w-12 h-12">
                    <img src="/logo.png" alt="Logo" className="w-full h-full " />
                </div>
            </div>

            {/* Top Dial */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-[400px] z-[20]">
                <div className="rotate-180">
                    <CircleSelector isLateral={false} onSelect={(value) => setDescriptorX(value)} />
                </div>
            </div>

            {/* Right Dial */}
            <div className="absolute -right-[400px] top-1/2 -translate-y-1/2 z-[20]">
                <div className="rotate-270">
                    <CircleSelector isLateral={true} onSelect={(value) => setDescriptorY(value)} />
                </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-[20]">
                <p className="text-[#757575] text-[24px] handjet">
                    Currently showing user paths through  
                    <span className="text-[#0b9b79] px-2">
                           [{descriptorX || 'piece'} and {descriptorY || 'piece'}]
                    </span>
                    -like websites
                </p>
            </div>
{/* 
            { descriptorX && descriptorY &&
            <Graph3D
                descriptorX={descriptorX}
                descriptorY={descriptorY}/>
        }        */}
        </div>
    )
} 