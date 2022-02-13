import axios from 'axios';

export async function fetchSquadronInfo(squadronId, baseAPI = 'https://api.emperorshammer.org') {
  const { data: squadron } = await axios.get(`${baseAPI}/squadron/${squadronId}`);
  return squadron;
}

export async function fetchSquadronData(squadronId, baseAPI) {
  const squadronInfo = await fetchSquadronInfo(squadronId, baseAPI);

  squadronInfo.pilots = squadronInfo.pilots.map((pilot) => ({
    ...pilot,
    flight: (((pilot.sqnSlot - 1) / 4) >> 0) + 1,
    flightPosition: pilot.sqnSlot - (((((pilot.sqnSlot - 1) / 4) >> 0)) * 4),
  }));

  return squadronInfo;
}
