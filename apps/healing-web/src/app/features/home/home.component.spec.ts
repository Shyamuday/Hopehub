import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the shared consumer copy and routes', () => {
    expect(component.UX).toBeTruthy();
    expect(component.ROUTES).toBeTruthy();
  });

  it('should provide the primary concern shortcuts', () => {
    expect(component.concernShortcuts()).toHaveLength(6);
    expect(component.concernShortcuts().map((concern) => concern.key)).toContain('anxiety');
  });
});
