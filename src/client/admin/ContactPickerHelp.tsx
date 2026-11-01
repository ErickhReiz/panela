import { useEffect } from "react";
import { detectPlatform, isIosSafari } from "./contacts";

interface Props {
  onClose: () => void;
}

/** Explica como habilitar a Contact Picker API quando o navegador não a expõe. */
export function ContactPickerHelp({ onClose }: Props) {
  const platform = detectPlatform();
  const insecure = !window.isSecureContext;

  useEffect(() => {
    // Captura antes do editor para que Esc feche só este modal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="overlay help-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="picker-help-heading">
        <h3 id="picker-help-heading">📇 Habilitar acesso à agenda</h3>

        {insecure ? (
          <p className="help">
            A agenda só pode ser acessada em uma conexão segura. Abra o painel pelo endereço <strong>https://</strong>.
          </p>
        ) : platform === "ios" ? (
          <>
            <p className="help">
              No iPhone, o acesso à agenda pelo navegador é um recurso experimental do <strong>Safari</strong> e vem
              desligado. Para ativar:
            </p>
            {!isIosSafari() && (
              <p className="help-warn">Abra este painel no Safari — Chrome e outros navegadores do iPhone não têm essa opção.</p>
            )}
            <ol className="help-steps">
              <li>
                Abra o app <strong>Ajustes</strong>.
              </li>
              <li>
                Toque em <strong>Apps</strong> → <strong>Safari</strong> (no iOS 17 ou anterior, direto em{" "}
                <strong>Safari</strong>).
              </li>
              <li>
                Role até o fim e toque em <strong>Avançado</strong>.
              </li>
              <li>
                Toque em <strong>Sinalizadores de Recursos</strong> (ou <strong>Recursos Experimentais</strong>).
              </li>
              <li>
                Ative <strong>Contact Picker API</strong>.
              </li>
              <li>Volte ao Safari e recarregue esta página.</li>
            </ol>
          </>
        ) : platform === "android" ? (
          <>
            <p className="help">Seu navegador não oferece acesso à agenda. No Android, use um destes:</p>
            <ol className="help-steps">
              <li>
                <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> ou <strong>Samsung Internet</strong>{" "}
                atualizados.
              </li>
              <li>Abra este painel nele e toque novamente em “Da agenda”.</li>
            </ol>
          </>
        ) : (
          <p className="help">
            Computadores não dão acesso à agenda do celular. Abra este painel no celular — no iPhone pelo{" "}
            <strong>Safari</strong> (com o recurso ativado) ou no Android pelo <strong>Chrome</strong>.
          </p>
        )}

        <p className="help">Os contatos só são lidos quando você os escolhe na lista do aparelho.</p>

        <button type="button" className="btn primary block" onClick={onClose}>
          Entendi
        </button>
      </section>
    </div>
  );
}
