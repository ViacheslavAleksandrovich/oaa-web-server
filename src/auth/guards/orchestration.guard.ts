import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../../entities/user.entity';
import {
  OrchestrationService,
  AuthContext,
} from '../orchestration/orchestration.service';
import {
  ORCHESTRATION_KEY,
  OrchestrationOptions,
} from '../decorators/orchestration.decorator';

@Injectable()
export class OrchestrationGuard implements CanActivate {
  private readonly logger = new Logger(OrchestrationGuard.name);

  constructor(
    private reflector: Reflector,
    private orchestrationService: OrchestrationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const orchestrationOptions =
      this.reflector.getAllAndOverride<OrchestrationOptions>(
        ORCHESTRATION_KEY,
        [context.getHandler(), context.getClass()],
      );

    // Якщо метод не потребує оркестрації, пропускаємо
    if (!orchestrationOptions || orchestrationOptions.skipOrchestration) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: User }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      // Збираємо контекст для оркестрації
      const authContext: AuthContext = {
        user,
        resource: orchestrationOptions.resource,
        action: orchestrationOptions.action,
        riskLevel: orchestrationOptions.riskLevel,
        metadata: {
          ipAddress: this.getClientIP(request),
          userAgent: request.headers['user-agent'],
          method: request.method,
          endpoint: request.path,
          body: request.body,
          params: request.params,
          query: request.query,
          deviceFingerprint: request.headers['x-device-fingerprint'],
          sessionId: request.headers['x-session-id'],
          amount: request.body?.amount || request.query?.amount,
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(
        `Orchestrating authorization for user ${user.id} on ${orchestrationOptions.resource}:${orchestrationOptions.action}`,
      );

      // Викликаємо оркестрацію
      const decision =
        await this.orchestrationService.orchestrateAuthorization(authContext);

      if (!decision.allowed) {
        this.logger.warn(
          `Access denied for user ${user.id}: ${decision.reason}`,
          { decision, context: authContext },
        );
        throw new ForbiddenException(decision.reason);
      }

      // Зберігаємо результат оркестрації в request для подальшого використання
      request.orchestrationDecision = decision;

      // Якщо потрібна додаткова аутентифікація, відмічаємо це
      if (
        decision.sessionRequirements?.requireMFA ||
        decision.sessionRequirements?.requireReauth
      ) {
        // Перевіряємо, чи пройшов користувач MFA
        const mfaPassed = request.headers['x-mfa-verified'] === 'true';
        if (
          (decision.sessionRequirements.requireMFA ||
            decision.sessionRequirements.requireReauth) &&
          !mfaPassed
        ) {
          throw new ForbiddenException('Multi-factor authentication required');
        }
      }

      this.logger.log(
        `Access granted for user ${user.id} with risk score ${decision.riskAssessment?.score}`,
        { decision },
      );

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        `Orchestration error for user ${user?.id}: ${error.message}`,
        error.stack,
      );

      throw new ForbiddenException(
        'Authorization failed due to internal error',
      );
    }
  }

  private getClientIP(request: Request): string {
    return (request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown') as string;
  }
}

// Розширюємо Request інтерфейс для збереження результату оркестрації
declare global {
  namespace Express {
    interface Request {
      user?: User;
      orchestrationDecision?: import('../orchestration/orchestration.service').AuthDecision;
    }
  }
}
