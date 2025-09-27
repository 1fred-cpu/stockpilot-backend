import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createDiscount(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.createDiscount(createDiscountDto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('stores/:storeId')
  async findAllDiscounts(@Param('storeId') storeId: string) {
    return this.discountsService.findAllDiscounts(storeId);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':discountId')
  findDiscount(@Param('discountId') discountId: string) {
    return this.discountsService.findDiscount(discountId);
  }

  // @HttpCode(HttpStatus.OK)
  // @Patch(":discountId")
  // updateDiscount(
  //     @Param("discountId") discountId: string,
  //     @Body() updateDiscountDto: UpdateDiscountDto
  // ) {
  //     return this.discountsService.updateDiscount(
  //         discountId,
  //         updateDiscountDto
  //     );
  // }

  @HttpCode(HttpStatus.OK)
  @Delete(':discountId')
  async deleteDiscount(@Param('discountId') discountId: string) {
    return this.discountsService.deleteDiscount(discountId);
  }
}
