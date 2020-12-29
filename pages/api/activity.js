// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import qs from 'querystring';
import { request } from 'axios';
import { omit } from 'lodash';

import Cors from 'cors';
import initMiddleware from '../../lib/initMiddleware';

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Only allow requests with GET, POST and OPTIONS
    methods: ['GET', 'POST', 'OPTIONS'],
  })
)


// TODO fix LoC / LoS parsing

const REGEXES = {
  COMBAT_EVENT_PARTICIPATION: /Combat event participation added to Combat Record by the COO : .*id=(?<eventId>\d+).*">(?<eventString>.*)<\/a>/,
  MEDAL_AWARDED: /^Medal awarded : [^\(]+ \((?<medalShorthand>.+)\)/,
  MEDALS_AWARDED: /^Medals awarded : (?<qty>\d+) [^\(]+ \((?<medalShorthand>.+)s?\)/,
  BATTLE_COMPLETED: /^Battle completed : .*id=(?<battleId>\d+).*">(?<battleType>.*)</,
  SUBMITTED_BATTLE_REVIEW: /^Submitted review for battle (?<battleType>\S+) (?<battleId>\d+)/,
  IU_COMPLETED: /^IU Course added to Academic Record by the SOO : \[(?<iuCourse>[^\(]+)]/,
  IU_REMOVED: /^IU Course removed from Academic Record by the SOO : \[(?<iuCourse>[^\(]+)]/,
  NEW_COMBAT_RATING: /^New Combat Rating achieved : (?<combatRating>.*)/,
  NEW_COMPETITION: /^Submitted competition approved : .*id=(?<competitionId>\d+).*">/,
  NEW_REPORT: /^Submitted a new (?<reportType>.*) report/,
  NEW_FCHG: /^New Fleet Commander's Honor Guard rank achieved : (?<fchg>\S+)/,
  NEW_COOP_RATING: /New COOP\/PVE Rating achieved : (?<rating>\S+)/,
  NEW_PROMOTION: /^New promotion : .* \((?<rankShorthand>\S+)\)/,
  NEW_UNIFORM_APPROVED: /^New uniform upload approved/,
  DELETED_UNIFORM: /^Deleted previously approved uniform/,
  NEW_ASSIGNMENT: /^New assignment :(?<assignment>.+)/,
  CREATED_BATTLE: /^Battle created by this pilot added to TC database : (?<battleType>\S+) (?<battleId>\d+)/,
  SUBMITTED_FICTION: /^New FICTION added by WARD \((?<title>.+)\)/,
  SUBMITTED_PATCH_BUG_REPORT: /^Submitted bug report for patch (?<patchType>\S+): (?<patchDetails>.+)/,
  SUBMITTED_BATTLE_BUG_REPORT: /^Submitted bug report for battle (?<battleType>\S+) (?<battleId>\d+)/,
  UPDATED_INPR: /^Updated Imperial Navy Personnel Record \(INPR\)/,
  UPDATED_ROSTER: /^Updated the roster information for (?<unit>.+)/,
  RANK_SET_BY_TCCOM: /^New rank set by the TCCOM : .+ \((?<rankShorthand>.+)\)/,

  IGNORE_COMBAT_EVENT_REMOVED: /^Combat event participation removed/,
};

function activityTypeByString(activityString) {
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

async function loadActivityData(pilotId, startDate, endDate, page, pageSize) {
  const url = `https://api.emperorshammer.org/atr/${pilotId}`;

  const params = {
    ...(page ? { page } : {}),
    ...(pageSize ? { pageSize } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data: activity } = await request({ url, params });

  if (!activity || !activity.activity) {
    return [];
  }

  const activityData = activity.activity.map(({ date, activity }) => ({
    activity: {
      ...activityTypeByString(activity),
      date: (new Date(date * 1000)),
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

      if (qty > 1) {
        medalShorthand = medalShorthand.slice(0, medalShorthand.length - 1);
      }

      return {
        ...acc,
        [medalShorthand]: acc[medalShorthand] ? acc[medalShorthand] + qty : qty,
      };
    }, {});
  }

  return { activityData: activityDataByType, hasMore: activity.hasMore };
}

async function formatActivityData(pilotId, activityData, hasMore) {
  const { data: pilotJSON } = await request({ url: `http://api.emperorshammer.org/pilot/${pilotId}` });
  const title = `${pilotJSON.label} #${pilotJSON.PIN}`;
  const underline = "".padStart(title.length, "=");

  const text = [`${title}\n${underline}\n`];

  Object.keys(activityData).forEach((activityType) => {
    text.push(`${activityType}:`);

    if (activityType === "MEDALS_AWARDED") {
      text.push(Object.keys(activityData[activityType]).map((medal) => `* ${medal} x ${activityData[activityType][medal]}`).join('\n') + '\n');
    } else {
      text.push(activityData[activityType].map((a) => `* [${a.date.toDateString()}] ${a.activityString}`).join('\n') + '\n');
    }
  }, []);

  if (hasMore) {
    text.push("===More results on next page===");
  }

  return text.join('\n');
}

export default async (req, res) => {
  await cors(req, res);

  const { url } = req;

  const {
    pilotId,
    startDate,
    endDate,
    format = "json",
    page = 1,
    pageSize = 50,
  } = qs.parse(url.split("?")[1]);

  const { activityData, hasMore } = await loadActivityData(pilotId, startDate, endDate, page, pageSize);

  res.statusCode = 200;

  if (format === "json") {
    res.json({
      activity: activityData,
      hasMore,
    });
  } else {
    const text = await formatActivityData(pilotId, activityData, hasMore);
    res.send(text);
  }
}
