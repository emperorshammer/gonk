// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import qs from 'querystring';
import axios from 'axios';
import cheerio from 'cheerio';
import { omit } from 'lodash';
import { parseStringPromise } from 'xml2js';

const REGEXES = {
  MEDAL_AWARDED: /^Medal awarded : [^\(]+ \((?<medalShorthand>.+)\)/,
  MEDALS_AWARDED: /^Medals awarded : (?<medalQty>\d+) [^\(]+ \((?<medalShorthand>.+)s\)/,
  BATTLE_COMPLETED: /^Battle completed : (?<battleType>\S+) (?<battleId>\d+)/,
  SUBMITTED_BATTLE_REVIEW: /^Submitted review for battle (?<battleType>\S+) (?<battleId>\d+)/,
  IU_COMPLETED: /^IU Course added to Academic Record by the SOO : \[(?<iuCourse>[^\(]+)]/,
  IU_REMOVED: /^IU Course removed from Academic Record by the SOO : \[(?<iuCourse>[^\(]+)]/,
  NEW_COMBAT_RATING: /^New Combat Rating achieved : (?<combatRating>.*)/,
  NEW_COMPETITION: /^Submitted competition approved : ID# (?<competitionId>\d+)/,
  NEW_REPORT: /^Submitted a new (?<reportType>.*) report/,
  NEW_FCHG: /^New Fleet Commander's Honor Guard rank achieved : (?<fchg>\S+)/,
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

async function loadActivityData(pilotId, startDate, endDate) {
  const { data: html } = await axios.get(`https://tc.emperorshammer.org/record.php?pin=${pilotId}&type=atr`);

  const $ = cheerio.load(html);

  const activityRows = $('body > center > table > tbody > tr > td:nth-child(2) > p:nth-child(6) > table:nth-child(2) > tbody > tr > td > table > tbody > tr > td:nth-child(1) > table:nth-child(4) tr');

  const activityData = [];

  const data = $(activityRows).each((index, row) => {
    const cells = $(row).children();
    const dateString = $(cells.get(1)).text();
    const activityString = $(cells.get(2)).text();

    if (!dateString || !activityString) {
      return;
    }

    const date = new Date(dateString);

    if (isNaN(date)) {
      return;
    }

    const isoDateString = date.toISOString();

    if (startDate && startDate > date) {
      return;
    }

    if (endDate && endDate < date) {
      return;
    }

    activityData.push({
      date: isoDateString,
      ...activityTypeByString(activityString),
    });
  });

  // Accumulate by type
  const activityDataByType = activityData.reduce((acc, activity) => ({
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
    activityDataByType.MEDALS_AWARDED = activityDataByType.MEDALS_AWARDED.reduce((acc, medal) => ({
      ...acc,
      [medal.medalShorthand]: acc[medal.medalShorthand] ? acc[medal.medalShorthand] + 1 : 1,
    }), {});
  }

  return activityDataByType;
}

async function formatActivityData(pilotId, activityData) {
  const { data: pilotJSON } = await axios.get(`http://tc.emperorshammer.org/api/pilot/${pilotId}`);
  const title = `${pilotJSON.label} #${pilotJSON.PIN}`;
  const underline = "".padStart(title.length, "=");

  const text = [`${title}\n${underline}\n`];

  Object.keys(activityData).forEach((activityType) => {
    text.push(`${activityType}:`);

    if (activityType === "MEDALS_AWARDED") {
      text.push(Object.keys(activityData[activityType]).map((medal) => `* ${medal} x ${activityData[activityType][medal]}`).join('\n') + '\n');
    } else {
      text.push(activityData[activityType].map((a) => `* [${a.date}] ${a.activityString}`).join('\n') + '\n');
    }
  }, []);

  return text.join('\n');
}

export default async (req, res) => {
  const { url } = req;

  const {
    pilotId,
    startDate: startDateString,
    endDate: endDateString,
    format = "json",
  } = qs.parse(url.split("?")[1]);

  let startDate;
  let endDate;

  if (startDateString) {
    startDate = new Date(startDateString);
  }

  if (endDateString) {
    endDate = new Date(endDateString);
  }

  if ((startDate && isNaN(startDate)) || (endDate && isNaN(endDate))) {
    res.statusCode = 422;

    res.json({
      error: "Invalid start date or end date supplied.",
      params: { pilotId, startDateString, endDateString },
    });

    return;
  }

  const activityData = await loadActivityData(pilotId, startDate, endDate);

  res.statusCode = 200;

  if (format === "json") {
    res.json({
      activity: activityData,
    });
  } else {
    const text = await formatActivityData(pilotId, activityData);
    res.send(text);
  }
}
