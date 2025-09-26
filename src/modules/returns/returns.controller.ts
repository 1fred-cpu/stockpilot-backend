import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnPolicyDto } from './dto/create-return-policy.dto';
import { UpdateReturnPolicyDto } from './dto/update-return-policy.dto';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('policy')
  createPolicy(@Body(ValidationPipe) dto: CreateReturnPolicyDto) {
    return this.returnsService.createReturnPolicy(dto);
  }

  @Get('policy/:storeId')
  getPolicy(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.returnsService.getReturnPolicy(storeId);
  }

  @Patch('policy/:storeId')
  updatePolicy(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: UpdateReturnPolicyDto,
  ) {
    return this.returnsService.updateReturnPolicy(storeId, dto);
  }

  @Delete('policy/:storeId')
  deletePolicy(@Param('storeId') storeId: string) {
    return this.returnsService.deleteReturnPolicy(storeId);
  }
}
