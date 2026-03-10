interface RacePageProps {
  params: { raceId: string };
}

export default function RacePage({ params }: RacePageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Race {params.raceId.slice(0, 8)}...</h1>
      <p className="text-gray-400">Race details will be displayed here.</p>
      {/* TODO: Wire up to API and show race state */}
    </div>
  );
}
