"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Download, RotateCcw } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, KosongRow, PageHeader, SearchBox, SelectField, Toolbar } from "@/components/ui";
import { ColumnChart, VIZ } from "@/graphify";
import { ENTITY_LABEL, useApp, type CollectionKey } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtTglJam } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export default function AuditPage() {
  return (
    <Guard modul="audit">
      <AuditView />
    </Guard>
  );
}

const AKSI = ["CREATE", "UPDATE", "DELETE", "APPROVE", "DECLINE", "LOGIN"] as const;

function AuditView() {
  const audit = useApp((s) => s.audit);
  const resetData = useApp((s) => s.resetData);
  const me = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const [q, setQ] = useState("");
  const [aksi, setAksi] = useState("");
  const [entity, setEntity] = useState("");

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return audit.filter((a) => {
      if (aksi && a.action !== aksi) return false;
      if (entity && a.entity !== entity) return false;
      if (!term) return true;
      return [a.entityLabel, a.aktor, a.field ?? "", a.before ?? "", a.after ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [audit, q, aksi, entity]);

  const perAksi = AKSI.map((a) => ({ label: a, value: audit.filter((x) => x.action === a).length }));

  const kolom = [
    { key: "at", header: "Waktu", value: (a: AuditEntry) => a.at },
    { key: "aktor", header: "Aktor", value: (a: AuditEntry) => a.aktor },
    { key: "role", header: "Peran", value: (a: AuditEntry) => a.aktorRole },
    { key: "entity", header: "Entitas", value: (a: AuditEntry) => ENTITY_LABEL[a.entity as CollectionKey] ?? a.entity },
    { key: "label", header: "Objek", value: (a: AuditEntry) => a.entityLabel },
    { key: "action", header: "Aksi", value: (a: AuditEntry) => a.action },
    { key: "field", header: "Field", value: (a: AuditEntry) => a.field ?? "" },
    { key: "before", header: "Nilai lama", value: (a: AuditEntry) => a.before ?? "" },
    { key: "after", header: "Nilai baru", value: (a: AuditEntry) => a.after ?? "" },
  ];

  return (
    <>
      <PageHeader
        judul="Audit Trail"
        modul="M11 · IMP-1"
        deskripsi="Jejak siapa mengubah apa dan kapan, lengkap dengan nilai lama → nilai baru. Wajib untuk data sensitif seperti harga dan kontrak."
        aksi={
          <>
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "audit-trail")}>
              <Download className="size-4" /> CSV
            </Button>
            {can(me, "audit", "delete") ? (
              <Button
                variant="danger-soft"
                onPress={() => {
                  if (confirm("Kembalikan seluruh data ke kondisi awal (seed)? Perubahan lokal akan hilang.")) resetData();
                }}
              >
                <RotateCcw className="size-4" /> Reset data demo
              </Button>
            ) : null}
          </>
        }
      />

      {audit.length === 0 ? (
        <div className="mb-4">
          <Callout tone="info" judul="Belum ada aktivitas tercatat">
            Audit trail terisi otomatis begitu ada perubahan data — coba ubah satu baris pada Master Category atau
            setujui sebuah usulan.
          </Callout>
        </div>
      ) : (
        <div className="mb-4">
          <ColumnChart
            title="Aktivitas per jenis aksi"
            subtitle="Sejak data demo dimuat di perangkat ini"
            data={perAksi}
            color={VIZ[6]}
            satuan="Jumlah entri"
            format={(n) => String(Math.round(n))}
            height={200}
          />
        </div>
      )}

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Objek / aktor / nilai…" className="w-64" />
        <SelectField
          label="Aksi"
          items={[{ id: "", label: "Semua aksi" }, ...AKSI.map((a) => ({ id: a, label: a }))]}
          value={aksi}
          onChange={setAksi}
          className="w-40"
        />
        <SelectField
          label="Entitas"
          items={[
            { id: "", label: "Semua entitas" },
            ...(Object.keys(ENTITY_LABEL) as CollectionKey[]).map((k) => ({ id: k, label: ENTITY_LABEL[k] })),
          ]}
          value={entity}
          onChange={setEntity}
          className="w-56"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} entri</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Tidak ada entri audit yang cocok." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Waktu</th>
                <th className="px-3 py-2 font-medium">Aktor</th>
                <th className="px-3 py-2 font-medium">Entitas / objek</th>
                <th className="px-3 py-2 font-medium">Aksi</th>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Lama → baru</th>
              </tr>
            </thead>
            <tbody>
              {terfilter.slice(0, 200).map((a) => (
                <tr key={a.id} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2 text-xs tnum text-muted">{fmtTglJam(a.at)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{a.aktor}</span>
                    <span className="block text-muted">{a.aktorRole}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{a.entityLabel}</span>
                    <span className="block text-muted">{ENTITY_LABEL[a.entity as CollectionKey] ?? a.entity}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        a.action === "DELETE" || a.action === "DECLINE"
                          ? "danger"
                          : a.action === "CREATE" || a.action === "APPROVE"
                            ? "success"
                            : "default"
                      }
                    >
                      {a.action}
                    </Chip>
                  </td>
                  <td className="px-3 py-2 text-xs tnum text-muted">{a.field ?? "—"}</td>
                  <td className="max-w-[320px] px-3 py-2 text-xs">
                    {a.before || a.after ? (
                      <span className="block truncate">
                        <span className="text-danger">{a.before ?? "∅"}</span>
                        <span className="text-muted"> → </span>
                        <span className="text-success">{a.after ?? "∅"}</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
