import { useState } from "react";

export default function FileDropField({
  file,
  onFile,
  disabled,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={[
        "rounded-xl border border-border/60 bg-secondary/10 p-4 transition",
        dragOver ? "ring-2 ring-primary/40 border-primary/40" : "",
        disabled ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFile(e.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {file ? (
            <>
              <div className="text-sm font-medium text-foreground truncate">
                {file.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB • {file.type || "unknown type"}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-foreground">
                Drop your submission file here
              </div>
              <div className="text-xs text-muted-foreground">or choose a file</div>
            </>
          )}
        </div>

        <label className="shrink-0 cursor-pointer rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs hover:bg-background">
          Choose file
          <input
            type="file"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {file && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onFile(null)}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}