export enum SessionState {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  REFRESHING = 'REFRESHING',
  LOGGED_OUT = 'LOGGED_OUT',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED'
}

export interface SessionTimelineEvent {
  state: SessionState;
  timestamp: number;
  reason?: string;
}

export interface SessionData {
  sessionId: string;
  deviceId: string;
  userId: string;
  currentState: SessionState;
  timeline: SessionTimelineEvent[];
}

class SessionStore {
  private db = new Map<string, SessionData>();

  public createSession(sessionId: string, deviceId: string, userId: string): void {
    this.db.set(sessionId, {
      sessionId,
      deviceId,
      userId,
      currentState: SessionState.CREATED,
      timeline: [{ state: SessionState.CREATED, timestamp: Date.now() }]
    });
  }

  public getSession(sessionId: string): SessionData | undefined {
    return this.db.get(sessionId);
  }

  public updateState(sessionId: string, newState: SessionState, reason?: string): void {
    const session = this.db.get(sessionId);
    if (session) {
      session.currentState = newState;
      session.timeline.push({ state: newState, timestamp: Date.now(), reason });
      this.db.set(sessionId, session);
    }
  }

  public getAll(): SessionData[] {
    return Array.from(this.db.values());
  }
}

export const sessionStore = new SessionStore();
