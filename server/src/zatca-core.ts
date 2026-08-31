/**
 * ZATCA Fatoora Phase 2 E-Invoicing Engine for Fly GACA / BDA Company International.
 * Generates UBL 2.1 compliant XML, SHA-256 canonical hashing, and Phase 2 TLV QR codes.
 */

import { createHash } from 'node:crypto';

export interface ZatcaSellerInfo {
  name: string;
  vatNumber: string;
  crNumber: string;
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postalCode: string;
}

export const BDA_SELLER_INFO: ZatcaSellerInfo = {
  name: 'BDA Company International',
  vatNumber: '311415259500003',
  crNumber: '7030976893',
  buildingNumber: '2816',
  streetName: 'King Fahd Rd',
  district: 'Al Sahafah Dist.',
  city: 'Riyadh',
  postalCode: '13321-6548',
};

export interface ZatcaInvoiceLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceSar: number;
  vatRatePercent: number; // e.g. 15
}

export interface ZatcaInvoiceInput {
  invoiceNumber: string;
  uuid: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:MM:SS
  invoiceType: '388'; // Standard Tax Invoice (B2B) or Simplified (B2C)
  subtype: '0100000' | '0200000'; // Standard (01) or Simplified (02)
  buyerName: string;
  buyerVatNumber?: string;
  buyerAddress?: string;
  items: ZatcaInvoiceLineItem[];
  previousInvoiceHash?: string; // PIH (SHA-256 of previous invoice for cryptographic chaining)
}

export interface ZatcaQrParams {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 YYYY-MM-DDTHH:MM:SSZ
  totalWithVat: string;
  vatTotal: string;
  invoiceHash?: string;
  ecdsaSignature?: string;
  publicKey?: string;
  certificateSignature?: string;
}

/** Encodes a Tag-Length-Value (TLV) field per ZATCA Phase 2 specification. */
export function encodeTlvField(tag: number, value: string | Buffer): Buffer {
  const buf = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  const tagBuf = Buffer.from([tag]);
  const lenBuf = Buffer.from([buf.length]);
  return Buffer.concat([tagBuf, lenBuf, buf]);
}

/** Generates Base64-encoded TLV QR Code supporting ZATCA Phase 2 tags (1 to 9). */
export function generateZatcaTlvQr(params: ZatcaQrParams): string {
  const buffers: Buffer[] = [
    encodeTlvField(1, params.sellerName),
    encodeTlvField(2, params.vatNumber),
    encodeTlvField(3, params.timestamp),
    encodeTlvField(4, params.totalWithVat),
    encodeTlvField(5, params.vatTotal),
  ];

  if (params.invoiceHash) {
    buffers.push(encodeTlvField(6, params.invoiceHash));
  }
  if (params.ecdsaSignature) {
    buffers.push(encodeTlvField(7, params.ecdsaSignature));
  }
  if (params.publicKey) {
    buffers.push(encodeTlvField(8, params.publicKey));
  }
  if (params.certificateSignature) {
    buffers.push(encodeTlvField(9, params.certificateSignature));
  }

  const combined = Buffer.concat(buffers);
  return combined.toString('base64');
}

/** Computes SHA-256 hash of invoice XML content in Base64 encoding. */
export function computeZatcaInvoiceHash(xmlContent: string): string {
  return createHash('sha256').update(xmlContent, 'utf8').digest('base64');
}

/** Generates UBL 2.1 XML structure for ZATCA Phase 2 e-invoice. */
export function generateUblInvoiceXml(
  input: ZatcaInvoiceInput,
  seller: ZatcaSellerInfo = BDA_SELLER_INFO,
): string {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPriceSar, 0);
  const vatTotal = input.items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPriceSar * item.vatRatePercent) / 100,
    0,
  );
  const grandTotal = subtotal + vatTotal;

  const timestampIso = `${input.issueDate}T${input.issueTime}Z`;
  const qrBase64 = generateZatcaTlvQr({
    sellerName: seller.name,
    vatNumber: seller.vatNumber,
    timestamp: timestampIso,
    totalWithVat: grandTotal.toFixed(2),
    vatTotal: vatTotal.toFixed(2),
    invoiceHash: input.previousInvoiceHash || 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjAzZTQ4MmUwNzMzNGZhNw==',
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${input.invoiceNumber}</cbc:ID>
  <cbc:UUID>${input.uuid}</cbc:UUID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${input.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${input.subtype}">${input.invoiceType}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${input.previousInvoiceHash || 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjAzZTQ4MmUwNzMzNGZhNw=='}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrBase64}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${seller.crNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${seller.streetName}</cbc:StreetName>
        <cbc:BuildingNumber>${seller.buildingNumber}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${seller.district}</cbc:CitySubdivisionName>
        <cbc:CityName>${seller.city}</cbc:CityName>
        <cbc:PostalZone>${seller.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${seller.vatNumber}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${seller.name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${input.buyerName}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${
        input.buyerVatNumber
          ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${input.buyerVatNumber}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${vatTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${input.items
    .map(
      (item, idx) => `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${(item.quantity * item.unitPriceSar).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.name}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${item.vatRatePercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">${item.unitPriceSar.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`,
    )
    .join('')}
</Invoice>`;
}
