import axios from 'axios';

export async function fetchPilotInfo(pilotId, baseAPI = 'https://api.emperorshammer.org') {
  const { data } = axios.get(`${baseAPI}/pilot/${pilotId})`);
  return data;
}
