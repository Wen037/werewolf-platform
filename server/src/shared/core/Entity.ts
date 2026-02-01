// src/shared/core/Entity.ts
// This is the "Grandparent" class for all your future Objects (User, Match, Venue)

import { ObjectId } from 'mongodb';

export abstract class Entity<T> {
  protected readonly _id: string;
  public readonly props: T;

  constructor(props: T, id?: string) {
    this._id = id ? id : new ObjectId().toString(); // Auto-generate ID if missing
    this.props = props;
  }

  // Returns true if the IDs match (DDD Equality Rule)
  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!isEntity(object)) {
      return false;
    }

    return this._id === object._id;
  }
}

// Helper to check if something is an Entity
function isEntity(v: any): v is Entity<any> {
  return v instanceof Entity;
}