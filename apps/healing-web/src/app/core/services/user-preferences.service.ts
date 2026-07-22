import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    UserPreferences,
    ContentPreferences,
    DashboardSettings,
    ReminderSettings,
    GoalSettings,
    PersonalGoal,
    Achievement,
    DashboardWidget
} from '../models/user-preferences.model';

@Injectable({
    providedIn: 'root'
})
export class UserPreferencesService {
    private readonly STORAGE_KEY = 'healing-hub-preferences';

    private preferencesSignal = signal<UserPreferences>(this.getDefaultPreferences());
    private isBrowser: boolean;

    // Computed signals for easy access
    preferences = this.preferencesSignal.asReadonly();
    contentPreferences = computed(() => this.preferences().contentPreferences);
    dashboardSettings = computed(() => this.preferences().dashboardSettings);
    reminderSettings = computed(() => this.preferences().reminderSettings);
    goalSettings = computed(() => this.preferences().goalSettings);

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.loadPreferences();
    }

    private getDefaultPreferences(): UserPreferences {
        return {
            id: this.generateId(),
            contentPreferences: {
                preferredCategories: [],
                difficultyLevel: 'all',
                contentTypes: {
                    assessments: true,
                    exercises: true,
                    lifestyleTips: true,
                    articles: true
                },
                assessmentFrequency: 'weekly',
                hideCompletedContent: false,
                showRecommendationsFirst: true
            },
            dashboardSettings: {
                layout: 'grid',
                theme: 'light',
                widgets: this.getDefaultWidgets(),
                quickAccessItems: [],
                showProgressCharts: true,
                showUpcomingReminders: true
            },
            reminderSettings: {
                enabled: false,
                exerciseReminders: {
                    enabled: false,
                    frequency: 'daily',
                    time: '09:00',
                    days: [1, 2, 3, 4, 5], // Weekdays
                    exercises: []
                },
                lifestyleTipReminders: {
                    enabled: false,
                    frequency: 'weekly',
                    time: '10:00',
                    tips: []
                },
                assessmentReminders: {
                    enabled: false,
                    frequency: 'weekly',
                    assessments: []
                },
                customReminders: []
            },
            goalSettings: {
                activeGoals: [],
                completedGoals: [],
                achievementSettings: {
                    showBadges: true,
                    showProgress: true,
                    celebrateAchievements: true
                }
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    private getDefaultWidgets(): DashboardWidget[] {
        return [
            {
                id: 'quick-access',
                type: 'quick-access',
                position: { row: 0, col: 0 },
                size: 'medium',
                visible: true
            },
            {
                id: 'progress',
                type: 'progress',
                position: { row: 0, col: 1 },
                size: 'medium',
                visible: true
            },
            {
                id: 'recommendations',
                type: 'recommendations',
                position: { row: 1, col: 0 },
                size: 'large',
                visible: true
            },
            {
                id: 'goals',
                type: 'goals',
                position: { row: 1, col: 1 },
                size: 'medium',
                visible: true
            }
        ];
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private loadPreferences(): void {
        // Check if we're in a browser environment
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Merge with defaults to handle new properties
                    const merged = this.mergeWithDefaults(parsed);
                    this.preferencesSignal.set(merged);
                }
            } catch (error) {
                console.warn('Failed to load user preferences:', error);
            }
        }
    }

    private mergeWithDefaults(stored: any): UserPreferences {
        const defaults = this.getDefaultPreferences();
        return {
            ...defaults,
            ...stored,
            contentPreferences: { ...defaults.contentPreferences, ...stored.contentPreferences },
            dashboardSettings: { ...defaults.dashboardSettings, ...stored.dashboardSettings },
            reminderSettings: { ...defaults.reminderSettings, ...stored.reminderSettings },
            goalSettings: { ...defaults.goalSettings, ...stored.goalSettings },
            updatedAt: new Date()
        };
    }

    private savePreferences(): void {
        // Check if we're in a browser environment
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            try {
                const current = this.preferencesSignal();
                current.updatedAt = new Date();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));
            } catch (error) {
                console.error('Failed to save user preferences:', error);
            }
        }
    }

    // Content Preferences Methods
    updateContentPreferences(preferences: Partial<ContentPreferences>): void {
        this.preferencesSignal.update(current => ({
            ...current,
            contentPreferences: { ...current.contentPreferences, ...preferences }
        }));
        this.savePreferences();
    }

    toggleContentType(type: keyof ContentPreferences['contentTypes']): void {
        this.preferencesSignal.update(current => ({
            ...current,
            contentPreferences: {
                ...current.contentPreferences,
                contentTypes: {
                    ...current.contentPreferences.contentTypes,
                    [type]: !current.contentPreferences.contentTypes[type]
                }
            }
        }));
        this.savePreferences();
    }

    // Dashboard Settings Methods
    updateDashboardSettings(settings: Partial<DashboardSettings>): void {
        this.preferencesSignal.update(current => ({
            ...current,
            dashboardSettings: { ...current.dashboardSettings, ...settings }
        }));
        this.savePreferences();
    }

    updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
        this.preferencesSignal.update(current => ({
            ...current,
            dashboardSettings: {
                ...current.dashboardSettings,
                widgets: current.dashboardSettings.widgets.map(widget =>
                    widget.id === widgetId ? { ...widget, ...updates } : widget
                )
            }
        }));
        this.savePreferences();
    }

    addQuickAccessItem(itemId: string): void {
        this.preferencesSignal.update(current => ({
            ...current,
            dashboardSettings: {
                ...current.dashboardSettings,
                quickAccessItems: [...current.dashboardSettings.quickAccessItems, itemId]
            }
        }));
        this.savePreferences();
    }

    removeQuickAccessItem(itemId: string): void {
        this.preferencesSignal.update(current => ({
            ...current,
            dashboardSettings: {
                ...current.dashboardSettings,
                quickAccessItems: current.dashboardSettings.quickAccessItems.filter(id => id !== itemId)
            }
        }));
        this.savePreferences();
    }

    // Reminder Settings Methods
    updateReminderSettings(settings: Partial<ReminderSettings>): void {
        this.preferencesSignal.update(current => ({
            ...current,
            reminderSettings: { ...current.reminderSettings, ...settings }
        }));
        this.savePreferences();
    }

    // Goal Methods
    addGoal(goal: Omit<PersonalGoal, 'id' | 'createdAt' | 'updatedAt'>): void {
        const newGoal: PersonalGoal = {
            ...goal,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.preferencesSignal.update(current => ({
            ...current,
            goalSettings: {
                ...current.goalSettings,
                activeGoals: [...current.goalSettings.activeGoals, newGoal]
            }
        }));
        this.savePreferences();
    }

    updateGoal(goalId: string, updates: Partial<PersonalGoal>): void {
        this.preferencesSignal.update(current => ({
            ...current,
            goalSettings: {
                ...current.goalSettings,
                activeGoals: current.goalSettings.activeGoals.map(goal =>
                    goal.id === goalId ? { ...goal, ...updates, updatedAt: new Date() } : goal
                )
            }
        }));
        this.savePreferences();
    }

    completeGoal(goalId: string): void {
        this.preferencesSignal.update(current => {
            const goalIndex = current.goalSettings.activeGoals.findIndex(g => g.id === goalId);
            if (goalIndex === -1) return current;

            const goal = current.goalSettings.activeGoals[goalIndex];
            const completedGoal = { ...goal, status: 'completed' as const, updatedAt: new Date() };

            return {
                ...current,
                goalSettings: {
                    ...current.goalSettings,
                    activeGoals: current.goalSettings.activeGoals.filter(g => g.id !== goalId),
                    completedGoals: [...current.goalSettings.completedGoals, completedGoal]
                }
            };
        });
        this.savePreferences();
    }

    updateGoalProgress(goalId: string, progress: number): void {
        this.updateGoal(goalId, { currentValue: progress });
    }

    // Utility Methods
    resetToDefaults(): void {
        this.preferencesSignal.set(this.getDefaultPreferences());
        this.savePreferences();
    }

    exportPreferences(): string {
        return JSON.stringify(this.preferencesSignal(), null, 2);
    }

    importPreferences(data: string): boolean {
        try {
            const parsed = JSON.parse(data);
            const merged = this.mergeWithDefaults(parsed);
            this.preferencesSignal.set(merged);
            this.savePreferences();
            return true;
        } catch (error) {
            console.error('Failed to import preferences:', error);
            return false;
        }
    }
}