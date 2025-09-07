import { Controller, Post, Delete, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ContainersService } from './containers.service';
import { CreateContainerResponse, ContainerStatusResponse, TerminateContainerResponse } from '../common/interfaces';

@Controller('api/containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Post()
  async createContainer(): Promise<CreateContainerResponse> {
    try {
      const container = await this.containersService.createContainer();
      return {
        id: container.id,
        status: container.status,
        websocketUrl: container.websocketUrl || ''
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create container: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async terminateContainer(@Param('id') id: string): Promise<TerminateContainerResponse> {
    try {
      const success = await this.containersService.terminateContainer(id);
      return {
        success,
        message: 'Container terminated successfully'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to terminate container: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getContainerStatus(@Param('id') id: string): Promise<ContainerStatusResponse> {
    try {
      const container = await this.containersService.getContainerStatus(id);
      return {
        id: container.id,
        status: container.status
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get container status: ${error.message}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Get()
  async getAllContainers() {
    return this.containersService.getAllContainers();
  }
}