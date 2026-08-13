import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { AdminAuth } from '../services/admin-auth';
import { staffHasAllPermissions, staffHasAnyPermission } from '../admin-permissions';

export type AdminPermissionMatch = 'all' | 'any';

/** Hides an action when the signed-in staff member lacks its required permission. */
@Directive({
  selector: '[adminCan]',
  standalone: true,
})
export class AdminCanDirective {
  private readonly auth = inject(AdminAuth);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  readonly adminCan = input.required<string | readonly string[]>();
  readonly adminCanMatch = input<AdminPermissionMatch>('all');

  constructor() {
    effect(() => {
      const value = this.adminCan();
      const permissions = typeof value === 'string' ? [value] : [...value];
      const allowed =
        this.adminCanMatch() === 'any'
          ? staffHasAnyPermission(this.auth.user(), ...permissions)
          : staffHasAllPermissions(this.auth.user(), ...permissions);

      this.renderer.setProperty(this.element.nativeElement, 'hidden', !allowed);
    });
  }
}
