import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class HandleErrorService {
  private readonly logger = new Logger(HandleErrorService.name);

  handleServiceError(error: any, method: string) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }
    this.logger.error(`Unexpected error in ${method}: ${error.message}`);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
