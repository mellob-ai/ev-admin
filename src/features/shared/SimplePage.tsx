interface SimplePageProps {
  page: string;
  title: string;
  subtitle?: string;
}

export default function SimplePage({ page, title, subtitle }: SimplePageProps) {
  return (
    <section className="page active" id={`page-${page}`}>
      <div className="table-card full">
        <div className="table-wrap table-wrap-pad">
          <p className="text-secondary">This module is active and routed. You can now customize and expand this feature in its own component file.</p>
        </div>
      </div>
    </section>
  );
}
