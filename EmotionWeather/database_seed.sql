-- EmotionWeather Database Seed Data
-- This file contains demo policies with comprehensive AI-extracted content

-- Smart City Infrastructure Initiative
INSERT INTO policies (id, title, description, details, status, created_at, benefits, eligibility, faqs, ai_extracted, extracted_at) VALUES 
('b1b4fbc7-2f15-45d2-804f-ffcf83be007f', 
'Smart City Infrastructure Initiative', 
'Comprehensive smart city development program leveraging IoT, AI, and sustainable technology to improve urban living standards, reduce energy consumption, and enhance citizen services.',
'The Smart City Infrastructure Initiative represents a transformative approach to urban development, integrating cutting-edge technology with sustainable practices. This comprehensive program aims to deploy Internet of Things (IoT) sensors throughout the city to monitor air quality, traffic patterns, and energy usage in real-time. The initiative includes installing smart traffic lights that adapt to traffic flow, implementing intelligent water management systems, and creating a unified digital platform for citizen services. Key components include: 1) Smart Transportation: Intelligent traffic management, electric vehicle charging stations, and integrated public transit systems with real-time tracking. 2) Energy Efficiency: Smart grid implementation, solar panel installations on public buildings, and energy-efficient LED street lighting with adaptive controls. 3) Digital Services: Mobile app for citizen services, online permit applications, and AI-powered chatbot for government inquiries. 4) Environmental Monitoring: Air quality sensors, noise level monitoring, and automated waste management systems. The initiative will be implemented in phases over three years, starting with downtown areas and expanding to residential neighborhoods.',
'active',
NOW(),
'• Reduced energy consumption by up to 30% through smart grid and LED lighting
• Improved traffic flow with 25% reduction in commute times
• Enhanced air quality monitoring and pollution reduction
• Streamlined government services with 24/7 digital access
• Increased property values in smart city zones
• Job creation in technology and green energy sectors
• Better emergency response times through integrated systems
• Reduced water waste through intelligent management systems',
'• Available to all residents within designated smart city zones
• Businesses can apply for smart energy partnerships
• Property owners eligible for solar panel installation incentives
• Public transit users benefit from real-time tracking systems
• Low-income households prioritized for energy efficiency upgrades
• Students and researchers can access environmental data through open APIs
• Small businesses eligible for digital transformation grants',
'Q: How will my privacy be protected with all these sensors?
A: All data collection follows strict privacy protocols with anonymization and encryption. Personal data is never stored or tracked.

Q: What is the cost to residents?
A: Most services are funded through municipal budgets and grants. Some premium services may have optional fees.

Q: When will the smart traffic lights be installed in my area?
A: Installation follows a phased approach. Check the city website for your neighborhood timeline.

Q: Can I access the environmental data collected?
A: Yes, anonymized environmental data will be available through a public dashboard and API for research purposes.

Q: What happens if the technology fails?
A: All smart systems have manual backup options and 24/7 technical support for critical infrastructure.',
true,
NOW())
ON CONFLICT (id) DO NOTHING;

-- Youth Mental Health Support Program
INSERT INTO policies (id, title, description, details, status, created_at, benefits, eligibility, faqs, ai_extracted, extracted_at) VALUES 
('7e820369-748c-4362-be27-28611a0c9fa5', 
'Youth Mental Health Support Program', 
'Comprehensive mental health initiative providing accessible counseling, peer support, and educational resources for students and young adults aged 13-25, addressing rising mental health challenges in our community.',
'The Youth Mental Health Support Program addresses the growing mental health crisis among young people through a multi-faceted approach combining professional counseling, peer support networks, and educational initiatives. This program recognizes that mental health challenges among youth have increased significantly, particularly following the pandemic, and requires immediate, comprehensive intervention. Key program components include: 1) School-Based Counseling: Licensed mental health professionals available in all high schools and middle schools, providing individual and group therapy sessions. 2) Peer Support Networks: Trained peer mentors and support groups facilitated by mental health professionals. 3) Digital Mental Health Platform: 24/7 access to mental health resources, self-help tools, and crisis intervention through a secure mobile app. 4) Family Education: Workshops for parents and guardians on recognizing mental health warning signs and supporting their children. 5) Crisis Intervention: 24/7 crisis hotline staffed by licensed professionals with same-day emergency appointments available. 6) Community Partnerships: Collaboration with local healthcare providers, non-profits, and educational institutions to create a comprehensive support network. The program emphasizes early intervention, destigmatization of mental health treatment, and building resilience skills that will benefit young people throughout their lives.',
'active',
NOW(),
'• Free access to licensed mental health professionals for students
• Reduced stigma around mental health treatment in schools
• Early intervention preventing more serious mental health crises
• Improved academic performance and school attendance
• Enhanced coping skills and emotional resilience
• Stronger family relationships through education and support
• Reduced youth suicide rates and self-harm incidents
• Better preparation for adult life challenges
• Peer support reducing isolation and loneliness
• 24/7 access to mental health resources and crisis support',
'• All students aged 13-25 in participating school districts
• Young adults aged 18-25 regardless of school enrollment status
• No insurance required - program provides free services
• Undocumented students fully eligible for all services
• LGBTQ+ youth receive specialized support and resources
• Students with disabilities have accessible service options
• Rural students can access services through telehealth options
• Parents and guardians eligible for family education programs
• Teachers and school staff can access training and support resources',
'Q: Is this program confidential?
A: Yes, all counseling sessions are strictly confidential except in cases where safety is at risk, as required by law.

Q: Do I need my parents permission to participate?
A: Students 18+ can participate independently. Minors may need parental consent depending on the service type and state laws.

Q: What if I don''t feel comfortable talking to someone in person?
A: We offer telehealth options, text-based counseling, and online resources for different comfort levels.

Q: Are services available during summer and school breaks?
A: Yes, the program operates year-round with expanded community-based services during school breaks.

Q: What if I''m having a mental health emergency?
A: Call our 24/7 crisis hotline or text YOUTH to 741741. Emergency services are always available.',
true,
NOW())
ON CONFLICT (id) DO NOTHING;

-- Small Business Recovery and Growth Fund
INSERT INTO policies (id, title, description, details, status, created_at, benefits, eligibility, faqs, ai_extracted, extracted_at) VALUES 
('b03213dc-3e27-4dd2-8284-3eb87a3bb037', 
'Small Business Recovery and Growth Fund', 
'Economic recovery program providing grants, low-interest loans, and business development support to help local small businesses recover from economic challenges and achieve sustainable growth.',
'The Small Business Recovery and Growth Fund is designed to revitalize our local economy by providing comprehensive support to small businesses that form the backbone of our community. This program recognizes that small businesses create jobs, drive innovation, and contribute to the unique character of our neighborhoods. The fund provides multiple types of assistance tailored to different business needs and stages of development. Program offerings include: 1) Recovery Grants: Up to $50,000 in non-repayable grants for businesses demonstrating pandemic-related losses or other economic hardships. 2) Growth Loans: Low-interest loans (2% APR) from $10,000 to $500,000 for expansion, equipment purchases, or inventory. 3) Business Development Services: Free consultation with business advisors, marketing support, financial planning assistance, and access to networking events. 4) Technology Modernization: Grants up to $25,000 for digital transformation, e-commerce development, and technology upgrades. 5) Workforce Development: Funding for employee training programs and apprenticeships. 6) Minority-Owned Business Support: Additional resources and mentorship for businesses owned by women, minorities, and veterans. The program prioritizes businesses that commit to maintaining or creating local jobs and contributing to community development. Applications are reviewed quarterly by a panel of business leaders, economic development experts, and community representatives.',
'active',
NOW(),
'• Direct financial support through grants and low-interest loans
• Free business consulting and development services
• Increased revenue potential through growth opportunities
• Enhanced competitiveness through technology upgrades
• Access to networking and partnership opportunities
• Workforce development reducing hiring and training costs
• Marketing support increasing customer reach
• Improved business sustainability and resilience
• Job creation benefiting the entire community
• Strengthened local economy reducing dependence on large corporations',
'• Businesses with 50 or fewer employees located within city limits
• Must have been operating for at least 6 months prior to application
• Annual revenue must not exceed $5 million
• Must demonstrate financial need or growth potential
• Preference given to businesses demonstrating community impact
• Minority-owned, women-owned, and veteran-owned businesses receive priority consideration
• Businesses in designated economic development zones eligible for enhanced benefits
• Sole proprietorships, partnerships, LLCs, and corporations all eligible
• Must commit to maintaining operations locally for minimum 3 years',
'Q: How do I apply for the program?
A: Applications are submitted online quarterly. Next deadline is [DATE]. Visit our website or attend an information session.

Q: What documents do I need to apply?
A: Tax returns, financial statements, business plan, and proof of business location are required. Full list available online.

Q: How long does the approval process take?
A: Applications are reviewed within 60 days of quarterly deadlines. Approved applicants are notified within 10 business days.

Q: Can I apply for both grants and loans?
A: Yes, businesses can apply for multiple program components, but total funding is capped at $500,000 per business.

Q: What if my application is denied?
A: You receive detailed feedback and can reapply in the next quarter after addressing concerns. Free consultation available.',
true,
NOW())
ON CONFLICT (id) DO NOTHING;