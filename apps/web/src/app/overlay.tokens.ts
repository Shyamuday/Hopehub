import { InjectionToken } from '@angular/core';
import type { AppOverlayRef } from './overlay.service';

export const APP_OVERLAY_DATA = new InjectionToken<unknown>('APP_OVERLAY_DATA');
export const APP_OVERLAY_REF = new InjectionToken<AppOverlayRef>('APP_OVERLAY_REF');
