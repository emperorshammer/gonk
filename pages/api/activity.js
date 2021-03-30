// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import qs from 'querystring';

import Cors from 'cors';
import initMiddleware from '../../lib/initMiddleware';
import { fetchFormattedActivityData, loadActivityData } from "../../src/fetchActivityData";

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Only allow requests with GET, POST and OPTIONS
    methods: ['GET', 'POST', 'OPTIONS'],
  })
)

export default async (req, res) => {
  await cors(req, res);

  const { url } = req;

  const {
    pilotId,
    startDate,
    endDate,
    format = "json",
  } = qs.parse(url.split("?")[1]);

  const activityData = await loadActivityData(pilotId, startDate, endDate);

  res.statusCode = 200;

  if (format === "json") {
    res.json({
      activity: activityData,
    });
  } else {
    const text = await fetchFormattedActivityData(pilotId, activityData);
    res.send(text);
  }
}
