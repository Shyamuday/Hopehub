import { Exercise, ExerciseCategory, ExerciseType } from '../models/exercise.model';
import { BREATHING_EXERCISES } from './exercises/breathing-exercises';
import { MINDFULNESS_EXERCISES } from './exercises/mindfulness-exercises';
import { COGNITIVE_EXERCISES } from './exercises/cognitive-exercises';
import { PHYSICAL_EXERCISES } from './exercises/physical-exercises';
import { BREAKUP_EXERCISES } from './exercises/breakup-exercises';

// Combine all exercises into a single array
export const ALL_EXERCISES: Exercise[] = [
    ...BREATHING_EXERCISES,
    ...MINDFULNESS_EXERCISES,
    ...COGNITIVE_EXERCISES,
    ...PHYSICAL_EXERCISES,
    ...BREAKUP_EXERCISES
];

// Utility functions
export function getExerciseById(exerciseId: string): Exercise | undefined {
    return ALL_EXERCISES.find(exercise => exercise.id === exerciseId);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
    return ALL_EXERCISES.filter(exercise => exercise.category.includes(category));
}

export function getExercisesByType(type: ExerciseType): Exercise[] {
    return ALL_EXERCISES.filter(exercise => exercise.type === type);
}

export function getExercisesByIds(exerciseIds: string[]): Exercise[] {
    return exerciseIds.map(id => getExerciseById(id)).filter(exercise => exercise !== undefined) as Exercise[];
}

export function searchExercises(searchTerm: string): Exercise[] {
    const term = searchTerm.toLowerCase();
    return ALL_EXERCISES.filter(exercise =>
        exercise.title.toLowerCase().includes(term) ||
        exercise.description.toLowerCase().includes(term) ||
        exercise.tags.some(tag => tag.toLowerCase().includes(term)) ||
        exercise.benefits.some(benefit => benefit.toLowerCase().includes(term))
    );
}

// Export individual exercise arrays for specific use cases
export {
    BREATHING_EXERCISES,
    MINDFULNESS_EXERCISES,
    COGNITIVE_EXERCISES,
    PHYSICAL_EXERCISES,
    BREAKUP_EXERCISES
};