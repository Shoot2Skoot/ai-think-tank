-- Seed data for conversation_templates table
-- Pre-configured conversation scenarios with recommended personas

-- First, we need to get the persona IDs from the persona_templates we just created
-- This uses a CTE to map persona names to their IDs

WITH persona_ids AS (
  SELECT
    name,
    id
  FROM persona_templates
)
INSERT INTO conversation_templates (
  category,
  industry,
  name,
  description,
  personas,
  initial_prompt,
  conversation_mode,
  estimated_messages,
  estimated_cost,
  is_premium,
  usage_count,
  rating
) VALUES
(
  'Product Development',
  'Technology',
  'New Feature Planning',
  'Comprehensive discussion for planning a new product feature with engineering, design, and business perspectives',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Jordan Taylor'),
    (SELECT id FROM persona_ids WHERE name = 'Robert Kim'),
    (SELECT id FROM persona_ids WHERE name = 'Jamie Parker')
  ],
  'Let''s discuss the implementation of a new feature. What are the key considerations from engineering, design, and business perspectives?',
  'ideation',
  30,
  0.50,
  false,
  0,
  4.7
),
(
  'Code Review',
  'Technology',
  'Architecture Review',
  'Technical deep dive for reviewing system architecture and design decisions',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Sarah Mitchell'),
    (SELECT id FROM persona_ids WHERE name = 'David Lee'),
    (SELECT id FROM persona_ids WHERE name = 'Marcus Johnson')
  ],
  'I need to review the architecture for our new microservices implementation. Let''s discuss scalability, security, and testing strategies.',
  'refinement',
  25,
  0.40,
  false,
  0,
  4.8
),
(
  'User Experience',
  'Design',
  'UX Design Workshop',
  'Collaborative session for improving user experience with multiple perspectives',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Jordan Taylor'),
    (SELECT id FROM persona_ids WHERE name = 'Maya Patel'),
    (SELECT id FROM persona_ids WHERE name = 'Jamie Parker'),
    (SELECT id FROM persona_ids WHERE name = 'Sam Thompson')
  ],
  'We need to redesign our user onboarding flow. Let''s explore different approaches to improve the user experience.',
  'ideation',
  35,
  0.45,
  false,
  0,
  4.6
),
(
  'Security Assessment',
  'Cybersecurity',
  'Security Audit',
  'Comprehensive security review with focus on vulnerabilities and compliance',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Marcus Johnson'),
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Chris Anderson'),
    (SELECT id FROM persona_ids WHERE name = 'David Lee')
  ],
  'We need to conduct a security audit of our application. What are the main vulnerabilities we should address?',
  'planning',
  40,
  0.60,
  true,
  0,
  4.9
),
(
  'Product Strategy',
  'Business',
  'Go-to-Market Planning',
  'Strategic discussion for product launch and marketing',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Robert Kim'),
    (SELECT id FROM persona_ids WHERE name = 'Lisa Wong'),
    (SELECT id FROM persona_ids WHERE name = 'Jordan Taylor'),
    (SELECT id FROM persona_ids WHERE name = 'Dr. Emily Rodriguez')
  ],
  'Let''s plan our go-to-market strategy for the new product launch. We need to consider positioning, pricing, and target audience.',
  'planning',
  45,
  0.70,
  true,
  0,
  4.8
),
(
  'Technical Debate',
  'Technology',
  'Tech Stack Selection',
  'Debate on choosing the right technology stack for a new project',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Sarah Mitchell'),
    (SELECT id FROM persona_ids WHERE name = 'Chris Anderson'),
    (SELECT id FROM persona_ids WHERE name = 'David Lee')
  ],
  'We need to choose between React/Node.js and Vue/Django for our new project. What are the pros and cons of each approach?',
  'debate',
  30,
  0.45,
  false,
  0,
  4.5
),
(
  'Data Strategy',
  'Analytics',
  'ML Implementation Review',
  'Discussion on implementing machine learning features',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Dr. Emily Rodriguez'),
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Robert Kim'),
    (SELECT id FROM persona_ids WHERE name = 'Marcus Johnson')
  ],
  'We want to implement recommendation system using ML. Let''s discuss the approach, data requirements, and privacy considerations.',
  'planning',
  35,
  0.55,
  true,
  0,
  4.9
),
(
  'Quick Feedback',
  'General',
  'Design Critique',
  'Quick design review with visual and UX perspectives',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Jordan Taylor'),
    (SELECT id FROM persona_ids WHERE name = 'Maya Patel'),
    (SELECT id FROM persona_ids WHERE name = 'Jamie Parker')
  ],
  'I''ve created a new design mockup. Can you provide feedback on the visual hierarchy, usability, and overall user experience?',
  'refinement',
  15,
  0.20,
  false,
  0,
  4.4
),
(
  'Infrastructure Planning',
  'Technology',
  'DevOps Strategy',
  'Planning CI/CD pipeline and infrastructure automation',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Chris Anderson'),
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Marcus Johnson'),
    (SELECT id FROM persona_ids WHERE name = 'David Lee')
  ],
  'Let''s design our CI/CD pipeline and discuss infrastructure automation strategies for better deployment efficiency.',
  'planning',
  30,
  0.45,
  false,
  0,
  4.6
),
(
  'User Testing',
  'Product',
  'Feature Validation',
  'Getting user feedback on new features from different user perspectives',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Jamie Parker'),
    (SELECT id FROM persona_ids WHERE name = 'Sam Thompson'),
    (SELECT id FROM persona_ids WHERE name = 'Jordan Taylor'),
    (SELECT id FROM persona_ids WHERE name = 'Sarah Mitchell')
  ],
  'We''ve built a new feature. Let''s test it from different user perspectives and gather feedback on usability and value.',
  'refinement',
  20,
  0.25,
  false,
  0,
  4.3
),
(
  'API Design',
  'Technology',
  'REST vs GraphQL Debate',
  'Technical discussion on API architecture choices',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Sarah Mitchell'),
    (SELECT id FROM persona_ids WHERE name = 'Marcus Johnson')
  ],
  'Should we use REST or GraphQL for our new API? Let''s discuss the trade-offs for our specific use case.',
  'debate',
  25,
  0.35,
  false,
  0,
  4.5
),
(
  'Budget Planning',
  'Business',
  'Project Cost Analysis',
  'Analyzing project costs and ROI from multiple perspectives',
  ARRAY[
    (SELECT id FROM persona_ids WHERE name = 'Robert Kim'),
    (SELECT id FROM persona_ids WHERE name = 'Alex Chen'),
    (SELECT id FROM persona_ids WHERE name = 'Lisa Wong'),
    (SELECT id FROM persona_ids WHERE name = 'Chris Anderson')
  ],
  'We need to analyze the costs and ROI for the proposed project. Let''s break down development costs, infrastructure needs, and expected returns.',
  'planning',
  30,
  0.45,
  false,
  0,
  4.7
);