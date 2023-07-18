import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartQueryDTO } from './dtos/partQuery.dto';

@Controller('parts')
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Get()
  public async aggregatePartData(@Query() query: PartQueryDTO) {
    if (!query.partNumber) {
      throw new BadRequestException('Part Number is required');
    }
    return await this.partsService.aggregatePartData(query?.partNumber);
  }
}
