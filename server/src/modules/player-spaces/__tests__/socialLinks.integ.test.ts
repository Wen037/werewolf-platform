/**
 * Integration tests for socialLinks feature on PlayerSpace.
 * Covers: create with socialLinks, update/clear individual fields, DTO shape.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { PlayerSpaceService } from '../coreLogic/PlayerSpaceService';
import { PlayerSpaceModel } from '../DBSchemas/PlayerSpaceSchema';

setupMongoMemory();

const svc = new PlayerSpaceService();

const baseDto = {
  name: 'SL Venue',
  address: '1 SL Street, Singapore',
  type: 'house' as const,
  privacy: 'public' as const,
  lat: 1.3521, lng: 103.8198,
  is_chargeable: false,
};

// ─── Create with socialLinks ──────────────────────────────────────────────────

describe('socialLinks — createVenue', () => {
  it('SL-CREATE-1: venue created without socialLinks has no socialLinks in DTO', async () => {
    const owner = await createTestUser();
    const result = await svc.createVenue(owner._id.toString(), baseDto);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().socialLinks).toBeUndefined();
  });

  it('SL-CREATE-2: venue created with wechatId only — only wechatId present', async () => {
    const owner = await createTestUser();
    const result = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: { wechatId: 'abc_wx_123' },
    });
    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.socialLinks?.wechatId).toBe('abc_wx_123');
    expect(dto.socialLinks?.telegramHandle).toBeUndefined();
    expect(dto.socialLinks?.facebookUrl).toBeUndefined();
  });

  it('SL-CREATE-3: venue created with all three socialLinks fields', async () => {
    const owner = await createTestUser();
    const result = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: {
        wechatId: 'wx123',
        telegramHandle: '@myhandle',
        facebookUrl: 'https://facebook.com/mypage',
      },
    });
    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto.socialLinks?.wechatId).toBe('wx123');
    expect(dto.socialLinks?.telegramHandle).toBe('@myhandle');
    expect(dto.socialLinks?.facebookUrl).toBe('https://facebook.com/mypage');
  });

  it('SL-CREATE-4: empty socialLinks object produces no socialLinks in DTO', async () => {
    const owner = await createTestUser();
    const result = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: {},
    });
    expect(result.isSuccess).toBe(true);
    // All values falsy → socialLinks should be absent or have no keys
    const sl = result.getValue().socialLinks;
    expect(sl).toBeUndefined();
  });
});

// ─── Update socialLinks ───────────────────────────────────────────────────────

describe('socialLinks — updateVenue', () => {
  it('SL-UPDATE-1: owner adds wechatId to venue that had none', async () => {
    const owner = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), baseDto);
    const venueId = createResult.getValue().id;

    const updateResult = await svc.updateVenue(venueId, owner._id.toString(), {
      socialLinks: { wechatId: 'new_wx' },
    });

    expect(updateResult.isSuccess).toBe(true);
    expect(updateResult.getValue().socialLinks?.wechatId).toBe('new_wx');
  });

  it('SL-UPDATE-2: updating telegramHandle leaves wechatId unchanged', async () => {
    const owner = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: { wechatId: 'wx_keep' },
    });
    const venueId = createResult.getValue().id;

    const updateResult = await svc.updateVenue(venueId, owner._id.toString(), {
      socialLinks: { telegramHandle: '@newhandle' },
    });

    expect(updateResult.isSuccess).toBe(true);
    const dto = updateResult.getValue();
    // telegramHandle added
    expect(dto.socialLinks?.telegramHandle).toBe('@newhandle');
    // wechatId should remain (patch semantics)
    const raw = await PlayerSpaceModel.findById(venueId);
    expect(raw?.socialLinks?.wechatId).toBe('wx_keep');
  });

  it('SL-UPDATE-3: setting wechatId to empty string removes it from DB', async () => {
    const owner = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: { wechatId: 'to_be_removed', telegramHandle: '@keep' },
    });
    const venueId = createResult.getValue().id;

    const updateResult = await svc.updateVenue(venueId, owner._id.toString(), {
      socialLinks: { wechatId: '' },
    });

    expect(updateResult.isSuccess).toBe(true);
    const raw = await PlayerSpaceModel.findById(venueId);
    expect(raw?.socialLinks?.wechatId).toBeUndefined();
    // telegramHandle should be untouched
    expect(raw?.socialLinks?.telegramHandle).toBe('@keep');
  });

  it('SL-UPDATE-4: non-owner cannot update socialLinks', async () => {
    const owner = await createTestUser();
    const rando = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), baseDto);
    const venueId = createResult.getValue().id;

    const updateResult = await svc.updateVenue(venueId, rando._id.toString(), {
      socialLinks: { wechatId: 'hacked' },
    });

    expect(updateResult.isFailure).toBe(true);
    expect(updateResult.getError()).toMatch(/forbidden/i);
  });
});

// ─── getVenueById — socialLinks in DTO ───────────────────────────────────────

describe('socialLinks — getVenueById', () => {
  it('SL-GET-1: getVenueById returns socialLinks set on venue', async () => {
    const owner = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      socialLinks: { wechatId: 'detail_wx', telegramHandle: '@detail' },
    });
    const venueId = createResult.getValue().id;

    const getResult = await svc.getVenueById(venueId);
    expect(getResult.isSuccess).toBe(true);
    expect(getResult.getValue().socialLinks?.wechatId).toBe('detail_wx');
    expect(getResult.getValue().socialLinks?.telegramHandle).toBe('@detail');
  });

  it('SL-GET-2: getVenueById does NOT expose ownerContact (phone/whatsapp removed)', async () => {
    const owner = await createTestUser();
    await PlayerSpaceModel.findOneAndUpdate(
      { owner_id: owner._id },
      {},
      { upsert: false }
    );
    const createResult = await svc.createVenue(owner._id.toString(), baseDto);
    const venueId = createResult.getValue().id;

    const getResult = await svc.getVenueById(venueId);
    const dto = getResult.getValue() as Record<string, unknown>;
    // ownerContact should be completely absent from the DTO
    expect(dto['ownerContact']).toBeUndefined();
  });

  it('SL-GET-3: school-type venue returns socialLinks if set', async () => {
    const owner = await createTestUser();
    const createResult = await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      type: 'school',
      socialLinks: { telegramHandle: '@school_tele' },
    });
    const venueId = createResult.getValue().id;

    const getResult = await svc.getVenueById(venueId);
    expect(getResult.getValue().socialLinks?.telegramHandle).toBe('@school_tele');
  });
});

// ─── getAllVenues — socialLinks propagated ────────────────────────────────────

describe('socialLinks — getAllVenues', () => {
  it('SL-LIST-1: socialLinks present in getAllVenues for venues that have them', async () => {
    const owner = await createTestUser();
    await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      name: 'With Links',
      socialLinks: { wechatId: 'list_wx' },
    });
    await svc.createVenue(owner._id.toString(), {
      ...baseDto,
      name: 'Without Links',
    });

    const venues = await svc.getAllVenues();
    const withLinks = venues.find(v => v.name === 'With Links');
    const withoutLinks = venues.find(v => v.name === 'Without Links');

    expect(withLinks?.socialLinks?.wechatId).toBe('list_wx');
    expect(withoutLinks?.socialLinks).toBeUndefined();
  });
});
