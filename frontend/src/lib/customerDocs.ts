import type { DocumentItem } from "@/lib/types";

export interface DocSummary {
  quotation: { count: number; total: number };
  invoice: { count: number; total: number };
  receipt: { count: number; total: number };
  purchase_order: { count: number; total: number };
  outstanding: number;
}

export function emptySummary(): DocSummary {
  return {
    quotation: { count: 0, total: 0 },
    invoice: { count: 0, total: 0 },
    receipt: { count: 0, total: 0 },
    purchase_order: { count: 0, total: 0 },
    outstanding: 0,
  };
}

/*
 * สรุปเอกสารของแต่ละลูกค้า (QT / IV / RC) และยอดค้างชำระ
 * ใช้ร่วมกันระหว่างหน้าตารางและบอร์ด Kanban
 */
export function summarizeDocs(
  docs: DocumentItem[],
): Record<number, DocSummary> {
  const result: Record<number, DocSummary> = {};

  for (const doc of docs) {
    const customerId = doc.customerId;

    if (customerId === null) {
      continue;
    }

    const summary = result[customerId] ?? emptySummary();

    if (doc.docType === "quotation") {
      summary.quotation.count += 1;
      summary.quotation.total += doc.amount;
    }

    if (doc.docType === "invoice") {
      summary.invoice.count += 1;
      summary.invoice.total += doc.amount;
    }

    if (doc.docType === "receipt") {
      summary.receipt.count += 1;
      summary.receipt.total += doc.amount;
    }

    if (doc.docType === "purchase_order") {
      summary.purchase_order.count += 1;
      summary.purchase_order.total += doc.amount;
    }

    result[customerId] = summary;
  }

  for (const [customerId, summary] of Object.entries(
    result,
  )) {
    summary.outstanding = Math.max(
      summary.invoice.total - summary.receipt.total,
      0,
    );

    result[Number(customerId)] = summary;
  }

  return result;
}
