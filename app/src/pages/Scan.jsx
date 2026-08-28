import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabaseClient.js";

const READER_ID = "qr-reader";

export default function Scan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);

  async function goToBoxByToken(token) {
    const { data, error: lookupError } = await supabase
      .from("boxes")
      .select("id")
      .eq("qr_token", token)
      .single();

    if (lookupError || !data) {
      setError("Este QR no corresponde a ninguna caja registrada.");
      return false;
    }

    navigate(`/cajas/${data.id}`);
    return true;
  }

  // QR leído con la cámara nativa del celular (fuera de la app): la URL ya
  // trae el token, así que resolvemos directo sin abrir el escáner en vivo.
  useEffect(() => {
    if (tokenFromUrl) {
      goToBoxByToken(tokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  // Escáner en vivo dentro de la app (cuando no viene un token por URL).
  useEffect(() => {
    if (tokenFromUrl) return;

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        async (decodedText) => {
          if (looking) return;
          setLooking(true);
          await scanner.stop();

          const ok = await goToBoxByToken(decodedText);
          if (!ok) {
            setLooking(false);
            scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: 240 },
              () => {},
              () => {}
            );
          }
        },
        () => {
          // errores de frame individual (sin QR visible) — se ignoran
        }
      )
      .catch((err) => setError("No se pudo acceder a la cámara: " + err.message));

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  if (tokenFromUrl) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Escanear QR</h1>
            <p className="page-subtitle">Buscando la caja...</p>
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Escanear QR</h1>
          <p className="page-subtitle">Apuntá la cámara al código QR de la caja</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <div id={READER_ID} />
      </div>
    </>
  );
}
