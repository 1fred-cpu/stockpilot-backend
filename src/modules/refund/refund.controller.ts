import { Body, Controller, Post } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundAndReturnDto } from './dto/refund-and-return.dto';

@Controller('refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  async handleRefundAndReturn(@Body() dto: RefundAndReturnDto) {
    return this.refundService.processRefundAndReturn(dto);
  }
}
