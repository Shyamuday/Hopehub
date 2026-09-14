import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AdminNavTabsComponent } from './admin-nav-tabs.component';

describe('AdminNavTabsComponent horizontal hierarchy', () => {
  it('opens a top menu, then a clickable category, while keeping every page a link', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNavTabsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminNavTabsComponent);
    fixture.componentRef.setInput('layout', 'horizontal');
    fixture.componentRef.setInput('items', [
      { path: '/consultations', label: 'Sessions / Consultations' },
      { path: '/follow-ups', label: 'Follow-ups' },
      { path: '/safety-flags', label: 'Safety Flags' },
    ]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const workButton = Array.from(host.querySelectorAll<HTMLButtonElement>('.group-btn')).find(
      (button) => button.textContent?.includes('Work'),
    );
    expect(workButton).toBeTruthy();
    workButton!.click();
    fixture.detectChanges();

    const categoryButton = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.submenu-trigger'),
    ).find((button) => button.textContent?.includes('Care delivery'));
    expect(categoryButton).toBeTruthy();
    categoryButton!.click();
    fixture.detectChanges();

    const destinations = Array.from(host.querySelectorAll<HTMLAnchorElement>('.nested-menu a')).map(
      (link) => link.getAttribute('href'),
    );
    expect(destinations).toEqual(['/consultations', '/follow-ups']);
  });
});
