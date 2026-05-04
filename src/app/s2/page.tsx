import React from 'react';
import { fetchTeams, fetchSquads, fetchFixtures } from '@/lib/data';
import type { Team, Fixture } from '@/lib/tournament';

/**
 * MVP page for Season 2. All data is fetched from Supabase via the unified data layer.
 * Season 1 data remains untouched because the data functions default to Prisma when `season` is omitted.
 */
export const dynamic = 'force-static'; // Ensure static generation when possible

export default async function Season2Page() {
  const [teams, squads, fixtures] = await Promise.all([
    fetchTeams(2),
    fetchSquads(2),
    fetchFixtures(2),
  ]);

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Varchasva Premier League – Season 2</h1>
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Teams</h2>
        <ul style={styles.teamList}>
          {teams.map((team) => (
            <li key={team.teamName} style={styles.teamItem}>
              <span style={{ ...styles.teamBadge, backgroundColor: team.color || '#666' }} />
              {team.teamName} ({team.shortName})
            </li>
          ))}
        </ul>
      </section>
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Squads</h2>
        {squads.map((squad) => (
          <details key={squad.teamName} style={styles.squadDetails}>
            <summary>{squad.teamName} – {squad.players.length} players</summary>
            <ul style={styles.playerList}>
              {squad.players.map((p, idx) => (
                <li key={idx} style={styles.playerItem}>
                  {p.name} – {p.role} – {p.price}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Fixtures</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Match</th>
              <th>Stage</th>
              <th>Group</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f, idx) => (
              <tr key={idx}>
                <td>{f.matchNo}</td>
                <td>{f.stage}</td>
                <td>{f.group}</td>
                <td>{f.team1}</td>
                <td>{f.team2}</td>
                <td>{f.winner || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    fontFamily: "'Inter', sans-serif",
    background: 'linear-gradient(135deg, #1e1e1e, #2b2b2b)',
    color: '#fff',
    minHeight: '100vh',
  },
  title: {
    fontSize: '2.5rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#ffcc00',
  },
  subtitle: {
    fontSize: '1.8rem',
    margin: '1rem 0',
    color: '#66ffcc',
  },
  section: {
    marginBottom: '2rem',
  },
  teamList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.5rem',
    listStyle: 'none',
    padding: 0,
  },
  teamItem: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    gap: '0.5rem',
    transition: 'transform 0.2s',
  },
  teamBadge: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  squadDetails: {
    marginBottom: '0.75rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '0.4rem',
    padding: '0.4rem',
  },
  playerList: {
    marginLeft: '1rem',
    listStyle: 'none',
    padding: 0,
  },
  playerItem: {
    marginBottom: '0.2rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255,255,255,0.02)',
  },
  th: {
    padding: '0.5rem',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  td: {
    padding: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
};
