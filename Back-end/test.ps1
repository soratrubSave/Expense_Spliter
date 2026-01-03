Write-Host "=== Testing Expense Splitter API ===" -ForegroundColor Cyan

# 1. Register Tom
Write-Host "`n1. Registering Tom..." -ForegroundColor Yellow
$tom = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"tom@example.com","name":"Tom","password":"123456"}'
Write-Host "   OK Tom registered (ID: $($tom.user.id))" -ForegroundColor Green

# 2. Register Bank
Write-Host "`n2. Registering Bank..." -ForegroundColor Yellow
$bank = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"bank@example.com","name":"Bank","password":"123456"}'
Write-Host "   OK Bank registered (ID: $($bank.user.id))" -ForegroundColor Green

# 3. Register Mew
Write-Host "`n3. Registering Mew..." -ForegroundColor Yellow
$mew = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"mew@example.com","name":"Mew","password":"123456"}'
Write-Host "   OK Mew registered (ID: $($mew.user.id))" -ForegroundColor Green

# 4. Login as Tom
Write-Host "`n4. Logging in as Tom..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"tom@example.com","password":"123456"}'
$token = $login.token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Write-Host "   OK Logged in successfully" -ForegroundColor Green

# 5. Create Group
Write-Host "`n5. Creating group..." -ForegroundColor Yellow
$group = Invoke-RestMethod -Uri "http://localhost:8080/api/groups" -Method Post -Headers $headers -Body '{"name":"Chiang Mai Trip","description":"3 days 2 nights"}'
Write-Host "   OK Group created (ID: $($group.id))" -ForegroundColor Green

# 6. Add Members
Write-Host "`n6. Adding members..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8080/api/groups/1/members" -Method Post -Headers $headers -Body '{"user_id":2}' | Out-Null
Write-Host "   OK Added Bank" -ForegroundColor Green
Invoke-RestMethod -Uri "http://localhost:8080/api/groups/1/members" -Method Post -Headers $headers -Body '{"user_id":3}' | Out-Null
Write-Host "   OK Added Mew" -ForegroundColor Green

# 7. Add Expenses
Write-Host "`n7. Adding expenses..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8080/api/expenses" -Method Post -Headers $headers -Body '{"group_id":1,"description":"Hotel","amount":3000,"paid_by":1,"split_with":[1,2,3]}' | Out-Null
Write-Host "   OK Tom paid 3000 for hotel" -ForegroundColor Green

Invoke-RestMethod -Uri "http://localhost:8080/api/expenses" -Method Post -Headers $headers -Body '{"group_id":1,"description":"Breakfast","amount":240,"paid_by":2,"split_with":[1,2,3]}' | Out-Null
Write-Host "   OK Bank paid 240 for breakfast" -ForegroundColor Green

Invoke-RestMethod -Uri "http://localhost:8080/api/expenses" -Method Post -Headers $headers -Body '{"group_id":1,"description":"Gas","amount":600,"paid_by":3,"split_with":[1,2,3]}' | Out-Null
Write-Host "   OK Mew paid 600 for gas" -ForegroundColor Green

# 8. Get Expenses
Write-Host "`n8. Getting all expenses..." -ForegroundColor Yellow
$expenses = Invoke-RestMethod -Uri "http://localhost:8080/api/expenses/group/1" -Method Get -Headers $headers
Write-Host "   Found $($expenses.Count) expenses" -ForegroundColor White
foreach ($exp in $expenses) {
    Write-Host "   - $($exp.description): $($exp.amount) (paid by $($exp.paid_by_name))" -ForegroundColor Gray
}

# 9. Calculate Settlements
Write-Host "`n9. Calculating settlements..." -ForegroundColor Yellow
$settlement = Invoke-RestMethod -Uri "http://localhost:8080/api/settlements/group/1" -Method Get -Headers $headers

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "        SETTLEMENT RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nWho should pay whom:" -ForegroundColor White
foreach ($s in $settlement.settlements) {
    Write-Host "  >> $($s.from_user_name) pays $($s.to_user_name): $($s.amount) baht" -ForegroundColor Yellow
}

Write-Host "`nFinal Balances:" -ForegroundColor White
foreach ($b in $settlement.balances) {
    if ($b.balance -gt 0) {
        Write-Host "  + $($b.user_name): +$($b.balance) baht (will receive)" -ForegroundColor Green
    } elseif ($b.balance -lt 0) {
        Write-Host "  - $($b.user_name): $($b.balance) baht (needs to pay)" -ForegroundColor Red
    } else {
        Write-Host "  = $($b.user_name): $($b.balance) baht (even)" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "All tests completed successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
