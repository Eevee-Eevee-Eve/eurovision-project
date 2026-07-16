const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePredictionScore } = require('../scoring');

const profile = {
  finalDistancePoints: [10, 7, 5, 3, 2, 1],
  finalWinnerBonus: 15,
  finalTop3Bonus: 6,
  finalTop10Bonus: 3,
  semiQualifierPoints: 4,
  semiNonQualifierPoints: 1,
  semiDistancePoints: [2, 1],
};

test('final scoring rewards exact places and configured top bonuses', () => {
  const score = calculatePredictionScore({
    ranking: ['se', 'it', 'ua', 'fr'],
    results: ['se', 'ua', 'it', 'fr'],
    profile,
    stageKey: 'final',
  });

  assert.equal(score.points, 79);
  assert.deepEqual(score.exactMatches, ['se', 'fr']);
  assert.equal(score.closeMatches, 4);
  assert.equal(score.totalDistance, 2);
});

test('semi-final scoring rewards correct qualification groups', () => {
  const score = calculatePredictionScore({
    ranking: ['a', 'c', 'b', 'd'],
    results: ['a', 'b', 'c', 'd'],
    profile,
    stageKey: 'semi1',
    qualificationCutoff: 2,
  });

  assert.equal(score.points, 11);
  assert.deepEqual(score.exactMatches, ['a', 'd']);
});

test('unknown result entries are ignored without corrupting totals', () => {
  const score = calculatePredictionScore({
    ranking: ['se', 'missing'],
    results: ['se'],
    profile,
    stageKey: 'final',
  });

  assert.equal(score.comparedEntries, 1);
  assert.equal(score.points, 34);
  assert.deepEqual(score.exactMatches, ['se']);
});
