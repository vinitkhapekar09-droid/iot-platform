import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={styles.logo}>⚡ IoT Platform</div>
          <div style={styles.navLinks}>
            <a href="#features" style={styles.navLink}>Features</a>
            <a href="#how-it-works" style={styles.navLink}>How It Works</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            {user ? (
              <Link to="/dashboard" style={styles.button}>Dashboard</Link>
            ) : (
              <>
                <Link to="/login" style={styles.navLink}>Sign In</Link>
                <Link to="/register" style={styles.button}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Monitor, Analyze & Act on IoT Data in <span style={styles.highlight}>Real-Time</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Enterprise-grade IoT platform with intelligent anomaly detection, real-time alerts, and AI-powered insights
          </p>
          <div style={styles.heroCTA}>
            <Link to="/register" style={{ ...styles.ctaButton, background: '#38bdf8', color: '#0f172a' }}>
              Start Free Trial
            </Link>
            <a href="#features" style={{ ...styles.ctaButton, background: 'transparent', border: '2px solid #38bdf8' }}>
              Learn More
            </a>
          </div>
          <p style={styles.heroMeta}>No credit card required • 14-day free trial</p>
        </div>
        <div style={styles.heroVisual}>
          <div style={styles.networkDiagram}>
            <div style={styles.node}>📡</div>
            <div style={styles.node}>🌡️</div>
            <div style={styles.node}>💨</div>
            <div style={styles.node}>⚙️</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.section}>
        <h2 style={styles.sectionTitle}>Powerful Features</h2>
        <p style={styles.sectionSubtitle}>Everything you need to manage IoT infrastructure at scale</p>
        
        <div style={styles.featuresGrid}>
          {[
            {
              icon: '📊',
              title: 'Real-Time Monitoring',
              description: 'Monitor sensor data and metrics across all devices with millisecond-level accuracy'
            },
            {
              icon: '🔍',
              title: 'Anomaly Detection',
              description: 'AI-powered machine learning algorithms detect anomalies and deviations automatically'
            },
            {
              icon: '🚨',
              title: 'Smart Alerts',
              description: 'Configurable alerts with severity levels, thresholds, and multi-channel notifications'
            },
            {
              icon: '🔗',
              title: 'API Integration',
              description: 'RESTful API for seamless integration with your existing tools and workflows'
            },
            {
              icon: '📈',
              title: 'Advanced Analytics',
              description: 'Deep dive into your data with powerful visualization and trend analysis tools'
            },
            {
              icon: '👥',
              title: 'Team Collaboration',
              description: 'Role-based access control and team management for organizations of any size'
            }
          ].map((feature, idx) => (
            <div key={idx} style={styles.featureCard}>
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.stepsContainer}>
          {[
            {
              num: '1',
              title: 'Connect Your Devices',
              description: 'Add your IoT devices to the platform using simple API keys or device managers'
            },
            {
              num: '2',
              title: 'Set Thresholds & Rules',
              description: 'Define anomaly detection rules and alert thresholds based on your requirements'
            },
            {
              num: '3',
              title: 'Get Real-Time Insights',
              description: 'Receive instant alerts and access AI-powered insights on your IoT data'
            },
            {
              num: '4',
              title: 'Take Action',
              description: 'Trigger automated workflows or manual responses to anomalies and alerts'
            }
          ].map((step, idx) => (
            <div key={idx} style={styles.stepCard}>
              <div style={styles.stepNumber}>{step.num}</div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDesc}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>500+</div>
            <div style={styles.statLabel}>Companies Worldwide</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>2M+</div>
            <div style={styles.statLabel}>Data Points Per Day</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>99.9%</div>
            <div style={styles.statLabel}>Uptime SLA</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>24/7</div>
            <div style={styles.statLabel}>Support</div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Use Cases</h2>
        <div style={styles.useCasesGrid}>
          {[
            {
              emoji: '🏭',
              title: 'Industrial Monitoring',
              description: 'Monitor factory equipment and production lines for predictive maintenance'
            },
            {
              emoji: '🏢',
              title: 'Smart Buildings',
              description: 'Manage HVAC, lighting, and security systems with real-time monitoring'
            },
            {
              emoji: '🌍',
              title: 'Environmental Monitoring',
              description: 'Track air quality, weather patterns, and environmental conditions'
            },
            {
              emoji: '⚡',
              title: 'Energy Management',
              description: 'Monitor and optimize energy consumption across facilities'
            }
          ].map((useCase, idx) => (
            <div key={idx} style={styles.useCaseCard}>
              <div style={styles.useCaseEmoji}>{useCase.emoji}</div>
              <h3 style={styles.useCaseTitle}>{useCase.title}</h3>
              <p style={styles.useCaseDesc}>{useCase.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={styles.section}>
        <h2 style={styles.sectionTitle}>Transparent Pricing</h2>
        <p style={styles.sectionSubtitle}>Choose the plan that fits your needs</p>
        
        <div style={styles.pricingGrid}>
          {[
            {
              name: 'Starter',
              price: '$29',
              period: '/month',
              description: 'Perfect for small projects',
              features: ['Up to 5 devices', 'Real-time monitoring', 'Basic alerts', 'Email support']
            },
            {
              name: 'Professional',
              price: '$99',
              period: '/month',
              description: 'For growing teams',
              features: ['Up to 50 devices', 'Anomaly detection', 'Advanced alerts', 'Priority support', 'API access'],
              highlighted: true
            },
            {
              name: 'Enterprise',
              price: 'Custom',
              period: '',
              description: 'For large organizations',
              features: ['Unlimited devices', 'Full AI suite', 'Custom integrations', '24/7 support', 'SLA guarantee']
            }
          ].map((plan, idx) => (
            <div key={idx} style={{
              ...styles.pricingCard,
              ...(plan.highlighted && styles.pricingCardHighlighted)
            }}>
              <h3 style={styles.pricingName}>{plan.name}</h3>
              <p style={styles.pricingDesc}>{plan.description}</p>
              <div style={styles.pricingAmount}>
                <span style={styles.price}>{plan.price}</span>
                {plan.period && <span style={styles.period}>{plan.period}</span>}
              </div>
              <ul style={styles.featuresList}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={styles.featureItem}>✓ {feature}</li>
                ))}
              </ul>
              <button style={{
                ...styles.pricingCTA,
                ...(plan.highlighted && styles.pricingCTAHighlighted)
              }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to Transform Your IoT Operations?</h2>
        <p style={styles.ctaSubtitle}>Start monitoring your devices in minutes with our intuitive platform</p>
        <Link to="/register" style={{ ...styles.ctaButton, background: '#38bdf8', color: '#0f172a', marginTop: '2rem' }}>
          Start Your Free Trial
        </Link>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerColumn}>
            <div style={styles.footerLogo}>⚡ IoT Platform</div>
            <p style={styles.footerDesc}>Enterprise IoT monitoring made simple</p>
          </div>
          <div style={styles.footerColumn}>
            <h4 style={styles.footerTitle}>Product</h4>
            <a href="#" style={styles.footerLink}>Features</a>
            <a href="#" style={styles.footerLink}>Pricing</a>
            <a href="#" style={styles.footerLink}>API Docs</a>
          </div>
          <div style={styles.footerColumn}>
            <h4 style={styles.footerTitle}>Company</h4>
            <a href="#" style={styles.footerLink}>About</a>
            <a href="#" style={styles.footerLink}>Blog</a>
            <a href="#" style={styles.footerLink}>Contact</a>
          </div>
          <div style={styles.footerColumn}>
            <h4 style={styles.footerTitle}>Legal</h4>
            <a href="#" style={styles.footerLink}>Privacy</a>
            <a href="#" style={styles.footerLink}>Terms</a>
            <a href="#" style={styles.footerLink}>Security</a>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>&copy; 2026 IoT Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  container: {
    background: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
  },
  navbar: {
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #1e293b',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#38bdf8',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  },
  navLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    transition: 'color 0.3s',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  button: {
    background: '#38bdf8',
    color: '#0f172a',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'background 0.3s',
    border: 'none',
    cursor: 'pointer',
  },
  // Hero Section
  hero: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '6rem 2rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4rem',
    alignItems: 'center',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: '800',
    lineHeight: '1.2',
    background: 'linear-gradient(135deg, #e2e8f0 0%, #38bdf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  highlight: {
    color: '#38bdf8',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  heroCTA: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },
  ctaButton: {
    padding: '1rem 2rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'inline-block',
  },
  heroMeta: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginTop: '0.5rem',
  },
  heroVisual: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkDiagram: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '3rem',
    padding: '3rem',
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  node: {
    fontSize: '4rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
    background: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '8px',
    border: '2px solid #38bdf8',
  },
  // Section Styles
  section: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '6rem 2rem',
    borderBottom: '1px solid #1e293b',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: '1.25rem',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: '4rem',
  },
  // Features Grid
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  featureCard: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  featureDesc: {
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  // Steps Container
  stepsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
  },
  stepCard: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  stepNumber: {
    fontSize: '3rem',
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: '1rem',
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  stepDesc: {
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  // Stats Section
  statsSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '6rem 2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
  },
  statCard: {
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: '0.5rem',
  },
  statLabel: {
    color: '#cbd5e1',
    fontSize: '1rem',
  },
  // Use Cases
  useCasesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
  },
  useCaseCard: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  useCaseEmoji: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  useCaseTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  useCaseDesc: {
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  // Pricing
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginTop: '4rem',
  },
  pricingCard: {
    background: '#1e293b',
    padding: '2.5rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
  },
  pricingCardHighlighted: {
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, #1e293b 100%)',
    border: '2px solid #38bdf8',
    transform: 'scale(1.05)',
  },
  pricingName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  pricingDesc: {
    color: '#cbd5e1',
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
  },
  pricingAmount: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '1.5rem',
  },
  price: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#38bdf8',
  },
  period: {
    color: '#cbd5e1',
    marginLeft: '0.5rem',
  },
  featuresList: {
    listStyle: 'none',
    padding: '0',
    marginBottom: '2rem',
    flex: 1,
  },
  featureItem: {
    color: '#cbd5e1',
    padding: '0.5rem 0',
    borderBottom: '1px solid #334155',
  },
  pricingCTA: {
    background: '#334155',
    color: '#e2e8f0',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  pricingCTAHighlighted: {
    background: '#38bdf8',
    color: '#0f172a',
  },
  // CTA Section
  ctaSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '6rem 2rem',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '1rem',
  },
  ctaSubtitle: {
    fontSize: '1.25rem',
    color: '#cbd5e1',
  },
  // Footer
  footer: {
    background: '#0a0f1a',
    borderTop: '1px solid #1e293b',
    padding: '4rem 2rem 2rem',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '3rem',
    marginBottom: '3rem',
  },
  footerColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  footerLogo: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: '0.5rem',
  },
  footerDesc: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
  },
  footerTitle: {
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  footerLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.3s',
    cursor: 'pointer',
  },
  footerBottom: {
    borderTop: '1px solid #1e293b',
    paddingTop: '2rem',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.9rem',
  },
}
