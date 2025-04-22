declare module 'three/examples/jsm/controls/OrbitControls' {
    import { Camera } from 'three';
    import { EventDispatcher } from 'three';
    import { Vector3 } from 'three';
  
    export class OrbitControls extends EventDispatcher {
      constructor(object: Camera, domElement?: HTMLElement);
      object: Camera;
      target: Vector3;
      update(): void;
      dispose(): void;
      enableZoom: boolean;
      enablePan: boolean;
      enableRotate: boolean;
      minPolarAngle: number;
      maxPolarAngle: number;
      minAzimuthAngle: number;
      maxAzimuthAngle: number;
      minDistance: number;
      maxDistance: number;
      // add other properties/methods as needed
    }
  }
  