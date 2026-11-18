import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSpacemanCrashMultiplier,
  cashOutSpaceman,
  createPlayer,
  getSpacemanStatus,
  SPACEMAN_MAX_MULTIPLIER,
  SPACEMAN_RETURN,
  startSpaceman,
} from "./game.js";

test("Spaceman crash distribution approaches the declared 95% return", () => {
  const sampleCount = 100_000;
  for (const target of [1, 2, 10, 100]) {
    let reached = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const roll = (index + 0.5) / sampleCount;
      if (calculateSpacemanCrashMultiplier(roll) > target) reached += 1;
    }
    const observedReturn = (reached / sampleCount) * target;
    assert.ok(Math.abs(observedReturn - SPACEMAN_RETURN) < 0.0001, `target ${target}x returned ${observedReturn}`);
  }
});

test("Spaceman crash point is capped and accepts only a unit-interval roll", () => {
  assert.equal(calculateSpacemanCrashMultiplier(0), SPACEMAN_RETURN);
  assert.equal(calculateSpacemanCrashMultiplier(0.525), 2);
  assert.equal(calculateSpacemanCrashMultiplier(0.99999999), SPACEMAN_MAX_MULTIPLIER);
  assert.throws(() => calculateSpacemanCrashMultiplier(1), /between 0 and 1/);
});

test("a safe Spaceman cashout credits the server-calculated payout", () => {
  const player = createPlayer();
  const startedAt = 10_000;
  const round = startSpaceman(player, 100, startedAt);
  round.crashMultiplier = SPACEMAN_MAX_MULTIPLIER;

  const result = cashOutSpaceman(player, round.id, startedAt + 1_000);
  assert.equal(result.status, "cashed_out");
  assert.equal(result.multiplier, 1.17);
  assert.equal(result.payout, 117);
  assert.equal(player.balance, 1_017);
});

test("a cashout request after the crash loses the stake", () => {
  const player = createPlayer();
  const startedAt = 20_000;
  const round = startSpaceman(player, 100, startedAt);
  round.crashMultiplier = 1.1;

  const result = cashOutSpaceman(player, round.id, startedAt + 1_000);
  assert.equal(result.status, "lost");
  assert.equal(result.payout, 0);
  assert.equal(player.balance, 900);
  assert.equal(getSpacemanStatus(player, round.id, startedAt + 2_000).status, "lost");
});
