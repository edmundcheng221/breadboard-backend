export class AggregatedPart {
  name: string; // part name
  description: string; // part description
  totalStock: number; // aggregate of total quantity free on hand (foh)/ available
  manufacturerLeadTime: number; // shortest lead time in days
  manufacturerName: string; // manufacturer for part
  packaging: Packaging[]; // collection of various packages available
  productDoc: string; // url to datasheet
  productUrl: string; // url to actual product on website
  productImageUrl: string; // url to product image
  specifications: JSON; // part name collection of specifications if any, [] if none
  sourceParts: SupplierName[]; // collection of suppliers from where data was aggregated
}
export type SupplierName = 'Arrow' | 'TTI';

export class Packaging {
  type: string; // package type (bulk, reel, cut-tape, unspecified, etc)
  minimumOrderQuantity: number; // minimum quantity required to purchase from this package
  quantityAvailable: number; // available stock for this package
  unitPrice: number; // unit price for this package
  supplier: SupplierName; // name of supplier
  priceBreaks: PriceBreak[]; // collection of pricing tiers for this package
  manufacturerLeadTime?: string; // lead time in days
}

export class PriceBreak {
  breakQuantity: number; // minimum quantity in order to reach pricing tier
  unitPrice: number; // price per unit at this tier
  totalPrice: number; // breakQuantity * unitPrice
}
