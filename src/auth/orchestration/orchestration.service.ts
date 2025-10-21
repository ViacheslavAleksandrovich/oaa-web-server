import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { UserRole, AuditAction, KycStatus } from '../../common/enums';

export interface AuthContext {
  user: User;
  resource: string;
  action: string;
  metadata?: Record<string, any>;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuthDecision {
  allowed: boolean;
  reason: string;
  additionalChecks?: string[];
  riskAssessment?: RiskAssessment;
  sessionRequirements?: SessionRequirements;
}

export interface RiskAssessment {
  score: number;
  factors: string[];
  recommendation: 'ALLOW' | 'CHALLENGE' | 'DENY' | 'MONITOR';
}

export interface SessionRequirements {
  requireMFA?: boolean;
  maxSessionDuration?: number;
  requireReauth?: boolean;
  monitoringLevel?: 'STANDARD' | 'ENHANCED' | 'STRICT';
}

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Основний метод оркестрації - координує всі перевірки авторизації
   */
  async orchestrateAuthorization(context: AuthContext): Promise<AuthDecision> {
    this.logger.log(
      `Orchestrating authorization for user ${context.user.id} on resource ${context.resource}`,
    );

    try {
      // 1. Базова перевірка ролей
      const roleCheck = await this.checkRoleBasedAccess(context);
      if (!roleCheck.allowed) {
        await this.logAuthEvent(context, 'ROLE_CHECK_FAILED', roleCheck.reason);
        return roleCheck;
      }

      // 2. Контекстуальна авторизація
      const contextCheck = await this.checkContextualAccess(context);
      if (!contextCheck.allowed) {
        await this.logAuthEvent(
          context,
          'CONTEXT_CHECK_FAILED',
          contextCheck.reason,
        );
        return contextCheck;
      }

      // 3. Оцінка ризиків
      const riskAssessment = await this.assessRisk(context);

      // 4. Перевірка обмежень сесії
      const sessionCheck = await this.checkSessionConstraints(context);

      // 5. Динамічні правила безпеки
      const dynamicCheck = await this.applyDynamicSecurityRules(context);

      // 6. Прийняття фінального рішення
      const finalDecision = this.makeFinalDecision({
        roleCheck,
        contextCheck,
        riskAssessment,
        sessionCheck,
        dynamicCheck,
        context,
      });

      await this.logAuthEvent(
        context,
        finalDecision.allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        finalDecision.reason,
        { decision: finalDecision },
      );

      return finalDecision;
    } catch (error) {
      this.logger.error(
        `Authorization orchestration failed: ${error.message}`,
        error.stack,
      );
      await this.logAuthEvent(context, 'ORCHESTRATION_ERROR', error.message);

      return {
        allowed: false,
        reason: 'Internal authorization error',
        riskAssessment: {
          score: 100,
          factors: ['system_error'],
          recommendation: 'DENY',
        },
      };
    }
  }

  /**
   * Перевірка доступу на основі ролей (RBAC)
   */
  private async checkRoleBasedAccess(
    context: AuthContext,
  ): Promise<AuthDecision> {
    const { user, resource, action } = context;

    // Матриця дозволів для різних ролей
    const permissions = {
      [UserRole.CLIENT]: {
        'banking/accounts': ['read', 'create'],
        'banking/transactions': ['read', 'create'],
        profile: ['read', 'update'],
        dashboard: ['read'],
      },
      [UserRole.ACCOUNT_MANAGER]: {
        'banking/accounts': ['read', 'create', 'update', 'approve'],
        'banking/transactions': ['read', 'create', 'approve'],
        customer: ['read', 'update'],
        reports: ['read'],
        dashboard: ['read'],
      },
      [UserRole.COMPLIANCE_OFFICER]: {
        'banking/accounts': ['read', 'suspend', 'investigate'],
        'banking/transactions': ['read', 'investigate', 'flag'],
        audit: ['read', 'export'],
        compliance: ['read', 'update'],
        reports: ['read', 'export'],
        dashboard: ['read'],
      },
      [UserRole.BANK_ADMIN]: {
        '*': ['*'], // Повний доступ
      },
    };

    const userPermissions = permissions[user.role] || {};
    const resourcePermissions =
      userPermissions[resource] || userPermissions['*'] || [];

    const hasAccess =
      resourcePermissions.includes(action) || resourcePermissions.includes('*');

    return {
      allowed: hasAccess,
      reason: hasAccess
        ? `Role ${user.role} has ${action} access to ${resource}`
        : `Role ${user.role} lacks ${action} access to ${resource}`,
    };
  }

  /**
   * Контекстуальна авторизація (час, локація, пристрій)
   */
  private async checkContextualAccess(
    context: AuthContext,
  ): Promise<AuthDecision> {
    const { user, metadata } = context;
    const restrictions = [];

    // Перевірка часових обмежень
    if (user.role === UserRole.CLIENT) {
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        restrictions.push(
          'Banking operations restricted during night hours (6 AM - 10 PM)',
        );
      }
    }

    // Перевірка IP-адреси (географічні обмеження)
    if (metadata?.ipAddress) {
      const suspiciousIPs = ['192.168.1.100', '10.0.0.50']; // Приклад підозрілих IP
      if (suspiciousIPs.includes(metadata.ipAddress)) {
        restrictions.push('Access from suspicious IP address');
      }
    }

    // Перевірка пристрою
    if (metadata?.deviceFingerprint) {
      const trustedDevices = user.metadata?.trustedDevices || [];
      if (!trustedDevices.includes(metadata.deviceFingerprint)) {
        restrictions.push('Access from unrecognized device');
      }
    }

    return {
      allowed: restrictions.length === 0,
      reason:
        restrictions.length === 0
          ? 'All contextual checks passed'
          : restrictions.join('; '),
      additionalChecks: restrictions,
    };
  }

  /**
   * Оцінка ризиків на основі поведінкового аналізу
   */
  private async assessRisk(context: AuthContext): Promise<RiskAssessment> {
    const { user, action, metadata } = context;
    let riskScore = 0;
    const riskFactors = [];

    // Аналіз частоти операцій
    const recentActions = await this.getRecentUserActions(user.id, 1); // за останню годину
    if (recentActions > 50) {
      riskScore += 30;
      riskFactors.push('high_frequency_operations');
    }

    // Аналіз типу операції
    const highRiskActions = ['transfer', 'withdraw', 'delete', 'admin'];
    if (highRiskActions.includes(action)) {
      riskScore += 20;
      riskFactors.push('high_risk_operation');
    }

    // Аналіз суми транзакції
    if (metadata?.amount && metadata.amount > 100000) {
      riskScore += 25;
      riskFactors.push('large_transaction_amount');
    }

    // Аналіз часу дії
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      riskScore += 15;
      riskFactors.push('unusual_time_access');
    }

    // Аналіз локації
    if (metadata?.ipAddress) {
      const knownBadIPs = ['192.168.1.100'];
      if (knownBadIPs.includes(metadata.ipAddress)) {
        riskScore += 40;
        riskFactors.push('suspicious_ip_address');
      }
    }

    // Перевірка статусу KYC
    if (user.kycStatus !== KycStatus.APPROVED) {
      riskScore += 20;
      riskFactors.push('incomplete_kyc');
    }

    // Визначення рекомендації
    let recommendation: 'ALLOW' | 'CHALLENGE' | 'DENY' | 'MONITOR';
    if (riskScore >= 70) recommendation = 'DENY';
    else if (riskScore >= 50) recommendation = 'CHALLENGE';
    else if (riskScore >= 30) recommendation = 'MONITOR';
    else recommendation = 'ALLOW';

    return {
      score: riskScore,
      factors: riskFactors,
      recommendation,
    };
  }

  /**
   * Перевірка обмежень сесії
   */
  private async checkSessionConstraints(
    context: AuthContext,
  ): Promise<SessionRequirements> {
    const { user, action } = context;
    const requirements: SessionRequirements = {
      monitoringLevel: 'STANDARD',
    };

    // Для високоризикових операцій
    const highRiskActions = ['transfer', 'withdraw', 'admin', 'delete'];
    if (highRiskActions.includes(action)) {
      requirements.requireMFA = true;
      requirements.maxSessionDuration = 30 * 60; // 30 хвилин
      requirements.monitoringLevel = 'ENHANCED';
    }

    // Для адміністративних ролей
    if (
      [UserRole.BANK_ADMIN, UserRole.COMPLIANCE_OFFICER].includes(user.role)
    ) {
      requirements.requireMFA = true;
      requirements.maxSessionDuration = 60 * 60; // 1 година
      requirements.monitoringLevel = 'STRICT';
    }

    // Для операцій з великими сумами
    if (context.metadata?.amount && context.metadata.amount > 50000) {
      requirements.requireReauth = true;
      requirements.monitoringLevel = 'STRICT';
    }

    return requirements;
  }

  /**
   * Застосування динамічних правил безпеки
   */
  private async applyDynamicSecurityRules(
    context: AuthContext,
  ): Promise<AuthDecision> {
    const { user, action, metadata } = context;

    // Правило: блокування підозрілої активності
    const suspiciousPatterns = await this.detectSuspiciousPatterns(user.id);
    if (suspiciousPatterns.length > 0) {
      return {
        allowed: false,
        reason: `Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`,
      };
    }

    // Правило: обмеження для неверифікованих користувачів
    if (
      user.kycStatus !== KycStatus.APPROVED &&
      action === 'transfer' &&
      metadata?.amount > 10000
    ) {
      return {
        allowed: false,
        reason: 'Large transfers require KYC approval',
      };
    }

    // Правило: обмеження операцій у святкові дні
    const isHoliday = await this.checkIfHoliday();
    if (
      isHoliday &&
      [UserRole.CLIENT].includes(user.role) &&
      ['transfer', 'withdraw'].includes(action)
    ) {
      return {
        allowed: false,
        reason: 'Banking operations limited during holidays',
      };
    }

    return {
      allowed: true,
      reason: 'All dynamic security rules passed',
    };
  }

  /**
   * Прийняття фінального рішення на основі всіх перевірок
   */
  private makeFinalDecision(checks: {
    roleCheck: AuthDecision;
    contextCheck: AuthDecision;
    riskAssessment: RiskAssessment;
    sessionCheck: SessionRequirements;
    dynamicCheck: AuthDecision;
    context: AuthContext;
  }): AuthDecision {
    const {
      roleCheck,
      contextCheck,
      riskAssessment,
      sessionCheck,
      dynamicCheck,
    } = checks;

    // Якщо будь-яка базова перевірка провалилась
    if (!roleCheck.allowed || !contextCheck.allowed || !dynamicCheck.allowed) {
      return {
        allowed: false,
        reason: [roleCheck, contextCheck, dynamicCheck]
          .filter((check) => !check.allowed)
          .map((check) => check.reason)
          .join('; '),
        riskAssessment,
        sessionRequirements: sessionCheck,
      };
    }

    // Рішення на основі оцінки ризиків
    switch (riskAssessment.recommendation) {
      case 'DENY':
        return {
          allowed: false,
          reason: `High risk operation denied (score: ${riskAssessment.score})`,
          riskAssessment,
          sessionRequirements: sessionCheck,
        };

      case 'CHALLENGE':
        return {
          allowed: true,
          reason: 'Access granted with additional security requirements',
          riskAssessment,
          sessionRequirements: {
            ...sessionCheck,
            requireMFA: true,
            requireReauth: true,
            monitoringLevel: 'ENHANCED',
          },
        };

      default:
        return {
          allowed: true,
          reason: 'Authorization granted',
          riskAssessment,
          sessionRequirements: sessionCheck,
        };
    }
  }

  /**
   * Допоміжні методи
   */
  private async getRecentUserActions(
    userId: string,
    hours: number,
  ): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.auditRepository.count({
      where: {
        userId,
        createdAt: MoreThan(since),
      },
    });
  }

  private async detectSuspiciousPatterns(userId: string): Promise<string[]> {
    const patterns = [];

    // Перевірка на багаторазові невдалі спроби
    const failedAttempts = await this.auditRepository.count({
      where: {
        userId,
        action: AuditAction.LOGIN_FAILED,
        createdAt: MoreThan(new Date(Date.now() - 30 * 60 * 1000)), // за останні 30 хвилин
      },
    });

    if (failedAttempts > 5) {
      patterns.push('multiple_failed_login_attempts');
    }

    return patterns;
  }

  private async checkIfHoliday(): Promise<boolean> {
    // Простимулюємо перевірку святкових днів
    const today = new Date();
    const holidays = [
      '2025-01-01', // Новий рік
      '2025-12-25', // Різдво
    ];

    const todayStr = today.toISOString().split('T')[0];
    return holidays.includes(todayStr);
  }

  private async logAuthEvent(
    context: AuthContext,
    action: string,
    details: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.auditRepository.save({
        userId: context.user.id,
        action: action as AuditAction,
        resourceType: 'authorization',
        resourceId: context.resource,
        details,
        metadata: {
          ...context.metadata,
          ...metadata,
          orchestrationStep: action,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error.message}`);
    }
  }
}
