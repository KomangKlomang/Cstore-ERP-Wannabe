"use client";

import { useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { KeyRound, Pencil, Plus } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  Callout,
  FormModal,
  NumberInput,
  PageHeader,
  SelectField,
  StatusChip,
  TextInput,
} from "@/components/ui";
import { BarChart } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { fmtNum, fmtNumShort } from "@/lib/format";
import { PLATFORMS, REGIONS, type AkunPlatform } from "@/lib/types";

export default function PlatformPage() {
  return (
    <Guard modul="platform">
      <PlatformView />
    </Guard>
  );
}

function PlatformView() {
  const akun = useApp((s) => s.akunPlatform);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "platform", "edit");

  const perAkun = akun
    .filter((a) => a.status === "AKTIF")
    .map((a) => ({ key: a.id, label: `${a.username}`, value: a.followers }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        judul="Akun Platform Marketing"
        modul="M6 · IMP-4"
        deskripsi="Daftar akun sosial media beserta PIC dan cakupan region. Kredensial tidak disimpan di MMS."
        aksi={boleh ? <FormAkun onSimpan={(v) => saveRow("akunPlatform", v)} /> : undefined}
      />

      <div className="mb-4">
        <Callout tone="warning" judul="IMP-4 — kredensial tidak disimpan di aplikasi ini">
          Board asli memiliki field <b>Password email</b> dan <b>Passoword sosmed</b>. Menyimpan kata sandi korporat
          sebagai teks biasa berisiko tinggi, sehingga di sini yang disimpan hanya <b>referensi vault</b> terenkripsi
          (mis. 1Password/Bitwarden) dengan akses per-PIC dan log akses. Login harian sebaiknya lewat SSO.
        </Callout>
      </div>

      <div className="mb-4">
        <BarChart
          title="Followers per akun aktif"
          subtitle="Basis audiens untuk perencanaan konten"
          data={perAkun}
          format={fmtNumShort}
          satuan="Followers"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Platform</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">PIC</th>
              <th className="px-3 py-2 font-medium">Region</th>
              <th className="px-3 py-2 text-right font-medium">Followers</th>
              <th className="px-3 py-2 font-medium">Kredensial</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {akun.map((a) => (
              <tr key={a.id} className="border-b border-separator/60 last:border-0">
                <td className="px-3 py-2">
                  <Chip size="sm" variant="soft">
                    {a.platform}
                  </Chip>
                </td>
                <td className="px-3 py-2 font-medium text-foreground">{a.username}</td>
                <td className="px-3 py-2 text-xs text-muted">{a.pic}</td>
                <td className="px-3 py-2 text-xs">{a.region}</td>
                <td className="px-3 py-2 text-right tnum">{fmtNum(a.followers)}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 text-xs tnum text-muted">
                    <KeyRound className="size-3.5" /> {a.vaultRef}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <StatusChip status={a.status} />
                </td>
                <td className="px-3 py-2">
                  {boleh ? <FormAkun akun={a} onSimpan={(v) => saveRow("akunPlatform", v)} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FormAkun({ akun, onSimpan }: { akun?: AkunPlatform; onSimpan: (a: AkunPlatform) => void }) {
  const state = useOverlayState();

  const kosong = (): AkunPlatform => ({
    id: newId("ap"),
    platform: "INSTAGRAM",
    username: "",
    pic: "",
    region: "PUSAT",
    followers: 0,
    vaultRef: "vault://mms/sosmed/",
    status: "AKTIF",
    updatedAt: "",
  });

  const [draft, setDraft] = useState<AkunPlatform>(akun ?? kosong());
  const set = <K extends keyof AkunPlatform>(k: K, v: AkunPlatform[K]) => setDraft({ ...draft, [k]: v });

  return (
    <>
      {akun ? (
        <Button size="sm" variant="ghost" isIconOnly aria-label={`Ubah ${akun.username}`} onPress={() => { setDraft(akun); state.open(); }}>
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button variant="primary" onPress={() => { setDraft(kosong()); state.open(); }}>
          <Plus className="size-4" /> Akun baru
        </Button>
      )}

      <FormModal state={state} judul={akun ? `Ubah ${akun.username}` : "Tambah akun platform"} size="md" onSimpan={() => onSimpan(draft)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Platform"
            items={PLATFORMS.map((p) => ({ id: p, label: p }))}
            value={draft.platform}
            onChange={(v) => set("platform", v as AkunPlatform["platform"])}
          />
          <TextInput label="Username" value={draft.username} onChange={(v) => set("username", v)} />
          <TextInput label="PIC" value={draft.pic} onChange={(v) => set("pic", v)} />
          <SelectField
            label="Region"
            items={[{ id: "PUSAT", label: "PUSAT" }, ...REGIONS.map((r) => ({ id: r, label: r }))]}
            value={draft.region}
            onChange={(v) => set("region", v as AkunPlatform["region"])}
          />
          <NumberInput label="Followers" value={draft.followers} onChange={(v) => set("followers", v)} />
          <SelectField
            label="Status"
            items={[
              { id: "AKTIF", label: "Aktif" },
              { id: "NONAKTIF", label: "Nonaktif" },
            ]}
            value={draft.status}
            onChange={(v) => set("status", v as AkunPlatform["status"])}
          />
          <TextInput
            label="Referensi vault"
            value={draft.vaultRef}
            onChange={(v) => set("vaultRef", v)}
            description="Alamat rahasia di password manager. Kata sandi tidak pernah disimpan di MMS."
            className="sm:col-span-2"
          />
        </div>
      </FormModal>
    </>
  );
}
