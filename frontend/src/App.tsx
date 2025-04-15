import Graph3D from './components/Graph3D';
import { nodes, edges } from './data'; // adjust path as needed

const graphData = {
  nodes,
  links: edges
};

export default function Home() {
  return (
    <main className="w-full h-screen">
      <Graph3D data={graphData} />
    </main>
  );
}
