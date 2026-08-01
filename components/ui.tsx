"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  TextArea,
  useOverlayState,
} from "@heroui/react";
import { Paperclip, Trash2, Upload, X } from "lucide-react";

import { MAX_UPLOAD_BYTES, fmtBytes, readFileAsDataUrl } from "@/lib/export";
import type { MediaFile } from "@/lib/types";
import { newId } from "@/lib/store";

/* ---------------------------------------------------------------- Page header */

export function PageHeader({
  judul,
  deskripsi,
  modul,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  modul?: string;
  aksi?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{judul}</h1>
          {modul ? (
            <Chip size="sm" variant="soft" color="default">
              {modul}
            </Chip>
          ) : null}
        </div>
        {deskripsi ? <p className="mt-1 max-w-3xl text-sm text-muted">{deskripsi}</p> : null}
      </div>
      {aksi ? <div className="flex flex-wrap items-center gap-2 no-print">{aksi}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ Stat card */

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warning" | "serious" | "critical";
  icon?: ReactNode;
  href?: string;
}) {
  const toneRing: Record<string, string> = {
    default: "border-border",
    good: "border-success/40",
    warning: "border-warning/50",
    serious: "border-warning/60",
    critical: "border-danger/50",
  };
  const toneText: Record<string, string> = {
    default: "text-foreground",
    good: "text-success",
    warning: "text-warning",
    serious: "text-warning",
    critical: "text-danger",
  };

  const body = (
    <div className={`h-full rounded-xl border bg-surface p-4 shadow-surface ${toneRing[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <div className={`mt-2 text-2xl font-semibold tnum ${toneText[tone]}`}>{value}</div>
      {hint ? <p className="mt-1 text-xs leading-snug text-muted">{hint}</p> : null}
    </div>
  );

  return href ? (
    <a href={href} className="block transition-opacity hover:opacity-90">
      {body}
    </a>
  ) : (
    body
  );
}

/* ----------------------------------------------------------------- Form field */

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  description,
  type = "text",
  isRequired,
  isDisabled,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
  type?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
      aria-label={label ? undefined : placeholder}
    >
      {label ? <Label isRequired={isRequired}>{label}</Label> : null}
      <Input placeholder={placeholder} type={type} />
      {description ? <Description>{description}</Description> : null}
    </TextField>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  description,
  isRequired,
  className,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  description?: string;
  isRequired?: boolean;
  className?: string;
}) {
  return (
    <TextInput
      label={label}
      type="number"
      value={String(value ?? 0)}
      onChange={(v) => onChange(Number(v.replace(/[^\d.-]/g, "")) || 0)}
      description={description}
      isRequired={isRequired}
      className={className}
    />
  );
}

export function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <TextField value={value} onChange={onChange} className={className} aria-label={label ? undefined : placeholder}>
      {label ? <Label>{label}</Label> : null}
      <TextArea placeholder={placeholder} rows={rows} />
    </TextField>
  );
}

export interface Opt {
  id: string;
  label: string;
  hint?: string;
}

export function SelectField({
  label,
  items,
  value,
  onChange,
  placeholder = "Pilih…",
  className,
  isDisabled,
  ariaLabel,
}: {
  label?: string;
  items: Opt[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Select
      selectedKey={value || null}
      onSelectionChange={(k) => onChange(k === null ? "" : String(k))}
      isDisabled={isDisabled}
      className={className}
      aria-label={label ?? ariaLabel ?? placeholder}
      placeholder={placeholder}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={items}>
          {(item: Opt) => (
            <ListBox.Item id={item.id} textValue={item.label}>
              <span className="block truncate">{item.label}</span>
              {item.hint ? <span className="block text-xs text-muted">{item.hint}</span> : null}
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

/* ---------------------------------------------------------------- Status chip */

const STATUS_TONE: Record<string, "default" | "accent" | "success" | "warning" | "danger"> = {
  AKTIF: "success",
  BERJALAN: "success",
  APPROVED: "success",
  GOOD: "success",
  DIPERPANJANG: "success",
  DRAFT: "default",
  NONAKTIF: "default",
  SELESAI: "default",
  RENOVASI: "default",
  SUBMITTED: "accent",
  ON_PROGRESS: "accent",
  RELOKASI: "accent",
  AKAN_BERAKHIR: "warning",
  REPLACE: "warning",
  DELISTING: "warning",
  BERAKHIR: "danger",
  DECLINED: "danger",
  DIBATALKAN: "danger",
  TUTUP: "danger",
  HILANG: "danger",
  RETUR: "warning",
};

export function StatusChip({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  return (
    <Chip size={size} variant="soft" color={STATUS_TONE[status] ?? "default"}>
      {status.replace(/_/g, " ")}
    </Chip>
  );
}

/* --------------------------------------------------------------- Toolbar/filter */

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3 no-print">
      {children}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Cari…",
  className = "w-64",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return <TextInput value={value} onChange={onChange} placeholder={placeholder} className={className} />;
}

/* ------------------------------------------------------------------- Modal UI */

export function FormModal({
  trigger,
  judul,
  deskripsi,
  children,
  onSimpan,
  simpanLabel = "Simpan",
  size = "lg",
  state,
  bisaSimpan = true,
}: {
  trigger?: ReactNode;
  judul: string;
  deskripsi?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  onSimpan?: () => boolean | void;
  simpanLabel?: string;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  state?: ReturnType<typeof useOverlayState>;
  bisaSimpan?: boolean;
}) {
  const own = useOverlayState();
  const st = state ?? own;

  return (
    <>
      {trigger ? <span onClick={() => st.open()}>{trigger}</span> : null}
      <Modal isOpen={st.isOpen} onOpenChange={st.setOpen}>
        <Modal.Backdrop>
          <Modal.Container size={size}>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{judul}</Modal.Heading>
                {deskripsi ? <p className="mt-1 text-sm text-muted">{deskripsi}</p> : null}
                <Modal.CloseTrigger>
                  <X className="size-4" />
                </Modal.CloseTrigger>
              </Modal.Header>
              <Modal.Body className="max-h-[65vh] overflow-y-auto">
                {typeof children === "function" ? children(() => st.close()) : children}
              </Modal.Body>
              {onSimpan ? (
                <Modal.Footer>
                  <Button variant="tertiary" onPress={() => st.close()}>
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={!bisaSimpan}
                    onPress={() => {
                      const res = onSimpan();
                      if (res !== false) st.close();
                    }}
                  >
                    {simpanLabel}
                  </Button>
                </Modal.Footer>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

/* --------------------------------------------------------- M10 upload lampiran */

export function FileUploadField({
  label = "Lampiran",
  files,
  onChange,
  accept = "image/*,.pdf",
  hint,
  maks = 6,
}: {
  label?: string;
  files: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  accept?: string;
  hint?: string;
  maks?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handle(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const out: MediaFile[] = [];
    for (const f of Array.from(list).slice(0, maks - files.length)) {
      if (f.size > MAX_UPLOAD_BYTES) {
        setError(`${f.name} melebihi ${fmtBytes(MAX_UPLOAD_BYTES)} dan dilewati.`);
        continue;
      }
      out.push({
        id: newId("file"),
        nama: f.name,
        tipe: f.type || "application/octet-stream",
        ukuran: f.size,
        dataUrl: await readFileAsDataUrl(f),
        uploadedAt: new Date().toISOString(),
        uploadedBy: "",
      });
    }
    onChange([...files, ...out]);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button size="sm" variant="outline" onPress={() => ref.current?.click()} isDisabled={files.length >= maks}>
          <Upload className="size-3.5" /> Pilih file
        </Button>
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => void handle(e.target.files)}
      />

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
          {hint ?? `Belum ada file. Maksimal ${fmtBytes(MAX_UPLOAD_BYTES)} per file, disimpan lokal di perangkat ini.`}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
              {f.tipe.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.dataUrl} alt={f.nama} className="size-9 rounded object-cover" />
              ) : (
                <Paperclip className="size-4 text-muted" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{f.nama}</span>
              <span className="tnum text-[11px] text-muted">{fmtBytes(f.ukuran)}</span>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label={`Hapus ${f.nama}`}
                onPress={() => onChange(files.filter((x) => x.id !== f.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- Empty state */

export function KosongRow({ pesan = "Tidak ada data." }: { pesan?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
      {pesan}
    </div>
  );
}

/* ------------------------------------------------------------ Info / callout */

export function Callout({
  tone = "info",
  judul,
  children,
}: {
  tone?: "info" | "warning" | "danger";
  judul: string;
  children?: ReactNode;
}) {
  const map = {
    info: "border-accent/40 bg-accent-soft text-accent-soft-foreground",
    warning: "border-warning/40 bg-warning-soft text-warning-soft-foreground",
    danger: "border-danger/40 bg-danger-soft text-danger-soft-foreground",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${map[tone]}`}>
      <p className="font-medium">{judul}</p>
      {children ? <div className="mt-1 text-[13px] opacity-90">{children}</div> : null}
    </div>
  );
}
