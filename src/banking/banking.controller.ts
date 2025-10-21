import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BankingService } from './banking.service';
import { CreateAccountDto, TransferDto } from './dto/banking.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';

@Controller('banking')
@UseGuards(AuthGuard('jwt'))
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Post('accounts')
  async createAccount(
    @Body() createAccountDto: CreateAccountDto,
    @CurrentUser() user: User,
  ) {
    return this.bankingService.createAccount(user.id, createAccountDto);
  }

  @Get('accounts')
  async getUserAccounts(@CurrentUser() user: User) {
    return this.bankingService.getUserAccounts(user.id);
  }

  @Get('accounts/:id')
  async getAccount(@Param('id') accountId: string, @CurrentUser() user: User) {
    return this.bankingService.getAccountById(accountId, user.id, user.role);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(@Body() transferDto: TransferDto, @CurrentUser() user: User) {
    return this.bankingService.transfer(transferDto, user.id);
  }

  @Get('accounts/:id/transactions')
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
  async getAllUserTransactions(@CurrentUser() user: User) {
    return this.bankingService.getAllUserTransactions(user.id, user.role);
  }

  @Post('accounts/:id/approve')
  @Roles(UserRole.BANK_ADMIN, UserRole.ACCOUNT_MANAGER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async approveAccount(
    @Param('id') accountId: string,
    @CurrentUser() user: User,
  ) {
    return this.bankingService.approveAccount(accountId, user.id);
  }
}
