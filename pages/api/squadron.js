// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import qs from 'querystring';
import axios from 'axios';
import cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';

const RANKS = {
  1: 'CT',
  2: 'SL',
  3: 'LT',
  4: 'LCM',
  5: 'CM',
  6: 'CPT',
  7: 'MAJ',
  8: 'LC',
  9: 'COL',
  10: 'GN',
};

const POSITIONS = {
  2: 'FM',
  3: 'FL',
  4: 'CMDR',
};

export default async (req, res) => {
  const { url } = req;
  const { squadronId } = qs.parse(url.split("?")[1]);

  const { data: html } = await axios.get(`https://tc.emperorshammer.org/roster.php?type=sqn&id=${squadronId}`);

  const $ = cheerio.load(html);
  const pilotTable = $('table[style="table-layout:fixed"]');

  const pilotPins = [];

  const flights = pilotTable.find('tr');
  // tables have a TR per flight

  const pilots = pilotTable.find('a[href*="record.php?pin="]').each((index, el) => {
    // the CMDR is listed twice, so ignore the first
    if (index === 0) { return; }

    const url = $(el).attr("href");
    const { pin } = qs.parse(url.split('?')[1]);
    pilotPins.push(pin);
  });

  const pilotData = await Promise.all(pilotPins.map(async (pin) => {
    const { data: pilotXML } = await axios.get(`https://tc.emperorshammer.org/TTT2backend.php?pin=${pin}`);

    const pilotData = await parseStringPromise(pilotXML);
    const pilot = pilotData.item.personnel[0];

    return pilot;
  }));

  const formattedData = pilotData.reduce((acc, pilotData) => {
    const { name } = pilotData;
    const rank = RANKS[pilotData.rank];
    const position = POSITIONS[pilotData.position];

    const squadronPosition = new RegExp(`\\\[(\\\d+)\\\] ${rank} ${name}`, "gm").exec(flights.text())[1] * 1 - 1;
    const flight = ((squadronPosition / 4) >> 0) + 1;
    const flightPosition = squadronPosition - ((flight - 1) * 4) + 1;

    return {
    ...acc,
      [[pilotData.pid]]: {
        name,
        rank,
        position,
        flight,
        flightPosition,
        pin: pilotData.pid[0],
      },
    }
  }, {});

  res.statusCode = 200
  res.json(formattedData)
}
