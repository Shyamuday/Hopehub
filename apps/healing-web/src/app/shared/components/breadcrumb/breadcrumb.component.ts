import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationService, BreadcrumbItem } from '../../../core/services/navigation.service';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './breadcrumb.component.html',
    styleUrl: './breadcrumb.component.scss'
})
export class BreadcrumbComponent implements OnInit {
    private navigationService = inject(NavigationService);
    breadcrumbs = signal<BreadcrumbItem[]>([]);

    constructor() {
        this.navigationService.navigationState$
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                this.breadcrumbs.set(this.navigationService.getBreadcrumbs());
            });
    }

    ngOnInit(): void {
        // Component initialization if needed
    }
}