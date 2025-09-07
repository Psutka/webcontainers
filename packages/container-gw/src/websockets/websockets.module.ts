import { Module } from '@nestjs/common';
import { ContainerGateway } from './container.gateway';
import { ContainersModule } from '../containers/containers.module';

@Module({
  imports: [ContainersModule],
  providers: [ContainerGateway],
})
export class WebsocketsModule {}