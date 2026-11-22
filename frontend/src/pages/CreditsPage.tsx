import { photoCredits } from '../photoCredits';

/** Photo credits. The car pictures are free-licence photos from Wikimedia Commons; the licence asks us to name the photographer. */
export function CreditsPage() {
  return (
    <main className="page narrow">
      <h1 className="page-title">Photo credits</h1>
      <p className="muted">
        The car photos in DriveMate come from <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">Wikimedia Commons</a> and
        are shared under free licences. Thank you to the photographers. Each photo links to its original page and licence.
      </p>
      <div className="card">
        <table className="table">
          <thead><tr><th>Car</th><th>Photographer</th><th>Licence</th></tr></thead>
          <tbody>
            {photoCredits.map((c) => (
              <tr key={c.file}>
                <td><a href={c.source} target="_blank" rel="noreferrer">{c.model}</a></td>
                <td>{c.photographer}</td>
                <td><a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
