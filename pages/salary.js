import { useState, useEffect } from 'react';
import { request } from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css'
import { loadActivityData } from '../src/fetchActivityData';
import {activityToSalary} from '../src/activityToSalary';

export async function loadPilotData(pilotId, startDate, endDate) {
  const { data: pilot } = await request({
    url: `/api/pilotInfo?pilotId=${pilotId}`
  });

  if (!pilot) {
    return {
      notFound: true,
    }
  }

  const activity = await loadActivityData(pilotId, startDate, endDate);

  return {
    pilot: pilot.pilotInfo,
    activity: activity,
  };
}

export default function SquadronSalary() {
  const { query } = useRouter();

  const [pilotData, setPilotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  useEffect(() => {
    if (!query.pilotId) { return; }

    const { pilotId, startDate, endDate } = query;

    loadPilotData(pilotId, startDate, endDate)
      .then(setPilotData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query]);

  if (!query.pilotId) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Pilot Salary Tracker</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className={styles.main}>
          <form method="GET" action="/salary">
            <label htmlFor="pilotId">Pilot ID:</label>
            <input type="number" name="pilotId" id="pilotId" />

            <br />

            <label htmlFor="startDate">Start Date:</label>
            <input type="date" name="startDate" id="startDate" />

            <br />

            <label htmlFor="endDate">End Date:</label>
            <input type="date" name="endDate" id="endDate" />

            <br />

            <button tyoe="submit">Get Paid</button>
          </form>
        </main>
      </div>
    );
  }

  if (!pilotData) {
    return (
      <div className={styles.container}>
        <h1>Loading...</h1>;
      </div>
    );
  }

  const { pilot, activity } = pilotData;
  const salaryData = activityToSalary(pilot, activity)

  return (
    <div className={styles.container}>
      <Head>
        <title>Pilot Salary Tracker</title>
      </Head>

      <main className={styles.main}>
        <Link href="/salary">&lt;- Go Back</Link>

        { pilot && (
          <>
            <h1 className={styles.title}>{ `${pilot.label}` }</h1>

            <h3>
              <em>Salary report for {query.startDate} - {query.endDate}</em>
            </h3>
          </>
        )}

        <table width="100%">
          <thead>
            <tr>
              <th>
                Income Source
              </th>
              <th>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {salaryData.primaryPosition}
              </td>
              <td>
                {salaryData.positionBase}
              </td>
            </tr>

            {Object.keys(salaryData.secondaryBonuses).map((position) => (
              <tr key={position}>
                <td>
                  {position}
                </td>
                <td>
                  {salaryData.secondaryBonuses[position]}
                </td>
              </tr>
            ))}

            {Object.keys(salaryData.activityBonuses).map((bonus) => (
              <tr key={bonus}>
                <td>
                  {bonus}
                </td>
                <td>
                  {salaryData.activityBonuses[bonus]}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr style={{ borderTop: "solid 1px #000" }}>
              <td>TOTAL</td>
              <td>{salaryData.totalSalary}</td>
            </tr>
          </tfoot>
        </table>

        <p>
          Notes: points for "Graphics" (25), "Streaming" (1), and
          "Competitions" (50) cannot be automatically pulled from the database.
        </p>

        {loading && <h1 className={styles.title}>Loading...</h1>}
        {error && <p>{error.toString()}</p>}
      </main>
    </div>
  );
}
