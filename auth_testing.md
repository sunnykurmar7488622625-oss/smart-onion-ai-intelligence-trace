# Auth Testing Playbook (ONIONAI)

Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "farmer"}).pretty()
db.users.findOne({email: "sunnykurmar7488622625@gmail.com"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, unique index exists on users.email, index on login_attempts.identifier.

Step 2: API Testing (Bearer token flow — cookies are not used)
```
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"sunnykurmar7488622625@gmail.com","password":"Onion@2026"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
```
Login should return {token, user}. /me should return the same user. Wrong password -> 401. 5 failures -> 429 lockout for 15 minutes.
Buyer accounts get 403 on farmer-only endpoints (POST /api/batches, /api/inspections/analyze, /api/dispatch/...).
