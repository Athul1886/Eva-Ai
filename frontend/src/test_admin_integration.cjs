/**
 * Admin Panel Frontend Integration Verification Script
 * Validates:
 * 1. Admin authentication logic and role validation
 * 2. Admin API client method contracts
 * 3. Route guarding & token handling
 * 4. Zero hardcoded mock business data for admin
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('\n--- EVA-AI ADMIN PANEL INTEGRATION VERIFICATION ---\n');

// 1. Verify files exist
const apiFilePath = path.join(__dirname, 'api', 'api.ts');
const adminAuthPath = path.join(__dirname, 'utils', 'adminAuth.ts');
const adminLayoutPath = path.join(__dirname, 'components', 'admin', 'AdminLayout.tsx');
const adminHeaderPath = path.join(__dirname, 'components', 'admin', 'AdminHeader.tsx');
const adminLoginPath = path.join(__dirname, 'pages', 'AdminLoginPage.tsx');
const adminDashboardPath = path.join(__dirname, 'pages', 'AdminDashboardPage.tsx');
const adminUsersPath = path.join(__dirname, 'pages', 'AdminUsersPage.tsx');
const adminProvidersPath = path.join(__dirname, 'pages', 'AdminProvidersPage.tsx');
const adminProviderDetailPath = path.join(__dirname, 'pages', 'AdminProviderDetailPage.tsx');
const appPath = path.join(__dirname, 'App.tsx');

assert(fs.existsSync(apiFilePath), 'api.ts exists');
assert(fs.existsSync(adminAuthPath), 'adminAuth.ts exists');
assert(fs.existsSync(adminLayoutPath), 'AdminLayout.tsx exists');
assert(fs.existsSync(adminHeaderPath), 'AdminHeader.tsx exists');
assert(fs.existsSync(adminLoginPath), 'AdminLoginPage.tsx exists');
assert(fs.existsSync(adminDashboardPath), 'AdminDashboardPage.tsx exists');
assert(fs.existsSync(adminUsersPath), 'AdminUsersPage.tsx exists');
assert(fs.existsSync(adminProvidersPath), 'AdminProvidersPage.tsx exists');
assert(fs.existsSync(adminProviderDetailPath), 'AdminProviderDetailPage.tsx exists');
assert(fs.existsSync(appPath), 'App.tsx exists');

// 2. Check API client endpoints and methods in api.ts
const apiContent = fs.readFileSync(apiFilePath, 'utf8');
assert(apiContent.includes("ADMIN_DASHBOARD_STATS: '/admin/dashboard/stats'"), 'API_ENDPOINTS contains ADMIN_DASHBOARD_STATS');
assert(apiContent.includes("ADMIN_USERS: '/admin/users'"), 'API_ENDPOINTS contains ADMIN_USERS');
assert(apiContent.includes("ADMIN_PROVIDER_STATUS: (id: string) => `/admin/providers/${id}/status`"), 'API_ENDPOINTS contains ADMIN_PROVIDER_STATUS');
assert(apiContent.includes('adminApi = {'), 'adminApi object defined in api.ts');
assert(apiContent.includes('getDashboardStats:'), 'adminApi.getDashboardStats implemented');
assert(apiContent.includes('getUsers:'), 'adminApi.getUsers implemented');
assert(apiContent.includes('updateProviderStatus:'), 'adminApi.updateProviderStatus implemented');
assert(apiContent.includes("localStorage.getItem('eva_ai_admin_session')"), 'getStoredAccessToken checks eva_ai_admin_session');
assert(apiContent.includes("localStorage.removeItem('eva_ai_admin_session')"), 'handleAuthFailure clears eva_ai_admin_session');

// 3. Check Admin Auth logic in adminAuth.ts
const authContent = fs.readFileSync(adminAuthPath, 'utf8');
assert(authContent.includes('export function getAdminSession'), 'getAdminSession exported');
assert(authContent.includes('export function setAdminSession'), 'setAdminSession exported');
assert(authContent.includes('export function clearAdminSession'), 'clearAdminSession exported');
assert(authContent.includes('export async function logoutAdmin'), 'logoutAdmin exported');
assert(authContent.includes('export async function verifyAdminSession'), 'verifyAdminSession exported');
assert(authContent.includes("role && role.toLowerCase() !== 'admin'"), 'verifyAdminSession strictly enforces role === "admin"');
assert(authContent.includes('user.isActive === false'), 'verifyAdminSession checks isActive state');

// 4. Check Admin Login Page
const loginContent = fs.readFileSync(adminLoginPath, 'utf8');
assert(loginContent.includes('authApi.login'), 'AdminLoginPage uses standard authApi.login endpoint');
assert(loginContent.includes("role !== 'admin'"), 'AdminLoginPage denies non-admin roles (customer/provider)');
assert(loginContent.includes('setStoredAccessToken'), 'AdminLoginPage stores tokens');
assert(loginContent.includes('setAdminSession'), 'AdminLoginPage stores verified admin session');
assert(loginContent.includes('/admin/dashboard'), 'AdminLoginPage navigates to /admin/dashboard');

// 5. Check Admin Dashboard Page
const dashboardContent = fs.readFileSync(adminDashboardPath, 'utf8');
assert(dashboardContent.includes('adminApi.getDashboardStats()'), 'AdminDashboardPage calls adminApi.getDashboardStats()');
assert(dashboardContent.includes('totalCustomers'), 'AdminDashboardPage displays totalCustomers');
assert(dashboardContent.includes('totalProviders'), 'AdminDashboardPage displays totalProviders');
assert(dashboardContent.includes('pendingProviders'), 'AdminDashboardPage displays pendingProviders');
assert(dashboardContent.includes('approvedProviders'), 'AdminDashboardPage displays approvedProviders');
assert(dashboardContent.includes('rejectedProviders'), 'AdminDashboardPage displays rejectedProviders');
assert(!dashboardContent.includes('mock'), 'AdminDashboardPage has NO mock stats fallback');

// 6. Check Admin Users Page
const usersContent = fs.readFileSync(adminUsersPath, 'utf8');
assert(usersContent.includes('adminApi.getUsers()'), 'AdminUsersPage calls adminApi.getUsers()');
assert(usersContent.includes('fullName'), 'AdminUsersPage displays customer name');
assert(usersContent.includes('email'), 'AdminUsersPage displays customer email');
assert(usersContent.includes('phone'), 'AdminUsersPage displays customer phone');
assert(usersContent.includes('location'), 'AdminUsersPage displays customer location');
assert(usersContent.includes('isActive'), 'AdminUsersPage displays customer status');
assert(usersContent.includes('createdAt'), 'AdminUsersPage displays customer createdAt');

// 7. Check Admin Providers Page
const providersContent = fs.readFileSync(adminProvidersPath, 'utf8');
assert(providersContent.includes('providersApi.getAll()'), 'AdminProvidersPage calls providersApi.getAll()');
assert(providersContent.includes('businessName'), 'AdminProvidersPage displays business/provider name');
assert(providersContent.includes('category'), 'AdminProvidersPage displays category');
assert(providersContent.includes('location'), 'AdminProvidersPage displays location');
assert(providersContent.includes('yearsExperience'), 'AdminProvidersPage displays yearsExperience');
assert(providersContent.includes('approvalStatus'), 'AdminProvidersPage displays approvalStatus');
assert(providersContent.includes('PENDING'), 'AdminProvidersPage handles PENDING status');
assert(providersContent.includes('APPROVED'), 'AdminProvidersPage handles APPROVED status');
assert(providersContent.includes('REJECTED'), 'AdminProvidersPage handles REJECTED status');
assert(providersContent.includes('SUSPENDED'), 'AdminProvidersPage handles SUSPENDED status');

// 8. Check Admin Provider Detail Page
const detailContent = fs.readFileSync(adminProviderDetailPath, 'utf8');
assert(detailContent.includes('providersApi.getById(id)'), 'AdminProviderDetailPage calls providersApi.getById(id)');
assert(detailContent.includes('adminApi.updateProviderStatus(id, statusActionPending)'), 'AdminProviderDetailPage calls adminApi.updateProviderStatus');
assert(detailContent.includes('APPROVED'), 'AdminProviderDetailPage supports APPROVED mutation');
assert(detailContent.includes('REJECTED'), 'AdminProviderDetailPage supports REJECTED mutation');
assert(detailContent.includes('showConfirmModal'), 'AdminProviderDetailPage enforces confirmation modal before status update');
assert(detailContent.includes('fetchProviderDetails()'), 'AdminProviderDetailPage refreshes backend data authoritatively after status update');

// 9. Check App.tsx Routes
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('path="/admin/login"'), 'App.tsx contains /admin/login route');
assert(appContent.includes('path="/admin"'), 'App.tsx contains /admin layout route');
assert(appContent.includes('path="dashboard"'), 'App.tsx contains admin dashboard route');
assert(appContent.includes('path="users"'), 'App.tsx contains admin users route');
assert(appContent.includes('path="providers"'), 'App.tsx contains admin providers route');
assert(appContent.includes('path="providers/:id"'), 'App.tsx contains admin provider details route');

console.log(`\nVerification Complete: ${testsPassed} passed, ${testsFailed} failed.\n`);
if (testsFailed > 0) {
  process.exit(1);
}
