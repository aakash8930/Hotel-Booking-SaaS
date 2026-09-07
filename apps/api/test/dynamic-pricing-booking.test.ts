import { Test } from '@nestjs/testing';

describe('dynamic pricing booking integration', () => {
  it.todo('uses dated DailyRoomPrice for every stay night');
  it.todo('falls back to room.basePrice when a date has no override');
  it.todo('calculates a mixed-rate stay total correctly');
  it.todo('rejects overlapping booking attempts under concurrent load');
  it.todo('does not change the charged total when a price is changed for a future date after an existing booking');
});
