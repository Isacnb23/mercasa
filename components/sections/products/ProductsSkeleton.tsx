// Placeholder puro (sin hooks/estado) mientras ProductsExplorerLoader trae y
// arma el árbol server-side. Reproduce la silueta de la grilla de tarjetas
// real (ver productos-rediseno-referencia.md) para que no haya salto de
// layout cuando el contenido real reemplaza el skeleton.
function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#EEF2F6] ${className}`} />;
}

export default function ProductsSkeleton() {
  return (
    <div className="mt-10 lg:mt-14" role="status" aria-live="polite">
      <div className="flex snap-x gap-4 overflow-x-auto px-1 pb-2 pt-4 [&::-webkit-scrollbar]:hidden xl:flex-wrap xl:justify-center xl:overflow-visible xl:px-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex w-[210px] shrink-0 flex-col items-center rounded-[26px] border px-6 pb-7 pt-8 sm:w-[240px] xl:w-[212px]"
            style={{ borderColor: "#E7ECF2" }}
          >
            <Bone className="h-20 w-20 rounded-full" />
            <Bone className="mt-5 h-5 w-28" />
            <Bone className="mt-3 h-3 w-20" />
            <Bone className="mt-6 h-[42px] w-32 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
