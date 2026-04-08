/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import Link from "next/link";

export function PopularGames({ games }: { games: any[] }) {
  if (!games.length) return null;
  return (
    <div>
      <p className="text-white font-semibold text-sm mb-3">Popular Games</p>
      <div className="grid grid-cols-2 gap-3">
        {games.map((g: any) => (
          <Link key={g.id} href={g.href}>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 hover:scale-[1.02] transition-all">
              <Image
                src={g.imageUrl}
                alt={g.name}
                fill
                unoptimized
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2 left-3 text-white text-xs font-bold">
                {g.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
