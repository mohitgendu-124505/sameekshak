# Emotion Weather - QA Checklist

## Authentication & Authorization
- [ ] User registration with email, name, password
- [ ] User login with valid/invalid credentials
- [ ] User logout clears session
- [ ] Admin access control (admin-only pages)
- [ ] JWT token security and httpOnly cookies

## Policy Management
- [ ] Create, read, update, delete policies (admin)
- [ ] Policy search and filtering
- [ ] Policy context switching
- [ ] URL synchronization with policy selection

## Voting & Comments
- [ ] Submit votes with mood and location data
- [ ] Vote statistics display and real-time updates
- [ ] Submit comments with optional mood/location
- [ ] Comment display and pagination
- [ ] Socket.IO real-time updates

## CSV Upload & AI Processing
- [ ] CSV file upload with validation
- [ ] CSV processing queue and job tracking
- [ ] AI sentiment analysis and summarization
- [ ] Job status monitoring and progress display
- [ ] Error handling and reporting

## Map Functionality
- [ ] Interactive map with policy-specific data
- [ ] Click markers to show city details
- [ ] Geographical data aggregation
- [ ] Percentage calculations and statistics

## Real-time Updates
- [ ] Socket.IO vote updates
- [ ] Socket.IO comment updates
- [ ] Socket.IO CSV job updates
- [ ] Policy-specific room management

## Analytics & Dashboard
- [ ] Policy-specific statistics
- [ ] Word cloud generation
- [ ] AI insights and analysis
- [ ] Real-time data updates

## Performance & Security
- [ ] Page load times < 3 seconds
- [ ] API response times
- [ ] Rate limiting enforcement
- [ ] Data validation and sanitization
- [ ] XSS and SQL injection prevention

## Cross-browser & Mobile
- [ ] Chrome, Firefox, Safari, Edge compatibility
- [ ] Mobile responsive design
- [ ] Touch interactions
- [ ] Accessibility (WCAG compliance)

## Error Handling
- [ ] Network error handling
- [ ] Form validation errors
- [ ] Server error responses
- [ ] User-friendly error messages

## Data Integrity
- [ ] Database consistency
- [ ] Real-time data synchronization
- [ ] Transaction atomicity
- [ ] Foreign key constraints

## Final Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated