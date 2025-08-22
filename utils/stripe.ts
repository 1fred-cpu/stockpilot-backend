import Stripe from "stripe";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StripeService {
  private 
    constructor(private readonly configService: ConfigService) {
      
    }
}
