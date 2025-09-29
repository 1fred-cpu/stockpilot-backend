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
import { CreateReturnDto } from './dto/create-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('create')
  async createReturn(@Body(ValidationPipe) dto: CreateReturnDto) {
    return this.returnsService.createReturn(dto);
  }

  @Post('review')
  async reviewReturns(@Body(ValidationPipe) dto: ReviewReturnDto) {
    return this.returnsService.reviewReturns(dto);
  }

  @Post('policy/create')
  async createPolicy(@Body(ValidationPipe) dto: CreateReturnPolicyDto) {
    return this.returnsService.createReturnPolicy(dto);
  }

  @Get(':storeId')
  findAllReturns(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.returnsService.findAllReturns(storeId);
  }

  @Get('store-credits/:storeId')
  async findAllStoreCredits(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.returnsService.findAllStoreCredits(storeId);
  }

  @Get('policy/:storeId')
  async getPolicy(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.returnsService.getReturnPolicy(storeId);
  }

  @Patch('policy/:storeId')
  async updatePolicy(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: UpdateReturnPolicyDto,
  ) {
    return this.returnsService.updateReturnPolicy(storeId, dto);
  }

  @Delete('policy/:storeId')
  async deletePolicy(@Param('storeId') storeId: string) {
    return this.returnsService.deleteReturnPolicy(storeId);
  }
}
