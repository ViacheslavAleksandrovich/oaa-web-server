import { SetMetadata } from '@nestjs/common';

export const ORCHESTRATION_KEY = 'orchestration';

export interface OrchestrationOptions {
  resource: string;
  action: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requireMFA?: boolean;
  skipOrchestration?: boolean;
  customRules?: string[];
}

/**
 * Декоратор для застосування оркестрації авторизації
 * @param options - налаштування оркестрації
 */
export const Orchestrate = (options: OrchestrationOptions) =>
  SetMetadata(ORCHESTRATION_KEY, options);

/**
 * Декоратор для ресурсів з високим рівнем ризику
 */
export const HighRiskOperation = (resource: string, action: string) =>
  Orchestrate({
    resource,
    action,
    riskLevel: 'HIGH',
    requireMFA: true,
  });

/**
 * Декоратор для критично важливих операцій
 */
export const CriticalOperation = (resource: string, action: string) =>
  Orchestrate({
    resource,
    action,
    riskLevel: 'CRITICAL',
    requireMFA: true,
    customRules: ['additional_verification', 'manager_approval'],
  });

/**
 * Декоратор для фінансових операцій
 */
export const FinancialOperation = (action: string) =>
  Orchestrate({
    resource: 'banking/transactions',
    action,
    riskLevel: 'HIGH',
    requireMFA: true,
    customRules: ['transaction_limits', 'fraud_detection'],
  });
