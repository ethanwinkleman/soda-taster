import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { SodaEntry } from '../types/soda';
import { SodaCard } from '../components/SodaCard';

interface Props {
  sodas: SodaEntry[];
  onToggleFavorite: (id: string) => void;
  groupId?: string | null;
}

export function FavoritesPage({ sodas, onToggleFavorite }: Props) {
  const navigate = useNavigate();
  const favorites = sodas.filter((s) => s.isFavorite);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Favorites</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={64} className="text-red-400/50 mb-4 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No favorites yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Tap the heart on any soda to add it here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/sodas')}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors"
          >
            Browse Sodas
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((soda) => (
              <SodaCard key={soda.id} soda={soda} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
