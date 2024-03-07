import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchHouseData } from '../src/fetchHouseData';
import { loadActivityData, formatActivityData } from '../src/fetchActivityData';
import styles from '../styles/Home.module.css'

export async function loadHouseData(houseId, startDate, endDate, baseAPI) {
  const house = await fetchHouseData(houseId, baseAPI);

  if (!house) {
    return {
      notFound: true,
    }
  }

  const houseActivity = await Promise.all(house.members.map(({ PIN: pin }) => (
    loadActivityData(pin, startDate, endDate, baseAPI)
  )));

  houseActivity.forEach((activity, i) => {
    house.members[i].activity = activity;
  });

  return house;
}

function MemberActivity({ member }) {
  return (
    <>
      <h2>{member.label} #{member.PIN}</h2>

      <a href={`https://so.emperorshammer.org/record.php?pin=${member.PIN}&type=profile`} target="_blank">
        <em>{member.IDLine}</em>
      </a>

      <pre>
        <code>
          {formatActivityData(member.activity)}
        </code>
      </pre>

      <hr />
    </>
  );
}

export default function HouseActivity() {
  const { query } = useRouter();

  const [data, setData] = useState({ house: null, members: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  const { house, members } = data;

  useEffect(() => {
    if (!query.houseId) { return; }

    const { houseId, startDate, endDate, useDevServer } = query;

    const baseAPI = useDevServer === "on" ? "https://devapi.emperorshammer.org" : undefined;

    loadHouseData(houseId, startDate, endDate, baseAPI)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className={styles.container}>
      <Head>
        <title>House Activity Tool</title>
      </Head>

      <main className={styles.main}>
        { house && (
          <>
            <h1 className={styles.title}>{house.name}</h1>

            <h3>
              <em>Activity report for {query.startDate} - {query.endDate}</em>
            </h3>

            {members.map((member) => <MemberActivity member={member} key={member.PIN} />)}
          </>
        )}

        {loading && <h1 className={styles.title}>Loading...</h1>}
        {error && <p>{error.toString()}</p>}
      </main>
    </div>
  );
}

