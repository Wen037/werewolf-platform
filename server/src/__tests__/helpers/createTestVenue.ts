import mongoose from 'mongoose';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../../modules/player-spaces/DBSchemas/PlayerSpaceSchema';

interface CreateTestVenueOptions {
  lat?: number;
  lng?: number;
  name?: string;
  status?: 'unVerified' | 'Verified';
}

export async function createTestVenue(
  ownerId: string,
  opts: CreateTestVenueOptions = {}
): Promise<IPlayerSpaceDocument> {
  const lat = opts.lat ?? 1.3521;
  const lng = opts.lng ?? 103.8198;

  return PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: opts.name ?? 'Test Venue',
    address: '123 Test Street, Singapore',
    type: 'house',
    location: { lat, long: lng },
    geoLocation: { type: 'Point', coordinates: [lng, lat] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: opts.status ?? 'unVerified',
  });
}
