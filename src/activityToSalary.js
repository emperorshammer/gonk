const POSITION_BASE_SALARY = {
  FC: 50000,
  EHCS: 35000,
  TCCOM: 25000,
  SOO: 14000,
  COO: 14000,
  COM: 8500,
  WC: 7000,
  CMDR: 5000,
  FL: 3500,
  FM: 2000,
  TRN: 0,
};

const SECONDARY_POSITION_BONUSES = {
  TAC: 3000,
  WARD: 2000,
  COOA: 1000,
  PROF: 500,
  EDR: 500,
  SIMS: 500,
  SIMSA: 250,
  SOOA: 500,
  TACA: 1000,
  IOA: 1000,
  QMA: 1000,
  FQM: 2000,
};

const RANK_WEIGHTS = {
  GA: 1.50,
  SA: 1.45,
  HA: 1.40,
  FA: 1.35,
  AD: 1.30,
  VA: 1.25,
  RA: 1.00,
  GN: 1.20,
  COL: 1.18,
  LC: 1.15,
  MAJ: 1.12,
  CPT: 1.10,
  CM: 1.08,
  LCM: 1.05,
  LT: 1.03,
  SL: 1.00,
  CT: 1.00,
};

const ACTIVITY_BONUSES = {
  BATTLE_COMPLETED: 2,
  MISSION_SUBMITTED: 5000,
  SUBMITTED_FICTION: 5,
  IU_COMPLETED: 50,
  JOINED: 1000,
  NEW_UNIFORM_APPROVED: 25,

  // Special cases
  LOC: 3,
  LOS: 1,
  // Graphics: 25, // not from ATR?
  // Streaming: 1, // also not from ATR
  // Competitions: 50 // also not from ATR
};

export function getSubpositions(IDLine) {
  const positions = IDLine.split("/")[0];
  const primaryPosition = positions.split("-");
  return primaryPosition.slice(1) || [];
}

export function getPosition(IDLine) {
  const positions = IDLine.split("/")[0];
  const primaryPosition = positions.split("-")[0];
  return primaryPosition;
}

export function getActivityBonuses(activityData) {
  return Object.keys(ACTIVITY_BONUSES).reduce((map, key) => {
    if(activityData[key]) {
      return {
        ...map,
        [key]: {
          amount: activityData[key].length,
          bonus: activityData[key].length * ACTIVITY_BONUSES[key],
          bonusPer: ACTIVITY_BONUSES[key],
        },
      }
    } else if (key === "LOS") {
      return {
        ...map,
        [key]: {
          amount: activityData.MEDALS_AWARDED.LoS || 0,
          bonus: (activityData.MEDALS_AWARDED.LoS || 0) * ACTIVITY_BONUSES.LOS,
          bonusPer: ACTIVITY_BONUSES.LOS,
        }
      }
    } else if (key === "LOC") {
      return {
        ...map,
        [key]: {
          amount: activityData.MEDALS_AWARDED.LoC || 0,
          bonus: (activityData.MEDALS_AWARDED.LoC || 0) * ACTIVITY_BONUSES.LOC,
          bonusPer: ACTIVITY_BONUSES.LOC,
        }
      }
    }

    return map;
  }, {});
}

export function activityToSalary(pilotInfo, activityData) {
  const {
    rankAbbr,
    IDLine,
  } = pilotInfo;

  const primaryPosition = getPosition(IDLine);
  const subPositions = getSubpositions(IDLine);

  const positionBase = POSITION_BASE_SALARY[primaryPosition];
  const exactRankBonus = positionBase * (RANK_WEIGHTS[rankAbbr] / 100);
  const rankBonus = Math.round(exactRankBonus * 100) / 100;

  const secondaryBonuses = subPositions.reduce((total, position) => ({
    ...total,
    [position]: SECONDARY_POSITION_BONUSES[position],
  }), {});

  const secondaryBonusTotal = Object.values(secondaryBonuses).reduce((total, current) =>
    (total + current),
    0
  );

  const activityBonuses = getActivityBonuses(activityData);

  const activityBonusTotal = Object.values(activityBonuses).reduce((total, current) =>
    (total + current.bonus),
    0
  );

  return {
    primaryPosition,
    rankAbbr,
    rankBonus,
    subPositions,
    positionBase,
    secondaryBonuses,
    secondaryBonusTotal,
    activityBonuses,
    rankBonusWeight: RANK_WEIGHTS[rankAbbr],
    totalSalary: positionBase + secondaryBonusTotal + activityBonusTotal + rankBonus
  };
}
