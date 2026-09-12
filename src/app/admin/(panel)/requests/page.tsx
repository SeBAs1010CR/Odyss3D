"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Inbox, Search, Trash2 } from "lucide-react";
import {
  deleteContactRequest,
  fetchContactRequests,
  resolveSignedUrls,
  updateContactRequestStatus,
} from "@/lib/admin/api";
import { formatDate } from "@/lib/admin/format";
import type { ContactRequest, ContactRequestStatus } from "@/lib/admin/types";
import { Badge } from "@/components/admin/Badge";
import { ConfirmDialog, EmptyState, LoadingBlock } from "@/components/admin/ui";

const STATUS_LABELS: Record<ContactRequestStatus, string> = {
  nuevo: "Nuevo",
  respondido: "Respondido",
  cerrado: "Cerrado",
};

const STATUS_TONES: Record<ContactRequestStatus, "blue" | "amber" | "slate"> = {
  nuevo: "blue",
  respondido: "amber",
  cerrado: "slate",
};

const FILTERS: { value: ContactRequestStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "nuevo", label: "Nuevas" },
  { value: "respondido", label: "Respondidas" },
  { value: "cerrado", label: "Cerradas" },
];

export default function RequestsPage() {
  const [requests, setRequests] = useState<ContactRequest[] | null>(null);
  const [filter, setFilter] = useState<ContactRequestStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<ContactRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => {
    fetchContactRequests()
      .then(async (r) => {
        setRequests(r);
        const paths = [
          ...new Set(r.flatMap((x) => x.file_paths ?? []).filter((p) => !/^https?:\/\//.test(p))),
        ];
        if (paths.length > 0) {
          const map = await resolveSignedUrls("cotizaciones", paths);
          setUrls(map);
        } else {
          setUrls({});
        }
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, nuevo: 0, respondido: 0, cerrado: 0 };
    for (const r of requests ?? []) {
      c.all += 1;
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    if (!requests) return [];
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q) ||
        (r.message ?? "").toLowerCase().includes(q)
      )
        return true;
      return false;
    });
  }, [requests, filter, search]);

  const onChangeStatus = async (r: ContactRequest, next: ContactRequestStatus) => {
    if (next === r.status) return;
    setUpdating(r.id);
    setError("");
    try {
      await updateContactRequestStatus(r.id, next);
      setRequests((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setUpdating(null);
    }
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deleteContactRequest(toDelete);
      setRequests((prev) => (prev ?? []).filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  if (error && !requests) return <div className="error-text">{error}</div>;
  if (!requests) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Solicitudes de cotización</h1>
          <p className="admin-page-sub">Pedidos llegados desde la web (página /contacto)</p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="filter-bar">
        <div className="search-wrap">
          <Search />
          <input
            className="input"
            placeholder="Buscar por nombre, contacto o mensaje…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="seg-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`seg-tab ${filter === f.value ? "seg-active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              <span className="seg-count">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={requests.length === 0 ? "Sin solicitudes" : "Sin resultados"}
          text={
            requests.length === 0
              ? "Cuando alguien envíe el formulario de /contacto aparecerá aquí."
              : "Prueba con otro filtro o búsqueda."
          }
        />
      ) : (
        <div className="req-list">
          {filtered.map((r) => {
            const files = r.file_paths ?? [];
            return (
              <div className="req-card" key={r.id}>
                <div className="req-head">
                  <div className="req-title">
                    <span className="req-name">{r.name}</span>
                    <span className="req-muted">{r.contact}</span>
                  </div>
                  <span className="req-date">{formatDate(r.created_at)}</span>
                </div>

                {r.message && <p className="req-message">{r.message}</p>}

                <div className="req-foot">
                  <div className="req-files">
                    <span className="req-files-count">
                      {files.length === 0
                        ? "Sin archivos"
                        : `${files.length} archivo${files.length === 1 ? "" : "s"}`}
                    </span>
                    {files.map((p) => {
                      const ext = p.split(".").pop()?.toUpperCase() ?? "";
                      const link = urls[p];
                      return (
                        <a
                          key={p}
                          className="req-file"
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!link) e.preventDefault();
                          }}
                        >
                          {ext}
                          <Download size={13} />
                        </a>
                      );
                    })}
                  </div>

                  <div className="table-actions">
                    <select
                      className="select select-sm"
                      value={r.status}
                      disabled={updating === r.id}
                      onChange={(e) => onChangeStatus(r, e.target.value as ContactRequestStatus)}
                    >
                      <option value="nuevo">Nuevo</option>
                      <option value="respondido">Respondido</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                    <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    <button className="icon-btn danger" onClick={() => setToDelete(r)} title="Eliminar">
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar solicitud"
        message={
          <>
            ¿Eliminar la solicitud de <strong>{toDelete?.name}</strong>? Sus archivos adjuntos también se borrarán.
          </>
        }
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}