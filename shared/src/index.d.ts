export type QuestionType = 'multiple_choice' | 'word_cloud' | 'short_answer' | 'slide_drawing' | 'matching' | 'ranking' | 'quick_poll' | 'live_qna' | 'image_upload' | 'plugin_game';
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
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    author: string;
    description?: string;
    views: ('presenter' | 'participant')[];
    participants: {
        min: number;
        max: number;
    };
    scoring: {
        mode: 'points';
        maxPointsPerRound: number;
    };
    config?: Record<string, {
        type: 'integer' | 'string';
        default?: any;
        min?: number;
        max?: number;
        enum?: string[];
    }>;
}
export interface PluginRunConfig {
    pluginId: string;
    manifest: PluginManifest;
    config: Record<string, any>;
    countTowardsLeaderboard: boolean;
    html?: string;
}
export interface Question {
    id: string;
    type: QuestionType;
    prompt: string;
    options?: MultipleChoiceOptions | MatchingOptions | RankingOptions | QuickPollOptions;
    pluginConfig?: PluginRunConfig;
    timeLimitSec?: number;
    timeStartedAt?: number;
    status: 'pending' | 'active' | 'closed';
    createdAt: number;
    pointsPerCorrect?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    correctAnswers?: string[];
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
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'presenter' | 'admin';
    createdAt: number;
}
export interface AuthTokenPayload {
    userId: string;
    email: string;
    role: 'presenter' | 'admin';
}
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    success: boolean;
    user?: User;
    token?: string;
    error?: string;
}
export interface ServerToClientEvents {
    'room-state': (room: Room) => void;
    'participant-joined': (participant: Participant) => void;
    'participant-left': (participantId: string) => void;
    'participant-updated': (participant: Participant) => void;
    'participant-kicked': (participantId: string) => void;
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
    'slide-changed': (slide: {
        index: number;
        title: string;
        imageUrl?: string;
    }) => void;
    'anonymous-mode': (enabled: boolean) => void;
    'plugin-started': (payload: {
        pluginId: string;
        manifest: PluginManifest;
        config: Record<string, any>;
        html: string;
    }) => void;
    'plugin-message': (payload: {
        fromRole: 'presenter' | 'participant';
        senderId: string;
        senderName?: string;
        data: any;
    }) => void;
    'plugin-stopped': (summary?: any) => void;
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
    'broadcast-slide': (payload: {
        code: string;
        hostToken: string;
        slide: {
            index: number;
            title: string;
            imageUrl?: string;
        };
    }, callback?: (res: {
        success: boolean;
        error?: string;
    }) => void) => void;
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
    'close-room': (payload: {
        code: string;
        hostToken: string;
    }) => void;
    'kick-participant': (payload: {
        code: string;
        hostToken: string;
        participantId: string;
    }) => void;
    'leave-room': (payload: {
        code: string;
    }) => void;
    'plugin-message': (payload: {
        code: string;
        target?: 'presenter' | 'all' | string;
        data: any;
    }) => void;
    'plugin-score': (payload: {
        code: string;
        points: number;
        meta?: any;
    }, callback?: (res: {
        success: boolean;
        error?: string;
        pointsAwarded?: number;
    }) => void) => void;
    'plugin-end': (payload: {
        code: string;
        hostToken: string;
        result?: any;
    }) => void;
}
export * from './plugins.js';
