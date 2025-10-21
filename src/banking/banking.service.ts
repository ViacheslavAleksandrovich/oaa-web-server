import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { Transaction } from '../entities/transaction.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import {
  AccountType,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  AuditAction,
  UserRole,
} from '../common/enums';
import { CreateAccountDto, TransferDto } from './dto/banking.dto';

@Injectable()
export class BankingService {
  constructor(
    @InjectRepository(BankAccount)
    private accountRepository: Repository<BankAccount>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createAccount(
    userId: string,
    createAccountDto: CreateAccountDto,
  ): Promise<BankAccount> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accountNumber = await this.generateAccountNumber();

    const account = this.accountRepository.create({
      ...createAccountDto,
      accountNumber,
      userId,
      status: AccountStatus.PENDING_VERIFICATION,
      dailyTransactionLimit:
        createAccountDto.dailyTransactionLimit ||
        this.getDefaultDailyLimit(createAccountDto.accountType),
      monthlyTransactionLimit:
        createAccountDto.monthlyTransactionLimit ||
        this.getDefaultMonthlyLimit(createAccountDto.accountType),
    });

    const savedAccount = await this.accountRepository.save(account);

    await this.createAuditLog(
      userId,
      AuditAction.ACCOUNT_CREATED,
      savedAccount.id,
      'bank_account',
    );

    return savedAccount;
  }

  async getUserAccounts(userId: string): Promise<BankAccount[]> {
    return this.accountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAccountById(
    accountId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<BankAccount> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['user'],
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (
      userRole !== UserRole.BANK_ADMIN &&
      userRole !== UserRole.ACCOUNT_MANAGER &&
      account.userId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return account;
  }

  async transfer(
    transferDto: TransferDto,
    userId: string,
  ): Promise<Transaction> {
    const { fromAccountId, toAccountNumber, amount, description, reference } =
      transferDto;

    const fromAccount = await this.accountRepository.findOne({
      where: { id: fromAccountId, userId },
    });

    if (!fromAccount) {
      throw new NotFoundException('Source account not found');
    }

    if (fromAccount.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('Source account is not active');
    }

    if (fromAccount.isBlocked) {
      throw new BadRequestException('Source account is blocked');
    }

    const toAccount = await this.accountRepository.findOne({
      where: { accountNumber: toAccountNumber },
    });

    if (!toAccount) {
      throw new NotFoundException('Destination account not found');
    }

    if (toAccount.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('Destination account is not active');
    }

    if (fromAccount.availableBalance < amount) {
      throw new BadRequestException('Insufficient funds');
    }

    // Check daily/monthly limits
    const dailyTransactions =
      await this.getDailyTransactionAmount(fromAccountId);
    if (dailyTransactions + amount > fromAccount.dailyTransactionLimit) {
      throw new BadRequestException('Daily transaction limit exceeded');
    }

    // Create transaction
    const transaction = this.transactionRepository.create({
      type: TransactionType.TRANSFER,
      amount,
      description,
      reference,
      fromAccountId,
      toAccountId: toAccount.id,
      status: TransactionStatus.PENDING,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Process transaction
    await this.processTransaction(savedTransaction);

    await this.createAuditLog(
      userId,
      AuditAction.TRANSACTION_CREATED,
      savedTransaction.id,
      'transaction',
    );

    return savedTransaction;
  }

  async getTransactionHistory(
    accountId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Transaction[]> {
    const account = await this.getAccountById(accountId, userId, userRole);

    return this.transactionRepository.find({
      where: [{ fromAccountId: account.id }, { toAccountId: account.id }],
      order: { createdAt: 'DESC' },
      take: 100, // Limit to last 100 transactions
    });
  }

  async getAllUserTransactions(
    userId: string,
    userRole: UserRole,
  ): Promise<Transaction[]> {
    if (userRole === UserRole.BANK_ADMIN || userRole === UserRole.AUDITOR) {
      // Admin and auditor can see all transactions
      return this.transactionRepository.find({
        order: { createdAt: 'DESC' },
        take: 100,
        relations: ['fromAccount', 'toAccount'],
      });
    }

    // Regular users can only see their own transactions
    const userAccounts = await this.getUserAccounts(userId);
    const accountIds = userAccounts.map((account) => account.id);

    if (accountIds.length === 0) {
      return [];
    }

    return this.transactionRepository.find({
      where: [
        { fromAccountId: In(accountIds) },
        { toAccountId: In(accountIds) },
      ],
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['fromAccount', 'toAccount'],
    });
  }

  async approveAccount(
    accountId: string,
    adminId: string,
  ): Promise<BankAccount> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    account.status = AccountStatus.ACTIVE;
    const updatedAccount = await this.accountRepository.save(account);

    await this.createAuditLog(
      adminId,
      AuditAction.ACCOUNT_CREATED,
      accountId,
      'bank_account',
      'Account approved',
    );

    return updatedAccount;
  }

  private async processTransaction(transaction: Transaction): Promise<void> {
    try {
      // Check for fraud
      const isFraudulent = await this.detectFraud(transaction);

      if (isFraudulent) {
        transaction.status = TransactionStatus.UNDER_REVIEW;
        transaction.isFraudulent = true;
        transaction.fraudReason = 'Suspicious activity detected';
        await this.transactionRepository.save(transaction);
        return;
      }

      // Update account balances
      await this.accountRepository.decrement(
        { id: transaction.fromAccountId },
        'balance',
        transaction.amount,
      );

      await this.accountRepository.decrement(
        { id: transaction.fromAccountId },
        'availableBalance',
        transaction.amount,
      );

      await this.accountRepository.increment(
        { id: transaction.toAccountId },
        'balance',
        transaction.amount,
      );

      await this.accountRepository.increment(
        { id: transaction.toAccountId },
        'availableBalance',
        transaction.amount,
      );

      transaction.status = TransactionStatus.COMPLETED;
      transaction.processedAt = new Date();

      await this.transactionRepository.save(transaction);
    } catch (error) {
      transaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
      throw error;
    }
  }

  private async detectFraud(transaction: Transaction): Promise<boolean> {
    // Simple fraud detection rules
    const largeAmountThreshold = 10000;
    const suspiciousHoursStart = 23; // 11 PM
    const suspiciousHoursEnd = 6; // 6 AM

    // Check for large amounts
    if (transaction.amount > largeAmountThreshold) {
      return true;
    }

    // Check for suspicious hours
    const currentHour = new Date().getHours();
    if (
      currentHour >= suspiciousHoursStart ||
      currentHour <= suspiciousHoursEnd
    ) {
      return true;
    }

    // Check for multiple transactions in short period
    const recentTransactions = await this.transactionRepository.count({
      where: {
        fromAccountId: transaction.fromAccountId,
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
      },
    });

    if (recentTransactions > 3) {
      return true;
    }

    return false;
  }

  private async getDailyTransactionAmount(accountId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.fromAccountId = :accountId', { accountId })
      .andWhere('transaction.createdAt >= :today', { today })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .getRawOne();

    return result.total || 0;
  }

  private async generateAccountNumber(): Promise<string> {
    const prefix = '1234';
    const randomPart = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0');
    return prefix + randomPart;
  }

  private getDefaultDailyLimit(accountType: AccountType): number {
    switch (accountType) {
      case AccountType.CHECKING:
        return 5000;
      case AccountType.SAVINGS:
        return 2000;
      case AccountType.BUSINESS:
        return 50000;
      case AccountType.CREDIT:
        return 3000;
      default:
        return 1000;
    }
  }

  private getDefaultMonthlyLimit(accountType: AccountType): number {
    switch (accountType) {
      case AccountType.CHECKING:
        return 100000;
      case AccountType.SAVINGS:
        return 50000;
      case AccountType.BUSINESS:
        return 1000000;
      case AccountType.CREDIT:
        return 50000;
      default:
        return 20000;
    }
  }

  private async createAuditLog(
    userId: string,
    action: AuditAction,
    resourceId?: string,
    resourceType?: string,
    details?: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      resourceId,
      resourceType,
      details,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
