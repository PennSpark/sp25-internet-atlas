import { useState, useEffect } from 'react'
import './App.css'
import LandingScreen from './LandingScreen'
import NodeGraph from './NodeGraph'

function App() {
  const [landingVisible, setLandingVisible] = useState(true)

  return (
    <div
      style={{
        backgroundColor: 'black',
        color: 'white',
        height: '100svh',
        width: '100svw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '2rem'}}>
      {landingVisible && (
        <div 
        style={{
          position: 'absolute',
          backgroundColor: 'black',
          color: 'white',
          height: '100svh',
          width: '100svw',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '2rem',
          zIndex: 40
        }}
        onClick={() => setLandingVisible(false)}>
          <LandingScreen/>
        </div>
      )}
      <NodeGraph/>
    </div>
  )
}

export default App
