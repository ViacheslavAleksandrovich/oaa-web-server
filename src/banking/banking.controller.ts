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
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BankingService } from './banking.service';
import { CreateAccountDto, TransferDto } from './dto/banking.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrchestrationGuard } from '../auth/guards/orchestration.guard';
import {
  Orchestrate,
  HighRiskOperation,
  FinancialOperation,
} from '../auth/decorators/orchestration.decorator';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';

@Controller('banking')
@UseGuards(AuthGuard('jwt'), OrchestrationGuard)
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Post('accounts')
  @Orchestrate({
    resource: 'banking/accounts',
    action: 'create',
    riskLevel: 'MEDIUM',
  })
  async createAccount(
    @Body() createAccountDto: CreateAccountDto,
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    // Отримуємо результат оркестрації з request
    const orchestrationDecision = req.orchestrationDecision;

    return this.bankingService.createAccount(user.id, createAccountDto);
  }

  @Get('accounts')
  @Orchestrate({
    resource: 'banking/accounts',
    action: 'read',
    riskLevel: 'LOW',
  })
  async getUserAccounts(@CurrentUser() user: User) {
    return this.bankingService.getUserAccounts(user.id);
  }

  @Get('accounts/:id')
  @Orchestrate({
    resource: 'banking/accounts',
    action: 'read',
    riskLevel: 'LOW',
  })
  async getAccount(@Param('id') accountId: string, @CurrentUser() user: User) {
    return this.bankingService.getAccountById(accountId, user.id, user.role);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @FinancialOperation('transfer')
  async transfer(
    @Body() transferDto: TransferDto,
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    // Додаткова перевірка на основі результату оркестрації
    const orchestrationDecision = req.orchestrationDecision;

    if (orchestrationDecision?.riskAssessment?.recommendation === 'DENY') {
      throw new ForbiddenException('Transfer denied due to risk assessment');
    }

    return this.bankingService.transfer(transferDto, user.id);
  }

  @Get('accounts/:id/transactions')
  @Orchestrate({
    resource: 'banking/transactions',
    action: 'read',
    riskLevel: 'LOW',
  })
  async getTransactionHistory(
    @Param('id') accountId: string,
    @CurrentUser() user: User,
  ) {
    return this.bankingService.getTransactionHistory(
      accountId,
      user.id,
      user.role,
    );
  }

  @Get('transactions')
  @Orchestrate({
    resource: 'banking/transactions',
    action: 'read',
    riskLevel: 'LOW',
  })
  async getAllUserTransactions(@CurrentUser() user: User) {
    return this.bankingService.getAllUserTransactions(user.id, user.role);
  }

  @Post('accounts/:id/approve')
  @Roles(UserRole.BANK_ADMIN, UserRole.ACCOUNT_MANAGER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @HighRiskOperation('banking/accounts', 'approve')
  async approveAccount(
    @Param('id') accountId: string,
    @CurrentUser() user: User,
  ) {
    return this.bankingService.approveAccount(accountId, user.id);
  }
}
