import { InjectionToken } from '@angular/core';
import type { DevAppGuide } from './dev-demo.types';

export interface DevDemoPort {
  readonly enabled: boolean;
  loadGuide(): Promise<DevAppGuide | null>;
  quickLogin(personaId: string): Promise<void>;
}

export const DEV_DEMO_PORT = new InjectionToken<DevDemoPort>('DEV_DEMO_PORT');
