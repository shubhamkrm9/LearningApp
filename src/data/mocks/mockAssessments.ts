import type { Assessment, Question, AssessmentResult } from '@shared/types/models';

export const mockQuestions: Record<string, Question[]> = {
  'a-l1': [
    {
      id: 'q1',
      assessmentId: 'a-l1',
      text: 'What is the primary purpose of Redux in a React Native app?',
      choices: [
        { id: 'c1', text: 'To manage local component state' },
        { id: 'c2', text: 'To style components' },
        { id: 'c3', text: 'To manage global application state' },
        { id: 'c4', text: 'To handle navigation' },
      ],
    },
    {
      id: 'q2',
      assessmentId: 'a-l1',
      text: 'Which hook should be used to dispatch actions in React Redux?',
      choices: [
        { id: 'c5', text: 'useSelector' },
        { id: 'c6', text: 'useDispatch' },
        { id: 'c7', text: 'useReducer' },
        { id: 'c8', text: 'useStore' },
      ],
    },
    {
      id: 'q3',
      assessmentId: 'a-l1',
      text: 'In Redux Toolkit, what does createSlice automatically generate?',
      choices: [
        { id: 'c9', text: 'React Components' },
        { id: 'c10', text: 'Action creators and action types' },
        { id: 'c11', text: 'API endpoints' },
        { id: 'c12', text: 'Navigation routes' },
      ],
    },
  ],
  'a-l3': [
    {
      id: 'q4',
      assessmentId: 'a-l3',
      text: 'What is the role of NavigationContainer in React Navigation?',
      choices: [
        { id: 'c13', text: 'Renders individual screens' },
        { id: 'c14', text: 'Wraps the entire navigation tree and manages state' },
        { id: 'c15', text: 'Defines bottom tab layout' },
        { id: 'c16', text: 'Handles deep links only' },
      ],
    },
    {
      id: 'q5',
      assessmentId: 'a-l3',
      text: 'Which navigator type is best for a login → home flow?',
      choices: [
        { id: 'c17', text: 'Tab Navigator' },
        { id: 'c18', text: 'Drawer Navigator' },
        { id: 'c19', text: 'Stack Navigator' },
        { id: 'c20', text: 'Material Top Tab Navigator' },
      ],
    },
  ],
};

export const mockAssessments: Assessment[] = [
  {
    id: 'a-l1',
    videoId: 'l1',
    moduleId: 'm1',
    title: 'Welcome to React Native - Quiz',
    totalQuestions: 3,
    durationMinutes: 10,
    passingScorePercent: 75,
    questions: mockQuestions['a-l1'] || [],
  },
  {
    id: 'a-l3',
    videoId: 'l3',
    moduleId: 'm1',
    title: 'React Navigation Fundamentals - Quiz',
    totalQuestions: 2,
    durationMinutes: 5,
    passingScorePercent: 75,
    questions: mockQuestions['a-l3'] || [],
  },
];

/**
 * Mock grading: maps questionId → correct choiceId.
 * In production, the backend grades answers — this is only for offline/mock testing.
 */
export const correctAnswers: Record<string, string> = {
  q1: 'c3', // "To manage global application state"
  q2: 'c6', // "useDispatch"
  q3: 'c10', // "Action creators and action types"
  q4: 'c14', // "Wraps the entire navigation tree"
  q5: 'c19', // "Stack Navigator"
};

export const mockResults: Record<string, AssessmentResult> = {};
