import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AccountType, AccountStatus } from '../common/enums';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accountNumber: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.CHECKING,
  })
  accountType: AccountType;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING_VERIFICATION,
  })
  status: AccountStatus;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ nullable: true })
  accountName: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  creditLimit: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  dailyTransactionLimit: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  monthlyTransactionLimit: number;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ nullable: true })
  blockReason: string;

  @ManyToOne(() => User, (user) => user.accounts)
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Transaction, (transaction) => transaction.fromAccount)
  outgoingTransactions: Transaction[];

  @OneToMany(() => Transaction, (transaction) => transaction.toAccount)
  incomingTransactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
