import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';

@Module({
  imports: [],
  controllers: [PartsController],
  providers: [PartsService],
})
export class PartsModule {}
