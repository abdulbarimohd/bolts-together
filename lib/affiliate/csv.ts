// lib/affiliate/csv.ts
//
// A small RFC 4180 CSV reader. Written rather than installed because the
// job is narrow (parse a retailer feed, get rows out) and a dependency here
// would have to run in both Node scripts and the Workers runtime.
//
// It handles the two things retailer feeds actually do that a naive
// `split(",")` gets wrong: quoted fields containing the delimiter or a
// newline, and doubled quotes ("" for a literal quote inside a quoted
// field). Product descriptions contain both constantly.
//
// Nothing here is affiliate- or network-specific; the Awin adapter uses it,
// and any other CSV-feed network can too.

export interface CsvParseOptions {
  /** Field separator. Comma unless a feed says otherwise. */
  readonly delimiter?: string;
  /** Quote character. */
  readonly quote?: string;
}

/**
 * Split CSV text into rows of raw string fields.
 *
 * Returns fields exactly as they appear -- no trimming, no type coercion,
 * no empty-to-null conversion. Those are decisions for the adapter, which
 * knows what each column means.
 */
export function parseCsv(text: string, options: CsvParseOptions = {}): string[][] {
  const delimiter = options.delimiter ?? ",";
  const quote = options.quote ?? '"';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;

  // Strip a UTF-8 BOM: Excel-exported feeds routinely carry one, and it
  // would otherwise become part of the first column's *name*, making that
  // column silently unfindable.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endField = () => {
    row.push(field);
    field = "";
    fieldWasQuoted = false;
  };

  const endRow = () => {
    endField();
    // Skip lines that are entirely empty (a trailing newline at EOF, or a
    // blank line between records) but keep a genuine one-empty-field row
    // if it was quoted.
    if (!(row.length === 1 && row[0] === "" && !fieldWasQuoted)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === quote) {
        if (input[i + 1] === quote) {
          field += quote;
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === quote && field === "") {
      inQuotes = true;
      fieldWasQuoted = true;
      continue;
    }

    if (char === delimiter) {
      endField();
      continue;
    }

    if (char === "\r") {
      // CRLF or a lone CR both end the record.
      if (input[i + 1] === "\n") i += 1;
      endRow();
      continue;
    }

    if (char === "\n") {
      endRow();
      continue;
    }

    field += char;
  }

  // Whatever is left after the last newline is a final record, unless the
  // file ended cleanly on one.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/**
 * Parse CSV whose first row is a header, yielding one object per record.
 *
 * Rows with a different field count from the header are *not* silently
 * padded or truncated: a short row usually means an unescaped quote
 * upstream, and quietly aligning the remaining values would shift every
 * column by one — putting a price in the stock column and nothing about it
 * would look wrong. They are reported through `onMalformedRow` and skipped.
 */
export function parseCsvRecords(
  text: string,
  options: CsvParseOptions & { onMalformedRow?: (line: number, fieldCount: number) => void } = {},
): { columns: string[]; records: Record<string, string>[] } {
  const rows = parseCsv(text, options);
  if (rows.length === 0) return { columns: [], records: [] };

  const columns = rows[0].map((name) => name.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length !== columns.length) {
      options.onMalformedRow?.(i + 1, row.length);
      continue;
    }
    const record: Record<string, string> = {};
    for (let c = 0; c < columns.length; c += 1) record[columns[c]] = row[c];
    records.push(record);
  }

  return { columns, records };
}
