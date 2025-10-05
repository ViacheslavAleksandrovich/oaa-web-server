import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'OAA Banking System - Orchestration Authentication Authorization';
  }
}
