import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PartsService {
  public async aggregatePartData(partNumber: string) {
    const supplierUrls = [
      'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json',
      'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json',
    ];

    const promises = supplierUrls.map(async (url) => {
      const response = await axios.get(url);
      return response.data;
    });
    console.log(partNumber);

    const aggregatedData = await Promise.all(promises);
    return aggregatedData;
  }
}
