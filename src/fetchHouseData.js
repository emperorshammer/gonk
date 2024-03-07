import axios from 'axios';

export async function fetchHouseInfo(houseId, baseAPI = 'https://api.emperorshammer.org') {
  return axios.get(`${baseAPI}/battleteam/${houseId}`);
}

export async function fetchHouseData(houseId, baseAPI) {
  const { data: houseInfo } = await fetchHouseInfo(houseId, baseAPI);

  houseInfo.members = houseInfo.members.map((member) => ({
    ...member,
  }));

  houseInfo.house = houseInfo.battleteam;

  return houseInfo;
}
