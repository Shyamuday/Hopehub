export interface SupportGroup {
    id: string;
    name: string;
    description: string;
    category: 'depression' | 'anxiety' | 'stress' | 'general' | 'addiction' | 'grief' | 'relationships';
    memberCount: number;
    isActive: boolean;
    moderator: string;
    meetingSchedule: string;
    tags: string[];
    createdAt: Date;
    lastActivity: Date;
}

export interface PeerMatch {
    id: string;
    userId: string;
    matchedUserId: string;
    matchScore: number;
    commonInterests: string[];
    matchType: 'buddy' | 'mentor' | 'mentee';
    status: 'pending' | 'active' | 'completed' | 'declined';
    createdAt: Date;
    lastInteraction: Date;
}

export interface SuccessStory {
    id: string;
    title: string;
    content: string;
    category: 'recovery' | 'milestone' | 'breakthrough' | 'lifestyle' | 'relationship' | 'career';
    tags: string[];
    upvotes: number;
    isAnonymous: boolean;
    authorPseudonym: string;
    submittedAt: Date;
    isVerified: boolean;
    inspirationLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface CommunityChallenge {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly';
    category: 'mindfulness' | 'exercise' | 'social' | 'self-care' | 'learning';
    startDate: Date;
    endDate: Date;
    participants: number;
    goals: ChallengeGoal[];
    rewards: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    isActive: boolean;
}

export interface ChallengeGoal {
    id: string;
    description: string;
    targetValue: number;
    unit: string;
    isCompleted: boolean;
}

export interface CommunityUser {
    id: string;
    pseudonym: string;
    joinDate: Date;
    interests: string[];
    supportAreas: string[];
    mentorshipRole: 'none' | 'mentor' | 'mentee' | 'both';
    participationLevel: 'observer' | 'participant' | 'active' | 'leader';
    badges: string[];
    totalContributions: number;
}