function getDistancePoints(profile, distance, stageKey) {
  const points = stageKey === 'final'
    ? profile.finalDistancePoints || profile.distancePoints || []
    : profile.semiDistancePoints || profile.distancePoints || [];
  return points[distance] || 0;
}

function getPredictionBonusPoints(
  profile,
  stageKey,
  predictionIndex,
  resultIndex,
  qualificationCutoff = null,
) {
  if (stageKey === 'final') {
    let bonus = 0;
    if (predictionIndex === 0 && resultIndex === 0) {
      bonus += profile.finalWinnerBonus || 0;
    }
    if (predictionIndex < 3 && resultIndex < 3) {
      bonus += profile.finalTop3Bonus || 0;
    }
    if (predictionIndex < 10 && resultIndex < 10) {
      bonus += profile.finalTop10Bonus || 0;
    }
    return bonus;
  }

  if (!qualificationCutoff) {
    return 0;
  }

  const predictedQualifier = predictionIndex < qualificationCutoff;
  const actualQualifier = resultIndex < qualificationCutoff;
  if (predictedQualifier && actualQualifier) {
    return profile.semiQualifierPoints || 0;
  }
  if (!predictedQualifier && !actualQualifier) {
    return profile.semiNonQualifierPoints || 0;
  }
  return 0;
}

function calculatePredictionScore({
  ranking,
  results,
  profile,
  stageKey,
  qualificationCutoff = null,
}) {
  const resultIndexMap = results.reduce((acc, code, index) => {
    acc[code] = index;
    return acc;
  }, {});

  return ranking.reduce((acc, countryCode, index) => {
    const resultIndex = resultIndexMap[countryCode];
    if (typeof resultIndex !== 'number') {
      return acc;
    }

    const distance = Math.abs(resultIndex - index);
    acc.points += getDistancePoints(profile, distance, stageKey);
    acc.points += getPredictionBonusPoints(
      profile,
      stageKey,
      index,
      resultIndex,
      qualificationCutoff,
    );
    acc.totalDistance += distance;
    acc.comparedEntries += 1;
    if (distance === 0) {
      acc.exactMatches.push(countryCode);
    }
    if (distance <= 2) {
      acc.closeMatches += 1;
    }
    return acc;
  }, {
    points: 0,
    closeMatches: 0,
    totalDistance: 0,
    comparedEntries: 0,
    exactMatches: [],
  });
}

module.exports = {
  calculatePredictionScore,
  getDistancePoints,
  getPredictionBonusPoints,
};
