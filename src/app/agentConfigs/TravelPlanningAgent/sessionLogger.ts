import fs from 'fs';
import path from 'path';

export interface ConversationLogEntry {
  timestamp: string;
  sessionId: string;
  type: 'user_message' | 'agent_response' | 'state_change' | 'tool_call' | 'phase_transition';
  content: string;
  metadata?: any;
}

export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime?: string;
  totalMessages: number;
  phases: string[];
  finalState?: any;
  conversationLog: ConversationLogEntry[];
}

export class SessionLogger {
  private logDir: string;
  private sessionId: string;
  private sessionStartTime: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.sessionStartTime = new Date().toISOString();
    this.logDir = path.join(process.cwd(), 'conversation_logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getSessionLogPath(): string {
    return path.join(this.logDir, `session_${this.sessionId}_conversation.log`);
  }

  private getSessionSummaryPath(): string {
    return path.join(this.logDir, `session_${this.sessionId}_summary.json`);
  }

  public async logUserMessage(message: string, metadata?: any): Promise<void> {
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'user_message',
      content: message,
      metadata
    };
    
    await this.appendToLog(entry);
  }

  public async logAgentResponse(response: string, metadata?: any): Promise<void> {
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'agent_response',
      content: response,
      metadata
    };
    
    await this.appendToLog(entry);
  }

  public async logStateChange(change: string, stateData?: any): Promise<void> {
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'state_change',
      content: change,
      metadata: { stateData }
    };
    
    await this.appendToLog(entry);
  }

  public async logToolCall(toolName: string, args: any, result?: any): Promise<void> {
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'tool_call',
      content: `Tool: ${toolName}`,
      metadata: { args, result }
    };
    
    await this.appendToLog(entry);
  }

  public async logPhaseTransition(fromPhase: string, toPhase: string, reason?: string): Promise<void> {
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'phase_transition',
      content: `Phase transition: ${fromPhase} → ${toPhase}`,
      metadata: { fromPhase, toPhase, reason }
    };
    
    await this.appendToLog(entry);
  }

  private async appendToLog(entry: ConversationLogEntry): Promise<void> {
    try {
      const logPath = this.getSessionLogPath();
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Error writing to conversation log:', error);
    }
  }

  public async getSessionLog(): Promise<ConversationLogEntry[]> {
    try {
      const logPath = this.getSessionLogPath();
      if (!fs.existsSync(logPath)) {
        return [];
      }
      
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error reading session log:', error);
      return [];
    }
  }

  public async createSessionSummary(finalState?: any): Promise<SessionSummary> {
    const conversationLog = await this.getSessionLog();
    const phases = [...new Set(conversationLog
      .filter(entry => entry.type === 'phase_transition')
      .map(entry => entry.metadata?.toPhase)
    )];
    
    const summary: SessionSummary = {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: new Date().toISOString(),
      totalMessages: conversationLog.filter(entry => 
        entry.type === 'user_message' || entry.type === 'agent_response'
      ).length,
      phases,
      finalState,
      conversationLog
    };
    
    try {
      const summaryPath = this.getSessionSummaryPath();
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    } catch (error) {
      console.error('Error writing session summary:', error);
    }
    
    return summary;
  }

  public async getSessionStats(): Promise<{
    totalSessions: number;
    averageSessionLength: number;
    mostCommonPhases: string[];
    recentSessions: string[];
  }> {
    try {
      const files = fs.readdirSync(this.logDir);
      const summaryFiles = files.filter(file => file.endsWith('_summary.json'));
      
      const summaries = summaryFiles.map(file => {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf8');
        return JSON.parse(content);
      });
      
      const totalSessions = summaries.length;
      const averageSessionLength = summaries.reduce((acc, summary) => 
        acc + summary.totalMessages, 0
      ) / totalSessions;
      
      const allPhases = summaries.flatMap(summary => summary.phases);
      const phaseCounts = allPhases.reduce((acc, phase) => {
        acc[phase] = (acc[phase] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonPhases = Object.entries(phaseCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([phase]) => phase);
      
      const recentSessions = summaries
        .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 5)
        .map(summary => summary.sessionId);
      
      return {
        totalSessions,
        averageSessionLength,
        mostCommonPhases,
        recentSessions
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        averageSessionLength: 0,
        mostCommonPhases: [],
        recentSessions: []
      };
    }
  }
}
