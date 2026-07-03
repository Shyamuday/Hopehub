import { Component, Input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getRoleTaskGuide } from '../../../../../../shared/role-task-guides/data';
import type { RoleTaskGuide } from '../../../../../../shared/role-task-guides/types';

@Component({
  selector: 'app-role-task-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-task-guide.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './role-task-guide.component.scss'
})
export class RoleTaskGuideComponent implements OnInit {
  @Input({ required: true }) appKey!: string;
  @Input() variantKey: string | null = null;
  @Input() theme: 'light' | 'dark' = 'light';

  guide = signal<RoleTaskGuide | null>(null);
  expanded = signal(true);
  hidden = signal(false);

  ngOnInit() {
    this.guide.set(getRoleTaskGuide(this.appKey, this.variantKey));
    const storageKey = this.storageKey();
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'collapsed') {
      this.expanded.set(false);
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'hidden') {
      this.hidden.set(true);
    }
  }

  toggle() {
    this.expanded.update((v) => !v);
    this.persist('collapsed', !this.expanded());
  }

  dismiss() {
    this.hidden.set(true);
    this.persist('hidden', true);
  }

  showAgain() {
    this.hidden.set(false);
    this.expanded.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey());
    }
  }

  private storageKey() {
    const variant = this.variantKey || 'default';
    return `vitalis-role-guide:${this.appKey}:${variant}`;
  }

  private persist(state: 'collapsed' | 'hidden', active: boolean) {
    if (typeof localStorage === 'undefined') return;
    const key = this.storageKey();
    if (active) {
      localStorage.setItem(key, state);
    } else {
      localStorage.removeItem(key);
    }
  }
}
