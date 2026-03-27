/**
 * ============================================================================
 * SEED RESUMES SCRIPT
 * ============================================================================
 * Creates 10 users + parsed EmployeeCV records for EACH of 5 team types:
 *   1. Fullstack Team (10)
 *   2. Advertisement Team (10)
 *   3. Creative & Design Team (10)
 *   4. Law & Legal Team (10)
 *   5. Data Science, ML & AI Team (10)
 *
 * Total: 50 users + 50 CVs
 *
 * Usage: node backend/scripts/seedResumes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const EmployeeCV = require('../models/EmployeeCV');

// ─── TEAM ROSTERS ───────────────────────────────────────────────────────────

const FULLSTACK_TEAM = [
    {
        fullName: 'Arjun Mehta', email: 'arjun.mehta@digitaldockers.com', role: 'technical_team',
        skills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'Docker', 'REST APIs', 'GraphQL'],
        domain: 'fullstack', years: 5,
        summary: 'Full stack engineer with 5 years of MERN expertise. Built scalable SaaS dashboards and payment microservices.',
        experience: [{ title: 'Senior Full Stack Developer', company: 'TechNova Solutions', years: 3, description: 'Led MERN stack dashboard for 50K+ users.' }, { title: 'Full Stack Developer', company: 'CodeBridge Inc', years: 2, description: 'Built REST APIs and React SPAs for fintech clients.' }],
        education: [{ degree: 'B.Tech Computer Science', institution: 'IIT Bombay', year: '2021' }]
    },
    {
        fullName: 'Priya Sharma', email: 'priya.sharma@digitaldockers.com', role: 'technical_team',
        skills: ['Vue.js', 'Python', 'Django', 'PostgreSQL', 'AWS Lambda', 'CI/CD', 'Tailwind CSS', 'Redis'],
        domain: 'fullstack', years: 4,
        summary: 'Versatile full stack dev specializing in Vue + Django. Strong in cloud-native deployments and DevOps pipelines.',
        experience: [{ title: 'Full Stack Developer', company: 'CloudFirst Labs', years: 2, description: 'Developed Vue.js frontends with Django REST backends on AWS.' }, { title: 'Junior Developer', company: 'StartupGrid', years: 2, description: 'Built MVPs for 3 startups using Python/JavaScript.' }],
        education: [{ degree: 'M.Sc Computer Science', institution: 'BITS Pilani', year: '2022' }]
    },
    {
        fullName: 'Rohan Desai', email: 'rohan.desai@digitaldockers.com', role: 'technical_team',
        skills: ['Angular', 'Java', 'Spring Boot', 'MySQL', 'Kubernetes', 'Microservices', 'RxJS', 'Jenkins'],
        domain: 'fullstack', years: 6,
        summary: 'Enterprise full stack engineer. 6 years with Angular + Spring Boot microservices at scale.',
        experience: [{ title: 'Lead Developer', company: 'Infosys Digital', years: 3, description: 'Architected microservices platform serving 1M+ transactions/day.' }, { title: 'Software Engineer', company: 'Wipro Technologies', years: 3, description: 'Built Angular enterprise dashboards with Spring Boot APIs.' }],
        education: [{ degree: 'B.E. Information Technology', institution: 'NIT Trichy', year: '2020' }]
    },
    {
        fullName: 'Sneha Kulkarni', email: 'sneha.kulkarni@digitaldockers.com', role: 'technical_team',
        skills: ['React Native', 'Next.js', 'Node.js', 'Firebase', 'Stripe API', 'Socket.io', 'Sass', 'Jest'],
        domain: 'fullstack', years: 4,
        summary: 'Cross-platform full stack dev. Expert in React Native mobile apps with Next.js server-side rendering.',
        experience: [{ title: 'Mobile & Web Developer', company: 'AppCraft Studios', years: 2, description: 'Shipped 5 React Native apps with 4.7+ ratings.' }, { title: 'Front-End Developer', company: 'PixelWave', years: 2, description: 'Built SSR Next.js e-commerce platforms.' }],
        education: [{ degree: 'B.Tech IT', institution: 'VIT Vellore', year: '2022' }]
    },
    {
        fullName: 'Vikram Singh', email: 'vikram.singh@digitaldockers.com', role: 'technical_lead',
        skills: ['React', 'Go', 'gRPC', 'PostgreSQL', 'Terraform', 'AWS ECS', 'WebSockets', 'Prometheus'],
        domain: 'fullstack', years: 8,
        summary: 'Staff-level full stack engineer. 8 years building high-throughput Go backends paired with React dashboards.',
        experience: [{ title: 'Staff Engineer', company: 'Razorpay', years: 4, description: 'Designed payment orchestration layer handling 10K TPS.' }, { title: 'Senior Engineer', company: 'Flipkart', years: 4, description: 'Built real-time inventory systems with Go + React.' }],
        education: [{ degree: 'M.Tech Software Engineering', institution: 'IISc Bangalore', year: '2018' }]
    },
    {
        fullName: 'Ananya Reddy', email: 'ananya.reddy@digitaldockers.com', role: 'technical_team',
        skills: ['Svelte', 'Rust', 'SQLite', 'Tauri', 'Electron', 'WebAssembly', 'CSS Grid', 'Vite'],
        domain: 'fullstack', years: 3,
        summary: 'Modern full stack dev working with Svelte + Rust/Tauri for desktop-class web applications.',
        experience: [{ title: 'Full Stack Developer', company: 'HyperDesk', years: 2, description: 'Built Tauri desktop apps with Svelte frontends.' }, { title: 'Intern → Junior Dev', company: 'MozTech', years: 1, description: 'Contributed to WebAssembly tooling and Svelte components.' }],
        education: [{ degree: 'B.Tech Computer Science', institution: 'IIIT Hyderabad', year: '2023' }]
    },
    {
        fullName: 'Karan Patel', email: 'karan.patel@digitaldockers.com', role: 'technical_team',
        skills: ['React', 'Express', 'MongoDB', 'Socket.io', 'Chart.js', 'Ant Design', 'JWT', 'Mongoose'],
        domain: 'fullstack', years: 3,
        summary: 'MERN specialist focused on real-time collaboration tools and data visualization dashboards.',
        experience: [{ title: 'Full Stack Developer', company: 'DataPulse', years: 2, description: 'Built real-time analytics dashboards with Chart.js and Socket.io.' }, { title: 'Junior Developer', company: 'WebSync Labs', years: 1, description: 'Developed MERN CRUD apps with JWT authentication.' }],
        education: [{ degree: 'B.Sc Computer Science', institution: 'Mumbai University', year: '2023' }]
    },
    {
        fullName: 'Meera Iyer', email: 'meera.iyer@digitaldockers.com', role: 'technical_team',
        skills: ['React', 'Python', 'FastAPI', 'MongoDB', 'Celery', 'RabbitMQ', 'Pandas', 'D3.js'],
        domain: 'fullstack', years: 5,
        summary: 'Data-aware full stack dev. Bridges frontend visualization (D3/React) with Python data pipelines.',
        experience: [{ title: 'Full Stack Engineer', company: 'Analytiq', years: 3, description: 'Architected FastAPI + React analytics platform with Celery workers.' }, { title: 'Backend Developer', company: 'DataStream', years: 2, description: 'Built Python ETL pipelines with REST API layer.' }],
        education: [{ degree: 'M.Sc Data Science', institution: 'Chennai Mathematical Institute', year: '2021' }]
    },
    {
        fullName: 'Aditya Joshi', email: 'aditya.joshi@digitaldockers.com', role: 'technical_team',
        skills: ['Next.js', 'Prisma', 'tRPC', 'Tailwind CSS', 'Vercel', 'Supabase', 'Zod', 'React Query'],
        domain: 'fullstack', years: 3,
        summary: 'T3 stack specialist. Builds type-safe full stack apps with Next.js, tRPC, and Prisma.',
        experience: [{ title: 'Full Stack Developer', company: 'TypeSafe Labs', years: 2, description: 'Shipped 3 production T3 stack applications on Vercel.' }, { title: 'Freelance Developer', company: 'Self-Employed', years: 1, description: 'Built custom SaaS dashboards for small businesses.' }],
        education: [{ degree: 'B.Tech IT', institution: 'DTU Delhi', year: '2023' }]
    },
    {
        fullName: 'Divya Nair', email: 'divya.nair@digitaldockers.com', role: 'technical_team',
        skills: ['React', 'Node.js', 'GraphQL', 'Apollo', 'PostgreSQL', 'Hasura', 'Storybook', 'Cypress'],
        domain: 'fullstack', years: 4,
        summary: 'GraphQL-first full stack developer. Expert in Apollo Client + Hasura for real-time data layers.',
        experience: [{ title: 'Full Stack Engineer', company: 'GraphBase', years: 2, description: 'Built GraphQL-driven dashboards with real-time subscriptions.' }, { title: 'Frontend Developer', company: 'UIFactory', years: 2, description: 'Created component libraries with Storybook and Cypress E2E tests.' }],
        education: [{ degree: 'B.Tech Computer Science', institution: 'NIT Surathkal', year: '2022' }]
    }
];

const ADVERTISEMENT_TEAM = [
    {
        fullName: 'Rahul Kapoor', email: 'rahul.kapoor@digitaldockers.com', role: 'marketing_team',
        skills: ['Google Ads', 'Facebook Ads', 'SEO', 'SEM', 'Analytics', 'A/B Testing', 'Conversion Optimization', 'HubSpot'],
        domain: 'marketing', years: 6,
        summary: 'Performance marketing expert with 6 years managing $500K+ monthly ad budgets across Google and Meta platforms.',
        experience: [{ title: 'Senior Performance Marketer', company: 'AdScale Digital', years: 3, description: 'Managed $500K/month Google Ads campaigns with 4x ROAS.' }, { title: 'Digital Marketing Specialist', company: 'GrowthEngine', years: 3, description: 'Led SEO/SEM strategies increasing organic traffic by 300%.' }],
        education: [{ degree: 'MBA Marketing', institution: 'IIM Ahmedabad', year: '2020' }]
    },
    {
        fullName: 'Nisha Gupta', email: 'nisha.gupta@digitaldockers.com', role: 'marketing_team',
        skills: ['Content Marketing', 'Copywriting', 'Email Marketing', 'Mailchimp', 'WordPress', 'Brand Strategy', 'Social Media', 'Canva'],
        domain: 'marketing', years: 5,
        summary: 'Content strategist and copywriter. Built content engines for B2B SaaS brands driving 200K+ monthly page views.',
        experience: [{ title: 'Content Marketing Manager', company: 'SaaS Growth Co', years: 3, description: 'Grew blog traffic from 10K to 200K monthly through SEO content strategy.' }, { title: 'Copywriter', company: 'BrandCraft Agency', years: 2, description: 'Created ad copy, landing pages, and email sequences for 20+ clients.' }],
        education: [{ degree: 'B.A. English Literature', institution: 'St. Xavier\'s College Mumbai', year: '2021' }]
    },
    {
        fullName: 'Amit Saxena', email: 'amit.saxena@digitaldockers.com', role: 'marketing_team',
        skills: ['Programmatic Advertising', 'DSP', 'DV360', 'RTB', 'Data-Driven Marketing', 'Campaign Management', 'Audience Segmentation', 'Lookalike Audiences'],
        domain: 'marketing', years: 7,
        summary: 'Programmatic advertising specialist. 7 years managing DV360 campaigns with advanced audience segmentation.',
        experience: [{ title: 'Director of Programmatic', company: 'MediaMatrix', years: 4, description: 'Managed $2M annual programmatic spend across DV360 and TTD.' }, { title: 'Programmatic Analyst', company: 'Omnicom Media Group', years: 3, description: 'Optimized RTB campaigns for FMCG brands.' }],
        education: [{ degree: 'MBA Digital Marketing', institution: 'ISB Hyderabad', year: '2019' }]
    },
    {
        fullName: 'Pooja Bhatt', email: 'pooja.bhatt@digitaldockers.com', role: 'marketing_team',
        skills: ['Social Media Marketing', 'Instagram Reels', 'TikTok Ads', 'Influencer Marketing', 'Community Management', 'Buffer', 'Hootsuite', 'Sprout Social'],
        domain: 'marketing', years: 4,
        summary: 'Social media specialist with expertise in short-form video and influencer partnerships.',
        experience: [{ title: 'Social Media Manager', company: 'Viral Co.', years: 2, description: 'Grew brand Instagram from 5K to 500K followers through Reels strategy.' }, { title: 'Community Manager', company: 'BuzzHive', years: 2, description: 'Managed online communities of 100K+ members for tech brands.' }],
        education: [{ degree: 'B.A. Mass Communication', institution: 'Symbiosis Institute', year: '2022' }]
    },
    {
        fullName: 'Deepak Verma', email: 'deepak.verma@digitaldockers.com', role: 'marketing_lead',
        skills: ['Marketing Strategy', 'Brand Management', 'Market Research', 'GTM Strategy', 'Product Marketing', 'Competitive Analysis', 'OKRs', 'Notion'],
        domain: 'marketing', years: 9,
        summary: 'VP-level marketing strategist. 9 years leading GTM launches for consumer tech products across India and SE Asia.',
        experience: [{ title: 'VP Marketing', company: 'LaunchPad Ventures', years: 4, description: 'Led GTM for 8 product launches with $10M+ cumulative revenue.' }, { title: 'Senior Brand Manager', company: 'Hindustan Unilever', years: 5, description: 'Managed brand strategy for personal care portfolio.' }],
        education: [{ degree: 'MBA Marketing & Strategy', institution: 'IIM Bangalore', year: '2017' }]
    },
    {
        fullName: 'Tanya Malhotra', email: 'tanya.malhotra@digitaldockers.com', role: 'marketing_team',
        skills: ['PPC', 'LinkedIn Ads', 'B2B Marketing', 'Lead Generation', 'Salesforce', 'Pardot', 'Landing Pages', 'CRO'],
        domain: 'marketing', years: 5,
        summary: 'B2B demand generation specialist. Expert in LinkedIn Ads and Salesforce-integrated campaigns.',
        experience: [{ title: 'Demand Gen Manager', company: 'B2B Rocket', years: 3, description: 'Generated 5000+ MQLs/quarter through LinkedIn and Google Ads.' }, { title: 'PPC Specialist', company: 'LeadWorks', years: 2, description: 'Managed $100K/month PPC budget with 3.5x ROAS.' }],
        education: [{ degree: 'BBA Marketing', institution: 'Christ University', year: '2021' }]
    },
    {
        fullName: 'Sameer Khan', email: 'sameer.khan@digitaldockers.com', role: 'marketing_team',
        skills: ['Video Marketing', 'YouTube Ads', 'OTT Advertising', 'Storyboarding', 'Adobe Premiere', 'After Effects', 'Media Planning', 'Brand Films'],
        domain: 'marketing', years: 6,
        summary: 'Video marketing expert. 6 years creating brand films and managing YouTube/OTT ad campaigns.',
        experience: [{ title: 'Video Marketing Lead', company: 'Reel Stories Media', years: 3, description: 'Produced 50+ brand videos with 10M+ cumulative views.' }, { title: 'Media Planner', company: 'Dentsu International', years: 3, description: 'Planned OTT and YouTube media buys for FMCG brands.' }],
        education: [{ degree: 'B.A. Film & Television', institution: 'FTII Pune', year: '2020' }]
    },
    {
        fullName: 'Kavita Rao', email: 'kavita.rao@digitaldockers.com', role: 'marketing_team',
        skills: ['PR', 'Media Relations', 'Crisis Communication', 'Press Releases', 'Event Marketing', 'Public Speaking', 'Journalism', 'Cision'],
        domain: 'marketing', years: 5,
        summary: 'PR and communications pro. 5 years building media relations and managing crisis communications for tech startups.',
        experience: [{ title: 'PR Manager', company: 'Reputation Lab', years: 3, description: 'Secured 200+ media placements in Tier-1 publications.' }, { title: 'Communications Associate', company: 'Edelman India', years: 2, description: 'Managed PR campaigns for tech and healthcare clients.' }],
        education: [{ degree: 'M.A. Communication', institution: 'Jamia Millia Islamia', year: '2021' }]
    },
    {
        fullName: 'Rajesh Pandey', email: 'rajesh.pandey@digitaldockers.com', role: 'marketing_team',
        skills: ['Marketing Analytics', 'Google Analytics 4', 'Mixpanel', 'SQL', 'Tableau', 'Attribution Modeling', 'Data Studio', 'Segment'],
        domain: 'marketing', years: 4,
        summary: 'Marketing analytics engineer. Bridges marketing and data with GA4, Mixpanel, and custom attribution models.',
        experience: [{ title: 'Marketing Analyst', company: 'DataMarketer', years: 2, description: 'Built multi-touch attribution models increasing ROAS by 40%.' }, { title: 'Analytics Associate', company: 'MeasureUp', years: 2, description: 'Implemented GA4 and Mixpanel tracking for 30+ websites.' }],
        education: [{ degree: 'B.Tech + MBA (Dual Degree)', institution: 'IIT Madras', year: '2022' }]
    },
    {
        fullName: 'Shreya Dutta', email: 'shreya.dutta@digitaldockers.com', role: 'marketing_team',
        skills: ['Affiliate Marketing', 'Partnership Management', 'Referral Programs', 'Impact.com', 'Rakuten', 'Negotiation', 'Revenue Sharing', 'KPI Reporting'],
        domain: 'marketing', years: 4,
        summary: 'Affiliate and partnership marketing manager. Scaled affiliate programs driving 25% of total e-commerce revenue.',
        experience: [{ title: 'Affiliate Manager', company: 'PartnerScale', years: 2, description: 'Managed 500+ affiliate partners generating $3M annual revenue.' }, { title: 'Partnerships Associate', company: 'ShopEasy', years: 2, description: 'Built referral program growing 15K new customers/month.' }],
        education: [{ degree: 'BBA', institution: 'Delhi University', year: '2022' }]
    }
];

const CREATIVE_DESIGN_TEAM = [
    {
        fullName: 'Ishaan Bose', email: 'ishaan.bose@digitaldockers.com', role: 'technical_team',
        skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Design Systems', 'Prototyping', 'User Research', 'Wireframing', 'Interaction Design'],
        domain: 'design', years: 6,
        summary: 'Senior product designer with 6 years creating design systems and leading UX research for consumer apps.',
        experience: [{ title: 'Lead Product Designer', company: 'DesignLab Studio', years: 3, description: 'Created design systems adopted by 5 product teams.' }, { title: 'UX Designer', company: 'UserFirst', years: 3, description: 'Conducted 100+ user interviews and redesigned core product flows.' }],
        education: [{ degree: 'B.Des Interaction Design', institution: 'NID Ahmedabad', year: '2020' }]
    },
    {
        fullName: 'Rekha Menon', email: 'rekha.menon@digitaldockers.com', role: 'technical_team',
        skills: ['Graphic Design', 'Adobe Illustrator', 'Photoshop', 'Brand Identity', 'Typography', 'Print Design', 'Packaging Design', 'InDesign'],
        domain: 'design', years: 7,
        summary: 'Brand identity designer. 7 years crafting visual identities, packaging, and print collateral for premium brands.',
        experience: [{ title: 'Art Director', company: 'BrandSmith Agency', years: 4, description: 'Led visual identity projects for 30+ clients including Fortune 500.' }, { title: 'Graphic Designer', company: 'CreativeHouse', years: 3, description: 'Designed packaging, logos, and brand guidelines.' }],
        education: [{ degree: 'B.F.A. Applied Art', institution: 'Sir JJ School of Art', year: '2019' }]
    },
    {
        fullName: 'Dev Chatterjee', email: 'dev.chatterjee@digitaldockers.com', role: 'technical_team',
        skills: ['Motion Graphics', 'After Effects', 'Cinema 4D', 'Lottie', 'SVG Animation', 'Blender', 'Video Editing', 'Premiere Pro'],
        domain: 'design', years: 5,
        summary: 'Motion designer specializing in UI animations, Lottie integrations, and 3D product renders.',
        experience: [{ title: 'Senior Motion Designer', company: 'MotionCraft', years: 3, description: 'Created 200+ Lottie animations for mobile apps.' }, { title: 'Motion Designer', company: 'StudioX', years: 2, description: 'Produced C4D product renders and After Effects explainer videos.' }],
        education: [{ degree: 'B.Des Communication Design', institution: 'MIT Pune', year: '2021' }]
    },
    {
        fullName: 'Sanya Kapoor', email: 'sanya.kapoor@digitaldockers.com', role: 'technical_team',
        skills: ['UX Research', 'Usability Testing', 'User Personas', 'Journey Mapping', 'Maze', 'Hotjar', 'Accessibility', 'WCAG'],
        domain: 'design', years: 4,
        summary: 'UX researcher focused on accessibility and inclusive design. Conducts usability studies and creates journey maps.',
        experience: [{ title: 'UX Researcher', company: 'InclusiveUX', years: 2, description: 'Led accessibility audits bringing 5 apps to WCAG AA compliance.' }, { title: 'UX Research Intern → Associate', company: 'Google India', years: 2, description: 'Conducted usability studies for Google Workspace features.' }],
        education: [{ degree: 'M.Des Human-Computer Interaction', institution: 'IDC IIT Bombay', year: '2022' }]
    },
    {
        fullName: 'Nikhil Arora', email: 'nikhil.arora@digitaldockers.com', role: 'technical_team',
        skills: ['3D Modeling', 'Blender', 'Unity', 'Unreal Engine', 'AR/VR Design', 'Substance Painter', 'SketchUp', 'Character Design'],
        domain: 'design', years: 5,
        summary: '3D artist and AR/VR designer. Creates immersive experiences using Blender, Unity and Unreal Engine.',
        experience: [{ title: '3D Designer', company: 'MetaVision Studios', years: 3, description: 'Designed AR product try-on experiences for e-commerce brands.' }, { title: 'Junior 3D Artist', company: 'GameForge', years: 2, description: 'Created 3D character models and environments for mobile games.' }],
        education: [{ degree: 'B.Des Game Design', institution: 'Srishti Institute', year: '2021' }]
    },
    {
        fullName: 'Ritu Chandra', email: 'ritu.chandra@digitaldockers.com', role: 'technical_team',
        skills: ['Illustration', 'Procreate', 'Digital Art', 'Editorial Illustration', 'Icon Design', 'Infographics', 'Adobe Fresco', 'Spot Illustrations'],
        domain: 'design', years: 4,
        summary: 'Digital illustrator. Creates editorial illustrations, icon sets, and infographic artwork for digital platforms.',
        experience: [{ title: 'Illustrator', company: 'ArtByte Studio', years: 2, description: 'Created 500+ custom icons and illustrations for SaaS products.' }, { title: 'Freelance Illustrator', company: 'Self-Employed', years: 2, description: 'Editorial illustrations for Forbes India, Mint, and The Ken.' }],
        education: [{ degree: 'B.F.A. Painting', institution: 'Faculty of Fine Arts, Baroda', year: '2022' }]
    },
    {
        fullName: 'Manish Tiwari', email: 'manish.tiwari@digitaldockers.com', role: 'technical_team',
        skills: ['Frontend Design', 'CSS Animations', 'GSAP', 'Framer Motion', 'Responsive Design', 'Tailwind CSS', 'Design Tokens', 'Storybook'],
        domain: 'design', years: 4,
        summary: 'Design engineer bridging design and code. Implements pixel-perfect UIs with advanced CSS animations and GSAP.',
        experience: [{ title: 'Design Engineer', company: 'PixelPerfect Labs', years: 2, description: 'Built animated landing pages with GSAP achieving 95+ Lighthouse scores.' }, { title: 'Frontend Developer', company: 'DesignFlow', years: 2, description: 'Implemented design systems with Storybook and Tailwind CSS.' }],
        education: [{ degree: 'B.Tech + B.Des (Dual)', institution: 'IIIT Delhi', year: '2022' }]
    },
    {
        fullName: 'Lakshmi Sundaram', email: 'lakshmi.sundaram@digitaldockers.com', role: 'technical_team',
        skills: ['Service Design', 'Design Thinking', 'Workshop Facilitation', 'Stakeholder Mapping', 'Miro', 'FigJam', 'Strategy', 'CX Design'],
        domain: 'design', years: 6,
        summary: 'Service designer and design thinking facilitator. Leads cross-functional workshops for product strategy.',
        experience: [{ title: 'Service Designer', company: 'IDEO India', years: 3, description: 'Facilitated 50+ design thinking workshops for enterprise clients.' }, { title: 'CX Strategist', company: 'Deloitte Digital', years: 3, description: 'Mapped customer journeys and designed service blueprints.' }],
        education: [{ degree: 'M.Des Strategic Design', institution: 'Srishti Institute', year: '2020' }]
    },
    {
        fullName: 'Farhan Sheikh', email: 'farhan.sheikh@digitaldockers.com', role: 'technical_team',
        skills: ['Photography', 'Photo Editing', 'Lightroom', 'Product Photography', 'Drone Photography', 'Visual Storytelling', 'Color Grading', 'Retouching'],
        domain: 'design', years: 5,
        summary: 'Visual content creator. Combines photography, drone coverage and advanced retouching for brand campaigns.',
        experience: [{ title: 'Creative Photographer', company: 'LensCraft Media', years: 3, description: 'Shot product photography for 40+ D2C brands.' }, { title: 'Visual Content Creator', company: 'BrandShot Studio', years: 2, description: 'Created visual content for social media campaigns.' }],
        education: [{ degree: 'B.A. Visual Communication', institution: 'Loyola College Chennai', year: '2021' }]
    },
    {
        fullName: 'Aarti Jain', email: 'aarti.jain@digitaldockers.com', role: 'technical_team',
        skills: ['Web Design', 'Webflow', 'Squarespace', 'WordPress Design', 'Landing Pages', 'Conversion-Focused Design', 'Micro-Interactions', 'Figma'],
        domain: 'design', years: 3,
        summary: 'Web designer specializing in conversion-optimized landing pages and no-code Webflow sites.',
        experience: [{ title: 'Web Designer', company: 'ConvertUI', years: 2, description: 'Designed 100+ landing pages with 15%+ conversion rates.' }, { title: 'Junior Designer', company: 'WebCraft', years: 1, description: 'Built Webflow and Squarespace sites for small businesses.' }],
        education: [{ degree: 'B.Des Visual Communication', institution: 'Pearl Academy', year: '2023' }]
    }
];

const LEGAL_TEAM = [
    {
        fullName: 'Adv. Sanjay Krishnamurthy', email: 'sanjay.krish@digitaldockers.com', role: 'technical_team',
        skills: ['Corporate Law', 'Contract Drafting', 'M&A', 'Due Diligence', 'Company Law', 'Board Resolutions', 'Shareholder Agreements', 'SEBI Regulations'],
        domain: 'other', years: 10,
        summary: 'Senior corporate attorney with 10 years in M&A, corporate governance, and SEBI compliance for listed companies.',
        experience: [{ title: 'Senior Associate', company: 'AZB & Partners', years: 5, description: 'Handled 20+ M&A transactions valued at $500M+ combined.' }, { title: 'Associate', company: 'Khaitan & Co', years: 5, description: 'Drafted board resolutions, SHA, and APA documents.' }],
        education: [{ degree: 'B.A. LL.B. (Hons)', institution: 'NLSIU Bangalore', year: '2016' }]
    },
    {
        fullName: 'Adv. Priyanka Vaidya', email: 'priyanka.vaidya@digitaldockers.com', role: 'technical_team',
        skills: ['IP Law', 'Trademark', 'Patent Filing', 'Copyright', 'Trade Secrets', 'IP Litigation', 'Licensing', 'WIPO'],
        domain: 'other', years: 7,
        summary: 'IP attorney specializing in patent prosecution, trademark disputes, and technology licensing.',
        experience: [{ title: 'IP Counsel', company: 'Anand & Anand', years: 4, description: 'Filed 200+ trademark applications and handled 30+ IP litigation cases.' }, { title: 'Patent Associate', company: 'LexOrbis', years: 3, description: 'Drafted patent specifications for software and pharma inventions.' }],
        education: [{ degree: 'LL.M. Intellectual Property', institution: 'NALSAR Hyderabad', year: '2019' }]
    },
    {
        fullName: 'Adv. Rohit Malhotra', email: 'rohit.malhotra@digitaldockers.com', role: 'technical_team',
        skills: ['Data Privacy', 'GDPR', 'DPDP Act', 'Privacy by Design', 'Data Protection', 'Consent Management', 'DPO Advisory', 'Cross-Border Data Transfer'],
        domain: 'other', years: 5,
        summary: 'Data privacy counsel specializing in GDPR, India DPDP Act, and privacy-by-design implementation.',
        experience: [{ title: 'Privacy Counsel', company: 'TrustArc India', years: 3, description: 'Advised 50+ companies on GDPR and DPDP Act compliance.' }, { title: 'Legal Associate', company: 'Nishith Desai Associates', years: 2, description: 'Drafted privacy policies and DPIAs for tech companies.' }],
        education: [{ degree: 'LL.M. Cyber Law', institution: 'GNLU Gandhinagar', year: '2021' }]
    },
    {
        fullName: 'Adv. Meghna Sethi', email: 'meghna.sethi@digitaldockers.com', role: 'technical_team',
        skills: ['Employment Law', 'Labor Compliance', 'HR Policies', 'POSH Act', 'Termination Law', 'Employee Contracts', 'Industrial Disputes', 'Payroll Compliance'],
        domain: 'other', years: 6,
        summary: 'Employment and labor law specialist. Advises on POSH compliance, termination procedures, and HR policy drafting.',
        experience: [{ title: 'Employment Counsel', company: 'Trilegal', years: 3, description: 'Advised on workforce restructuring for 10+ companies.' }, { title: 'Legal Executive', company: 'Infosys Legal', years: 3, description: 'Managed employment law compliance for 200K+ employees.' }],
        education: [{ degree: 'B.A. LL.B.', institution: 'Faculty of Law, Delhi University', year: '2020' }]
    },
    {
        fullName: 'Adv. Kunal Bhatia', email: 'kunal.bhatia@digitaldockers.com', role: 'technical_team',
        skills: ['Regulatory Compliance', 'RBI Guidelines', 'FEMA', 'Banking Regulations', 'FinTech Law', 'AML/KYC', 'Payment Systems', 'Licensing'],
        domain: 'other', years: 8,
        summary: 'FinTech regulatory counsel. 8 years navigating RBI guidelines, payment licensing, and AML/KYC frameworks.',
        experience: [{ title: 'Regulatory Counsel', company: 'PayPal India', years: 4, description: 'Secured payment aggregator license and managed RBI compliance.' }, { title: 'Associate', company: 'Cyril Amarchand Mangaldas', years: 4, description: 'Advised fintech startups on FEMA, RBI, and SEBI compliance.' }],
        education: [{ degree: 'LL.M. Banking & Finance Law', institution: 'NLU Delhi', year: '2018' }]
    },
    {
        fullName: 'Adv. Sonali Deshmukh', email: 'sonali.deshmukh@digitaldockers.com', role: 'technical_team',
        skills: ['Tax Law', 'GST', 'Income Tax', 'Transfer Pricing', 'Tax Litigation', 'International Taxation', 'DTAA', 'Tax Planning'],
        domain: 'other', years: 7,
        summary: 'Tax litigation and advisory specialist. Expert in GST, transfer pricing, and international taxation.',
        experience: [{ title: 'Tax Counsel', company: 'EY India (Tax)', years: 4, description: 'Handled 100+ tax litigation matters before ITAT and High Courts.' }, { title: 'Tax Associate', company: 'KPMG India', years: 3, description: 'Advised on transfer pricing for multinational clients.' }],
        education: [{ degree: 'B.Com LL.B.', institution: 'ILS Law College Pune', year: '2019' }]
    },
    {
        fullName: 'Adv. Arnab Roy', email: 'arnab.roy@digitaldockers.com', role: 'technical_team',
        skills: ['Commercial Contracts', 'SaaS Agreements', 'MSA', 'SLA Drafting', 'Vendor Agreements', 'NDA', 'Force Majeure', 'Dispute Resolution'],
        domain: 'other', years: 5,
        summary: 'Commercial contracts specialist for SaaS and technology companies. Drafts MSAs, SLAs, and vendor agreements.',
        experience: [{ title: 'Legal Manager', company: 'Freshworks', years: 3, description: 'Drafted and negotiated 500+ SaaS subscription agreements.' }, { title: 'Contracts Associate', company: 'Zoho Legal', years: 2, description: 'Managed vendor contracts and NDA workflows.' }],
        education: [{ degree: 'B.A. LL.B. (Hons)', institution: 'NUJS Kolkata', year: '2021' }]
    },
    {
        fullName: 'Adv. Jyoti Agarwal', email: 'jyoti.agarwal@digitaldockers.com', role: 'technical_team',
        skills: ['Dispute Resolution', 'Arbitration', 'Mediation', 'Civil Litigation', 'SIAC', 'ICC', 'Court Procedures', 'Injunctions'],
        domain: 'other', years: 6,
        summary: 'Dispute resolution counsel experienced in international arbitration (SIAC/ICC) and commercial litigation.',
        experience: [{ title: 'Disputes Counsel', company: 'Shardul Amarchand', years: 3, description: 'Represented clients in 15+ SIAC/ICC arbitrations.' }, { title: 'Litigation Associate', company: 'AZB & Partners', years: 3, description: 'Handled commercial and IP disputes before High Courts.' }],
        education: [{ degree: 'LL.M. Dispute Resolution', institution: 'NLSIU Bangalore', year: '2020' }]
    },
    {
        fullName: 'Adv. Nitin Srivastava', email: 'nitin.srivastava@digitaldockers.com', role: 'technical_team',
        skills: ['Startup Law', 'Fundraising', 'Term Sheets', 'ESOP', 'Startup India', 'Angel Tax', 'SHA', 'Convertible Notes'],
        domain: 'other', years: 5,
        summary: 'Startup and VC counsel. Advises on fundraising rounds, ESOP structures, and Startup India compliance.',
        experience: [{ title: 'Startup Legal Advisor', company: 'LegalPad Ventures', years: 3, description: 'Advised 40+ startups across seed to Series B rounds.' }, { title: 'Associate', company: 'IndusLaw', years: 2, description: 'Drafted term sheets, SHA, and ESOP plans.' }],
        education: [{ degree: 'B.A. LL.B.', institution: 'GNLU Gandhinagar', year: '2021' }]
    },
    {
        fullName: 'Adv. Zarina Qureshi', email: 'zarina.qureshi@digitaldockers.com', role: 'technical_team',
        skills: ['Cyber Law', 'IT Act', 'Cybercrime', 'Digital Forensics Coordination', 'Intermediary Guidelines', 'Content Takedown', 'Data Breach', 'E-evidence'],
        domain: 'other', years: 4,
        summary: 'Cyber law specialist. Handles IT Act compliance, cybercrime reporting, and data breach notifications.',
        experience: [{ title: 'Cyber Law Counsel', company: 'CyberSafe Legal', years: 2, description: 'Advised platforms on intermediary guidelines and content moderation law.' }, { title: 'Legal Analyst', company: 'CERT-In Advisory', years: 2, description: 'Assisted in drafting data breach notification protocols.' }],
        education: [{ degree: 'LL.M. Technology Law', institution: 'NALSAR Hyderabad', year: '2022' }]
    }
];

const DATASCIENCE_ML_AI_TEAM = [
    {
        fullName: 'Dr. Raghav Srinivasan', email: 'raghav.srini@digitaldockers.com', role: 'technical_lead',
        skills: ['Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'NLP', 'Computer Vision', 'MLOps', 'Research Papers'],
        domain: 'ml_ai', years: 10,
        summary: 'Principal ML scientist. 10 years in deep learning R&D. Published 15+ papers in NeurIPS/ICML.',
        experience: [{ title: 'Principal ML Scientist', company: 'NVIDIA Research India', years: 5, description: 'Led research on large language models and multimodal AI.' }, { title: 'Senior Research Scientist', company: 'Google DeepMind', years: 5, description: 'Published 15+ papers in NeurIPS, ICML, and CVPR.' }],
        education: [{ degree: 'Ph.D. Computer Science (ML)', institution: 'IIT Madras', year: '2016' }]
    },
    {
        fullName: 'Shruti Agarwal', email: 'shruti.agarwal@digitaldockers.com', role: 'technical_team',
        skills: ['NLP', 'Transformers', 'BERT', 'GPT', 'LangChain', 'RAG', 'Text Classification', 'Sentiment Analysis'],
        domain: 'ml_ai', years: 5,
        summary: 'NLP engineer specializing in LLM applications, RAG pipelines, and custom fine-tuning.',
        experience: [{ title: 'NLP Engineer', company: 'AIFirst Labs', years: 3, description: 'Built production RAG pipelines for enterprise document Q&A.' }, { title: 'ML Engineer', company: 'Haptik AI', years: 2, description: 'Fine-tuned BERT models for intent classification in chatbots.' }],
        education: [{ degree: 'M.Tech AI & ML', institution: 'IIT Hyderabad', year: '2021' }]
    },
    {
        fullName: 'Dhruv Malhotra', email: 'dhruv.malhotra@digitaldockers.com', role: 'technical_team',
        skills: ['Computer Vision', 'OpenCV', 'YOLO', 'Object Detection', 'Image Segmentation', 'CNNs', 'Edge AI', 'ONNX'],
        domain: 'ml_ai', years: 4,
        summary: 'Computer vision engineer. Expert in real-time object detection (YOLO) and edge deployment.',
        experience: [{ title: 'CV Engineer', company: 'VisionAI Labs', years: 2, description: 'Deployed YOLO-based quality inspection systems in manufacturing.' }, { title: 'AI Engineer', company: 'SeeChange Tech', years: 2, description: 'Built image segmentation pipelines for autonomous vehicles.' }],
        education: [{ degree: 'B.Tech Computer Science', institution: 'IIT Delhi', year: '2022' }]
    },
    {
        fullName: 'Aparna Nambiar', email: 'aparna.nambiar@digitaldockers.com', role: 'technical_team',
        skills: ['Data Engineering', 'Apache Spark', 'Airflow', 'Kafka', 'Data Pipelines', 'ETL', 'dbt', 'Snowflake'],
        domain: 'data', years: 6,
        summary: 'Senior data engineer. Builds petabyte-scale pipelines with Spark, Airflow, and Kafka.',
        experience: [{ title: 'Senior Data Engineer', company: 'DataStack Inc', years: 3, description: 'Designed Spark pipelines processing 5TB/day for analytics platform.' }, { title: 'Data Engineer', company: 'Walmart Global Tech', years: 3, description: 'Built Airflow-orchestrated ETL pipelines for supply chain analytics.' }],
        education: [{ degree: 'M.Tech Data Science', institution: 'IIIT Bangalore', year: '2020' }]
    },
    {
        fullName: 'Varun Thakur', email: 'varun.thakur@digitaldockers.com', role: 'technical_team',
        skills: ['Statistical Modeling', 'R', 'Python', 'Time Series', 'Bayesian Methods', 'A/B Testing', 'Causal Inference', 'scipy'],
        domain: 'data', years: 5,
        summary: 'Statistician and data scientist. Expert in Bayesian methods, A/B testing, and causal inference.',
        experience: [{ title: 'Data Scientist', company: 'Swiggy', years: 3, description: 'Built demand forecasting models reducing food waste by 20%.' }, { title: 'Statistical Analyst', company: 'Nielsen India', years: 2, description: 'Developed market mix models for FMCG brands.' }],
        education: [{ degree: 'M.Stat', institution: 'ISI Kolkata', year: '2021' }]
    },
    {
        fullName: 'Tanvi Shah', email: 'tanvi.shah@digitaldockers.com', role: 'technical_team',
        skills: ['MLOps', 'Kubeflow', 'MLflow', 'Docker', 'Kubernetes', 'CI/CD for ML', 'Model Monitoring', 'Feature Stores'],
        domain: 'ml_ai', years: 4,
        summary: 'MLOps engineer. Builds end-to-end ML deployment pipelines using Kubeflow and MLflow.',
        experience: [{ title: 'MLOps Engineer', company: 'ModelServe AI', years: 2, description: 'Built Kubeflow pipelines reducing model deployment time from weeks to hours.' }, { title: 'DevOps/ML Engineer', company: 'Fractal Analytics', years: 2, description: 'Containerized 30+ ML models for production serving.' }],
        education: [{ degree: 'B.Tech IT', institution: 'COEP Pune', year: '2022' }]
    },
    {
        fullName: 'Ankit Bansal', email: 'ankit.bansal@digitaldockers.com', role: 'technical_team',
        skills: ['Recommendation Systems', 'Collaborative Filtering', 'Matrix Factorization', 'Deep RecSys', 'Feature Engineering', 'Python', 'scikit-learn', 'XGBoost'],
        domain: 'ml_ai', years: 5,
        summary: 'Recommendation systems specialist. Built personalization engines serving 100M+ users.',
        experience: [{ title: 'Senior ML Engineer', company: 'Flipkart', years: 3, description: 'Built product recommendation engine increasing CTR by 35%.' }, { title: 'ML Engineer', company: 'MX Player', years: 2, description: 'Developed video recommendation system for 280M MAU platform.' }],
        education: [{ degree: 'M.Tech CS', institution: 'IISc Bangalore', year: '2021' }]
    },
    {
        fullName: 'Ritika Choudhary', email: 'ritika.choudhary@digitaldockers.com', role: 'technical_team',
        skills: ['Data Visualization', 'Tableau', 'Power BI', 'Python', 'Matplotlib', 'Plotly', 'Storytelling with Data', 'SQL'],
        domain: 'data', years: 4,
        summary: 'Data analyst and visualization expert. Builds executive dashboards and data stories with Tableau and Power BI.',
        experience: [{ title: 'Data Analyst', company: 'ZS Associates', years: 2, description: 'Created 50+ executive dashboards for pharmaceutical clients.' }, { title: 'BI Analyst', company: 'MakeMyTrip', years: 2, description: 'Built Power BI dashboards tracking $100M+ booking revenue.' }],
        education: [{ degree: 'B.Sc Statistics', institution: 'St. Stephen\'s College', year: '2022' }]
    },
    {
        fullName: 'Siddharth Rajan', email: 'siddharth.rajan@digitaldockers.com', role: 'technical_team',
        skills: ['Generative AI', 'Stable Diffusion', 'GANs', 'VAEs', 'Diffusion Models', 'CLIP', 'Image Generation', 'Fine-Tuning'],
        domain: 'ml_ai', years: 3,
        summary: 'GenAI researcher. Specializes in diffusion models, image generation, and multimodal AI systems.',
        experience: [{ title: 'GenAI Engineer', company: 'Stability AI India', years: 2, description: 'Fine-tuned Stable Diffusion for domain-specific image generation.' }, { title: 'ML Research Intern', company: 'Adobe Research', years: 1, description: 'Researched GAN architectures for content-aware image editing.' }],
        education: [{ degree: 'M.Tech AI', institution: 'IIT Bombay', year: '2023' }]
    },
    {
        fullName: 'Poornima Hegde', email: 'poornima.hegde@digitaldockers.com', role: 'technical_team',
        skills: ['Reinforcement Learning', 'OpenAI Gym', 'Multi-Agent RL', 'Robotics', 'Control Systems', 'Simulation', 'JAX', 'PyTorch'],
        domain: 'ml_ai', years: 4,
        summary: 'Reinforcement learning engineer. Builds multi-agent RL systems for robotics and simulation.',
        experience: [{ title: 'RL Engineer', company: 'DeepMind India', years: 2, description: 'Developed multi-agent RL systems for warehouse optimization.' }, { title: 'Robotics ML Engineer', company: 'GreyOrange', years: 2, description: 'Built RL-based navigation for warehouse robots.' }],
        education: [{ degree: 'M.S. Robotics', institution: 'CMU (Carnegie Mellon)', year: '2022' }]
    }
];

// ─── SEED FUNCTION ──────────────────────────────────────────────────────────

async function seedTeam(teamData, teamLabel) {
    let created = 0;
    for (const person of teamData) {
        // Upsert user
        let user = await User.findOne({ email: person.email });
        if (!user) {
            user = await User.create({
                fullName: person.fullName,
                email: person.email,
                password: 'TempPass@123',
                role: person.role,
                isActive: true,
                profileInfo: { skills: person.skills, department: teamLabel }
            });
            console.log(`   👤 Created user: ${person.fullName}`);
        } else {
            // Update skills on existing user
            user.profileInfo = user.profileInfo || {};
            user.profileInfo.skills = person.skills;
            user.profileInfo.department = teamLabel;
            await user.save();
            console.log(`   🔄 Updated user: ${person.fullName}`);
        }

        // Check if CV already exists
        const existingCV = await EmployeeCV.findOne({ user: user._id, status: 'parsed' });
        if (existingCV) {
            console.log(`   📄 CV already exists for ${person.fullName}, skipping.`);
            continue;
        }

        // Create parsed CV record
        await EmployeeCV.create({
            user: user._id,
            originalFilename: `${person.fullName.replace(/\s+/g, '_')}_Resume.pdf`,
            status: 'parsed',
            parsedAt: new Date(),
            parsedText: person.summary,
            extractedData: {
                skills: person.skills,
                experience: person.experience,
                education: person.education,
                summary: person.summary,
                totalYearsExperience: person.years,
                primaryDomain: person.domain
            }
        });
        created++;
    }
    console.log(`   ✅ ${teamLabel}: ${created} new CVs seeded.\n`);
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📡 Connected to MongoDB\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  SEEDING 50 RESUMES (10 per team × 5 teams)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🟢 Team 1: Fullstack Engineering');
        await seedTeam(FULLSTACK_TEAM, 'Fullstack Engineering');

        console.log('🟡 Team 2: Advertisement & Marketing');
        await seedTeam(ADVERTISEMENT_TEAM, 'Advertisement & Marketing');

        console.log('🟣 Team 3: Creative & Design');
        await seedTeam(CREATIVE_DESIGN_TEAM, 'Creative & Design');

        console.log('🔴 Team 4: Law & Legal');
        await seedTeam(LEGAL_TEAM, 'Law & Legal');

        console.log('🔵 Team 5: Data Science, ML & AI');
        await seedTeam(DATASCIENCE_ML_AI_TEAM, 'Data Science, ML & AI');

        // Final count
        const totalCVs = await EmployeeCV.countDocuments({ status: 'parsed' });
        const totalUsers = await User.countDocuments({ isActive: true });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  DONE! ${totalCVs} parsed CVs | ${totalUsers} active users`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

main();
