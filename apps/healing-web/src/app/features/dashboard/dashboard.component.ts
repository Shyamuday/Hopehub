import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.model';
import { ProgressDashboardComponent } from '../../shared/components/progress-dashboard/progress-dashboard.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterModule, ProgressDashboardComponent],
    template: `
        <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <div class="bg-white shadow">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center py-6">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">
                                Welcome back, {{ user()?.name || 'User' }}!
                            </h1>
                            <p class="mt-1 text-sm text-gray-600">
                                Track your mental health journey and access personalized resources
                            </p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button
                                (click)="logout()"
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Quick Actions -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <a
                        routerLink="/assessments"
                        class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">
                                            Take Assessment
                                        </dt>
                                        <dd class="text-lg font-medium text-gray-900">
                                            Check Your Mood
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </a>

                    <a
                        routerLink="/exercises"
                        class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">
                                            Practice Exercises
                                        </dt>
                                        <dd class="text-lg font-medium text-gray-900">
                                            Mindfulness & More
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </a>

                    <a
                        routerLink="/lifestyle-tips"
                        class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                                        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">
                                            Lifestyle Tips
                                        </dt>
                                        <dd class="text-lg font-medium text-gray-900">
                                            Improve Wellness
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </a>

                    <a
                        routerLink="/articles"
                        class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                                        <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">
                                            Read Articles
                                        </dt>
                                        <dd class="text-lg font-medium text-gray-900">
                                            Learn & Grow
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>

                <!-- Progress Dashboard -->
                <app-progress-dashboard></app-progress-dashboard>

                <!-- Patient code badge (if available) -->
                @if (user()?.patientCode) {
                  <div class="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p class="text-sm text-blue-700">
                      Your patient code: <strong>{{ user()!.patientCode }}</strong>
                    </p>
                  </div>
                }
            </div>
        </div>
    `
})
export class DashboardComponent implements OnInit {
    private authService = inject(AuthService);
    user = signal<User | null>(null);
    isLoading = signal(false);

    constructor() {
        this.authService.user$
            .pipe(takeUntilDestroyed())
            .subscribe((user: User | null) => {
                this.user.set(user);
            });
    }

    ngOnInit(): void {
        // Component initialized
    }

    async logout(): Promise<void> {
        try {
            await this.authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}