import qs from 'querystring';
import Cors from 'cors';

import initMiddleware from '../../lib/initMiddleware';
import { loadActivityData } from "../../src/fetchActivityData";
import { fetchPilotInfo } from "../../src/fetchPilotInfo";
import { activityToSalary } from '../../src/activityToSalary';

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
  } = qs.parse(url.split("?")[1]);

  const activityData = await loadActivityData(pilotId, startDate, endDate);
  const pilotInfo = await fetchPilotInfo(pilotId);

  res.statusCode = 200;

  res.json({
    salary: activityToSalary(pilotInfo, activityData.activity)
  });
}
