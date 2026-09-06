const members = [
  ["DMD", "Daisy Marcella Durine"],
  ["DA", "Darmisa Abdullah"],
  ["FM", "Farizah binti Mustafa"],
  ["JF", "Jeccy Fred"],
  ["MJ", "Masyitah binti Jefri"],
];

export default function About() {
  return (
    <div className="about-content">
      <p>
        Calm Corner ialah ruang refleksi kendiri untuk mengenali perasaan,
        menulis catatan dan mencari ketenangan pada rentak sendiri.
      </p>
      <section aria-labelledby="about-adviser">
        <h3 id="about-adviser">Penasihat</h3>
        <div className="about-person">
          <span className="about-initials" aria-hidden="true">
            RP
          </span>
          <span>Rabia binti Pisa</span>
        </div>
      </section>
      <section aria-labelledby="about-members">
        <h3 id="about-members">Ahli</h3>
        <ul className="about-members">
          {members.map(([initials, name]) => (
            <li className="about-person" key={name}>
              <span className="about-initials" aria-hidden="true">
                {initials}
              </span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
