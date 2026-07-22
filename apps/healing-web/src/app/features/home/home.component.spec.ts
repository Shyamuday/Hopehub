import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HomeComponent, RouterTestingModule]
        })
            .compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display 10 services', () => {
        expect(component.services.length).toBe(10);
    });

    it('should have announcement message', () => {
        expect(component.announcementMessage).toContain('monthly healing circle');
    });

    it('should calculate next first Sunday correctly', () => {
        expect(component.nextMeetup.date).toBeInstanceOf(Date);
        expect(component.nextMeetup.date.getDay()).toBe(0); // Sunday
    });

    it('should format meetup date correctly', () => {
        const testDate = new Date(2024, 0, 7); // January 7, 2024 (Sunday)
        const formatted = component.formatMeetupDate(testDate);
        expect(formatted).toContain('Sunday');
        expect(formatted).toContain('January');
        expect(formatted).toContain('2024');
    });
});