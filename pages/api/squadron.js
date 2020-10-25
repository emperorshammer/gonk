// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import qs from 'querystring';
import axios from 'axios';
import cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';


import Cors from 'cors';
import initMiddleware from '../../lib/initMiddleware';

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Only allow requests with GET, POST and OPTIONS
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

export default async (req, res) => {
  await cors(req, res);

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
    const { data: pilotJSON } = await axios.get(`http://api.emperorshammer.org/pilot/${pin}`);

    const {
      name,
      rank,
      label,
      position,
      idLine,
      FCHG,
      CR,
      PvE,
    } = pilotJSON;

    const squadronPosition = new RegExp(`\\\[(\\\d+)\\\] ${label}`, "gm").exec(flights.text())[1] * 1 - 1;
    const flight = ((squadronPosition / 4) >> 0) + 1;
    const flightPosition = squadronPosition - ((flight - 1) * 4) + 1;

    return {
      name,
      rank,
      label,
      pin,
      flight,
      flightPosition,
      position,
      idLine,
      FCHG,
      CR,
      PvE,
    };
  }));

  res.statusCode = 200;
  res.json(pilotData);
}
