export interface Dance {
  id: number;
  creator?: string;
  name: string;
  soundFile: string;
  modelFile: string;
  modelPosition: { x: number; y: number; z: number };
  modelRotation?: { x: number; y: number; z: number };
  modelScale?: number;
}
