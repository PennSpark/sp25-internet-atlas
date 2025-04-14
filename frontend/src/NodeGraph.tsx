import { useState } from 'react'
import CircleSelector from "./components/CircleSelector"
import Grid from './components/Grid'

import { data } from './data'

export default function NodeGraph() {
    const [descriptorX, setDescriptorX] = useState<string | null>(null)
    const [descriptorY, setDescriptorY] = useState<string | null>(null)
    return (
        <div
        style={{
            backgroundColor: 'black',
            color: 'white',
            height: '100%',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '2rem',
        }}>
            <div className='absolute -top-[150px] rotate-180 z-[30]'>
                <CircleSelector />
            </div>

            <div className='absolute -right-[150px] rotate-270 z-[30]'>
                <CircleSelector />
            </div>
                <Grid data={data} />
        </div>
    )
}