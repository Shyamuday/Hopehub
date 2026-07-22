import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface AssessmentQuestion {
    id: number;
    text: string;
    category: string;
}

interface AssessmentResult {
    total: number;
    level: string;
    color: string;
    suggestions: string[];
    safetyFlag: boolean;
}

@Component({
    selector: 'app-self-assessment',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './self-assessment.component.html',
    styleUrl: './self-assessment.component.scss'
})
export class SelfAssessmentComponent implements OnInit {
    // Signal-based state
    assessmentStarted = signal(false);
    showResults = signal(false);
    currentQuestion = signal(0);
    answers = signal<number[]>([]);
    result = signal<AssessmentResult>({
        total: 0,
        level: '',
        color: '',
        suggestions: [],
        safetyFlag: false
    });

    // Make Math available in template
    Math = Math;

    responseOptions = signal<string[]>([
        'Not at all',
        'Several days',
        'More than half the days',
        'Nearly every day'
    ]);

    questions = signal<AssessmentQuestion[]>([
        { id: 1, text: 'Little interest or pleasure in doing things', category: 'mood' },
        { id: 2, text: 'Feeling sad, low, or empty', category: 'mood' },
        { id: 3, text: 'Feeling tired or having very low energy', category: 'energy' },
        { id: 4, text: 'Difficulty getting started with daily tasks', category: 'energy' },
        { id: 5, text: 'Feeling hopeless about the future', category: 'thoughts' },
        { id: 6, text: 'Feeling bad about yourself or feeling like a failure', category: 'thoughts' },
        { id: 7, text: 'Feeling nervous, anxious, or on edge', category: 'anxiety' },
        { id: 8, text: 'Trouble relaxing or constant overthinking', category: 'anxiety' },
        { id: 9, text: 'Trouble falling asleep, staying asleep, or sleeping too much', category: 'sleep' },
        { id: 10, text: 'Difficulty concentrating on work or daily activities', category: 'focus' },
        { id: 11, text: 'Avoiding people or withdrawing from social interaction', category: 'social' },
        { id: 12, text: 'Thoughts that life is not worth living', category: 'safety' }
    ]);

    ngOnInit() {
        this.answers.set(new Array(this.questions().length).fill(undefined));
    }

    startAssessment() {
        this.assessmentStarted.set(true);
        this.currentQuestion.set(0);
    }

    nextQuestion() {
        const current = this.currentQuestion();
        if (current < this.questions().length - 1) {
            this.currentQuestion.set(current + 1);
        }
    }

    previousQuestion() {
        const current = this.currentQuestion();
        if (current > 0) {
            this.currentQuestion.set(current - 1);
        }
    }

    selectAnswer(value: number) {
        const current = this.currentQuestion();
        const answersArray = [...this.answers()];
        answersArray[current] = value;
        this.answers.set(answersArray);
    }

    calculateResults() {
        const answersArray = this.answers();
        const total = answersArray.reduce((sum, answer) => sum + (answer || 0), 0);
        const safetyFlag = answersArray[11] >= 1; // Last question about self-harm thoughts

        let level = '';
        let color = '';
        let suggestions: string[] = [];

        if (total <= 4) {
            level = 'Emotional Well-being Looks Stable';
            color = 'green';
            suggestions = [
                'Maintain your healthy routines',
                'Practice gratitude or journaling',
                'Continue regular sleep and physical activity',
                'Stay connected with supportive people'
            ];
        } else if (total <= 9) {
            level = 'Mild Emotional Distress';
            color = 'yellow';
            suggestions = [
                'Try breathing exercises and mindfulness',
                'Engage in light physical activity',
                'Reduce screen time, especially at night',
                'Talk to a trusted friend or family member',
                'Consider establishing a daily routine'
            ];
        } else if (total <= 14) {
            level = 'Moderate Emotional Distress';
            color = 'orange';
            suggestions = [
                'Create a structured daily routine',
                'Practice mindfulness or meditation regularly',
                'Consider professional guidance or counseling',
                'Avoid isolation - stay connected with others',
                'Focus on basic self-care: sleep, nutrition, exercise'
            ];
        } else if (total <= 19) {
            level = 'High Emotional Distress';
            color = 'red';
            suggestions = [
                'Strongly consider professional mental health support',
                'Reach out to a counselor or therapist',
                'Talk to someone you trust today',
                'Focus on immediate self-care and safety',
                'Consider contacting a mental health helpline'
            ];
        } else {
            level = 'Very High Emotional Distress';
            color = 'red';
            suggestions = [
                'Please seek professional help immediately',
                'Contact a mental health professional today',
                'Reach out to emergency services if needed',
                'Talk to someone you trust right now',
                'Remember: this is temporary and help is available'
            ];
        }

        this.result.set({ total, level, color, suggestions, safetyFlag });
        this.showResults.set(true);
    }

    retakeAssessment() {
        this.assessmentStarted.set(false);
        this.showResults.set(false);
        this.currentQuestion.set(0);
        this.answers.set(new Array(this.questions().length).fill(undefined));
    }
}
