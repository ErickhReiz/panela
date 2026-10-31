export function NotFound({ code }: { code?: string }) {
  return (
    <div className="public-page centered">
      <main className="hero-card">
        <h1 className="section-title">Convite não encontrado 😔</h1>
        {code ? (
          <p className="muted">
            O código "<strong>{code}</strong>" não foi localizado em nossa lista.
          </p>
        ) : (
          <p className="muted">Esta página não existe.</p>
        )}
        <p style={{ marginTop: 20 }}>
          <a className="action-link" href="/">
            Voltar para a página inicial
          </a>
        </p>
      </main>
    </div>
  );
}
