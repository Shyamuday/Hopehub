export interface Meetup {
    id: string;
    title: string;
    description: string;
    date: Date;
    time: string;
    location?: string;
    virtualLink?: string;
    isVirtual: boolean;
    maxAttendees?: number;
}