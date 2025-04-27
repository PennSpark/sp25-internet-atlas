export interface NodeType {
    id: string;
    name?: string;
    val?: number;
    x?: number;
    y?: number;
    z?: number;
    // landmark
    isLandmark?: boolean;
    visitCount?: number; 
  }
  
export interface LinkType {
    source: NodeType;
    target: NodeType;
    curvature?: number;
    rotation?: number;
  }