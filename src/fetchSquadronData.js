import axios from 'axios';

export async function fetchSquadronInfo(squadronId) {
  const { data: squadron } = await axios.get(`https://api.emperorshammer.org/squadron/${squadronId}`);
  return squadron;
}

export async function fetchSquadronData(squadronId) {
  const squadronInfo = await fetchSquadronInfo(squadronId);

  squadronInfo.pilots = squadronInfo.pilots.map((pilot) => ({
    ...pilot,
    flight: (((pilot.sqnSlot - 1) / 4) >> 0) + 1,
    flightPosition: pilot.sqnSlot - (((((pilot.sqnSlot - 1) / 4) >> 0)) * 4),
  }));

  return squadronInfo;
}
