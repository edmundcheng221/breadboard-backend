import { AutoMap } from '@automapper/classes';
import { IsNotEmpty, IsString } from 'class-validator';
export class PartQueryDTO {
  @AutoMap()
  @IsString()
  @IsNotEmpty()
  partNumber: string;
}
