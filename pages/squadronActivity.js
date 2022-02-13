import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchSquadronData } from '../src/fetchSquadronData';
import { loadActivityData, formatActivityData } from '../src/fetchActivityData';
import styles from '../styles/Home.module.css'

export async function loadSquadronData(squadronId, startDate, endDate, baseAPI) {
  const squadron = await fetchSquadronData(squadronId, baseAPI);

  if (!squadron) {
    return {
      notFound: true,
    }
  }

  const squadronActivity = await Promise.all(squadron.pilots.map(({ PIN: pin }) => (
    loadActivityData(pin, startDate, endDate, baseAPI)
  )));

  squadronActivity.forEach((activity, i) => {
    squadron.pilots[i].activity = activity;
  });

  return squadron;
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

  const [data, setData] = useState({ squadron: null, pilots: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  const { squadron, pilots } = data;

  useEffect(() => {
    if (!query.squadronId) { return; }

    const { squadronId, startDate, endDate, useDevServer } = query;

    const baseAPI = useDevServer === "on" ? "https://devapi.emperorshammer.org" : undefined;

    loadSquadronData(squadronId, startDate, endDate, baseAPI)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Squadron Activity Tool</title>
      </Head>

      <main className={styles.main}>
        { squadron && (
          <>
            <h1 className={styles.title}>{squadron.name}</h1>

            <h3>
              <em>Activity report for {query.startDate} - {query.endDate}</em>
            </h3>

            {pilots.map((pilot) => <PilotActivity pilot={pilot} key={pilot.PIN} />)}
          </>
        )}

        {loading && <h1 className={styles.title}>Loading...</h1>}
        {error && <p>{error.toString()}</p>}
      </main>
    </div>
  );
}

