import { useBitjitaCargosWithFallback } from '../services/useBitjitaCargosWithFallback';
import { STATIC_CARGO_DATA } from '../services/staticCargoData';

export function CargoDebugComponent() {
  const { cargos, loading, error, usingFallback } =
    useBitjitaCargosWithFallback();

  console.log('[CargoDebug] Hook state:', {
    cargosLength: cargos.length,
    loading,
    error,
    usingFallback,
    cargos: cargos.slice(0, 5), // First 5 items
  });

  console.log('[CargoDebug] Static data length:', STATIC_CARGO_DATA.length);
  console.log(
    '[CargoDebug] Static leather items:',
    STATIC_CARGO_DATA.filter((item) =>
      item.name.toLowerCase().includes('leather'),
    ),
  );

  return (
    <div style={{ margin: '20px', padding: '20px', border: '1px solid #ccc' }}>
      <h3>Cargo Debug Info</h3>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <p>
        Using Fallback: {usingFallback ? 'Yes (Static Data)' : 'No (API Data)'}
      </p>
      <p>Cargos loaded: {cargos.length}</p>
      <p>Static cargos available: {STATIC_CARGO_DATA.length}</p>

      {cargos.length > 0 && (
        <div>
          <h4>Sample cargo items:</h4>
          <ul>
            {cargos.slice(0, 10).map((cargo) => (
              <li key={cargo.id}>
                {cargo.name} (Tier {cargo.tier})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4>Leather items in static data:</h4>
        <ul>
          {STATIC_CARGO_DATA.filter((item) =>
            item.name.toLowerCase().includes('leather'),
          ).map((item) => (
            <li key={item.id}>
              {item.name} (Tier {item.tier})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
