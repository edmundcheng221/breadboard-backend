import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as http from 'http';
import { AggregatedPart, Packaging } from './types/parts.type';

@Injectable()
export class PartsService {
  private axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
  });
  private myArrowApi =
    'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json';
  private ttiApi =
    'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json';

  public async aggregatePartData(
    partNumber: string,
  ): Promise<AggregatedPart[]> {
    const [myArrowData, ttiData] = await Promise.all([
      this.aggregateMyArrowData(partNumber),
      this.aggregateTTIData(partNumber),
    ]);
    return [...myArrowData, ...ttiData];
  }

  private async aggregateMyArrowData(
    partNumber: string,
  ): Promise<AggregatedPart[]> {
    const response = await this.axiosInstance.get(this.myArrowApi);
    if (response?.data?.status === 'SUCCESS') {
      const pricingData = response?.data?.pricingResponse.filter(
        (pricing) =>
          this.cleanPartNumber(pricing?.partNumber) ===
          this.cleanPartNumber(partNumber),
      );
      const fohQuantity = pricingData
        .map((pricing) => parseInt(pricing?.fohQuantity) || 0)
        .reduce((sum, price) => sum + price, 0);
      const aggregatedParts: AggregatedPart[] = pricingData.map((item) => {
        const aggregatedPart: AggregatedPart = {
          name: item?.suppPartNum?.name, //
          description: item?.description, //
          totalStock: fohQuantity, //
          manufacturerLeadTime: undefined,
          manufacturerName: item.manufacturer,
          packaging: [
            {
              type: undefined,
              minimumOrderQuantity: undefined,
              quantityAvailable: undefined,
              unitPrice: undefined,
              supplier: undefined,
              priceBreaks: undefined,
              manufacturerLeadTime: undefined,
            },
          ],
          productDoc: '',
          productUrl: '',
          productImageUrl: '',
          specifications: JSON.parse(JSON.stringify({})),
          sourceParts: ['Arrow'],
        };

        return aggregatedPart;
      });
      return aggregatedParts;
    }
    return;
  }

  private async aggregateTTIData(
    partNumber: string,
  ): Promise<AggregatedPart[]> {
    const response = await this.axiosInstance.get(this.ttiApi);
    if (response?.data?.parts) {
      const data = response?.data?.parts.filter(
        (pricing) =>
          this.cleanPartNumber(pricing?.ttiPartNumber) ===
          this.cleanPartNumber(partNumber),
      );
    }
    return [];
  }

  private cleanPartNumber(partNumber: string): string {
    if (!partNumber) {
      return;
    }
    return partNumber.replace(/^0+|\D/g, '');
  }
}
