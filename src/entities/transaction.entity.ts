import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { TransactionType, TransactionStatus } from '../common/enums';
import { BankAccount } from './bank-account.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  reference: string;

  @ManyToOne(() => BankAccount, (account) => account.outgoingTransactions)
  fromAccount: BankAccount;

  @Column({ nullable: true })
  fromAccountId: string;

  @ManyToOne(() => BankAccount, (account) => account.incomingTransactions)
  toAccount: BankAccount;

  @Column({ nullable: true })
  toAccountId: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  fee: number;

  @Column({ nullable: true })
  externalReference: string;

  @Column({ default: false })
  isFraudulent: boolean;

  @Column({ nullable: true })
  fraudReason: string;

  @Column({ nullable: true })
  processedAt: Date;

  @Column({ nullable: true })
  processedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
