import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrchestrationGuard } from '../guards/orchestration.guard';
import { OrchestrationService } from './orchestration.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import {
  Orchestrate,
  HighRiskOperation,
  CriticalOperation,
} from '../decorators/orchestration.decorator';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums';

@Controller('orchestration')
@UseGuards(AuthGuard('jwt'), OrchestrationGuard)
export class OrchestrationController {
  constructor(private readonly orchestrationService: OrchestrationService) {}

  /**
   * Демонстрація базової оркестрації
   */
  @Get('demo/basic')
  @Orchestrate({
    resource: 'demo',
    action: 'read',
    riskLevel: 'LOW',
  })
  async basicDemo(@CurrentUser() user: User, @Request() req: any) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Базова оркестрація пройшла успішно',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }

  /**
   * Демонстрація високоризикової операції
   */
  @Post('demo/high-risk')
  @HighRiskOperation('demo', 'high_risk_action')
  async highRiskDemo(
    @Body() data: { amount?: number; description?: string },
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Високоризикова операція виконана',
      data,
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        recommendation: decision.riskAssessment?.recommendation,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }

  /**
   * Демонстрація критично важливої операції
   */
  @Post('demo/critical')
  @CriticalOperation('demo', 'critical_action')
  @Roles(UserRole.BANK_ADMIN, UserRole.ACCOUNT_MANAGER)
  @UseGuards(RolesGuard)
  async criticalDemo(
    @Body() data: { action: string; target?: string },
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Критично важлива операція виконана',
      data,
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        recommendation: decision.riskAssessment?.recommendation,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }

  /**
   * Тестування різних рівнів ризику
   */
  @Post('demo/risk-test')
  @Orchestrate({
    resource: 'demo',
    action: 'risk_test',
    riskLevel: 'MEDIUM',
  })
  async riskTest(
    @Body()
    testData: {
      amount?: number;
      frequency?: number;
      suspiciousActivity?: boolean;
      timeOfDay?: string;
    },
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Тест оцінки ризиків завершено',
      testData,
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        recommendation: decision.riskAssessment?.recommendation,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }

  /**
   * Отримання поточного статусу авторизації користувача
   */
  @Get('status')
  @Orchestrate({
    resource: 'orchestration',
    action: 'status',
    riskLevel: 'LOW',
  })
  async getAuthorizationStatus(@CurrentUser() user: User, @Request() req: any) {
    const decision = req.orchestrationDecision;

    // Отримуємо додаткову інформацію про користувача
    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      kycStatus: user.kycStatus,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      metadata: user.metadata,
    };

    return {
      message: 'Статус авторизації отримано',
      user: userInfo,
      currentSession: {
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        sessionRequirements: decision.sessionRequirements,
        monitoringLevel: decision.sessionRequirements?.monitoringLevel,
      },
      orchestrationResult: decision,
    };
  }

  /**
   * Симуляція підозрілої активності
   */
  @Post('demo/suspicious')
  @Orchestrate({
    resource: 'demo',
    action: 'suspicious_activity',
    riskLevel: 'HIGH',
  })
  async suspiciousActivityDemo(
    @Body()
    data: {
      rapidRequests?: boolean;
      unusualLocation?: boolean;
      largeAmount?: number;
      offHours?: boolean;
    },
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Тест підозрілої активності',
      warning:
        decision.riskAssessment?.recommendation === 'DENY'
          ? 'Операцію ЗАБЛОКОВАНО через високий ризик!'
          : 'Операцію дозволено з додатковим моніторингом',
      data,
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        recommendation: decision.riskAssessment?.recommendation,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }

  /**
   * Демонстрація контекстуальної авторизації
   */
  @Post('demo/contextual')
  @Orchestrate({
    resource: 'demo',
    action: 'contextual_access',
    riskLevel: 'MEDIUM',
  })
  async contextualDemo(
    @Body()
    context: {
      deviceFingerprint?: string;
      location?: string;
      timeZone?: string;
    },
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const decision = req.orchestrationDecision;

    return {
      message: 'Контекстуальна авторизація виконана',
      context: {
        ...context,
        detectedIP: req.ip,
        userAgent: req.headers['user-agent'],
        timeOfRequest: new Date().toISOString(),
      },
      orchestrationResult: {
        allowed: decision.allowed,
        reason: decision.reason,
        riskScore: decision.riskAssessment?.score,
        riskFactors: decision.riskAssessment?.factors,
        additionalChecks: decision.additionalChecks,
        sessionRequirements: decision.sessionRequirements,
      },
    };
  }
}
