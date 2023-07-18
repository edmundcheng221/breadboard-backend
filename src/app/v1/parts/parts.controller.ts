import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartQueryDTO } from './dtos/partQuery.dto';
import { ApiBadRequestResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('parts')
export class PartsController {
  constructor(private partsService: PartsService) {}

  @ApiOperation({
    description: 'Query for aggregated part data',
    tags: ['PARTS'],
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiQuery({ name: 'partNumber', type: String, required: true })
  @Get()
  public async aggregatePartData(@Query() query: PartQueryDTO) {
    if (!query.partNumber) {
      throw new BadRequestException('Part Number is required');
    }
    return await this.partsService.aggregatePartData(query?.partNumber);
  }
}
