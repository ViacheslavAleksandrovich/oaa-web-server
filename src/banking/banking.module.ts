import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { AuthModule } from '../auth/auth.module';
import { BankAccount } from '../entities/bank-account.entity';
import { Transaction } from '../entities/transaction.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccount, Transaction, AuditLog, User]),
    AuthModule,
  ],
  controllers: [BankingController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
