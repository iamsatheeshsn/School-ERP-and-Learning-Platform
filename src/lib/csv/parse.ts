export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  return rows;
}

export function csvRowsToObjects<T extends Record<string, string>>(
  rows: string[][],
  headers: (keyof T & string)[]
): T[] {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((h) => h.trim().toLowerCase());

  return dataRows.map((dataRow) => {
    const record = {} as T;
    headers.forEach((header) => {
      const index = normalizedHeaders.indexOf(header.toLowerCase());
      record[header] = (index >= 0 ? dataRow[index] ?? "" : "") as T[keyof T & string];
    });
    return record;
  });
}
