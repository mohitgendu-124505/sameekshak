# EmotionWeather Test Scripts

## Authentication System Tests (AUTH1)

### Test 1: Admin User Registration
```bash
# Register new admin user
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "email": "testadmin@example.com",
    "password": "SecurePass123"
  }'

# Expected: 201 status with user registration success
```

### Test 2: Admin Login and Token Generation
```bash
# Login as admin
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Expected: 200 status with JWT token and user info
# Save token for subsequent tests
```

### Test 3: Protected Admin Endpoint Access
```bash
# Access admin-only CSV upload endpoint
curl -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -F "csvFile=@example_comments.csv"

# Expected: 200 status with job ID if authenticated admin
# Expected: 401 status if not authenticated
# Expected: 403 status if authenticated but not admin
```

## Per-Policy Data Isolation Tests (DATA1)

### Test 4: Policy-Specific Voting
```bash
# Vote on specific policy
curl -X POST "http://localhost:5000/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "df0dfe97-97bb-464c-8bf0-564b5567f79f",
    "voteType": "positive",
    "comment": "Great policy for sustainable agriculture"
  }'

# Expected: 201 status with vote confirmation
# Verify vote appears only in specified policy stats
```

### Test 5: Policy-Specific Comments
```bash
# Add comment to specific policy
curl -X POST "http://localhost:5000/api/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "7e820369-748c-4362-be27-28611a0c9fa5",
    "content": "Mental health support is crucial for our youth",
    "author": "Concerned Parent",
    "sentiment": "positive",
    "state": "California",
    "city": "Los Angeles"
  }'

# Expected: 201 status with comment ID
# Verify comment appears only for specified policy
```

### Test 6: Cross-Policy Data Isolation Verification
```bash
# Get stats for Policy A
curl "http://localhost:5000/api/policies/df0dfe97-97bb-464c-8bf0-564b5567f79f/stats"

# Get stats for Policy B
curl "http://localhost:5000/api/policies/7e820369-748c-4362-be27-28611a0c9fa5/stats"

# Expected: Different vote/comment counts confirming isolation
```

## Socket Rooms Implementation Tests (SOCKET1)

### Test 7: Socket Room Join/Leave Verification
```bash
# Install socket.io-client for testing
npm install -g socket.io-client-tool

# Test 7a: Connect and join policy room
socket.io-client http://localhost:5000 \
  --event connect \
  --event disconnect \
  --event roomJoined \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}'

# Expected: 
# - connect event received
# - roomJoined event with room: "policy-df0dfe97-97bb-464c-8bf0-564b5567f79f"
# Server logs should show: "Client [ID] joined policy room: df0dfe97-97bb-464c-8bf0-564b5567f79f"

# Test 7b: Leave policy room
socket.io-client http://localhost:5000 \
  --emit 'leavePolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}'

# Expected:
# Server logs should show: "Client [ID] left policy room: df0dfe97-97bb-464c-8bf0-564b5567f79f"
```

### Test 8: Real-time Vote Update Broadcasting
```bash
# Test 8a: Start socket listener for Policy A
socket.io-client http://localhost:5000 \
  --event voteUpdate \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' &

# Test 8b: Start socket listener for Policy B (should NOT receive updates)
socket.io-client http://localhost:5000 \
  --event voteUpdate \
  --emit 'joinPolicy,{"policyId":"7e820369-748c-4362-be27-28611a0c9fa5"}' &

# Test 8c: Submit vote for Policy A via API
curl -X POST "http://localhost:5000/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "df0dfe97-97bb-464c-8bf0-564b5567f79f",
    "voteType": "positive",
    "comment": "Socket test vote"
  }'

# Expected:
# - Policy A listener receives voteUpdate event with new vote breakdown
# - Policy B listener receives NO update
# - voteUpdate includes: policyId, voteBreakdown object, totalVotes
```

### Test 9: Real-time Comment Update Broadcasting
```bash
# Test 9a: Connect multiple clients to same policy
socket.io-client http://localhost:5000 \
  --event commentUpdate \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' &

socket.io-client http://localhost:5000 \
  --event commentUpdate \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' &

# Test 9b: Submit comment via API
curl -X POST "http://localhost:5000/api/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "df0dfe97-97bb-464c-8bf0-564b5567f79f",
    "content": "Socket test comment for real-time updates",
    "author": "Test User",
    "sentiment": "positive",
    "state": "California",
    "city": "Los Angeles"
  }'

# Expected:
# - Both Policy A listeners receive commentUpdate event
# - commentUpdate includes: policyId, comment object with all fields
# - Comment object has: id, content, author, sentiment, state, city, createdAt
```

### Test 10: Socket Room Isolation Verification
```bash
# Test 10a: Cross-policy isolation test
# Terminal 1: Listen to Policy A
socket.io-client http://localhost:5000 \
  --event voteUpdate \
  --event commentUpdate \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' &

# Terminal 2: Listen to Policy B
socket.io-client http://localhost:5000 \
  --event voteUpdate \
  --event commentUpdate \
  --emit 'joinPolicy,{"policyId":"7e820369-748c-4362-be27-28611a0c9fa5"}' &

# Terminal 3: Submit activity to Policy B
curl -X POST "http://localhost:5000/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "7e820369-748c-4362-be27-28611a0c9fa5",
    "voteType": "negative",
    "comment": "Isolation test vote"
  }'

# Expected:
# - Policy A listener receives NO events
# - Policy B listener receives voteUpdate event
# - This confirms proper room isolation
```

### Test 11: Socket Error Handling
```bash
# Test 11a: Invalid policy ID join attempt
socket.io-client http://localhost:5000 \
  --event error \
  --emit 'joinPolicy,{"policyId":"invalid-uuid-12345"}'

# Expected:
# - error event with message about invalid policy ID
# - Connection remains stable
# - No room join occurs

# Test 11b: Malformed join request
socket.io-client http://localhost:5000 \
  --event error \
  --emit 'joinPolicy,{"invalidField":"test"}'

# Expected:
# - error event with validation message
# - Connection remains stable
```

### Test 12: Socket Connection Stability
```bash
# Test 12a: Rapid connect/disconnect
for i in {1..5}; do
  timeout 2s socket.io-client http://localhost:5000 \
    --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' &
  sleep 1
done

# Expected:
# - All connections handled gracefully
# - No memory leaks or server crashes
# - Proper cleanup of disconnected clients
# Server logs show connect/disconnect cycles

# Test 12b: Multiple room joins per client
socket.io-client http://localhost:5000 \
  --emit 'joinPolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}' \
  --emit 'joinPolicy,{"policyId":"7e820369-748c-4362-be27-28611a0c9fa5"}' \
  --emit 'leavePolicy,{"policyId":"df0dfe97-97bb-464c-8bf0-564b5567f79f"}'

# Expected:
# - Client joins first room successfully
# - Client leaves first room, joins second room
# - Only receives updates for currently joined room
```

### Socket Testing Prerequisites
```bash
# Install socket.io client testing tool (if not available, use Node.js script)
npm install -g socket.io-client-tool

# Alternative: Create simple Node.js test script
cat > socket_test.js << 'EOF'
const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join policy room
  socket.emit('joinPolicy', { policyId: process.argv[2] || 'df0dfe97-97bb-464c-8bf0-564b5567f79f' });
});

socket.on('roomJoined', (data) => {
  console.log('Joined room:', data);
});

socket.on('voteUpdate', (data) => {
  console.log('Vote update received:', data);
});

socket.on('commentUpdate', (data) => {
  console.log('Comment update received:', data);
});

socket.on('error', (error) => {
  console.log('Socket error:', error);
});

process.on('SIGINT', () => {
  socket.disconnect();
  process.exit();
});
EOF

# Run socket test
node socket_test.js [policyId]
```

## Core API Endpoints Tests (API1)

### Test 13: Results API Endpoint
```bash
# Get comprehensive results for all policies
curl "http://localhost:5000/api/results"

# Expected: JSON with:
# - voteBreakdown by emotion type
# - sentimentCounts (positive/negative/neutral)
# - stateBreakdown with regional data
# - cityBreakdown with municipal data
# - recentActivity array
```

### Test 14: Summary API Endpoint
```bash
# Get summary statistics
curl "http://localhost:5000/api/summary"

# Expected: JSON with:
# - sentimentCounts object
# - voteBreakdown by type
# - timeframe information
# - coverage metadata
# - totalComments and totalVotes
```

### Test 15: Word Cloud API Endpoint
```bash
# Get word cloud data
curl "http://localhost:5000/api/wordcloud"

# Expected: JSON array with:
# - text: word
# - value: frequency count
# - Filtered stop words removed
# - Minimum frequency threshold applied
```

## CSV Upload Functionality Tests (CSV1)

### Test 16: CSV Upload Process
```bash
# Upload CSV file with background processing
curl -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "csvFile=@example_comments.csv"

# Expected: 202 status with job ID
# Save job ID for status checking
```

### Test 17: Job Status Monitoring
```bash
# Check job processing status
curl "http://localhost:5000/api/csv/jobs/JOB_ID_HERE" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: JSON with:
# - status: "pending", "processing", "completed", or "failed"
# - progress: percentage (0-100)
# - processed: number of records processed
# - errors: array of error messages (if any)
```

### Test 18: CSV Data Validation
```bash
# Upload invalid CSV to test error handling
echo "invalid,csv,data" > invalid.csv
curl -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "csvFile=@invalid.csv"

# Expected: Job should process with validation errors reported
```

## AI Extraction System Tests (AI1)

### Test 19: AI Policy Extraction
```bash
# Extract benefits/eligibility/FAQs from policy
curl -X POST "http://localhost:5000/api/ai/extract-policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"policyId": "b1b4fbc7-2f15-45d2-804f-ffcf83be007f"}'

# Expected: JSON with:
# - benefits: array of {title, description} objects
# - eligibility: array of {criteria, details} objects  
# - faqs: array of {question, answer} objects
# - cached: boolean indicating if data was cached
```

### Test 20: AI Extraction Caching
```bash
# Call same extraction twice to test 24-hour cache
curl -X POST "http://localhost:5000/api/ai/extract-policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"policyId": "7e820369-748c-4362-be27-28611a0c9fa5"}'

# First call: cached: false
# Second call: cached: true (within 24 hours)
```

### Test 21: AI Fallback Parser
```bash
# Test fallback parser with policies containing text-based data
# Should work even if AI service is unavailable
curl -X POST "http://localhost:5000/api/ai/extract-policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"policyId": "b03213dc-3e27-4dd2-8284-3eb87a3bb037"}'

# Expected: Structured data from text parsing fallback
```

## Database Seeding Tests (SEED1)

### Test 22: Verify Demo Policies
```bash
# Check that demo policies exist with complete data
curl "http://localhost:5000/api/policies"

# Expected: Response includes:
# - Smart City Infrastructure Initiative
# - Youth Mental Health Support Program  
# - Small Business Recovery and Growth Fund
# All with status: "active" and comprehensive details
```

### Test 23: Verify CSV Example Data
```bash
# Check example_comments.csv format
head -5 example_comments.csv

# Expected: Valid CSV with headers:
# policy_id,content,author,sentiment,state,city
# Sample data covering multiple policies
```

## Performance and Load Tests

### Test 24: Concurrent User Simulation
```bash
# Simulate multiple users voting simultaneously
for i in {1..10}; do
  curl -X POST "http://localhost:5000/api/vote" \
    -H "Content-Type: application/json" \
    -d "{
      \"policyId\": \"df0dfe97-97bb-464c-8bf0-564b5567f79f\",
      \"voteType\": \"positive\",
      \"comment\": \"Load test vote $i\"
    }" &
done
wait

# Expected: All requests succeed without conflicts
```

### Test 25: Large CSV Upload
```bash
# Create and upload large CSV file (1000+ rows)
python3 -c "
import csv
with open('large_test.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['policy_id', 'content', 'author', 'sentiment', 'state', 'city'])
    for i in range(1000):
        writer.writerow(['df0dfe97-97bb-464c-8bf0-564b5567f79f', f'Test comment {i}', f'User{i}', 'positive', 'TestState', 'TestCity'])
"

curl -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "csvFile=@large_test.csv"

# Expected: Job processes successfully with progress updates
```

## Error Handling Tests

### Test 26: Invalid Policy ID
```bash
# Test with non-existent policy ID
curl -X POST "http://localhost:5000/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "invalid-uuid-12345",
    "voteType": "positive",
    "comment": "Test"
  }'

# Expected: 400 or 404 error with clear message
```

### Test 27: Invalid Authentication
```bash
# Test with invalid JWT token
curl -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer invalid.jwt.token" \
  -F "csvFile=@example_comments.csv"

# Expected: 401 Unauthorized error
```

### Test 28: Database Connection Test
```bash
# Test API endpoints when database is available
curl "http://localhost:5000/api/policies"

# Expected: 200 status with policy list
# If database unavailable: 500 error with appropriate message
```

## Integration Tests

### Test 29: End-to-End User Journey
```bash
# Test 29a: Dashboard and Policy List Access
curl "http://localhost:5000/api/policies" | grep -q "Agriculture Sustainability Act"
if [ $? -eq 0 ]; then echo "✓ Policy list accessible"; else echo "✗ Policy list failed"; fi

curl "http://localhost:5000/api/policies/summary" | grep -q "total"
if [ $? -eq 0 ]; then echo "✓ Dashboard summary working"; else echo "✗ Dashboard summary failed"; fi

# Test 29b: Policy Navigation and Voting with Real-time Updates
# Start socket listener in background to verify real-time updates
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:5000');
let voteReceived = false;

socket.on('connect', () => {
  socket.emit('joinPolicy', { policyId: 'df0dfe97-97bb-464c-8bf0-564b5567f79f' });
});

socket.on('voteUpdate', (data) => {
  console.log('✓ Real-time vote update received:', JSON.stringify(data));
  voteReceived = true;
  process.exit(0);
});

setTimeout(() => {
  if (!voteReceived) {
    console.log('✗ No real-time update received within 10 seconds');
    process.exit(1);
  }
}, 10000);
" &
SOCKET_PID=$!

# Submit vote and verify API response
sleep 2
VOTE_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "df0dfe97-97bb-464c-8bf0-564b5567f79f",
    "voteType": "positive",
    "comment": "End-to-end test vote"
  }')

if echo "$VOTE_RESPONSE" | grep -q "Vote submitted successfully"; then
  echo "✓ Vote submission successful"
else
  echo "✗ Vote submission failed: $VOTE_RESPONSE"
fi

# Wait for socket listener to complete
wait $SOCKET_PID

# Test 29c: Analytics and Emotion Map Verification
curl -s "http://localhost:5000/api/results" | grep -q "voteBreakdown"
if [ $? -eq 0 ]; then echo "✓ Analytics results accessible"; else echo "✗ Analytics results failed"; fi

curl -s "http://localhost:5000/api/wordcloud" | grep -q '"text"'
if [ $? -eq 0 ]; then echo "✓ Word cloud data available"; else echo "✗ Word cloud data failed"; fi

curl -s "http://localhost:5000/api/geographical-data" | grep -q "state"
if [ $? -eq 0 ]; then echo "✓ Emotion map data available"; else echo "✗ Emotion map data failed"; fi

# Expected: All checks pass with ✓ indicators
```

### Test 30: Admin Workflow
```bash
# Test 30a: Admin Authentication
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
  echo "✓ Admin login successful"
else
  echo "✗ Admin login failed"
  exit 1
fi

# Test 30b: CSV Upload and Job Monitoring
echo "Creating test CSV file..."
cat > admin_test.csv << EOF
policy_id,content,author,sentiment,state,city
df0dfe97-97bb-464c-8bf0-564b5567f79f,"Admin workflow test comment","Test Admin","positive","TestState","TestCity"
7e820369-748c-4362-be27-28611a0c9fa5,"Another admin test","Test Admin 2","negative","TestState2","TestCity2"
EOF

# Upload CSV and get job ID
JOB_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/csv/upload" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "csvFile=@admin_test.csv")

JOB_ID=$(echo "$JOB_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
  echo "✓ CSV upload initiated, Job ID: $JOB_ID"
else
  echo "✗ CSV upload failed: $JOB_RESPONSE"
fi

# Monitor job progress
echo "Monitoring job progress..."
for i in {1..10}; do
  JOB_STATUS=$(curl -s "http://localhost:5000/api/csv/jobs/$JOB_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  STATUS=$(echo "$JOB_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo "$JOB_STATUS" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
  
  echo "Job Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✓ CSV processing completed successfully"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "✗ CSV processing failed"
    break
  fi
  
  sleep 2
done

# Test 30c: AI Policy Extraction
AI_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/ai/extract-policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"policyId": "b1b4fbc7-2f15-45d2-804f-ffcf83be007f"}')

if echo "$AI_RESPONSE" | grep -q '"benefits"'; then
  echo "✓ AI extraction working"
  BENEFITS_COUNT=$(echo "$AI_RESPONSE" | grep -o '"title"' | wc -l)
  echo "  - Extracted $BENEFITS_COUNT structured benefits"
else
  echo "✗ AI extraction failed: $AI_RESPONSE"
fi

# Test 30d: Comprehensive Analytics Access
ANALYTICS_RESPONSE=$(curl -s "http://localhost:5000/api/policies/all-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ANALYTICS_RESPONSE" | grep -q "df0dfe97-97bb-464c-8bf0-564b5567f79f"; then
  echo "✓ Comprehensive analytics accessible"
  POLICY_COUNT=$(echo "$ANALYTICS_RESPONSE" | grep -o '"[a-f0-9-]*":' | wc -l)
  echo "  - Analytics available for $POLICY_COUNT policies"
else
  echo "✗ Comprehensive analytics failed"
fi

# Test 30e: Policy Management Verification
POLICIES_RESPONSE=$(curl -s "http://localhost:5000/api/policies")
ACTIVE_POLICIES=$(echo "$POLICIES_RESPONSE" | grep -o '"status":"active"' | wc -l)
TOTAL_POLICIES=$(echo "$POLICIES_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)

echo "✓ Policy management summary:"
echo "  - Total policies: $TOTAL_POLICIES"
echo "  - Active policies: $ACTIVE_POLICIES"

# Cleanup test files
rm -f admin_test.csv

# Expected: All steps complete successfully with ✓ indicators
# Admin should have full access to upload, monitor, extract, and analyze data
```

## Sample Test Data

### Valid Vote Data
```json
{
  "policyId": "df0dfe97-97bb-464c-8bf0-564b5567f79f",
  "voteType": "positive",
  "comment": "This policy will help farmers transition to sustainable practices"
}
```

### Valid Comment Data
```json
{
  "policyId": "7e820369-748c-4362-be27-28611a0c9fa5",
  "content": "Mental health support in schools is long overdue",
  "author": "Teacher",
  "sentiment": "positive",
  "state": "California",
  "city": "San Francisco"
}
```

### CSV Test Data Format
```csv
policy_id,content,author,sentiment,state,city
df0dfe97-97bb-464c-8bf0-564b5567f79f,"Great policy for agriculture","Farmer Joe","positive","Iowa","Des Moines"
7e820369-748c-4362-be27-28611a0c9fa5,"Mental health is important","Parent","positive","Texas","Austin"
```

## Notes for Testing
- Replace `YOUR_JWT_TOKEN_HERE` and `YOUR_ADMIN_TOKEN` with actual tokens from login
- Ensure database is seeded with demo data before running tests
- Some tests require multiple browser tabs for real-time verification
- Monitor server logs during testing for error diagnosis
- Use appropriate test data that matches schema validation rules