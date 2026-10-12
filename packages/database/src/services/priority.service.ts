import { TaskModel } from '../models/index.js';
import type { PriorityItem, Task } from '@trackmate/shared';
import { toTask } from './task.service.js';

const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 40,
  high:     30,
  medium:   20,
  low:      10,
};

const STATUS_WEIGHTS: Record<string, number> = {
  blocked:     15, // blocked tasks need immediate resolution
  in_progress: 10, // momentum
  in_review:    5,
  todo:         3,
  done:         0,
};

function computeUrgency(task: {
  priority: string;
  status: string;
  dueDate: string | null;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const pScore = PRIORITY_WEIGHTS[task.priority] ?? 0;
  score += pScore;
  reasons.push(`Priority: ${task.priority} (+${pScore})`);

  const sScore = STATUS_WEIGHTS[task.status] ?? 0;
  score += sScore;
  if (task.status === 'blocked') reasons.push('Blocked — needs attention (+15)');
  if (task.status === 'in_progress') reasons.push('In progress — maintain momentum (+10)');

  if (task.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    const daysDiff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

    if (daysDiff < 0) {
      score += 50;
      reasons.push(`Overdue by ${Math.abs(daysDiff)} day(s) (+50)`);
    } else if (daysDiff === 0) {
      score += 45;
      reasons.push('Due today (+45)');
    } else if (daysDiff === 1) {
      score += 35;
      reasons.push('Due tomorrow (+35)');
    } else if (daysDiff <= 3) {
      score += 25;
      reasons.push(`Due in ${daysDiff} days (+25)`);
    } else if (daysDiff <= 7) {
      score += 15;
      reasons.push(`Due within 1 week (+15)`);
    }
  }

  return { score, reasons };
}

export class PriorityService {
  /**
   * Compute today's top daily priorities using weighted priority scoring
   */
  static async getDailyPriorities(options?: {
    projectId?: string | undefined;
    limit?: number | undefined;
  }): Promise<{ date: string; topPriorities: PriorityItem[]; message: string }> {
    const limit = options?.limit ?? 5;
    const query: Record<string, any> = { status: { $ne: 'done' } };

    if (options?.projectId) {
      query['projectId'] = options.projectId;
    }

    const docs = await TaskModel.find(query);
    const tasks: Task[] = docs.map(toTask);

    const scoredItems: PriorityItem[] = tasks
      .map((t) => {
        const { score, reasons } = computeUrgency(t);
        return {
          task: t,
          score,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return {
      date: todayStr,
      topPriorities: scoredItems,
      message: `Here are your top ${scoredItems.length} priorities for today.`,
    };
  }
}
