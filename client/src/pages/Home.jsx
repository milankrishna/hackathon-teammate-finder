import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'

export default function Home() {
  const { user } = useAuth()
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR NEXT HACKATHON STARTS HERE</span>
          <h1>Big ideas.<br /><span>The right people.</span></h1>
          <p>Hackathon Team Finder helps students connect around complementary skills and shared interests. Find your people and turn “what if” into something real.</p>
          <div className="button-row">
            <Link className="button" to={user ? '/dashboard' : '/register'}>{user ? 'Go to dashboard' : 'Find your starting point'} <span aria-hidden="true">↗</span></Link>
            <Link className="button button-secondary" to={user ? '/teams' : '/login'}>{user ? 'Explore teams' : 'I already have an account'}</Link>
          </div>
          <p className="hero-caption">For developers, designers, thinkers, and first-time builders.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-label">BETTER, TOGETHER</span>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-core">{'{ }'}<span>YOUR NEXT IDEA</span></div>
          <div className="skill-float float-one">&lt;/&gt; Development</div>
          <div className="skill-float float-two">✧ Design</div>
          <div className="skill-float float-three">↗ Big-picture thinking</div>
        </div>
      </section>
      <section className="feature-section" aria-labelledby="why-title">
        <div className="section-heading"><span className="eyebrow">MADE FOR COLLABORATION</span><h2 id="why-title">A place for every kind of builder.</h2></div>
        <div className="card-grid">
          <article className="panel feature-card"><span className="feature-number">01 / YOUR STRENGTHS</span><h3>Bring what you know.</h3><p>Start with a profile that puts your skills and interests front and center.</p></article>
          <article className="panel feature-card"><span className="feature-number">02 / SHARED ENERGY</span><h3>Connect around an idea.</h3><p>Great teams bring different perspectives to the same challenge.</p></article>
          <article className="panel feature-card"><span className="feature-number">03 / SOMETHING NEW</span><h3>Learn by building.</h3><p>You don’t need to know everything. Curiosity is a great place to start.</p></article>
        </div>
      </section>
    </>
  )
}
