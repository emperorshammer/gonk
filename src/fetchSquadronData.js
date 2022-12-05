import axios from 'axios';

export async function fetchSquadronInfo(squadronId, baseAPI = 'https://api.emperorshammer.org') {
  return axios.get(`${baseAPI}/squadron/${squadronId}`);
}

export async function fetchSquadronData(squadronId, baseAPI) {
  const { data: squadronInfo } = await fetchSquadronInfo(squadronId, baseAPI);

  squadronInfo.pilots = squadronInfo.pilots.map((pilot) => ({
    ...pilot,
    flight: (((pilot.sqnSlot - 1) / 4) >> 0) + 1,
    flightPosition: pilot.sqnSlot - (((((pilot.sqnSlot - 1) / 4) >> 0)) * 4),
  }));

  return squadronInfo;
}
