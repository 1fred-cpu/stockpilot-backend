import { Controller } from '@nestjs/common';
import { RefundService } from './refund.service';

@Controller('refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}
}
