export enum AssessmentType {
    PHQ9 = 'PHQ-9',
    PHQ2 = 'PHQ-2',
    GAD7 = 'GAD-7',
    DASS21 = 'DASS-21',
    BDI = 'BDI-II',
    HAMD = 'HAM-D',
    CESD = 'CES-D',
    WHO5 = 'WHO-5',
    PSS = 'PSS-10',
    BURNOUT = 'Burnout Assessment',
    RELATIONSHIP = 'Relationship Health',
    SLEEP = 'Sleep Quality',
    BREAKUP = 'Breakup Recovery',
    GENERAL = 'GENERAL'
}

export enum AssessmentCategory {
    DEPRESSION = 'Depression',
    ANXIETY = 'Anxiety',
    STRESS = 'Stress',
    WELLBEING = 'Well-being',
    COMBINED = 'Combined',
    BURNOUT = 'Burnout',
    RELATIONSHIP = 'Relationship',
    SLEEP = 'Sleep',
    BREAKUP = 'Breakup Recovery'
}

export interface AssessmentQuestion {
    id: number;
    text: string;
    category?: string;
    subcategory?: string;
}

export interface ResponseOption {
    value: number;
    label: string;
}

export interface ScoreInterpretation {
    min: number;
    max: number;
    level: string;
    color: string;
    description: string;
    suggestions: string[];
}

export interface AssessmentConfig {
    id: string;
    type: AssessmentType;
    category: AssessmentCategory;
    title: string;
    description: string;
    instructions: string;
    timeframe?: string;
    questions: AssessmentQuestion[];
    responseOptions: ResponseOption[];
    scoring: ScoreInterpretation[];
    disclaimer: string;
    emergencyHelplines: { name: string; number: string }[];
    safetyQuestionIndex?: number;
    duration: string;
    references?: string[];
}

export interface AssessmentResult {
    assessmentId: string;
    assessmentType: AssessmentType;
    total: number;
    maxScore: number;
    level: string;
    color: string;
    description: string;
    suggestions: string[];
    safetyFlag: boolean;
    completedAt: Date;
    answers: number[];
}
