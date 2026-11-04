export type QuestionType =
  | 'multiple_choice'
  | 'word_cloud'
  | 'short_answer'
  | 'slide_drawing';

export interface Participant {
  id: string; // socket.id or user session id
  name: string;
  score: number;
  joinedAt: number;
  connected: boolean;
}

export interface MultipleChoiceOptions {
  choices: string[];
  correctIndex?: number; // optional, for scoring
  hasCorrectAnswer?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: MultipleChoiceOptions;
  timeLimitSec?: number;
  status: 'pending' | 'active' | 'closed';
  createdAt: number;
}

export interface Answer {
  id: string;
  questionId: string;
  participantId: string;
  participantName: string;
  content: string; // choice index string, word, text response, or canvas data URL
  submittedAt: number;
  isCorrect?: boolean;
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
  'leave-room': (payload: { code: string }) => void;
}
