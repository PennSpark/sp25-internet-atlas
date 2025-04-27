export interface NodeType {
    id: string;
    name?: string;
    val?: number;
    x?: number;
    y?: number;
    z?: number;
  }
  
export interface LinkType {
    source: NodeType;
    target: NodeType;
    curvature?: number;
    rotation?: number;
  }