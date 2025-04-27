export interface NodeType {
    id: string;
    name?: string;
    val?: number;
    x: number;
    y: number;
    z: number;
    rank?: number;
    isValidDomain?: boolean;
  }
  
export interface LinkType {
    source: NodeType;
    target: NodeType;
    num_users: number;
  }