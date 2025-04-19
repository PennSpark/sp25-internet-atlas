import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


import {
  embedWebsite,
  searchVectors,
  getCoordinates,
} from './api/api';

function App() {
  const [count, setCount] = useState(0)
  const [result, setResult] = useState<any>(null)

  const handleEmbedTest = async () => {
    const dummyFile = new File(["dummy content"], "test.txt", { type: "text/plain" });
    try {
      const res = await embedWebsite([dummyFile], "test text", "http://example.com");
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error embedding website");
    }
  };

  const handleSearchTest = async () => {
    try {
      const res = await searchVectors("test search");
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error searching vectors");
    }
  };

  const handleCoordinateTest = async () => {
    try {
      const res = await getCoordinates("apple", "banana", "cherry");
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult("Error getting coordinates");
    }
  };


  return (
    <>
      <div>
      <h2>🧪 API Test Section</h2>
      <div className="card">
        <button onClick={handleEmbedTest}>Test /embed-website</button>
        <button onClick={handleSearchTest}>Test /search_vectors</button>
        <button onClick={handleCoordinateTest}>Test /get_coordinates</button>
        <pre style={{ textAlign: 'left', marginTop: '1rem' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
