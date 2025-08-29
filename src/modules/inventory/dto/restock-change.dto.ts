

import {IsString, IsNumber, IsUUID, IsArray, IsEnum,IsOptional} from "class-validator"

export class RestockChangeDto{
  @IsUUID()
  storeId:string;
  
  @IsArray()
  changes:Change[]
}

class Change{
  @IsUUID()
  inventoryId:string;
  
  @IsNumber()
  change:number;
  
  @IsEnum({message:"Type field value must be Restock",enum: ["Restock"]})
  type:"Restock";
  
  @IsOptional()
  @IsString()
  reason:string
  
  @IsOptional()
  @IsString()
  referenceId:string;
  
  @IsString()
  idempotencyKey:string
  
  @IsString()
  userId:string
  
}