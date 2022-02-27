// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { request } from 'axios';
import { omit } from 'lodash';

const REGEXES = {
  COMBAT_EVENT_PARTICIPATION: /Combat event participation added to Combat Record by the COO\s?: CE ID# (?<eventId>\d+)/,
  MEDAL_AWARDED: /^(Medal awarded)\s?: (?<medalShorthand>.+)\s\(?/,
  MEDALS_AWARDED: /^Medals awarded\s?: (?<qty>\d+) [^\(]+ \((?<medalShorthand>.+)s?\)/,
  IGNORE_ME_IM_CONFUSING_DATA: /^New award:/,
  BATTLE_COMPLETED: /^Battle completed\s?: (?<battleType>\S+) (?<battleId>\d+) \((?<numMissions>\d+) missions?\)/,
  SUBMITTED_BATTLE_REVIEW: /^Submitted review for battle (?<battleType>\S+) (?<battleId>\d+)/,
  IWATS_COMPLETED: /^IWATS Course added to Academic Record by the SOO\s?: \[(?<iuCourse>[^\(]+)] - (?<percentage>\d+%)/,
  IU_COMPLETED: /^IU Course added to Academic Record by the SOO\s?: \[(?<iuCourse>[^\(]+)] - (?<percentage>\d+%)/,
  IU_REMOVED: /^IU Course removed from Academic Record by the SOO\s?: \[(?<iuCourse>[^\(]+)]/,
  NEW_COMBAT_RATING: /^New Combat Rating (\(MP PvP\) rank\s)?achieved\s?: (?<rating>.*)/,
  NEW_COMPETITION: /^Submitted competition approved\s?: ID# (?<competitionId>\d+)/,
  NEW_REPORT: /^Submitted a new (?<reportType>.*) report/,
  NEW_FCHG: /^New Fleet Commander's Honor Guard rank achieved\s?: (?<rating>.*) \[(?<shorthand>.*)\]/,
  NEW_COOP_RATING: /New (COOP\/PVE Rating\s)?(Combat Rating \(MP PvE\) rank\s)?achieved\s?: (?<rating>.*)/,
  NEW_PROMOTION: /^New promotion\s?: .* \((?<rankShorthand>\S+)\)/,
  NEW_UNIFORM_APPROVED: /^New uniform upload approved/,
  DELETED_UNIFORM: /^Deleted previously approved uniform/,
  NEW_ASSIGNMENT: /^New assignment\s?:\s?(?<assignment>.+)/,
  CREATED_BATTLE: /^Battle created by this pilot added to TC database\s?: (?<battleType>\S+) (?<battleId>\d+)/,
  SUBMITTED_FICTION: /^New FICTION added by WARD \((?<title>.+)\)/,
  SUBMITTED_GRAPHICS: /New gfx added by WARD \((?<name>.+)\)/,
  SUBMITTED_PATCH_BUG_REPORT: /^Submitted bug report for patch (?<patchType>\S+): (?<patchDetails>.+)/,
  SUBMITTED_BATTLE_BUG_REPORT: /^Submitted bug report for battle (?<battleType>\S+) (?<battleId>\d+)/,
  UPDATED_INPR: /^Updated Imperial Navy Personnel Record \(INPR\)/,
  UPDATED_UNIT_INFORMATION: /^Updated unit information for (?<unit>.+)\./,
  RANK_SET_BY_TCCOM: /^New rank set by the TCCOM\s?: .+ \((?<rankShorthand>.+)\)/,
  MEDAL_COUNT_UPDATED: /^Medal count updated by the SOO - (?<medalShorthand>.*)\s?: [+-](?<qty>\d+)/,
  IGNORE_COMBAT_EVENT_REMOVED: /^Combat event participation removed/,
  FLIGHT_CERTIFICATION_WINGS: /Flight Certification Wings awarded\s?: (?<echelon>.*)/,
  OBTAINED_FLIGHT_CERTIFICATION: /Obtained TIE Corps Flight Certification/,
  JOINED: /Joined the Emperor's Hammer TIE Corps as Cadet (?<name>.*)!/,
  EMAIL_UPDATED: /Personal e-mail address updated/,
  NAME_CHANGE: /Pilot name changed\s?: (?<name>)/,
  SUBMITTED_TIMED_TEST: /Submitted answers for timed test: (?<testName>.+)/,
  UPDATED_ROSTER: /^Updated the roster information for (?<unit>.+)/, // deprecated; became UPDATED_UNIT_INFORMATION
};

function removeTags(str) {
  if (!str) {
    return "";
  }

  str = str.toString();
  return str.replace(/(<([^>]+)>)/ig, '');
}

function removeSlashes(str) {
  if (!str) {
    return "";
  }

  str = str.toString();
  return str.replace(/\\/ig, '');
}

function activityTypeByString(activityStringWithHTML) {
  const activityString = removeSlashes(removeTags(activityStringWithHTML));
  const matcher = Object.keys(REGEXES).find(r => REGEXES[r].exec(activityString));

  if (!matcher) {
    return {
      activityString,
      type: 'unknown',
    }
  }

  return {
    type: matcher,
    activityString,
    ...(REGEXES[matcher].exec(activityString).groups),
  };
}

async function paginateActivityData(pilotId, startDate, endDate, page = 1, recordsReturned = 0, baseAPI = 'https://api.emperorshammer.org') {
  const url = `${baseAPI}/atr/${pilotId}`;

  const params = {
    page,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data: activity } = await request({ url, params });

  recordsReturned += activity.activity.length;

  // Check if the length of the activity array is less than the total number, and if it is, keep
  // paginating. Load no more than 20 pages of results to keep things from falling apart.
  if (recordsReturned < activity.total && page < 20) {
    const nextPageData = await paginateActivityData(pilotId, startDate, endDate, page + 1, recordsReturned, baseAPI);

    return [
      ...activity.activity,
      ...nextPageData,
    ];
  }

  return activity.activity || [];
}

export async function loadActivityData(pilotId, startDate, endDate, baseAPI = 'https://api.emperorshammer.org') {
  const activity = await paginateActivityData(pilotId, startDate, endDate, 1, 0, baseAPI);

  if (!activity) {
    return [];
  }

  const activityData = activity.map(({ date, activity }) => ({
    activity: {
      ...activityTypeByString(activity),
      date: (new Date(date * 1000)).toDateString(),
    }
  }));

  // Accumulate by type
  const activityDataByType = activityData.reduce((acc, { activity }) => ({
    ...acc,
    [activity.type]: [
      ...(acc[activity.type] || []),
      omit(activity, ["type"]),
    ],
  }), {});


  // Combine MEDAL_AWARDED + MEDALS_AWARDED
  if (activityDataByType.MEDAL_AWARDED) {
    activityDataByType.MEDALS_AWARDED = activityDataByType.MEDALS_AWARDED || [];

    activityDataByType.MEDAL_AWARDED.forEach((medal) => {
      activityDataByType.MEDALS_AWARDED.push({ ...medal, qty: 1 });
    });

    delete activityDataByType.MEDAL_AWARDED;
  }

  // Combine medals by type
  if (activityDataByType.MEDALS_AWARDED) {
    activityDataByType.MEDALS_AWARDED = activityDataByType.MEDALS_AWARDED.reduce((acc, medal) => {
      let { medalShorthand, qty } = medal;
      qty = qty * 1;

      // suuuuper hacky. old website added an "s", like "LoSs". New one is just "LoS."
      if (qty > 1 && medalShorthand[medalShorthand.length - 1] === "s") {
        medalShorthand = medalShorthand.slice(0, medalShorthand.length - 1);
      }

      // normalize LoCs / LoSs between old and new website data
      if (medalShorthand === "Legion of Combat") {
        medalShorthand = "LoC";
      }

      if (medalShorthand === "Legion of Skirmish") {
        medalShorthand = "LoS";
      }

      return {
        ...acc,
        [medalShorthand]: acc[medalShorthand] ? acc[medalShorthand] + qty : qty,
      };
    }, {});
  }

  return activityDataByType;
}

export function formatActivityData(activityData) {
  const text = [];

  Object.keys(activityData).forEach((activityType) => {
    text.push(`\n${activityType}:\n`);

    if (activityType === "MEDALS_AWARDED") {
      text.push(Object.keys(activityData[activityType]).map((medal) => `* ${medal} x ${activityData[activityType][medal]}`).join('\n') + '\n');
    } else {
      text.push(activityData[activityType].map((a) => `* [${a.date}] ${a.activityString}`).join('\n') + '\n');
    }
  }, []);

  return text;
}

export async function fetchFormattedActivityData(pilotId, activityData, baseAPI = 'https://api.emperorshammer.org') {
  const { data: pilotJSON } = await request({ url: `${baseAPI}/pilot/${pilotId}` });
  const title = `${pilotJSON.label} #${pilotJSON.PIN}`;
  const underline = "".padStart(title.length, "=");

  const text = [`${title}\n${underline}\n`, ...formatActivityData(activityData)];

  return text.join('\n');
}
