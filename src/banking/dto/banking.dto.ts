import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AccountType } from '../../common/enums';

export class CreateAccountDto {
  @IsEnum(AccountType)
  accountType: AccountType;

  @IsOptional()
  accountName?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  initialDeposit?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  creditLimit?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  dailyTransactionLimit?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyTransactionLimit?: number;
}

export class TransferDto {
  @IsNotEmpty()
  fromAccountId: string;

  @IsNotEmpty()
  toAccountNumber: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  description?: string;

  @IsOptional()
  reference?: string;
}
