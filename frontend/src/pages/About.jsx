import styles from "./About.module.css";
import AboutHero from "../components/About/AboutHero";
import AboutTimeline from "../components/About/AboutTimeline";
// import AboutValues from "../components/About/AboutValues";
// import AboutImpact from "../components/About/AboutImpact";
// import AboutCTA from "../components/About/AboutCTA";

export default function About() {
  return (
    <main className={styles.page}>
      <AboutHero />
      <AboutTimeline />
      
      {/* Add these next */}
      {/* <AboutValues /> */}
      
      {/* <AboutImpact /> */}
      {/* <AboutCTA /> */}
    </main>
  );
}