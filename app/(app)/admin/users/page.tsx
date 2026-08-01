"use client";

import { useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Pencil, Plus, ShieldCheck } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, FormModal, PageHeader, SelectField, StatusChip, TextInput, Toolbar } from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { MODULES, PERMISSION_MATRIX, can, scopeLabel } from "@/lib/rbac";
import { fmtTglJam } from "@/lib/format";
import { REGIONS, ROLES, ROLE_LABEL, type Role, type User } from "@/lib/types";

export default function UsersPage() {
  return (
    <Guard modul="users">
      <UsersView />
    </Guard>
  );
}

function UsersView() {
  const users = useApp((s) => s.users);
  const saveRow = useApp((s) => s.saveRow);
  const me = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(me, "users", "edit");

  const [role, setRole] = useState("");

  const terfilter = role ? users.filter((u) => u.role === role) : users;

  return (
    <>
      <PageHeader
        judul="User, Role &amp; Permission"
        modul="M9 · FR-9.3 / FR-9.7"
        deskripsi="Kelola akun dan cakupan data. Penonaktifan bersifat soft-disable agar riwayat aktivitas tetap utuh."
        aksi={boleh ? <FormUser onSimpan={(v) => saveRow("users", v)} /> : undefined}
      />

      <Toolbar>
        <SelectField
          label="Peran"
          items={[{ id: "", label: "Semua peran" }, ...ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }))]}
          value={role}
          onChange={setRole}
          className="w-64"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">
          {users.filter((u) => u.aktif).length} aktif dari {users.length} user
        </span>
      </Toolbar>

      <div className="mb-5 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Peran</th>
              <th className="px-3 py-2 font-medium">Cakupan data</th>
              <th className="px-3 py-2 font-medium">MFA</th>
              <th className="px-3 py-2 font-medium">Login terakhir</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {terfilter.map((u) => (
              <tr key={u.id} className="border-b border-separator/60 last:border-0">
                <td className="px-3 py-2 font-medium text-foreground">{u.nama}</td>
                <td className="px-3 py-2 text-xs text-muted">{u.email}</td>
                <td className="px-3 py-2">
                  <Chip size="sm" variant="soft" color={u.role === "MDM" ? "accent" : "default"}>
                    {u.role}
                  </Chip>
                </td>
                <td className="px-3 py-2 text-xs text-muted">{scopeLabel(u)}</td>
                <td className="px-3 py-2">
                  {u.mfaAktif ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <ShieldCheck className="size-3.5" /> aktif
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs tnum text-muted">{u.lastLogin ? fmtTglJam(u.lastLogin) : "—"}</td>
                <td className="px-3 py-2">
                  <StatusChip status={u.aktif ? "AKTIF" : "NONAKTIF"} />
                </td>
                <td className="px-3 py-2">{boleh ? <FormUser user={u} onSimpan={(v) => saveRow("users", v)} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-foreground">Matriks izin (SRS §3.6)</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1000px] text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-muted">
              <th className="px-2 py-2 font-medium">Modul</th>
              {ROLES.map((r) => (
                <th key={r} className="px-2 py-2 text-center font-medium">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m} className="border-b border-separator/50 last:border-0">
                <td className="px-2 py-1.5 font-medium text-foreground">{m}</td>
                {ROLES.map((r) => {
                  const perms = PERMISSION_MATRIX[r]?.[m];
                  return (
                    <td key={r} className="px-2 py-1.5 text-center">
                      {!perms ? (
                        <span className="text-muted">—</span>
                      ) : perms.length >= 5 ? (
                        <Chip size="sm" variant="soft" color="success">
                          full
                        </Chip>
                      ) : perms.length === 1 ? (
                        <Chip size="sm" variant="soft">
                          view
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="soft" color="accent">
                          {perms.length === 4 ? "crud" : "rw"}
                        </Chip>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Callout tone="info" judul="Catatan keamanan">
          Sesi berakhir setelah 30 menit idle dan seluruh login tercatat di Audit Trail (FR-9.6). MFA disarankan untuk
          peran MDM dan Admin/IT (FR-9.2).
        </Callout>
      </div>
    </>
  );
}

function FormUser({ user, onSimpan }: { user?: User; onSimpan: (u: User) => void }) {
  const state = useOverlayState();
  const stores = useApp((s) => s.stores);

  const kosong = (): User => ({
    id: newId("u"),
    nama: "",
    email: "",
    role: "CATEGORY_OFFICER",
    regions: [],
    aktif: true,
    mfaAktif: false,
  });

  const [draft, setDraft] = useState<User>(user ?? kosong());
  const set = <K extends keyof User>(k: K, v: User[K]) => setDraft({ ...draft, [k]: v });

  return (
    <>
      {user ? (
        <Button size="sm" variant="ghost" isIconOnly aria-label={`Ubah ${user.nama}`} onPress={() => { setDraft(user); state.open(); }}>
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button variant="primary" onPress={() => { setDraft(kosong()); state.open(); }}>
          <Plus className="size-4" /> User baru
        </Button>
      )}

      <FormModal state={state} judul={user ? `Ubah ${user.nama}` : "Tambah user"} size="md" onSimpan={() => onSimpan(draft)}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nama" value={draft.nama} onChange={(v) => set("nama", v)} isRequired />
            <TextInput label="Email" value={draft.email} onChange={(v) => set("email", v)} isRequired />
            <SelectField
              label="Peran"
              items={ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }))}
              value={draft.role}
              onChange={(v) => set("role", v as Role)}
            />
            <SelectField
              label="Status"
              items={[
                { id: "true", label: "Aktif" },
                { id: "false", label: "Nonaktif (soft-disable)" },
              ]}
              value={String(draft.aktif)}
              onChange={(v) => set("aktif", v === "true")}
            />
            <SelectField
              label="MFA"
              items={[
                { id: "false", label: "Tidak aktif" },
                { id: "true", label: "Aktif (TOTP)" },
              ]}
              value={String(draft.mfaAktif)}
              onChange={(v) => set("mfaAktif", v === "true")}
            />
            <SelectField
              label="Toko (khusus Crew)"
              items={[{ id: "", label: "—" }, ...stores.map((s) => ({ id: s.storeCode, label: `${s.storeCode} — ${s.storeName}` }))]}
              value={draft.storeCode ?? ""}
              onChange={(v) => set("storeCode", v || undefined)}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Cakupan region {draft.regions.length === 0 ? "(kosong = semua region)" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <label key={r} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.regions.includes(r)}
                    onChange={(e) =>
                      set("regions", e.target.checked ? [...draft.regions, r] : draft.regions.filter((x) => x !== r))
                    }
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormModal>
    </>
  );
}
