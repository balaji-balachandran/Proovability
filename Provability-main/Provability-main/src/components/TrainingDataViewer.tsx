import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CsvDataSample = {
  headers: string[];
  rows: string[][];
  truncatedByRows: boolean;
  truncatedByBytes: boolean;
};

type ColumnSummary = {
  name: string;
  inferredType: "number" | "string";
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  sampleCount: number;
  numeric?: {
    min: number;
    max: number;
    mean: number;
    bins: number[];
  };
  topValues?: Array<{ value: string; count: number }>;
};

function safeFileNameFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const last = url.pathname.split("/").filter(Boolean).pop();
    return last && last.includes(".") ? last : "training_data.csv";
  } catch {
    return "training_data.csv";
  }
}

function parseCsvSample(text: string, options?: { maxRows?: number; maxBytes?: number }) {
  const maxRows = options?.maxRows ?? 500; // includes header row
  const maxBytes = options?.maxBytes ?? 1024 * 1024;
  const slice = text.slice(0, maxBytes);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];

    if (inQuotes) {
      if (c === '"') {
        if (slice[i + 1] === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\r") continue;

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (rows.length >= maxRows) break;
      continue;
    }

    field += c;
  }

  if (rows.length < maxRows && (field.length > 0 || row.length > 0)) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows[0] ?? [];
  const body = rows.slice(1);

  return {
    headers,
    rows: body,
    truncatedByRows: rows.length >= maxRows,
    truncatedByBytes: text.length > slice.length,
  } satisfies CsvDataSample;
}

function toNumberStrict(v: string) {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function summarizeColumns(headers: string[], rows: string[][]): ColumnSummary[] {
  const colCount = headers.length;
  const summaries: ColumnSummary[] = [];

  for (let c = 0; c < colCount; c++) {
    const name = headers[c] || `col_${c + 1}`;
    const values = rows.map((r) => (r[c] ?? "").trim());
    const sampleCount = values.length;

    const nonMissing = values.filter((v) => v !== "");
    const missingCount = sampleCount - nonMissing.length;
    const missingPct = sampleCount === 0 ? 0 : Math.round((missingCount / sampleCount) * 1000) / 10;

    const nums = nonMissing.map(toNumberStrict).filter((n): n is number => n !== null);
    const numericRatio = nonMissing.length === 0 ? 0 : nums.length / nonMissing.length;
    const inferredType: ColumnSummary["inferredType"] = numericRatio >= 0.9 ? "number" : "string";

    const unique = new Set(nonMissing);
    const uniqueCount = unique.size;

    const base: ColumnSummary = {
      name,
      inferredType,
      missingCount,
      missingPct,
      uniqueCount,
      sampleCount,
    };

    if (inferredType === "number" && nums.length > 0) {
      let min = nums[0];
      let max = nums[0];
      let sum = 0;
      for (const n of nums) {
        if (n < min) min = n;
        if (n > max) max = n;
        sum += n;
      }
      const mean = sum / nums.length;

      // 12 bins histogram
      const binCount = 12;
      const bins = Array.from({ length: binCount }, () => 0);
      if (min === max) {
        bins[0] = nums.length;
      } else {
        const width = (max - min) / binCount;
        for (const n of nums) {
          const idx = Math.min(binCount - 1, Math.max(0, Math.floor((n - min) / width)));
          bins[idx]++;
        }
      }

      base.numeric = { min, max, mean, bins };
    } else {
      const counts = new Map<string, number>();
      for (const v of nonMissing) counts.set(v, (counts.get(v) ?? 0) + 1);
      const topValues = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([value, count]) => ({ value, count }));
      base.topValues = topValues;
    }

    summaries.push(base);
  }

  return summaries;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let u = 0;
  while (b >= 1024 && u < units.length - 1) {
    b /= 1024;
    u++;
  }
  const digits = u === 0 ? 0 : u === 1 ? 2 : 2;
  return `${b.toFixed(digits)} ${units[u]}`;
}

export default function TrainingDataViewer(props: { url: string }) {
  const url = props.url.trim();

  const [activeTab, setActiveTab] = useState<"about" | "rows" | "columns">("rows");
  const [rowQuery, setRowQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<CsvDataSample | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Best-effort file size (may fail if CORS doesn't allow HEAD)
        try {
          const head = await fetch(url, { method: "HEAD", signal: controller.signal });
          const len = head.headers.get("content-length");
          if (len && /^\d+$/.test(len)) setFileSize(Number(len));
        } catch {
          // ignore
        }

        // Fetch first ~1MB for sample. Range can be ignored by some servers; still ok.
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Range: "bytes=0-1048575" },
        });
        if (!res.ok) throw new Error(`Failed to fetch CSV (HTTP ${res.status})`);
        const text = await res.text();
        setSample(parseCsvSample(text, { maxRows: 500, maxBytes: 1024 * 1024 }));
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load training data");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [url]);

  const summaries = useMemo(() => {
    if (!sample) return [];
    return summarizeColumns(sample.headers, sample.rows);
  }, [sample]);

  const filteredRows = useMemo(() => {
    if (!sample) return [];
    const q = rowQuery.trim().toLowerCase();
    if (!q) return sample.rows;
    return sample.rows.filter((r) => r.some((cell) => (cell ?? "").toLowerCase().includes(q)));
  }, [sample, rowQuery]);

  async function handleDownload() {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = safeFileNameFromUrl(url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  return (
    <Card className="border-border/60 bg-background/30">
      <CardHeader className="p-4 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground">Training data</div>
            <div className="text-xs text-muted-foreground break-all">{url}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                CSV
              </Badge>
              {fileSize !== null ? (
                <Badge variant="outline" className="text-[10px]">
                  {formatBytes(fileSize)}
                </Badge>
              ) : null}
              {sample ? (
                <Badge variant="outline" className="text-[10px]">
                  {sample.headers.length} columns
                </Badge>
              ) : null}
              {sample ? (
                <Badge variant="outline" className="text-[10px]">
                  {sample.rows.length} rows sampled
                </Badge>
              ) : null}
              {sample?.truncatedByRows || sample?.truncatedByBytes ? (
                <Badge variant="outline" className="text-[10px]">
                  partial preview
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full border border-border/70 bg-background/40 px-4 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary/40 hover:bg-background/60 disabled:opacity-50"
              disabled={!url}
            >
              Download
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border/70 bg-background/40 px-4 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:border-primary/40 hover:bg-background/60"
            >
              Open
            </a>
          </div>
        </div>

        <div className="mt-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full justify-start bg-muted/40">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="rows">Rows</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <div className="text-xs text-muted-foreground">
                {loading ? (
                  <div>Loading preview…</div>
                ) : error ? (
                  <div className="text-destructive">{error}</div>
                ) : sample ? (
                  <div className="space-y-2">
                    <div>
                      This preview is computed from the first{" "}
                      <span className="text-foreground/90 font-medium">{sample.rows.length}</span> rows available in the
                      browser.
                    </div>
                    <div>
                      If you need the full dataset, use <span className="text-foreground/90 font-medium">Download</span>.
                    </div>
                  </div>
                ) : (
                  <div>No preview yet.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rows">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    value={rowQuery}
                    onChange={(e) => setRowQuery(e.target.value)}
                    placeholder="Search rows…"
                    className="w-full sm:max-w-[320px] rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {sample ? (
                    <div className="text-[10px] text-muted-foreground">
                      Showing <span className="text-foreground/90 font-medium">{Math.min(filteredRows.length, 80)}</span>{" "}
                      of{" "}
                      <span className="text-foreground/90 font-medium">{filteredRows.length}</span> sampled rows
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border border-border/60 bg-card/40">
                  <ScrollArea className="h-[260px]">
                    {loading ? (
                      <div className="p-3 text-xs text-muted-foreground">Loading preview…</div>
                    ) : error ? (
                      <div className="p-3 text-xs text-destructive">{error}</div>
                    ) : sample && sample.headers.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                          <TableRow>
                            {sample.headers.map((h, idx) => (
                              <TableHead key={`${h}:${idx}`} className="h-10 px-3 py-2 text-[10px]">
                                {h || `col_${idx + 1}`}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRows.slice(0, 80).map((r, rIdx) => (
                            <TableRow key={rIdx}>
                              {sample.headers.map((_, cIdx) => (
                                <TableCell key={cIdx} className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                  {(r[cIdx] ?? "").slice(0, 140)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground">No rows found.</div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="columns">
              <CardContent className="p-0 pt-2">
                {loading ? (
                  <div className="p-3 text-xs text-muted-foreground">Loading columns…</div>
                ) : error ? (
                  <div className="p-3 text-xs text-destructive">{error}</div>
                ) : summaries.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {summaries.map((col) => {
                      const maxBin = col.numeric?.bins.reduce((m, v) => (v > m ? v : m), 0) ?? 0;
                      return (
                        <div key={col.name} className="rounded-md border border-border/60 bg-card/40 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground truncate">{col.name}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">
                                  {col.inferredType}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {col.uniqueCount} unique
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {col.missingPct}% missing
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {col.numeric ? (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>
                                  min <span className="text-foreground/90 font-medium">{col.numeric.min}</span>
                                </span>
                                <span>
                                  mean <span className="text-foreground/90 font-medium">{col.numeric.mean.toFixed(3)}</span>
                                </span>
                                <span>
                                  max <span className="text-foreground/90 font-medium">{col.numeric.max}</span>
                                </span>
                              </div>
                              <div className="mt-2 flex h-10 items-end gap-[2px]">
                                {col.numeric.bins.map((b, idx) => {
                                  const h = maxBin === 0 ? 0 : Math.max(2, Math.round((b / maxBin) * 40));
                                  return (
                                    <div
                                      key={idx}
                                      title={`${b} samples`}
                                      className="flex-1 rounded-sm bg-primary/30"
                                      style={{ height: `${h}px` }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : col.topValues && col.topValues.length > 0 ? (
                            <div className="mt-3">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Top values</div>
                              <div className="mt-2 grid gap-1">
                                {col.topValues.map((tv) => (
                                  <div key={tv.value} className="flex items-center justify-between gap-3 text-xs">
                                    <div className="min-w-0 truncate text-muted-foreground">{tv.value}</div>
                                    <div className="shrink-0 text-muted-foreground">{tv.count}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">No columns found.</div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0" />
    </Card>
  );
}

