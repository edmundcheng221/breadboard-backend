import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as http from 'http';
import { AggregatedPart } from './types/parts.type';

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

      const minLeadTime = Math.min(
        ...pricingData
          .filter(
            (pricing) => pricing?.leadTime?.supplierLeadTime !== undefined,
          )
          .map((pricing) =>
            this.convertLeadTimeToDays(
              pricing?.leadTime?.supplierLeadTime ?? 0,
            ),
          ),
      );
      const aggregatedParts: AggregatedPart[] = pricingData.map((item) => {
        const minQuantity =
          item?.pricingTier &&
          item?.pricingTier.reduce((min, tier) => {
            const currentMinQuantity = parseInt(tier.minQuantity);
            return currentMinQuantity < min ? currentMinQuantity : min;
          }, Infinity);
        const priceBreaks =
          item?.pricingTier &&
          item?.pricingTier.map((tier: { [key: string]: string }) => {
            return {
              breakQuantity: tier.minQuantity,
              unitPrice: tier.resalePrice,
              totalPrice: (
                parseFloat(tier.minQuantity) * parseFloat(tier.resalePrice)
              ).toFixed(2),
            };
          });
        const aggregatedPart: AggregatedPart = {
          name: item?.suppPartNum?.name,
          description: item?.description,
          totalStock: fohQuantity,
          manufacturerLeadTime: minLeadTime,
          manufacturerName: item.manufacturer,
          packaging: [
            {
              type: item?.pkg ?? 'unspecified',
              minimumOrderQuantity: minQuantity,
              quantityAvailable: item?.spq ?? 0,
              unitPrice: item?.resalePrice ?? 0,
              supplier: item?.supplier,
              priceBreaks,
              manufacturerLeadTime: item?.leadTime?.supplierLeadTime,
            },
          ],
          productDoc:
            item?.urlData &&
            item?.urlData.filter((url) => url?.type === 'Datasheet').length >
              0 &&
            item?.urlData.filter((url) => url?.type === 'Datasheet')[0]?.value,
          productUrl:
            item?.urlData &&
            item?.urlData.filter((url) => url?.type === 'Part Details').length >
              0 &&
            item?.urlData.filter((url) => url?.type === 'Part Details')[0]
              ?.value,
          productImageUrl:
            item?.urlData &&
            item?.urlData.filter((url) => url?.type.includes('Image')).length >
              0 &&
            item?.urlData.filter((url) => url?.type.includes('Image'))[0]
              ?.value,
          specifications: JSON.parse(
            JSON.stringify({
              [item?.suppPartNum?.name]:
                item?.urlData &&
                item?.urlData.filter((url) =>
                  url?.type.includes('Part Details'),
                ).length > 0 &&
                item?.urlData.filter((url) =>
                  url?.type.includes('Part Details'),
                )[0]?.value,
            }),
          ),
          sourceParts: ['Arrow'], // api is from Arrow Supplier
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
      const minLeadTime = Math.min(
        ...data
          .filter((pricing) => pricing?.leadTime !== undefined)
          .map((pricing) => this.convertLeadTimeToDays(pricing?.leadTime ?? 0)),
      );
      const totalStock = data
        .map((part) => part?.availableToSell ?? 0)
        .reduce((sum, curr) => sum + curr, 0);
      const aggregatedParts: AggregatedPart[] = data.map((item) => {
        const priceBreaks =
          item?.pricing?.quantityPriceBreaks &&
          item?.pricing?.quantityPriceBreaks.map(
            (tier: { [key: string]: string | number }) => {
              return {
                breakQuantity: tier.quantity,
                unitPrice: tier.price,
                totalPrice: (
                  parseFloat(tier.quantity as string) *
                  parseFloat(tier.price as string)
                ).toFixed(2),
              };
            },
          );
        const aggregatedPart: AggregatedPart = {
          name: item?.ttiPartNumber,
          description: item?.description,
          totalStock,
          manufacturerLeadTime: minLeadTime,
          manufacturerName: item?.manufacturer,
          packaging: [
            {
              type: item?.packaging ?? 'unspecified',
              minimumOrderQuantity: item?.salesMinimum,
              quantityAvailable: item?.availableToSell ?? 0,
              unitPrice: undefined, // smallest quantity is 100
              supplier: item?.manufacturer,
              priceBreaks,
              manufacturerLeadTime: item?.leadTime?.supplierLeadTime,
            },
          ],
          productDoc: item?.datasheetURL,
          productUrl: item?.buyUrl,
          productImageUrl: item?.imageURL,
          specifications: JSON.parse(
            JSON.stringify({
              [item?.ttiPartNumber]: {
                ...item?.exportInformation,
                ...item?.environmentalInformation,
              },
            }),
          ),
          sourceParts: ['TTI'], // api is from TTI Supplier
        };
        return aggregatedPart;
      });
      return aggregatedParts;
    }
    return [];
  }

  private cleanPartNumber(partNumber: string): string {
    if (!partNumber) {
      return;
    }
    return partNumber.replace(/^0+|\D/g, '');
  }

  private convertLeadTimeToDays(leadTime: string | number): number {
    if (typeof leadTime === 'number') {
      return leadTime;
    }
    const numericValue = `${leadTime}`;
    const [value, unit] = numericValue.split(' ');
    if (unit === 'Weeks') {
      return parseInt(value) * 7;
    } else {
      return 0;
    }
  }
}
