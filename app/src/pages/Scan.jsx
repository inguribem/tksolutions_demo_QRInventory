import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabaseClient.js";

const READER_ID = "qr-reader";

export default function Scan() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);

  useEffect(() => {
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

          const { data, error: lookupError } = await supabase
            .from("boxes")
            .select("id")
            .eq("qr_token", decodedText)
            .single();

          if (lookupError || !data) {
            setError("Este QR no corresponde a ninguna caja registrada.");
            setLooking(false);
            scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: 240 },
              () => {},
              () => {}
            );
            return;
          }

          navigate(`/cajas/${data.id}`);
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
  }, []);

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
