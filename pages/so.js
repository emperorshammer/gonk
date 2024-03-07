import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>House Activity Tool</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <form method="GET" action="/houseActivity">
          <label htmlFor="houseId">House ID:</label>
          <input type="number" name="houseId" id="houseId" />

          <br />

          <label htmlFor="startDate">Start Date:</label>
          <input type="date" name="startDate" id="startDate" />

          <br />

          <label htmlFor="endDate">End Date:</label>
          <input type="date" name="endDate" id="endDate" />

          <br />

          {/*
            <label htmlFor="useDevServer">
              <input type="checkbox" name="useDevServer" id="useDevServer" />
              Use dev server
            </label>

            <br />
          */}

          <button tyoe="submit">Go Forth</button>
        </form>
      </main>
    </div>
  )
}
