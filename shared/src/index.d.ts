export type QuestionType = 'multiple_choice' | 'word_cloud' | 'short_answer' | 'slide_drawing' | 'matching' | 'ranking' | 'quick_poll' | 'live_qna';
export interface Participant {
    id: string;
    name: string;
    score: number;
    joinedAt: number;
    connected: boolean;
    disconnectedAt?: number;
    answeredCount?: number;
    correctCount?: number;
    stars?: number;
    totalResponseTimeMs?: number;
    averageSpeedSec?: number;
}
export interface MultipleChoiceOptions {
    choices: string[];
    correctIndex?: number;
    hasCorrectAnswer?: boolean;
}
export interface MatchingPair {
    id: string;
    left: string;
    right: string;
}
export interface MatchingOptions {
    pairs: MatchingPair[];
}
export interface RankingOptions {
    items: string[];
    correctOrder?: string[];
}
export type QuickPollTemplate = 'likert_5' | 'yes_no' | 'true_false' | 'rating_5';
export interface QuickPollOptionItem {
    id: string;
    label: string;
    emoji: string;
    color: string;
}
export interface QuickPollOptions {
    template: QuickPollTemplate;
    options: QuickPollOptionItem[];
}
export interface Question {
    id: string;
    type: QuestionType;
    prompt: string;
    options?: MultipleChoiceOptions | MatchingOptions | RankingOptions | QuickPollOptions;
    timeLimitSec?: number;
    timeStartedAt?: number;
    status: 'pending' | 'active' | 'closed';
    createdAt: number;
    pointsPerCorrect?: number;
}
export interface Answer {
    id: string;
    questionId: string;
    participantId: string;
    participantName: string;
    content: string;
    submittedAt: number;
    isCorrect?: boolean;
    pointsAwarded?: number;
    responseDurationSec?: number;
    starsEarned?: number;
}
export interface Room {
    code: string;
    title: string;
    hostSocketId: string;
    status: 'waiting' | 'active' | 'finished';
    participants: Record<string, Participant>;
    currentQuestion?: Question;
    questions: Question[];
    answers: Record<string, Answer[]>;
    qna: QnaItem[];
    qnaEnabled: boolean;
    createdAt: number;
}
export interface QnaItem {
    id: string;
    participantId: string;
    participantName: string;
    content: string;
    upvotes: number;
    status: 'open' | 'answered' | 'ignored';
    createdAt: number;
}
export type SlideType = 'pdf_page' | 'activity' | 'result';
export interface DeckSlide {
    id: string;
    type: SlideType;
    title: string;
    pageNumber?: number;
    imageUrl?: string;
    activityConfig?: Omit<Question, 'id' | 'status' | 'createdAt'>;
    autoStart?: boolean;
    resultData?: {
        questionPrompt: string;
        type: QuestionType;
        answersCount: number;
        summary?: string;
    };
}
export interface Deck {
    id: string;
    title: string;
    fileName: string;
    pageCount: number;
    slides: DeckSlide[];
    currentSlideIndex: number;
}
export interface ServerToClientEvents {
    'room-state': (room: Room) => void;
    'participant-joined': (participant: Participant) => void;
    'participant-left': (participantId: string) => void;
    'participant-updated': (participant: Participant) => void;
    'star-awarded': (payload: {
        participantId: string;
        count: number;
        totalStars: number;
    }) => void;
    'question-started': (question: Question) => void;
    'question-closed': (summary: {
        questionId: string;
        answers: Answer[];
    }) => void;
    'answer-received': (answer: Answer) => void;
    'qna-updated': (item: QnaItem) => void;
    'qna-state': (items: QnaItem[]) => void;
    'room-closed': () => void;
    'error-message': (msg: string) => void;
}
export interface ClientToServerEvents {
    'create-room': (payload: {
        title: string;
    }, callback: (res: {
        success: boolean;
        room?: Room;
        hostToken?: string;
        error?: string;
    }) => void) => void;
    'join-room': (payload: {
        code: string;
        name: string;
    }, callback: (res: {
        success: boolean;
        room?: Room;
        sessionToken?: string;
        error?: string;
    }) => void) => void;
    'rejoin-room': (payload: {
        code: string;
        sessionToken: string;
    }, callback: (res: {
        success: boolean;
        room?: Room;
        error?: string;
    }) => void) => void;
    'start-question': (payload: {
        code: string;
        hostToken: string;
        question: Omit<Question, 'id' | 'status' | 'createdAt'>;
    }) => void;
    'close-question': (payload: {
        code: string;
        hostToken: string;
        questionId: string;
    }) => void;
    'submit-answer': (payload: {
        code: string;
        questionId: string;
        content: string;
    }, callback: (res: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'submit-qna': (payload: {
        code: string;
        content: string;
    }, callback: (res: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'upvote-qna': (payload: {
        code: string;
        qnaId: string;
    }, callback?: (res: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'mark-qna': (payload: {
        code: string;
        hostToken: string;
        qnaId: string;
        status: 'answered' | 'ignored' | 'open';
    }) => void;
    'set-qna-enabled': (payload: {
        code: string;
        hostToken: string;
        enabled: boolean;
    }) => void;
    'award-star': (payload: {
        code: string;
        hostToken: string;
        participantId: string;
        count?: number;
    }, callback?: (res: {
        success: boolean;
        stars?: number;
        error?: string;
    }) => void) => void;
    'leave-room': (payload: {
        code: string;
    }) => void;
}
