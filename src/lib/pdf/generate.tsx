import React from "react";
import { pdf } from "@react-pdf/renderer";
import {
  ReportCardDocument,
  type ReportCardPdfData,
} from "@/lib/pdf/report-card-document";

export async function generateReportCardPdf(data: ReportCardPdfData): Promise<Buffer> {
  const instance = pdf(<ReportCardDocument data={data} />);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
