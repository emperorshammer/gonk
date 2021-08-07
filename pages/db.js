import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { loadActivityData, formatActivityData } from '../src/fetchActivityData';
import styles from '../styles/Home.module.css'

import { request } from 'axios';

const BATTLETEAMS = {
  hyperion: [
    419, /*718 DB, Torres */
    11276, /*3452, Earnim*/
    8171, /*2633, Eclipse*/
    5243, /*1858, Exar*/
  ],
  sentinel: [
    1818, /*1112, Talons*/
    5118, /*1831, Zekk*/
    7782, /*2552, Coremy*/
    13050, /*4791, Sparky*/
    55805, /*4994, Highlander*/
    572, /*831, Phoenix*/
    56107, /*5148, Shoma*/
  ],
  stingray: [
    12971, /*4647, Jarion*/
    5402, /*1900, Pellaeon*/
    12433, /*379,*/
    13086, /*4801, Silvius*/
    12945, /*382, Dempsey*/
    7659, /*2521, Coranel*/
    11759, /*3705, Golbez*/
    11690, /*3672, John T Clark*/
    708, /*909, Marenta*/
    6874, /*2304, Phalk*/
    11691, /*3673, Horus*/
    1968, /*1139, Kalve*/
    3643, /*1464, Pete Mitchell*/
    56017, /*5111, Coldsnacks*/
    55973, /*5084, Honsou*/
    55962, /*5109, Wreckage*/
    55678, /*4611, Aldaric*/
    55788, /*4984, EvilGrin*/
    55730, /*4937, Genie*/
    56051, /*5132, Hijacker*/
    55942, /*5090, Morgoth*/
    55591, /*4869, Rachel Drakon*/
    55922, /*5069, EchoVII*/
    55933, /*5159, Gytheran*/
    56071, /*5144, Taurus*/
    55848, /*5147, Taygetta*/
    56022, /*5141, TheBlackxRanger*/
    56112, /*5154, andr3*/
    56080, /*5151, XCptCronchX*/
  ],
};

async function fetchPilotInfo(pilotId) {
  const { data: pilotJSON } = await request({
    url: `/api/pilotInfo?pilotId=${pilotId}`
  });

  return pilotJSON;
}

export async function loadDBActivityData(startDate, endDate, battleteam) {
  const pilotPINs = BATTLETEAMS[battleteam];

  return await Promise.all(pilotPINs.map(async (pin) => ({
    ...(await fetchPilotInfo(pin)).pilotInfo,
    activity: await loadActivityData(pin, startDate, endDate)
  })));
}

function PilotActivity({ pilot }) {
  return (
    <>
      <h2>{pilot.flight}-{pilot.flightPosition} {pilot.label} #{pilot.PIN}</h2>

      <a href={`https://tc.emperorshammer.org/record.php?pin=${pilot.PIN}&type=profile`} target="_blank">
        <em>{pilot.IDLine}</em>
      </a>

      <pre>
        <code>
          {formatActivityData(pilot.activity)}
        </code>
      </pre>

      <hr />
    </>
  );
}

export default function SquadronActivity() {
  const { query } = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  useEffect(() => {
    const {
      startDate,
      endDate,
      battleteam,
    } = query;

    if (!startDate || !endDate) {
      return;
    }

    loadDBActivityData(startDate, endDate, battleteam)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query]);

  if (!data && !query.startDate) {
    return (
      <main className={styles.main}>
        <form method="GET" action="/db">
          <label htmlFor="battleteam">Battleteam:</label>
          <select id="battleteam" name="battleteam">
            <option value="stingray">Stingray</option>
            <option value="hyperion">Hyperion</option>
            <option value="sentinel">Sentinel</option>
          </select>

          <br />

          <label htmlFor="startDate">Start Date:</label>
          <input type="date" name="startDate" id="startDate" required />

          <br />

          <label htmlFor="endDate">End Date:</label>
          <input type="date" name="endDate" id="endDate" required />

          <br />

          <button tyoe="submit">Go Forth</button>
        </form>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={styles.main}>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Squadron Activity Tool</title>
      </Head>

      <main className={styles.main}>
        <>
          <h1 className={styles.title}>{query.battleteam}</h1>

          <h3>
            <em>Activity report for {query.startDate} - {query.endDate}</em>
          </h3>

            {data.map((pilot) => <PilotActivity pilot={pilot} key={pilot.PIN} />)}
        </>

        {loading && <h1 className={styles.title}>Loading...</h1>}
        {error && <p>{error.toString()}</p>}
      </main>
    </div>
  );
}

