import mongoose from 'mongoose';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../../modules/player-spaces/DBSchemas/PlayerSpaceSchema';

export async function createTestVenue(ownerId: string): Promise<IPlayerSpaceDocument> {
  return PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: 'Test Venue',
    address: '123 Test Street, Singapore',
    type: 'house',
    location: { lat: 1.3521, long: 103.8198 },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
  });
}
