import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContainersModule } from './containers/containers.module';
import { WebsocketsModule } from './websockets/websockets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ContainersModule,
    WebsocketsModule,
  ],
})
export class AppModule {}