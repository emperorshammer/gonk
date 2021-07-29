import { request } from 'axios';

export async function fetchPilotInfo(pilotId) {
  const { data: pilotJSON } = await request({
    url: `http://api.emperorshammer.org/pilot/${pilotId}`
  });

  return pilotJSON;
}
