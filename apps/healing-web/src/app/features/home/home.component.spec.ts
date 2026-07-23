import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomeComponent } from './home.component';
import { APP_CONSTANTS } from '../../core';

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

  it('should expose app constants for the announcement banner', () => {
    expect(component.APP_CONSTANTS.TELEGRAM.GROUP_URL).toBe(APP_CONSTANTS.TELEGRAM.GROUP_URL);
  });

  it('should have daily Telegram announcement message', () => {
    expect(component.announcementMessage).toContain('daily 9 PM Telegram voice circle');
  });
});
