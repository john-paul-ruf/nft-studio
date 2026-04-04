import type { LoopDuration } from '../types/effects';

export interface Loop {
  id: string;
  name: string;
  loopSeconds: LoopDuration;
  seed: number;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
}
