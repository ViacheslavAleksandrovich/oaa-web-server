import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole, AuditAction } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: User; tokens: any }> {
    const { email, password, ...userData } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      ...userData,
      role: UserRole.CLIENT,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    await this.createAuditLog(savedUser.id, AuditAction.USER_CREATED);

    const tokens = await this.generateTokens(savedUser);
    await this.updateRefreshToken(savedUser.id, tokens.refreshToken);

    delete savedUser.password;
    return { user: savedUser, tokens };
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
  ): Promise<{ user: User; tokens: any }> {
    const { email, password, twoFactorCode } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled && !twoFactorCode) {
      throw new BadRequestException('Two-factor code required');
    }

    if (user.twoFactorEnabled && twoFactorCode) {
      const isValidCode = await this.validateTwoFactorCode(
        user.twoFactorSecret,
        twoFactorCode,
      );
      if (!isValidCode) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    await this.handleSuccessfulLogin(user.id, ipAddress);

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    await this.createAuditLog(user.id, AuditAction.LOGIN, ipAddress);

    delete user.password;
    return { user, tokens };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isTokenMatching = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isTokenMatching) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
    await this.createAuditLog(userId, AuditAction.LOGOUT);
  }

  async validateUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: User): Promise<any> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.update(userId, { refreshToken: hashedToken });
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const attempts = user.loginAttempts + 1;
    const lockUntil =
      attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

    await this.userRepository.update(userId, {
      loginAttempts: attempts,
      lockedUntil: lockUntil,
    });
  }

  private async handleSuccessfulLogin(
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });
  }

  private async validateTwoFactorCode(
    secret: string,
    code: string,
  ): Promise<boolean> {
    // Implementation for TOTP validation would go here
    // For now, return true for demo purposes
    return code === '123456';
  }

  private async createAuditLog(
    userId: string,
    action: AuditAction,
    ipAddress?: string,
    details?: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      ipAddress,
      details,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
