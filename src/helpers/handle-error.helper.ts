import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';

@Injectable()
export class HandleErrorService {
  private readonly logger = new Logger(HandleErrorService.name);

  handleServiceError(error: any, method: string) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof UnauthorizedException ||
      error instanceof InternalServerErrorException ||
      error instanceof HttpException||
      error instanceof Error 
    ) {
      throw error;
    }
    this.logger.error(
      `Unexpected error in ${method}: ${error.message} \n${error.stack}`,
    );
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
