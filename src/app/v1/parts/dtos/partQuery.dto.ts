import { IsNotEmpty, IsString } from 'class-validator';
export class PartQueryDTO {
  @IsString()
  @IsNotEmpty()
  partNumber: string;
}
