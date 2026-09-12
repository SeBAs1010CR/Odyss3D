"use client";

import { useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.stl,.step,.stp,.obj,.iges,.igs,.sldprt,.zip,.rar";

type Status = "idle" | "sending" | "success" | "error";

export default function Contacto() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const onChangeFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const total = list.reduce((acc, f) => acc + f.size, 0);
    if (total > 25 * 1024 * 1024) {
      setError("Los archivos en total no pueden superar 25 MB.");
      if (inputRef.current) inputRef.current.value = "";
      setFiles([]);
      return;
    }
    setError("");
    setFiles(list);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");

    const form = new FormData();
    form.append("name", name.trim());
    form.append("contact", contact.trim());
    form.append("message", message.trim());
    for (const f of files) form.append("files", f, f.name);

    try {
      const res = await fetch("/api/cotizacion", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar la solicitud. Inténtalo de nuevo.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setName("");
      setContact("");
      setMessage("");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Hubo un problema de conexión. Inténtalo de nuevo.");
      setStatus("error");
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="section contacto">
          <div className="container">
            <div className="contacto-head">
              <span className="section-eyebrow">Cotización</span>
              <h1 className="section-title">Solicita tu cotización</h1>
              <p className="section-subtitle">
                Cuéntanos qué necesitas fabricar y sube tu archivo, imagen o
                referencia. Te respondemos con una propuesta clara.
              </p>
            </div>

            {status === "success" ? (
              <div className="contacto-success">
                <h3>¡Solicitud enviada!</h3>
                <p>
                  Recibimos tu pedido y te responderemos lo antes posible.
                  Mientras tanto, también puedes escribirnos por WhatsApp.
                </p>
                <a
                  href="https://wa.me/50663959409"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Escríbenos por WhatsApp
                </a>
              </div>
            ) : (
              <form className="contacto-form" onSubmit={onSubmit}>
                <div className="contacto-fields">
                  <label className="contacto-field">
                    <span>Tu nombre *</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre y apellido"
                      required
                    />
                  </label>

                  <label className="contacto-field">
                    <span>WhatsApp o correo *</span>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Teléfono o correo para responderte"
                      required
                    />
                  </label>
                </div>

                <label className="contacto-field">
                  <span>¿Qué necesitas?</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe tu idea: tamaño, material, cantidad, acabado…"
                  />
                </label>

                <div className="contacto-field">
                  <span>Adjunta tu archivo o imagen</span>
                  <div
                    className="contacto-drop"
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                    }}
                  >
                    {files.length === 0 ? (
                      <>
                        <strong>Haz clic para seleccionar</strong>
                        <small>
                          Imágenes, PDF o modelos 3D (STL, STEP, OBJ…) · Máx. 25 MB
                        </small>
                      </>
                    ) : (
                      <ul className="contacto-files">
                        {files.map((f) => (
                          <li key={f.name}>
                            {f.name} <span>({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept={ACCEPT}
                      multiple
                      onChange={onChangeFiles}
                      style={{ display: "none" }}
                    />
                  </div>
                  <small className="contacto-hint">
                    Puedes adjuntar la pieza a fabricar, un boceto o una referencia.
                  </small>
                </div>

                {error && <p className="contacto-error">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === "sending"}
                  style={{ opacity: status === "sending" ? 0.6 : 1 }}
                >
                  {status === "sending" ? "Enviando…" : "Enviar solicitud"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}