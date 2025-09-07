import { Module } from '@nestjs/common';
import { ContainersService } from './containers.service';
import { ContainersController } from './containers.controller';

@Module({
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService]
})
export class ContainersModule {}