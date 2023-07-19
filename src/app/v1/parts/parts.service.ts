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
  public specifications = new Set();
  public packaging: Packaging[] = [];
  public descriptions: { [key: string]: Set<string> } = {};
  public minLeadTime: number;
  public aggregatedPart: AggregatedPart = {
    name: undefined,
    description: undefined,
    totalStock: 0,
    manufacturerLeadTime: undefined,
    manufacturerName: undefined,
    packaging: undefined,
    productDoc: undefined,
    productUrl: undefined,
    productImageUrl: undefined,
    specifications: undefined,
    sourceParts: [],
  };

  public async aggregatePartData(partNumber: string): Promise<AggregatedPart> {
    await Promise.all([
      this.aggregateMyArrowData(partNumber),
      this.aggregateTTIData(partNumber),
    ]);
    return this.aggregatedPart;
  }

  private async aggregateMyArrowData(partNumber: string): Promise<void> {
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

      this.aggregatedPart.totalStock += fohQuantity;

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
      if (
        !this.aggregatedPart.manufacturerLeadTime ||
        minLeadTime < this.aggregatedPart.manufacturerLeadTime
      ) {
        this.aggregatedPart.manufacturerLeadTime = minLeadTime;
      }
      this.aggregatedPart.sourceParts.push('Arrow');

      pricingData.map((item) => {
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

        this.packaging.push({
          type: item?.pkg ?? 'unspecified',
          minimumOrderQuantity: minQuantity,
          quantityAvailable: item?.spq ?? 0,
          unitPrice: item?.resalePrice ?? 0,
          supplier: item?.supplier,
          priceBreaks,
          manufacturerLeadTime: item?.leadTime?.supplierLeadTime,
        });
        this.aggregatedPart.packaging = this.packaging;

        this.aggregatedPart.name = this.cleanPartNumber(partNumber);
        this.aggregatedPart.manufacturerName = item?.manufacturer || '';
        this.aggregatedPart.productDoc =
          item?.urlData &&
          item?.urlData.filter((url) => url?.type === 'Datasheet').length > 0 &&
          item?.urlData.filter((url) => url?.type === 'Datasheet')[0]?.value;
        this.aggregatedPart.productUrl =
          item?.urlData &&
          item?.urlData.filter((url) => url?.type === 'Part Details').length >
            0 &&
          item?.urlData.filter((url) => url?.type === 'Part Details')[0]?.value;
        this.aggregatedPart.productImageUrl =
          item?.urlData &&
          item?.urlData.filter((url) => url?.type.includes('Image')).length >
            0 &&
          item?.urlData.filter((url) => url?.type.includes('Image'))[0]?.value;
        if (!this.descriptions[this.cleanPartNumber(partNumber)]) {
          this.descriptions[this.cleanPartNumber(partNumber)] =
            new Set<string>();
        }
        this.descriptions[this.cleanPartNumber(partNumber)].add(
          item.description,
        );
        this.specifications.add({
          [this.cleanPartNumber(partNumber)]: {
            'Part Details':
              item?.urlData &&
              item?.urlData.filter((url) => url?.type.includes('Part Details'))
                .length > 0 &&
              item?.urlData.filter((url) =>
                url?.type.includes('Part Details'),
              )[0]?.value,
          },
        });
      });
      this.aggregatedPart.specifications = JSON.parse(
        JSON.stringify([...this.specifications]),
      );
      this.aggregatedPart.description = [
        ...this.descriptions[this.cleanPartNumber(partNumber)],
      ].join(', ');
    }
    return;
  }

  private async aggregateTTIData(partNumber: string): Promise<void> {
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
      if (
        !this.aggregatedPart.manufacturerLeadTime ||
        minLeadTime < this.aggregatedPart.manufacturerLeadTime
      ) {
        this.aggregatedPart.manufacturerLeadTime = minLeadTime;
      }

      this.aggregatedPart.totalStock += data
        .map((part) => part?.availableToSell ?? 0)
        .reduce((sum, curr) => sum + curr, 0);

      const firstRecord = data && data.length > 0 && data[0];

      this.aggregatedPart.name = this.cleanPartNumber(partNumber);
      this.aggregatedPart.manufacturerName = firstRecord?.manufacturer || '';
      this.aggregatedPart.productDoc = firstRecord?.datasheetURL || '';
      this.aggregatedPart.productUrl = firstRecord?.buyUrl || '';
      this.aggregatedPart.productImageUrl = firstRecord?.imageURL || '';
      this.aggregatedPart.sourceParts.push('TTI');

      for (const part of data) {
        if (!this.descriptions[this.cleanPartNumber(partNumber)]) {
          this.descriptions[this.cleanPartNumber(partNumber)] =
            new Set<string>();
        }
        this.descriptions[this.cleanPartNumber(partNumber)].add(
          part.description,
        );
        this.specifications.add({
          [this.cleanPartNumber(partNumber)]: {
            ...part?.exportInformation,
            ...part?.environmentalInformation,
          },
        });
        const priceBreaks =
          part?.pricing?.quantityPriceBreaks &&
          part?.pricing?.quantityPriceBreaks.map(
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
        this.packaging.push({
          type: part?.packaging ?? 'unspecified',
          minimumOrderQuantity: part?.salesMinimum,
          quantityAvailable: part?.availableToSell ?? 0,
          unitPrice: priceBreaks[0].unitPrice ?? 'Unavailable',
          supplier: part?.manufacturer,
          priceBreaks,
          manufacturerLeadTime: part?.leadTime?.supplierLeadTime,
        });
        this.aggregatedPart.packaging = this.packaging;
      }
      this.aggregatedPart.description = [
        ...this.descriptions[this.cleanPartNumber(partNumber)],
      ].join(', ');
      this.aggregatedPart.specifications = JSON.parse(
        JSON.stringify([...this.specifications]),
      );
    }
    return;
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
