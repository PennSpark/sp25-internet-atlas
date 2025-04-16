import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CircleSelector from "./CircleSelector"

export default function NodeGraph() {
    const [descriptorX, setDescriptorX] = useState<string | null>(null)
    const [descriptorY, setDescriptorY] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogoClick = () => {
        navigate('/')
    }

    return (
        <div className="relative w-full h-screen bg-black text-white">
            {/* Logo */}
            <div 
                className="absolute top-8 left-8 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleLogoClick}
            >
                <div className="w-12 h-12">
                    <img src="/logo.png" alt="Logo" className="w-full h-full" />
                </div>
            </div>

            {/* Top Dial */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-[150px]">
                <div className="rotate-180">
                    <CircleSelector onSelect={(value) => setDescriptorX(value)} />
                </div>
            </div>

            {/* Right Dial */}
            <div className="absolute -right-[150px] top-1/2 -translate-y-1/2">
                <div className="rotate-270">
                    <CircleSelector onSelect={(value) => setDescriptorY(value)} />
                </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <p className="text-[#757575] text-[32px] handjet">
                    Currently showing user paths through  
                    <span className="text-[#0b9b79]">
                           [ {descriptorX || 'piece'} and {descriptorY || 'piece'} ]
                    </span>
                    -like websites
                </p>
            </div>
        </div>
    )
} 