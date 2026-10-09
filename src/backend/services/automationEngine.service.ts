import { getPrisma } from '../db.js';

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface RuleAction {
  type: 'create_notification' | 'create_task' | 'update_task_status' | 'log_event';
  params: Record<string, any>;
}

export class AutomationEngineService {
  /**
   * Evaluates and executes matching rules based on an event trigger
   */
  static async triggerEvent(userId: string, triggerType: string, eventContext: Record<string, any>) {
    const prisma = getPrisma();

    // 1. Fetch active rules for this user and trigger
    const rules = await prisma.automationRule.findMany({
      where: {
        userId,
        active: true,
        triggerType
      }
    });

    if (!rules || rules.length === 0) {
      return { triggeredCount: 0, executedCount: 0 };
    }

    let executedCount = 0;

    for (const rule of rules) {
      // Check cooldown if configured
      if (rule.cooldownMinutes > 0 && rule.lastExecutedAt) {
        const diffMinutes = (Date.now() - rule.lastExecutedAt.getTime()) / (1000 * 60);
        if (diffMinutes < rule.cooldownMinutes) {
          continue;
        }
      }

      // 2. Evaluate conditions
      let conditions: RuleCondition[] = [];
      try {
        conditions = JSON.parse(rule.conditions || '[]');
      } catch (e) {
        conditions = [];
      }

      const isMatch = this.evaluateConditions(conditions, eventContext);
      if (!isMatch) continue;

      // 3. Execute actions
      let actions: RuleAction[] = [];
      try {
        actions = JSON.parse(rule.actions || '[]');
      } catch (e) {
        actions = [];
      }

      const executionStartTime = Date.now();
      let status = 'Success';
      let errorMsg: string | null = null;
      const executionResults: any[] = [];

      try {
        for (const action of actions) {
          const res = await this.executeAction(userId, action, eventContext);
          executionResults.push(res);
        }
        executedCount++;
      } catch (err: any) {
        status = 'Failed';
        errorMsg = err.message || 'Action execution error';
      }

      // 4. Update Rule stats and save execution record in PostgreSQL
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          executionCount: rule.executionCount + 1,
          lastExecutedAt: new Date()
        }
      });

      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          userId,
          status,
          triggerData: JSON.stringify(eventContext),
          resultData: JSON.stringify(executionResults),
          error: errorMsg,
          executedAt: new Date()
        }
      });
    }

    return { triggeredCount: rules.length, executedCount };
  }

  private static evaluateConditions(conditions: RuleCondition[], context: Record<string, any>): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(c => {
      const actualValue = context[c.field];
      switch (c.operator) {
        case 'equals':
          return String(actualValue) === String(c.value);
        case 'not_equals':
          return String(actualValue) !== String(c.value);
        case 'greater_than':
          return Number(actualValue) > Number(c.value);
        case 'less_than':
          return Number(actualValue) < Number(c.value);
        case 'contains':
          return String(actualValue || '').toLowerCase().includes(String(c.value || '').toLowerCase());
        default:
          return true;
      }
    });
  }

  private static async executeAction(userId: string, action: RuleAction, context: Record<string, any>) {
    const prisma = getPrisma();

    switch (action.type) {
      case 'create_notification': {
        const title = action.params.title || 'LifeOS Tự động hóa';
        const message = action.params.message || `Kích hoạt tự động bởi hệ thống (${JSON.stringify(context)})`;
        return await prisma.notification.create({
          data: {
            userId,
            title,
            message,
            type: 'automation',
            read: false,
            date: new Date()
          }
        });
      }

      case 'create_task': {
        const title = action.params.title || 'Nhiệm vụ tự động';
        return await prisma.task.create({
          data: {
            userId,
            title,
            description: action.params.description || 'Được sinh tự động qua Automation Rule',
            status: 'Chưa làm',
            priority: action.params.priority || 'Trung bình',
            dueDate: action.params.dueDate || new Date().toISOString().split('T')[0]
          }
        });
      }

      case 'update_task_status': {
        if (context.taskId && action.params.newStatus) {
          return await prisma.task.updateMany({
            where: { id: context.taskId, userId },
            data: { status: action.params.newStatus }
          });
        }
        break;
      }

      case 'log_event':
      default:
        return { logged: true, timestamp: new Date().toISOString() };
    }
  }
}
