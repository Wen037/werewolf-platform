import { Entity } from '../../../shared/core/Entity';

export type PlaceType = 'house' | 'work' | 'school' | 'boardgame_store' | 'other';
export type VerificationStatus = 'unVerified' | 'Verified';

interface PlayerSpaceProps {
  owner_id: string;
  name: string;
  address: string;
  description?: string;
  imageUrl?: string;
  type: PlaceType;
  location: { lat: number; long: number };
  status: VerificationStatus;
  financials: { is_chargeable: boolean; approx_fee: number };
  amenities: string[];
  rules?: string;
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
}

export class PlayerSpace extends Entity<PlayerSpaceProps> {
  get id() { return this._id; }
  get ownerId() { return this.props.owner_id; }
  get isVerified() { return this.props.status === 'Verified'; }

  static create(props: PlayerSpaceProps, id?: string): PlayerSpace {
    return new PlayerSpace(props, id);
  }
}
