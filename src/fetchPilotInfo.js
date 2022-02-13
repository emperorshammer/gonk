import { request } from 'axios';

export async function fetchPilotInfo(pilotId, baseAPI = 'https://api.emperorshammer.org') {
  const { data: pilotJSON } = await request({
    url: `${baseAPI}/pilot/${pilotId}`
  });

  return pilotJSON;
}
