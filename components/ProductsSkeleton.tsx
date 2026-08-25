// Placeholder puro (sin hooks/estado) mientras ProductsExplorerLoader trae y
// arma el árbol server-side. Reproduce la silueta del master-detail real
// (columna de familias + panel de detalle) para que no haya salto de layout
// cuando el contenido real reemplaza el skeleton.
function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#EEF2F6] ${className}`} />;
}

export default function ProductsSkeleton() {
  return (
    <div className="mt-16 lg:mt-20" role="status" aria-live="polite">
      <div className="flex justify-center">
        <Bone className="h-3 w-40" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-8">
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-[52px] w-[180px] shrink-0 lg:h-[64px] lg:w-full" />
          ))}
        </div>

        <div className="rounded-[28px] border p-6 sm:p-8" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex items-center gap-4">
            <Bone className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex flex-col gap-2">
              <Bone className="h-5 w-40" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={i} className="h-[26px] w-20" />
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-[58px] w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
