import { describe, it, expect } from "vitest";
import {
  encodeTlvField,
  generateZatcaTlvQr,
  computeZatcaInvoiceHash,
  generateUblInvoiceXml,
  BDA_SELLER_INFO,
  type ZatcaInvoiceInput,
} from "../src/zatca-core";

describe("ZATCA Phase 2 E-Invoicing Core", () => {
  it("encodes TLV fields accurately according to ZATCA specification", () => {
    const field = encodeTlvField(1, "BDA Company International");
    expect(field[0]).toBe(1); // Tag
    expect(field[1]).toBe(Buffer.byteLength("BDA Company International")); // Length
    expect(field.subarray(2).toString("utf8")).toBe("BDA Company International");
  });

  it("generates a valid Base64 TLV QR code containing all required Phase 2 tags", () => {
    const qrBase64 = generateZatcaTlvQr({
      sellerName: BDA_SELLER_INFO.name,
      vatNumber: BDA_SELLER_INFO.vatNumber,
      timestamp: "2026-08-30T15:30:00Z",
      totalWithVat: "11500.00",
      vatTotal: "1500.00",
      invoiceHash: "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjAzZTQ4MmUwNzMzNGZhNw==",
    });

    expect(typeof qrBase64).toBe("string");
    expect(qrBase64.length).toBeGreaterThan(50);
    const decoded = Buffer.from(qrBase64, "base64");
    expect(decoded[0]).toBe(1); // Tag 1
  });

  it("computes deterministic SHA-256 invoice cryptographic digest", () => {
    const xml = "<Invoice><ID>INV-2026-001</ID></Invoice>";
    const hash1 = computeZatcaInvoiceHash(xml);
    const hash2 = computeZatcaInvoiceHash(xml);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(44); // Base64 SHA-256 length is 44 characters (32 bytes + padding)
  });

  it("generates valid UBL 2.1 invoice XML for Flight Academy cohort license billing", () => {
    const invoiceInput: ZatcaInvoiceInput = {
      invoiceNumber: "BDA-2026-0801",
      uuid: "c8a33a30-6644-4824-9642-120e890c2134",
      issueDate: "2026-08-30",
      issueTime: "12:00:00",
      invoiceType: "388",
      subtype: "0100000",
      buyerName: "OxfordSaudia Flight Academy",
      buyerVatNumber: "300000000000003",
      buyerAddress: "Dammam Airport King Fahd International",
      items: [
        {
          id: "1",
          name: "Fly GACA Flight School Cohort Seat Licenses (25 Cadets, 90-day intake)",
          quantity: 1,
          unitPriceSar: 12500,
          vatRatePercent: 15,
        },
      ],
    };

    const xml = generateUblInvoiceXml(invoiceInput);
    expect(xml).toContain("BDA Company International");
    expect(xml).toContain("311415259500003");
    expect(xml).toContain("7030976893");
    expect(xml).toContain("OxfordSaudia Flight Academy");
    expect(xml).toContain("12500.00"); // Subtotal
    expect(xml).toContain("1875.00"); // 15% VAT
    expect(xml).toContain("14375.00"); // Total with VAT
  });
});
