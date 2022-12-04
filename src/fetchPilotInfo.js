import axios from 'axios';

export async function fetchPilotInfo(pilotId, baseAPI = 'https://api.emperorshammer.org') {
  return axios.get(`${baseAPI}/pilot/${pilotId})`);
}
