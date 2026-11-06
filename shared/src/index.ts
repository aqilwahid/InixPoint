export type QuestionType = 
  | 'multiple_choice' 
  | 'word_cloud' 
  | 'short_answer' 
  | 'slide_drawing'
  | 'matching'
  | 'ranking'
  | 'quick_poll';

export interface Participant {
  id: string; // socket.id or user session id
  name: string;
  score: number;
  joinedAt: number;
  connected: boolean;
  answeredCount?: number; // for leaderboard stats
  correctCount?: number;
  stars?: number; // gamification stars
  totalResponseTimeMs?: number;
  averageSpeedSec?: number; // average response speed in seconds
}

export interface MultipleChoiceOptions {
  choices: string[];
  correctIndex?: number; // optional, for scoring
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
  correctOrder?: string[]; // optional, for scoring
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
  timeStartedAt?: number; // for countdown timer
  status: 'pending' | 'active' | 'closed';
  createdAt: number;
  pointsPerCorrect?: number; // default 10, can be customized
}

export interface Answer {
  id: string;
  questionId: string;
  participantId: string;
  participantName: string;
  content: string; // choice index, word, text, JSON for matching/ranking, or canvas data URL
  submittedAt: number;
  isCorrect?: boolean;
  pointsAwarded?: number; // actual points given (0 or pointsPerCorrect)
  responseDurationSec?: number; // speed in seconds
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
  answers: Record<string, Answer[]>; // questionId -> list of Answers
  createdAt: number;
}

// Socket.io payload contracts
export interface ServerToClientEvents {
  'room-state': (room: Room) => void;
  'participant-joined': (participant: Participant) => void;
  'participant-left': (participantId: string) => void;
  'participant-updated': (participant: Participant) => void;
  'star-awarded': (payload: { participantId: string; count: number; totalStars: number }) => void;
  'question-started': (question: Question) => void;
  'question-closed': (summary: { questionId: string; answers: Answer[] }) => void;
  'answer-received': (answer: Answer) => void;
  'room-closed': () => void;
  'error-message': (msg: string) => void;
}

export interface ClientToServerEvents {
  'create-room': (payload: { title: string }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'join-room': (payload: { code: string; name: string }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'start-question': (payload: { code: string; question: Omit<Question, 'id' | 'status' | 'createdAt'> }) => void;
  'close-question': (payload: { code: string; questionId: string }) => void;
  'submit-answer': (payload: { code: string; questionId: string; content: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'award-star': (payload: { code: string; participantId: string; count?: number }, callback?: (res: { success: boolean; stars?: number; error?: string }) => void) => void;
  'leave-room': (payload: { code: string }) => void;
}
